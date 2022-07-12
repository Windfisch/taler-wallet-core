/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import {
  AbsoluteTime,
  AcceptPeerPushPaymentRequest,
  AmountJson,
  Amounts,
  AmountString,
  buildCodecForObject,
  CheckPeerPushPaymentRequest,
  CheckPeerPushPaymentResponse,
  Codec,
  codecForAmountString,
  codecForAny,
  codecForExchangeGetContractResponse,
  ContractTermsUtil,
  decodeCrock,
  Duration,
  eddsaGetPublic,
  encodeCrock,
  ExchangePurseMergeRequest,
  InitiatePeerPushPaymentRequest,
  InitiatePeerPushPaymentResponse,
  j2s,
  Logger,
  strcmp,
  TalerProtocolTimestamp,
  UnblindedSignature,
  WalletAccountMergeFlags,
} from "@gnu-taler/taler-util";
import { url } from "inspector";
import {
  CoinStatus,
  OperationStatus,
  ReserveRecord,
  ReserveRecordStatus,
} from "../db.js";
import {
  checkSuccessResponseOrThrow,
  readSuccessResponseJsonOrThrow,
  throwUnexpectedRequestError,
} from "../util/http.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { checkDbInvariant } from "../util/invariants.js";

const logger = new Logger("operations/peer-to-peer.ts");

export interface PeerCoinSelection {
  exchangeBaseUrl: string;

  /**
   * Info of Coins that were selected.
   */
  coins: {
    coinPub: string;
    coinPriv: string;
    contribution: AmountString;
    denomPubHash: string;
    denomSig: UnblindedSignature;
  }[];

  /**
   * How much of the deposit fees is the customer paying?
   */
  depositFees: AmountJson;
}

interface CoinInfo {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  coinPriv: string;

  /**
   * Deposit fee for the coin.
   */
  feeDeposit: AmountJson;

  value: AmountJson;

  denomPubHash: string;

  denomSig: UnblindedSignature;
}

export async function initiatePeerToPeerPush(
  ws: InternalWalletState,
  req: InitiatePeerPushPaymentRequest,
): Promise<InitiatePeerPushPaymentResponse> {
  const instructedAmount = Amounts.parseOrThrow(req.amount);
  const coinSelRes: PeerCoinSelection | undefined = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      coins: x.coins,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const exchanges = await tx.exchanges.iter().toArray();
      for (const exch of exchanges) {
        if (exch.detailsPointer?.currency !== instructedAmount.currency) {
          continue;
        }
        const coins = (
          await tx.coins.indexes.byBaseUrl.getAll(exch.baseUrl)
        ).filter((x) => x.status === CoinStatus.Fresh);
        const coinInfos: CoinInfo[] = [];
        for (const coin of coins) {
          const denom = await ws.getDenomInfo(
            ws,
            tx,
            coin.exchangeBaseUrl,
            coin.denomPubHash,
          );
          if (!denom) {
            throw Error("denom not found");
          }
          coinInfos.push({
            coinPub: coin.coinPub,
            feeDeposit: denom.feeDeposit,
            value: denom.value,
            denomPubHash: denom.denomPubHash,
            coinPriv: coin.coinPriv,
            denomSig: coin.denomSig,
          });
        }
        if (coinInfos.length === 0) {
          continue;
        }
        coinInfos.sort(
          (o1, o2) =>
            -Amounts.cmp(o1.value, o2.value) ||
            strcmp(o1.denomPubHash, o2.denomPubHash),
        );
        let amountAcc = Amounts.getZero(instructedAmount.currency);
        let depositFeesAcc = Amounts.getZero(instructedAmount.currency);
        const resCoins: {
          coinPub: string;
          coinPriv: string;
          contribution: AmountString;
          denomPubHash: string;
          denomSig: UnblindedSignature;
        }[] = [];
        for (const coin of coinInfos) {
          if (Amounts.cmp(amountAcc, instructedAmount) >= 0) {
            const res: PeerCoinSelection = {
              exchangeBaseUrl: exch.baseUrl,
              coins: resCoins,
              depositFees: depositFeesAcc,
            };
            return res;
          }
          const gap = Amounts.add(
            coin.feeDeposit,
            Amounts.sub(instructedAmount, amountAcc).amount,
          ).amount;
          const contrib = Amounts.min(gap, coin.value);
          amountAcc = Amounts.add(
            amountAcc,
            Amounts.sub(contrib, coin.feeDeposit).amount,
          ).amount;
          depositFeesAcc = Amounts.add(depositFeesAcc, coin.feeDeposit).amount;
          resCoins.push({
            coinPriv: coin.coinPriv,
            coinPub: coin.coinPub,
            contribution: Amounts.stringify(contrib),
            denomPubHash: coin.denomPubHash,
            denomSig: coin.denomSig,
          });
        }
        continue;
      }
      return undefined;
    });
  logger.info(`selected p2p coins: ${j2s(coinSelRes)}`);

  if (!coinSelRes) {
    throw Error("insufficient balance");
  }

  const pursePair = await ws.cryptoApi.createEddsaKeypair({});
  const mergePair = await ws.cryptoApi.createEddsaKeypair({});

  const purseExpiration: TalerProtocolTimestamp = AbsoluteTime.toTimestamp(
    AbsoluteTime.addDuration(
      AbsoluteTime.now(),
      Duration.fromSpec({ days: 2 }),
    ),
  );

  const contractTerms = {
    ...req.partialContractTerms,
    purse_expiration: purseExpiration,
    amount: req.amount,
  };

  const hContractTerms = ContractTermsUtil.hashContractTerms(contractTerms);

  const purseSigResp = await ws.cryptoApi.signPurseCreation({
    hContractTerms,
    mergePub: mergePair.pub,
    minAge: 0,
    purseAmount: Amounts.stringify(instructedAmount),
    purseExpiration,
    pursePriv: pursePair.priv,
  });

  const depositSigsResp = await ws.cryptoApi.signPurseDeposits({
    exchangeBaseUrl: coinSelRes.exchangeBaseUrl,
    pursePub: pursePair.pub,
    coins: coinSelRes.coins,
  });

  const createPurseUrl = new URL(
    `purses/${pursePair.pub}/create`,
    coinSelRes.exchangeBaseUrl,
  );

  const econtractResp = await ws.cryptoApi.encryptContractForMerge({
    contractTerms,
    mergePriv: mergePair.priv,
    pursePriv: pursePair.priv,
    pursePub: pursePair.pub,
  });

  const httpResp = await ws.http.postJson(createPurseUrl.href, {
    amount: Amounts.stringify(instructedAmount),
    merge_pub: mergePair.pub,
    purse_sig: purseSigResp.sig,
    h_contract_terms: hContractTerms,
    purse_expiration: purseExpiration,
    deposits: depositSigsResp.deposits,
    min_age: 0,
    econtract: econtractResp.econtract,
  });

  const resp = await httpResp.json();

  logger.info(`resp: ${j2s(resp)}`);

  if (httpResp.status !== 200) {
    throw Error("got error response from exchange");
  }

  return {
    contractPriv: econtractResp.contractPriv,
    mergePriv: mergePair.priv,
    pursePub: pursePair.pub,
    exchangeBaseUrl: coinSelRes.exchangeBaseUrl,
  };
}

interface ExchangePurseStatus {
  balance: AmountString;
}

export const codecForExchangePurseStatus = (): Codec<ExchangePurseStatus> =>
  buildCodecForObject<ExchangePurseStatus>()
    .property("balance", codecForAmountString())
    .build("ExchangePurseStatus");

export async function checkPeerPushPayment(
  ws: InternalWalletState,
  req: CheckPeerPushPaymentRequest,
): Promise<CheckPeerPushPaymentResponse> {
  const getPurseUrl = new URL(
    `purses/${req.pursePub}/deposit`,
    req.exchangeBaseUrl,
  );

  const contractPub = encodeCrock(
    eddsaGetPublic(decodeCrock(req.contractPriv)),
  );

  const purseHttpResp = await ws.http.get(getPurseUrl.href);

  const purseStatus = await readSuccessResponseJsonOrThrow(
    purseHttpResp,
    codecForExchangePurseStatus(),
  );

  const getContractUrl = new URL(
    `contracts/${contractPub}`,
    req.exchangeBaseUrl,
  );

  const contractHttpResp = await ws.http.get(getContractUrl.href);

  const contractResp = await readSuccessResponseJsonOrThrow(
    contractHttpResp,
    codecForExchangeGetContractResponse(),
  );

  const dec = await ws.cryptoApi.decryptContractForMerge({
    ciphertext: contractResp.econtract,
    contractPriv: req.contractPriv,
    pursePub: req.pursePub,
  });

  await ws.db
    .mktx((x) => ({
      peerPushPaymentIncoming: x.peerPushPaymentIncoming,
    }))
    .runReadWrite(async (tx) => {
      await tx.peerPushPaymentIncoming.add({
        contractPriv: req.contractPriv,
        exchangeBaseUrl: req.exchangeBaseUrl,
        mergePriv: dec.mergePriv,
        pursePub: req.pursePub,
        timestampAccepted: TalerProtocolTimestamp.now(),
        contractTerms: dec.contractTerms,
      });
    });

  return {
    amount: purseStatus.balance,
    contractTerms: dec.contractTerms,
  };
}

export function talerPaytoFromExchangeReserve(
  exchangeBaseUrl: string,
  reservePub: string,
): string {
  const url = new URL(exchangeBaseUrl);
  let proto: string;
  if (url.protocol === "http:") {
    proto = "taler+http";
  } else if (url.protocol === "https:") {
    proto = "taler";
  } else {
    throw Error(`unsupported exchange base URL protocol (${url.protocol})`);
  }

  let path = url.pathname;
  if (!path.endsWith("/")) {
    path = path + "/";
  }

  return `payto://${proto}/${url.host}${url.pathname}${reservePub}`;
}

export async function acceptPeerPushPayment(
  ws: InternalWalletState,
  req: AcceptPeerPushPaymentRequest,
) {
  const peerInc = await ws.db
    .mktx((x) => ({ peerPushPaymentIncoming: x.peerPushPaymentIncoming }))
    .runReadOnly(async (tx) => {
      return tx.peerPushPaymentIncoming.get([
        req.exchangeBaseUrl,
        req.pursePub,
      ]);
    });

  if (!peerInc) {
    throw Error("can't accept unknown incoming p2p push payment");
  }

  const amount = Amounts.parseOrThrow(peerInc.contractTerms.amount);

  // We have to create the key pair outside of the transaction,
  // due to the async crypto API.
  const newReservePair = await ws.cryptoApi.createEddsaKeypair({});

  const reserve: ReserveRecord | undefined = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      reserves: x.reserves,
    }))
    .runReadWrite(async (tx) => {
      const ex = await tx.exchanges.get(req.exchangeBaseUrl);
      checkDbInvariant(!!ex);
      if (ex.currentMergeReservePub) {
        return await tx.reserves.get(ex.currentMergeReservePub);
      }
      const rec: ReserveRecord = {
        exchangeBaseUrl: req.exchangeBaseUrl,
        // FIXME: field will be removed in the future, folded into withdrawal/p2p record.
        reserveStatus: ReserveRecordStatus.Dormant,
        timestampCreated: TalerProtocolTimestamp.now(),
        instructedAmount: Amounts.getZero(amount.currency),
        currency: amount.currency,
        reservePub: newReservePair.pub,
        reservePriv: newReservePair.priv,
        timestampBankConfirmed: undefined,
        timestampReserveInfoPosted: undefined,
        // FIXME!
        initialDenomSel: undefined as any,
        // FIXME!
        initialWithdrawalGroupId: "",
        initialWithdrawalStarted: false,
        lastError: undefined,
        operationStatus: OperationStatus.Pending,
        retryInfo: undefined,
        bankInfo: undefined,
        restrictAge: undefined,
        senderWire: undefined,
      };
      await tx.reserves.put(rec);
      return rec;
    });

  if (!reserve) {
    throw Error("can't create reserve");
  }

  const mergeTimestamp = TalerProtocolTimestamp.now();

  const reservePayto = talerPaytoFromExchangeReserve(
    reserve.exchangeBaseUrl,
    reserve.reservePub,
  );

  const sigRes = await ws.cryptoApi.signPurseMerge({
    contractTermsHash: ContractTermsUtil.hashContractTerms(
      peerInc.contractTerms,
    ),
    flags: WalletAccountMergeFlags.MergeFullyPaidPurse,
    mergePriv: peerInc.mergePriv,
    mergeTimestamp: mergeTimestamp,
    purseAmount: Amounts.stringify(amount),
    purseExpiration: peerInc.contractTerms.purse_expiration,
    purseFee: Amounts.stringify(Amounts.getZero(amount.currency)),
    pursePub: peerInc.pursePub,
    reservePayto,
    reservePriv: reserve.reservePriv,
  });

  const mergePurseUrl = new URL(
    `purses/${req.pursePub}/merge`,
    req.exchangeBaseUrl,
  );

  const mergeReq: ExchangePurseMergeRequest = {
    payto_uri: reservePayto,
    merge_timestamp: mergeTimestamp,
    merge_sig: sigRes.mergeSig,
    reserve_sig: sigRes.accountSig,
  };

  const mergeHttpReq = await ws.http.postJson(mergePurseUrl.href, mergeReq);

  const res = await readSuccessResponseJsonOrThrow(mergeHttpReq, codecForAny());
  logger.info(`merge result: ${j2s(res)}`);
}
