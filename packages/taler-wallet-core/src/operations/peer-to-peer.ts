/*
 This file is part of GNU Taler
 (C) 2022 GNUnet e.V.

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
  AcceptPeerPullPaymentRequest,
  AcceptPeerPushPaymentRequest,
  AmountJson,
  AmountLike,
  Amounts,
  AmountString,
  buildCodecForObject,
  CheckPeerPullPaymentRequest,
  CheckPeerPullPaymentResponse,
  CheckPeerPushPaymentRequest,
  CheckPeerPushPaymentResponse,
  Codec,
  codecForAmountString,
  codecForAny,
  codecForExchangeGetContractResponse,
  CoinPublicKey,
  constructPayPullUri,
  constructPayPushUri,
  ContractTermsUtil,
  decodeCrock,
  Duration,
  eddsaGetPublic,
  encodeCrock,
  ExchangePurseDeposits,
  ExchangePurseMergeRequest,
  ExchangeReservePurseRequest,
  getRandomBytes,
  InitiatePeerPullPaymentRequest,
  InitiatePeerPullPaymentResponse,
  InitiatePeerPushPaymentRequest,
  InitiatePeerPushPaymentResponse,
  j2s,
  Logger,
  parsePayPullUri,
  parsePayPushUri,
  RefreshReason,
  strcmp,
  TalerProtocolTimestamp,
  UnblindedSignature,
  WalletAccountMergeFlags,
} from "@gnu-taler/taler-util";
import {
  CoinStatus,
  MergeReserveInfo,
  ReserveRecordStatus,
  WalletStoresV1,
} from "../db.js";
import { readSuccessResponseJsonOrThrow } from "../util/http.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { checkDbInvariant } from "../util/invariants.js";
import { internalCreateWithdrawalGroup } from "./withdraw.js";
import { GetReadOnlyAccess } from "../util/query.js";
import { createRefreshGroup } from "./refresh.js";
import { updateExchangeFromUrl } from "./exchanges.js";

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

export async function selectPeerCoins(
  ws: InternalWalletState,
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    denominations: typeof WalletStoresV1.denominations;
    coins: typeof WalletStoresV1.coins;
  }>,
  instructedAmount: AmountJson,
): Promise<PeerCoinSelection | undefined> {
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
}

export async function initiatePeerToPeerPush(
  ws: InternalWalletState,
  req: InitiatePeerPushPaymentRequest,
): Promise<InitiatePeerPushPaymentResponse> {
  // FIXME: actually create a record for retries here!
  const instructedAmount = Amounts.parseOrThrow(req.amount);
  const coinSelRes: PeerCoinSelection | undefined = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      coins: x.coins,
      denominations: x.denominations,
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const sel = await selectPeerCoins(ws, tx, instructedAmount);
      if (!sel) {
        return undefined;
      }

      const pubs: CoinPublicKey[] = [];
      for (const c of sel.coins) {
        const coin = await tx.coins.get(c.coinPub);
        checkDbInvariant(!!coin);
        coin.currentAmount = Amounts.sub(
          coin.currentAmount,
          Amounts.parseOrThrow(c.contribution),
        ).amount;
        await tx.coins.put(coin);
      }

      await createRefreshGroup(ws, tx, pubs, RefreshReason.Pay);

      return sel;
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
    talerUri: constructPayPushUri({
      exchangeBaseUrl: coinSelRes.exchangeBaseUrl,
      contractPriv: econtractResp.contractPriv,
    }),
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
  // FIXME: Check if existing record exists!

  const uri = parsePayPushUri(req.talerUri);

  if (!uri) {
    throw Error("got invalid taler://pay-push URI");
  }

  const exchangeBaseUrl = uri.exchangeBaseUrl;

  await updateExchangeFromUrl(ws, exchangeBaseUrl);

  const contractPriv = uri.contractPriv;
  const contractPub = encodeCrock(eddsaGetPublic(decodeCrock(contractPriv)));

  const getContractUrl = new URL(`contracts/${contractPub}`, exchangeBaseUrl);

  const contractHttpResp = await ws.http.get(getContractUrl.href);

  const contractResp = await readSuccessResponseJsonOrThrow(
    contractHttpResp,
    codecForExchangeGetContractResponse(),
  );

  const pursePub = contractResp.purse_pub;

  const dec = await ws.cryptoApi.decryptContractForMerge({
    ciphertext: contractResp.econtract,
    contractPriv: contractPriv,
    pursePub: pursePub,
  });

  const getPurseUrl = new URL(`purses/${pursePub}/deposit`, exchangeBaseUrl);

  const purseHttpResp = await ws.http.get(getPurseUrl.href);

  const purseStatus = await readSuccessResponseJsonOrThrow(
    purseHttpResp,
    codecForExchangePurseStatus(),
  );

  const peerPushPaymentIncomingId = encodeCrock(getRandomBytes(32));

  await ws.db
    .mktx((x) => ({
      peerPushPaymentIncoming: x.peerPushPaymentIncoming,
    }))
    .runReadWrite(async (tx) => {
      await tx.peerPushPaymentIncoming.add({
        peerPushPaymentIncomingId,
        contractPriv: contractPriv,
        exchangeBaseUrl: exchangeBaseUrl,
        mergePriv: dec.mergePriv,
        pursePub: pursePub,
        timestamp: TalerProtocolTimestamp.now(),
        contractTerms: dec.contractTerms,
      });
    });

  return {
    amount: purseStatus.balance,
    contractTerms: dec.contractTerms,
    peerPushPaymentIncomingId,
  };
}

export function talerPaytoFromExchangeReserve(
  exchangeBaseUrl: string,
  reservePub: string,
): string {
  const url = new URL(exchangeBaseUrl);
  let proto: string;
  if (url.protocol === "http:") {
    proto = "taler-reserve-http";
  } else if (url.protocol === "https:") {
    proto = "taler-reserve";
  } else {
    throw Error(`unsupported exchange base URL protocol (${url.protocol})`);
  }

  let path = url.pathname;
  if (!path.endsWith("/")) {
    path = path + "/";
  }

  return `payto://${proto}/${url.host}${url.pathname}${reservePub}`;
}

async function getMergeReserveInfo(
  ws: InternalWalletState,
  req: {
    exchangeBaseUrl: string;
  },
): Promise<MergeReserveInfo> {
  // We have to eagerly create the key pair outside of the transaction,
  // due to the async crypto API.
  const newReservePair = await ws.cryptoApi.createEddsaKeypair({});

  const mergeReserveInfo: MergeReserveInfo = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadWrite(async (tx) => {
      const ex = await tx.exchanges.get(req.exchangeBaseUrl);
      checkDbInvariant(!!ex);
      if (ex.currentMergeReserveInfo) {
        return ex.currentMergeReserveInfo;
      }
      await tx.exchanges.put(ex);
      ex.currentMergeReserveInfo = {
        reservePriv: newReservePair.priv,
        reservePub: newReservePair.pub,
      };
      return ex.currentMergeReserveInfo;
    });

  return mergeReserveInfo;
}

export async function acceptPeerPushPayment(
  ws: InternalWalletState,
  req: AcceptPeerPushPaymentRequest,
) {
  const peerInc = await ws.db
    .mktx((x) => ({ peerPushPaymentIncoming: x.peerPushPaymentIncoming }))
    .runReadOnly(async (tx) => {
      return tx.peerPushPaymentIncoming.get(req.peerPushPaymentIncomingId);
    });

  if (!peerInc) {
    throw Error(
      `can't accept unknown incoming p2p push payment (${req.peerPushPaymentIncomingId})`,
    );
  }

  await updateExchangeFromUrl(ws, peerInc.exchangeBaseUrl);

  const amount = Amounts.parseOrThrow(peerInc.contractTerms.amount);

  const mergeReserveInfo = await getMergeReserveInfo(ws, {
    exchangeBaseUrl: peerInc.exchangeBaseUrl,
  });

  const mergeTimestamp = TalerProtocolTimestamp.now();

  const reservePayto = talerPaytoFromExchangeReserve(
    peerInc.exchangeBaseUrl,
    mergeReserveInfo.reservePub,
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
    reservePriv: mergeReserveInfo.reservePriv,
  });

  const mergePurseUrl = new URL(
    `purses/${peerInc.pursePub}/merge`,
    peerInc.exchangeBaseUrl,
  );

  const mergeReq: ExchangePurseMergeRequest = {
    payto_uri: reservePayto,
    merge_timestamp: mergeTimestamp,
    merge_sig: sigRes.mergeSig,
    reserve_sig: sigRes.accountSig,
  };

  const mergeHttpReq = await ws.http.postJson(mergePurseUrl.href, mergeReq);

  logger.info(`merge request: ${j2s(mergeReq)}`);
  const res = await readSuccessResponseJsonOrThrow(mergeHttpReq, codecForAny());
  logger.info(`merge response: ${j2s(res)}`);

  await internalCreateWithdrawalGroup(ws, {
    amount,
    exchangeBaseUrl: peerInc.exchangeBaseUrl,
    reserveStatus: ReserveRecordStatus.QueryingStatus,
    reserveKeyPair: {
      priv: mergeReserveInfo.reservePriv,
      pub: mergeReserveInfo.reservePub,
    },
  });
}

/**
 * FIXME: Bad name!
 */
export async function acceptPeerPullPayment(
  ws: InternalWalletState,
  req: AcceptPeerPullPaymentRequest,
) {
  const peerPullInc = await ws.db
    .mktx((x) => ({ peerPullPaymentIncoming: x.peerPullPaymentIncoming }))
    .runReadOnly(async (tx) => {
      return tx.peerPullPaymentIncoming.get(req.peerPullPaymentIncomingId);
    });

  if (!peerPullInc) {
    throw Error(
      `can't accept unknown incoming p2p pull payment (${req.peerPullPaymentIncomingId})`,
    );
  }

  const instructedAmount = Amounts.parseOrThrow(
    peerPullInc.contractTerms.amount,
  );
  const coinSelRes: PeerCoinSelection | undefined = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      coins: x.coins,
      denominations: x.denominations,
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const sel = await selectPeerCoins(ws, tx, instructedAmount);
      if (!sel) {
        return undefined;
      }

      const pubs: CoinPublicKey[] = [];
      for (const c of sel.coins) {
        const coin = await tx.coins.get(c.coinPub);
        checkDbInvariant(!!coin);
        coin.currentAmount = Amounts.sub(
          coin.currentAmount,
          Amounts.parseOrThrow(c.contribution),
        ).amount;
        await tx.coins.put(coin);
      }

      await createRefreshGroup(ws, tx, pubs, RefreshReason.Pay);

      return sel;
    });
  logger.info(`selected p2p coins: ${j2s(coinSelRes)}`);

  if (!coinSelRes) {
    throw Error("insufficient balance");
  }

  const pursePub = peerPullInc.pursePub;

  const depositSigsResp = await ws.cryptoApi.signPurseDeposits({
    exchangeBaseUrl: coinSelRes.exchangeBaseUrl,
    pursePub,
    coins: coinSelRes.coins,
  });

  const purseDepositUrl = new URL(
    `purses/${pursePub}/deposit`,
    coinSelRes.exchangeBaseUrl,
  );

  const depositPayload: ExchangePurseDeposits = {
    deposits: depositSigsResp.deposits,
  };

  const httpResp = await ws.http.postJson(purseDepositUrl.href, depositPayload);
  const resp = await readSuccessResponseJsonOrThrow(httpResp, codecForAny());
  logger.trace(`purse deposit response: ${j2s(resp)}`);
}

export async function checkPeerPullPayment(
  ws: InternalWalletState,
  req: CheckPeerPullPaymentRequest,
): Promise<CheckPeerPullPaymentResponse> {
  const uri = parsePayPullUri(req.talerUri);

  if (!uri) {
    throw Error("got invalid taler://pay-push URI");
  }

  const exchangeBaseUrl = uri.exchangeBaseUrl;
  const contractPriv = uri.contractPriv;
  const contractPub = encodeCrock(eddsaGetPublic(decodeCrock(contractPriv)));

  const getContractUrl = new URL(`contracts/${contractPub}`, exchangeBaseUrl);

  const contractHttpResp = await ws.http.get(getContractUrl.href);

  const contractResp = await readSuccessResponseJsonOrThrow(
    contractHttpResp,
    codecForExchangeGetContractResponse(),
  );

  const pursePub = contractResp.purse_pub;

  const dec = await ws.cryptoApi.decryptContractForDeposit({
    ciphertext: contractResp.econtract,
    contractPriv: contractPriv,
    pursePub: pursePub,
  });

  const getPurseUrl = new URL(`purses/${pursePub}/merge`, exchangeBaseUrl);

  const purseHttpResp = await ws.http.get(getPurseUrl.href);

  const purseStatus = await readSuccessResponseJsonOrThrow(
    purseHttpResp,
    codecForExchangePurseStatus(),
  );

  const peerPullPaymentIncomingId = encodeCrock(getRandomBytes(32));

  await ws.db
    .mktx((x) => ({
      peerPullPaymentIncoming: x.peerPullPaymentIncoming,
    }))
    .runReadWrite(async (tx) => {
      await tx.peerPullPaymentIncoming.add({
        peerPullPaymentIncomingId,
        contractPriv: contractPriv,
        exchangeBaseUrl: exchangeBaseUrl,
        pursePub: pursePub,
        timestamp: TalerProtocolTimestamp.now(),
        contractTerms: dec.contractTerms,
      });
    });

  return {
    amount: purseStatus.balance,
    contractTerms: dec.contractTerms,
    peerPullPaymentIncomingId,
  };
}

export async function initiatePeerRequestForPay(
  ws: InternalWalletState,
  req: InitiatePeerPullPaymentRequest,
): Promise<InitiatePeerPullPaymentResponse> {
  const mergeReserveInfo = await getMergeReserveInfo(ws, {
    exchangeBaseUrl: req.exchangeBaseUrl,
  });

  const mergeTimestamp = TalerProtocolTimestamp.now();

  const pursePair = await ws.cryptoApi.createEddsaKeypair({});
  const mergePair = await ws.cryptoApi.createEddsaKeypair({});

  const purseExpiration: TalerProtocolTimestamp = AbsoluteTime.toTimestamp(
    AbsoluteTime.addDuration(
      AbsoluteTime.now(),
      Duration.fromSpec({ days: 2 }),
    ),
  );

  const reservePayto = talerPaytoFromExchangeReserve(
    req.exchangeBaseUrl,
    mergeReserveInfo.reservePub,
  );

  const contractTerms = {
    ...req.partialContractTerms,
    amount: req.amount,
    purse_expiration: purseExpiration,
  };

  const econtractResp = await ws.cryptoApi.encryptContractForDeposit({
    contractTerms,
    pursePriv: pursePair.priv,
    pursePub: pursePair.pub,
  });

  const hContractTerms = ContractTermsUtil.hashContractTerms(contractTerms);

  const purseFee = Amounts.stringify(
    Amounts.getZero(Amounts.parseOrThrow(req.amount).currency),
  );

  const sigRes = await ws.cryptoApi.signReservePurseCreate({
    contractTermsHash: hContractTerms,
    flags: WalletAccountMergeFlags.CreateWithPurseFee,
    mergePriv: mergePair.priv,
    mergeTimestamp: mergeTimestamp,
    purseAmount: req.amount,
    purseExpiration: purseExpiration,
    purseFee: purseFee,
    pursePriv: pursePair.priv,
    pursePub: pursePair.pub,
    reservePayto,
    reservePriv: mergeReserveInfo.reservePriv,
  });

  await ws.db
    .mktx((x) => ({
      peerPullPaymentInitiation: x.peerPullPaymentInitiation,
    }))
    .runReadWrite(async (tx) => {
      await tx.peerPullPaymentInitiation.put({
        amount: req.amount,
        contractTerms,
        exchangeBaseUrl: req.exchangeBaseUrl,
        pursePriv: pursePair.priv,
        pursePub: pursePair.pub,
      });
    });

  const reservePurseReqBody: ExchangeReservePurseRequest = {
    merge_sig: sigRes.mergeSig,
    merge_timestamp: mergeTimestamp,
    h_contract_terms: hContractTerms,
    merge_pub: mergePair.pub,
    min_age: 0,
    purse_expiration: purseExpiration,
    purse_fee: purseFee,
    purse_pub: pursePair.pub,
    purse_sig: sigRes.purseSig,
    purse_value: req.amount,
    reserve_sig: sigRes.accountSig,
    econtract: econtractResp.econtract,
  };

  logger.info(`reserve purse request: ${j2s(reservePurseReqBody)}`);

  const reservePurseMergeUrl = new URL(
    `reserves/${mergeReserveInfo.reservePub}/purse`,
    req.exchangeBaseUrl,
  );

  const httpResp = await ws.http.postJson(
    reservePurseMergeUrl.href,
    reservePurseReqBody,
  );

  const resp = await readSuccessResponseJsonOrThrow(httpResp, codecForAny());

  logger.info(`reserve merge response: ${j2s(resp)}`);

  await internalCreateWithdrawalGroup(ws, {
    amount: Amounts.parseOrThrow(req.amount),
    exchangeBaseUrl: req.exchangeBaseUrl,
    reserveStatus: ReserveRecordStatus.QueryingStatus,
    reserveKeyPair: {
      priv: mergeReserveInfo.reservePriv,
      pub: mergeReserveInfo.reservePub,
    },
  });

  return {
    talerUri: constructPayPullUri({
      exchangeBaseUrl: req.exchangeBaseUrl,
      contractPriv: econtractResp.contractPriv,
    }),
  };
}
