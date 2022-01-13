/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  AmountJson,
  Amounts,
  buildCodecForObject,
  canonicalJson,
  Codec,
  codecForString,
  codecForTimestamp,
  codecOptional,
  ContractTerms,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  DenomKeyType,
  durationFromSpec,
  GetFeeForDepositRequest,
  getTimestampNow,
  Logger,
  NotificationType,
  parsePaytoUri,
  TalerErrorDetails,
  Timestamp,
  timestampAddDuration,
  timestampIsBetween,
  timestampTruncateToSecond,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
  URL,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "../common.js";
import { kdf } from "@gnu-taler/taler-util";
import {
  encodeCrock,
  getRandomBytes,
  stringToBytes,
} from "@gnu-taler/taler-util";
import { DepositGroupRecord, OperationStatus } from "../db.js";
import { guardOperationException } from "../errors.js";
import { PayCoinSelection, selectPayCoins } from "../util/coinSelection.js";
import { readSuccessResponseJsonOrThrow } from "../util/http.js";
import { initRetryInfo, updateRetryInfoTimeout } from "../util/retries.js";
import { getExchangeDetails } from "./exchanges.js";
import {
  applyCoinSpend,
  extractContractData,
  generateDepositPermissions,
  getCandidatePayCoins,
  getTotalPaymentCost,
  hashWire,
  hashWireLegacy,
} from "./pay.js";
import { getTotalRefreshCost } from "./refresh.js";

/**
 * Logger.
 */
const logger = new Logger("deposits.ts");

interface DepositSuccess {
  // Optional base URL of the exchange for looking up wire transfers
  // associated with this transaction.  If not given,
  // the base URL is the same as the one used for this request.
  // Can be used if the base URL for /transactions/ differs from that
  // for /coins/, i.e. for load balancing.  Clients SHOULD
  // respect the transaction_base_url if provided.  Any HTTP server
  // belonging to an exchange MUST generate a 307 or 308 redirection
  // to the correct base URL should a client uses the wrong base
  // URL, or if the base URL has changed since the deposit.
  transaction_base_url?: string;

  // timestamp when the deposit was received by the exchange.
  exchange_timestamp: Timestamp;

  // the EdDSA signature of TALER_DepositConfirmationPS using a current
  // signing key of the exchange affirming the successful
  // deposit and that the exchange will transfer the funds after the refund
  // deadline, or as soon as possible if the refund deadline is zero.
  exchange_sig: string;

  // public EdDSA key of the exchange that was used to
  // generate the signature.
  // Should match one of the exchange's signing keys from /keys.  It is given
  // explicitly as the client might otherwise be confused by clock skew as to
  // which signing key was used.
  exchange_pub: string;
}

const codecForDepositSuccess = (): Codec<DepositSuccess> =>
  buildCodecForObject<DepositSuccess>()
    .property("exchange_pub", codecForString())
    .property("exchange_sig", codecForString())
    .property("exchange_timestamp", codecForTimestamp)
    .property("transaction_base_url", codecOptional(codecForString()))
    .build("DepositSuccess");

async function resetDepositGroupRetry(
  ws: InternalWalletState,
  depositGroupId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      depositGroups: x.depositGroups,
    }))
    .runReadWrite(async (tx) => {
      const x = await tx.depositGroups.get(depositGroupId);
      if (x) {
        x.retryInfo = initRetryInfo();
        await tx.depositGroups.put(x);
      }
    });
}

async function incrementDepositRetry(
  ws: InternalWalletState,
  depositGroupId: string,
  err: TalerErrorDetails | undefined,
): Promise<void> {
  await ws.db
    .mktx((x) => ({ depositGroups: x.depositGroups }))
    .runReadWrite(async (tx) => {
      const r = await tx.depositGroups.get(depositGroupId);
      if (!r) {
        return;
      }
      if (!r.retryInfo) {
        return;
      }
      r.retryInfo.retryCounter++;
      updateRetryInfoTimeout(r.retryInfo);
      r.lastError = err;
      await tx.depositGroups.put(r);
    });
  if (err) {
    ws.notify({ type: NotificationType.DepositOperationError, error: err });
  }
}

export async function processDepositGroup(
  ws: InternalWalletState,
  depositGroupId: string,
  forceNow = false,
): Promise<void> {
  await ws.memoProcessDeposit.memo(depositGroupId, async () => {
    const onOpErr = (e: TalerErrorDetails): Promise<void> =>
      incrementDepositRetry(ws, depositGroupId, e);
    return await guardOperationException(
      async () => await processDepositGroupImpl(ws, depositGroupId, forceNow),
      onOpErr,
    );
  });
}

async function processDepositGroupImpl(
  ws: InternalWalletState,
  depositGroupId: string,
  forceNow: boolean = false,
): Promise<void> {
  if (forceNow) {
    await resetDepositGroupRetry(ws, depositGroupId);
  }
  const depositGroup = await ws.db
    .mktx((x) => ({
      depositGroups: x.depositGroups,
    }))
    .runReadOnly(async (tx) => {
      return tx.depositGroups.get(depositGroupId);
    });
  if (!depositGroup) {
    logger.warn(`deposit group ${depositGroupId} not found`);
    return;
  }
  if (depositGroup.timestampFinished) {
    logger.trace(`deposit group ${depositGroupId} already finished`);
    return;
  }

  const contractData = extractContractData(
    depositGroup.contractTermsRaw,
    depositGroup.contractTermsHash,
    "",
  );

  const depositPermissions = await generateDepositPermissions(
    ws,
    depositGroup.payCoinSelection,
    contractData,
  );

  for (let i = 0; i < depositPermissions.length; i++) {
    if (depositGroup.depositedPerCoin[i]) {
      continue;
    }
    const perm = depositPermissions[i];
    let requestBody: any;
    if (
      typeof perm.ub_sig === "string" ||
      perm.ub_sig.cipher === DenomKeyType.LegacyRsa
    ) {
      // Legacy request
      logger.info("creating legacy deposit request");
      const wireHash = hashWireLegacy(
        depositGroup.wire.payto_uri,
        depositGroup.wire.salt,
      );
      requestBody = {
        contribution: Amounts.stringify(perm.contribution),
        wire: depositGroup.wire,
        h_wire: wireHash,
        h_contract_terms: depositGroup.contractTermsHash,
        ub_sig: perm.ub_sig,
        timestamp: depositGroup.contractTermsRaw.timestamp,
        wire_transfer_deadline:
          depositGroup.contractTermsRaw.wire_transfer_deadline,
        refund_deadline: depositGroup.contractTermsRaw.refund_deadline,
        coin_sig: perm.coin_sig,
        denom_pub_hash: perm.h_denom,
        merchant_pub: depositGroup.merchantPub,
      };
    } else {
      logger.info("creating v10 deposit request");
      requestBody = {
        contribution: Amounts.stringify(perm.contribution),
        merchant_payto_uri: depositGroup.wire.payto_uri,
        wire_salt: depositGroup.wire.salt,
        h_contract_terms: depositGroup.contractTermsHash,
        ub_sig: perm.ub_sig,
        timestamp: depositGroup.contractTermsRaw.timestamp,
        wire_transfer_deadline:
          depositGroup.contractTermsRaw.wire_transfer_deadline,
        refund_deadline: depositGroup.contractTermsRaw.refund_deadline,
        coin_sig: perm.coin_sig,
        denom_pub_hash: perm.h_denom,
        merchant_pub: depositGroup.merchantPub,
      };
    }
    const url = new URL(`coins/${perm.coin_pub}/deposit`, perm.exchange_url);
    logger.info(`depositing to ${url}`);
    const httpResp = await ws.http.postJson(url.href, requestBody);
    await readSuccessResponseJsonOrThrow(httpResp, codecForDepositSuccess());
    await ws.db
      .mktx((x) => ({ depositGroups: x.depositGroups }))
      .runReadWrite(async (tx) => {
        const dg = await tx.depositGroups.get(depositGroupId);
        if (!dg) {
          return;
        }
        dg.depositedPerCoin[i] = true;
        await tx.depositGroups.put(dg);
      });
  }

  await ws.db
    .mktx((x) => ({
      depositGroups: x.depositGroups,
    }))
    .runReadWrite(async (tx) => {
      const dg = await tx.depositGroups.get(depositGroupId);
      if (!dg) {
        return;
      }
      let allDeposited = true;
      for (const d of depositGroup.depositedPerCoin) {
        if (!d) {
          allDeposited = false;
        }
      }
      if (allDeposited) {
        dg.timestampFinished = getTimestampNow();
        dg.operationStatus = OperationStatus.Finished;
        delete dg.lastError;
        delete dg.retryInfo;
        await tx.depositGroups.put(dg);
      }
    });
}

export async function trackDepositGroup(
  ws: InternalWalletState,
  req: TrackDepositGroupRequest,
): Promise<TrackDepositGroupResponse> {
  const responses: {
    status: number;
    body: any;
  }[] = [];
  const depositGroup = await ws.db
    .mktx((x) => ({
      depositGroups: x.depositGroups,
    }))
    .runReadOnly(async (tx) => {
      return tx.depositGroups.get(req.depositGroupId);
    });
  if (!depositGroup) {
    throw Error("deposit group not found");
  }
  const contractData = extractContractData(
    depositGroup.contractTermsRaw,
    depositGroup.contractTermsHash,
    "",
  );

  const depositPermissions = await generateDepositPermissions(
    ws,
    depositGroup.payCoinSelection,
    contractData,
  );

  const wireHash = depositGroup.contractTermsRaw.h_wire;

  for (const dp of depositPermissions) {
    const url = new URL(
      `deposits/${wireHash}/${depositGroup.merchantPub}/${depositGroup.contractTermsHash}/${dp.coin_pub}`,
      dp.exchange_url,
    );
    const sig = await ws.cryptoApi.signTrackTransaction({
      coinPub: dp.coin_pub,
      contractTermsHash: depositGroup.contractTermsHash,
      merchantPriv: depositGroup.merchantPriv,
      merchantPub: depositGroup.merchantPub,
      wireHash,
    });
    url.searchParams.set("merchant_sig", sig);
    const httpResp = await ws.http.get(url.href);
    const body = await httpResp.json();
    responses.push({
      body,
      status: httpResp.status,
    });
  }
  return {
    responses,
  };
}

export async function getFeeForDeposit(
  ws: InternalWalletState,
  req: GetFeeForDepositRequest,
): Promise<DepositFee> {
  const p = parsePaytoUri(req.depositPaytoUri);
  if (!p) {
    throw Error("invalid payto URI");
  }

  const amount = Amounts.parseOrThrow(req.amount);

  const exchangeInfos: { url: string; master_pub: string }[] = [];

  await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadOnly(async (tx) => {
      const allExchanges = await tx.exchanges.iter().toArray();
      for (const e of allExchanges) {
        const details = await getExchangeDetails(tx, e.baseUrl);
        if (!details || amount.currency !== details.currency) {
          continue;
        }
        exchangeInfos.push({
          master_pub: details.masterPublicKey,
          url: e.baseUrl,
        });
      }
    });

  const timestamp = getTimestampNow();
  const timestampRound = timestampTruncateToSecond(timestamp);
  // const noncePair = await ws.cryptoApi.createEddsaKeypair();
  // const merchantPair = await ws.cryptoApi.createEddsaKeypair();
  // const wireSalt = encodeCrock(getRandomBytes(16));
  // const wireHash = hashWire(req.depositPaytoUri, wireSalt);
  // const wireHashLegacy = hashWireLegacy(req.depositPaytoUri, wireSalt);
  const contractTerms: ContractTerms = {
    auditors: [],
    exchanges: exchangeInfos,
    amount: req.amount,
    max_fee: Amounts.stringify(amount),
    max_wire_fee: Amounts.stringify(amount),
    wire_method: p.targetType,
    timestamp: timestampRound,
    merchant_base_url: "",
    summary: "",
    nonce: "",
    wire_transfer_deadline: timestampRound,
    order_id: "",
    h_wire: "",
    pay_deadline: timestampAddDuration(
      timestampRound,
      durationFromSpec({ hours: 1 }),
    ),
    merchant: {
      name: "",
    },
    merchant_pub: "",
    refund_deadline: { t_ms: 0 },
  };

  const contractData = extractContractData(contractTerms, "", "");

  const candidates = await getCandidatePayCoins(ws, contractData);

  const payCoinSel = selectPayCoins({
    candidates,
    contractTermsAmount: contractData.amount,
    depositFeeLimit: contractData.maxDepositFee,
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: contractData.maxWireFee,
    prevPayCoins: [],
  });

  if (!payCoinSel) {
    throw Error("insufficient funds");
  }

  return await getTotalFeeForDepositAmount(
    ws,
    p.targetType,
    amount,
    payCoinSel,
  );
}

export async function createDepositGroup(
  ws: InternalWalletState,
  req: CreateDepositGroupRequest,
): Promise<CreateDepositGroupResponse> {
  const p = parsePaytoUri(req.depositPaytoUri);
  if (!p) {
    throw Error("invalid payto URI");
  }

  const amount = Amounts.parseOrThrow(req.amount);

  const exchangeInfos: { url: string; master_pub: string }[] = [];

  await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadOnly(async (tx) => {
      const allExchanges = await tx.exchanges.iter().toArray();
      for (const e of allExchanges) {
        const details = await getExchangeDetails(tx, e.baseUrl);
        if (!details || amount.currency !== details.currency) {
          continue;
        }
        exchangeInfos.push({
          master_pub: details.masterPublicKey,
          url: e.baseUrl,
        });
      }
    });

  const timestamp = getTimestampNow();
  const timestampRound = timestampTruncateToSecond(timestamp);
  const noncePair = await ws.cryptoApi.createEddsaKeypair();
  const merchantPair = await ws.cryptoApi.createEddsaKeypair();
  const wireSalt = encodeCrock(getRandomBytes(16));
  const wireHash = hashWire(req.depositPaytoUri, wireSalt);
  const wireHashLegacy = hashWireLegacy(req.depositPaytoUri, wireSalt);
  const contractTerms: ContractTerms = {
    auditors: [],
    exchanges: exchangeInfos,
    amount: req.amount,
    max_fee: Amounts.stringify(amount),
    max_wire_fee: Amounts.stringify(amount),
    wire_method: p.targetType,
    timestamp: timestampRound,
    merchant_base_url: "",
    summary: "",
    nonce: noncePair.pub,
    wire_transfer_deadline: timestampRound,
    order_id: "",
    // This is always the v2 wire hash, as we're the "merchant" and support v2.
    h_wire: wireHash,
    // Required for older exchanges.
    h_wire_legacy: wireHashLegacy,
    pay_deadline: timestampAddDuration(
      timestampRound,
      durationFromSpec({ hours: 1 }),
    ),
    merchant: {
      name: "",
    },
    merchant_pub: merchantPair.pub,
    refund_deadline: { t_ms: 0 },
  };

  const contractTermsHash = await ws.cryptoApi.hashString(
    canonicalJson(contractTerms),
  );

  const contractData = extractContractData(
    contractTerms,
    contractTermsHash,
    "",
  );

  const candidates = await getCandidatePayCoins(ws, {
    allowedAuditors: contractData.allowedAuditors,
    allowedExchanges: contractData.allowedExchanges,
    amount: contractData.amount,
    maxDepositFee: contractData.maxDepositFee,
    maxWireFee: contractData.maxWireFee,
    timestamp: contractData.timestamp,
    wireFeeAmortization: contractData.wireFeeAmortization,
    wireMethod: contractData.wireMethod,
  });

  const payCoinSel = selectPayCoins({
    candidates,
    contractTermsAmount: contractData.amount,
    depositFeeLimit: contractData.maxDepositFee,
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: contractData.maxWireFee,
    prevPayCoins: [],
  });

  if (!payCoinSel) {
    throw Error("insufficient funds");
  }

  const totalDepositCost = await getTotalPaymentCost(ws, payCoinSel);

  const depositGroupId = encodeCrock(getRandomBytes(32));

  const effectiveDepositAmount = await getEffectiveDepositAmount(
    ws,
    p.targetType,
    payCoinSel,
  );

  const depositGroup: DepositGroupRecord = {
    contractTermsHash,
    contractTermsRaw: contractTerms,
    depositGroupId,
    noncePriv: noncePair.priv,
    noncePub: noncePair.pub,
    timestampCreated: timestamp,
    timestampFinished: undefined,
    payCoinSelection: payCoinSel,
    payCoinSelectionUid: encodeCrock(getRandomBytes(32)),
    depositedPerCoin: payCoinSel.coinPubs.map(() => false),
    merchantPriv: merchantPair.priv,
    merchantPub: merchantPair.pub,
    totalPayCost: totalDepositCost,
    effectiveDepositAmount,
    wire: {
      payto_uri: req.depositPaytoUri,
      salt: wireSalt,
    },
    retryInfo: initRetryInfo(),
    operationStatus: OperationStatus.Pending,
    lastError: undefined,
  };

  await ws.db
    .mktx((x) => ({
      depositGroups: x.depositGroups,
      coins: x.coins,
      refreshGroups: x.refreshGroups,
      denominations: x.denominations,
    }))
    .runReadWrite(async (tx) => {
      await applyCoinSpend(
        ws,
        tx,
        payCoinSel,
        `deposit-group:${depositGroup.depositGroupId}`,
      );
      await tx.depositGroups.put(depositGroup);
    });

  return { depositGroupId };
}

/**
 * Get the amount that will be deposited on the merchant's bank
 * account, not considering aggregation.
 */
export async function getEffectiveDepositAmount(
  ws: InternalWalletState,
  wireType: string,
  pcs: PayCoinSelection,
): Promise<AmountJson> {
  const amt: AmountJson[] = [];
  const fees: AmountJson[] = [];
  const exchangeSet: Set<string> = new Set();

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadOnly(async (tx) => {
      for (let i = 0; i < pcs.coinPubs.length; i++) {
        const coin = await tx.coins.get(pcs.coinPubs[i]);
        if (!coin) {
          throw Error("can't calculate deposit amount, coin not found");
        }
        const denom = await ws.getDenomInfo(
          ws,
          tx,
          coin.exchangeBaseUrl,
          coin.denomPubHash,
        );
        if (!denom) {
          throw Error("can't find denomination to calculate deposit amount");
        }
        amt.push(pcs.coinContributions[i]);
        fees.push(denom.feeDeposit);
        exchangeSet.add(coin.exchangeBaseUrl);
      }

      for (const exchangeUrl of exchangeSet.values()) {
        const exchangeDetails = await getExchangeDetails(tx, exchangeUrl);
        if (!exchangeDetails) {
          continue;
        }

        // FIXME/NOTE: the line below _likely_ throws exception
        // about "find method not found on undefined" when the wireType
        // is not supported by the Exchange.
        const fee = exchangeDetails.wireInfo.feesForType[wireType].find((x) => {
          return timestampIsBetween(
            getTimestampNow(),
            x.startStamp,
            x.endStamp,
          );
        })?.wireFee;
        if (fee) {
          fees.push(fee);
        }
      }
    });
  return Amounts.sub(Amounts.sum(amt).amount, Amounts.sum(fees).amount).amount;
}

export interface DepositFee {
  coin: AmountJson;
  wire: AmountJson;
  refresh: AmountJson;
}

/**
 * Get the fee amount that will be charged when trying to deposit the
 * specified amount using the selected coins and the wire method.
 */
export async function getTotalFeeForDepositAmount(
  ws: InternalWalletState,
  wireType: string,
  total: AmountJson,
  pcs: PayCoinSelection,
): Promise<DepositFee> {
  const wireFee: AmountJson[] = [];
  const coinFee: AmountJson[] = [];
  const refreshFee: AmountJson[] = [];
  const exchangeSet: Set<string> = new Set();

  // let acc: AmountJson = Amounts.getZero(total.currency);

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadOnly(async (tx) => {
      for (let i = 0; i < pcs.coinPubs.length; i++) {
        const coin = await tx.coins.get(pcs.coinPubs[i]);
        if (!coin) {
          throw Error("can't calculate deposit amount, coin not found");
        }
        const denom = await ws.getDenomInfo(
          ws,
          tx,
          coin.exchangeBaseUrl,
          coin.denomPubHash,
        );
        if (!denom) {
          throw Error("can't find denomination to calculate deposit amount");
        }
        // const cc = pcs.coinContributions[i]
        // acc = Amounts.add(acc, cc).amount
        coinFee.push(denom.feeDeposit);
        exchangeSet.add(coin.exchangeBaseUrl);

        const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
          .iter(coin.exchangeBaseUrl)
          .filter((x) =>
            Amounts.isSameCurrency(x.value, pcs.coinContributions[i]),
          );
        const amountLeft = Amounts.sub(
          denom.value,
          pcs.coinContributions[i],
        ).amount;
        const refreshCost = getTotalRefreshCost(allDenoms, denom, amountLeft);
        refreshFee.push(refreshCost);
      }

      for (const exchangeUrl of exchangeSet.values()) {
        const exchangeDetails = await getExchangeDetails(tx, exchangeUrl);
        if (!exchangeDetails) {
          continue;
        }
        // FIXME/NOTE: the line below _likely_ throws exception
        // about "find method not found on undefined" when the wireType
        // is not supported by the Exchange.
        const fee = exchangeDetails.wireInfo.feesForType[wireType].find((x) => {
          return timestampIsBetween(
            getTimestampNow(),
            x.startStamp,
            x.endStamp,
          );
        })?.wireFee;
        if (fee) {
          wireFee.push(fee);
        }
      }
    });

  return {
    coin:
      coinFee.length === 0
        ? Amounts.getZero(total.currency)
        : Amounts.sum(coinFee).amount,
    wire:
      wireFee.length === 0
        ? Amounts.getZero(total.currency)
        : Amounts.sum(wireFee).amount,
    refresh:
      refreshFee.length === 0
        ? Amounts.getZero(total.currency)
        : Amounts.sum(refreshFee).amount,
  };
}
