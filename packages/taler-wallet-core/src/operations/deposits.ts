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

/**
 * Imports.
 */
import {
  AbsoluteTime,
  AmountJson,
  Amounts,
  CancellationToken,
  canonicalJson,
  codecForDepositSuccess,
  ContractTerms,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  durationFromSpec,
  encodeCrock,
  GetFeeForDepositRequest,
  getRandomBytes,
  hashWire,
  Logger,
  NotificationType,
  parsePaytoUri,
  PrepareDepositRequest,
  PrepareDepositResponse,
  TalerErrorDetail,
  TalerProtocolTimestamp,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
  URL,
} from "@gnu-taler/taler-util";
import { DepositGroupRecord, OperationStatus, WireFee } from "../db.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { PayCoinSelection, selectPayCoins } from "../util/coinSelection.js";
import { readSuccessResponseJsonOrThrow } from "../util/http.js";
import { resetRetryInfo, RetryInfo } from "../util/retries.js";
import { guardOperationException } from "./common.js";
import { getExchangeDetails } from "./exchanges.js";
import {
  applyCoinSpend,
  CoinSelectionRequest,
  extractContractData,
  generateDepositPermissions,
  getCandidatePayCoins,
  getTotalPaymentCost,
} from "./pay.js";
import { getTotalRefreshCost } from "./refresh.js";

/**
 * Logger.
 */
const logger = new Logger("deposits.ts");

/**
 * Set up the retry timeout for a deposit group.
 */
async function setupDepositGroupRetry(
  ws: InternalWalletState,
  depositGroupId: string,
  options: {
    resetRetry: boolean;
  },
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      depositGroups: x.depositGroups,
    }))
    .runReadWrite(async (tx) => {
      const x = await tx.depositGroups.get(depositGroupId);
      if (!x) {
        return;
      }
      if (options.resetRetry) {
        x.retryInfo = resetRetryInfo();
      } else {
        x.retryInfo = RetryInfo.increment(x.retryInfo);
      }
      delete x.lastError;
      await tx.depositGroups.put(x);
    });
}

/**
 * Report an error that occurred while processing the deposit group.
 */
async function reportDepositGroupError(
  ws: InternalWalletState,
  depositGroupId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({ depositGroups: x.depositGroups }))
    .runReadWrite(async (tx) => {
      const r = await tx.depositGroups.get(depositGroupId);
      if (!r) {
        return;
      }
      if (!r.retryInfo) {
        logger.error(
          `deposit group record (${depositGroupId}) reports error, but no retry active`,
        );
        return;
      }
      r.lastError = err;
      await tx.depositGroups.put(r);
    });
  ws.notify({ type: NotificationType.DepositOperationError, error: err });
}

export async function processDepositGroup(
  ws: InternalWalletState,
  depositGroupId: string,
  options: {
    forceNow?: boolean;
    cancellationToken?: CancellationToken;
  } = {},
): Promise<void> {
  const onOpErr = (err: TalerErrorDetail): Promise<void> =>
    reportDepositGroupError(ws, depositGroupId, err);
  return await guardOperationException(
    async () => await processDepositGroupImpl(ws, depositGroupId, options),
    onOpErr,
  );
}

/**
 * @see {processDepositGroup}
 */
async function processDepositGroupImpl(
  ws: InternalWalletState,
  depositGroupId: string,
  options: {
    forceNow?: boolean;
    cancellationToken?: CancellationToken;
  } = {},
): Promise<void> {
  const forceNow = options.forceNow ?? false;
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

  await setupDepositGroupRetry(ws, depositGroupId, { resetRetry: forceNow });

  const contractData = extractContractData(
    depositGroup.contractTermsRaw,
    depositGroup.contractTermsHash,
    "",
  );

  // Check for cancellation before expensive operations.
  options.cancellationToken?.throwIfCancelled();
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
    // Check for cancellation before making network request.
    options.cancellationToken?.throwIfCancelled();
    const url = new URL(`coins/${perm.coin_pub}/deposit`, perm.exchange_url);
    logger.info(`depositing to ${url}`);
    const httpResp = await ws.http.postJson(url.href, requestBody, {
      cancellationToken: options.cancellationToken,
    });
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
        dg.timestampFinished = TalerProtocolTimestamp.now();
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
    const sigResp = await ws.cryptoApi.signTrackTransaction({
      coinPub: dp.coin_pub,
      contractTermsHash: depositGroup.contractTermsHash,
      merchantPriv: depositGroup.merchantPriv,
      merchantPub: depositGroup.merchantPub,
      wireHash,
    });
    url.searchParams.set("merchant_sig", sigResp.sig);
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
): Promise<DepositGroupFees> {
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

  const csr: CoinSelectionRequest = {
    allowedAuditors: [],
    allowedExchanges: [],
    amount: Amounts.parseOrThrow(req.amount),
    maxDepositFee: Amounts.parseOrThrow(req.amount),
    maxWireFee: Amounts.parseOrThrow(req.amount),
    timestamp: TalerProtocolTimestamp.now(),
    wireFeeAmortization: 1,
    wireMethod: p.targetType,
  };

  const candidates = await getCandidatePayCoins(ws, csr);

  const payCoinSel = selectPayCoins({
    candidates,
    contractTermsAmount: csr.amount,
    depositFeeLimit: csr.maxDepositFee,
    wireFeeAmortization: csr.wireFeeAmortization,
    wireFeeLimit: csr.maxWireFee,
    prevPayCoins: [],
  });

  if (!payCoinSel) {
    throw Error("insufficient funds");
  }

  return await getTotalFeesForDepositAmount(
    ws,
    p.targetType,
    amount,
    payCoinSel,
  );
}

export async function prepareDepositGroup(
  ws: InternalWalletState,
  req: PrepareDepositRequest,
): Promise<PrepareDepositResponse> {
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

  const now = AbsoluteTime.now();
  const nowRounded = AbsoluteTime.toTimestamp(now);
  const contractTerms: ContractTerms = {
    auditors: [],
    exchanges: exchangeInfos,
    amount: req.amount,
    max_fee: Amounts.stringify(amount),
    max_wire_fee: Amounts.stringify(amount),
    wire_method: p.targetType,
    timestamp: nowRounded,
    merchant_base_url: "",
    summary: "",
    nonce: "",
    wire_transfer_deadline: nowRounded,
    order_id: "",
    h_wire: "",
    pay_deadline: AbsoluteTime.toTimestamp(
      AbsoluteTime.addDuration(now, durationFromSpec({ hours: 1 })),
    ),
    merchant: {
      name: "(wallet)",
    },
    merchant_pub: "",
    refund_deadline: TalerProtocolTimestamp.zero(),
  };

  const { h: contractTermsHash } = await ws.cryptoApi.hashString({
    str: canonicalJson(contractTerms),
  });

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

  const effectiveDepositAmount = await getEffectiveDepositAmount(
    ws,
    p.targetType,
    payCoinSel,
  );

  return { totalDepositCost, effectiveDepositAmount }
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

  const now = AbsoluteTime.now();
  const nowRounded = AbsoluteTime.toTimestamp(now);
  const noncePair = await ws.cryptoApi.createEddsaKeypair({});
  const merchantPair = await ws.cryptoApi.createEddsaKeypair({});
  const wireSalt = encodeCrock(getRandomBytes(16));
  const wireHash = hashWire(req.depositPaytoUri, wireSalt);
  const contractTerms: ContractTerms = {
    auditors: [],
    exchanges: exchangeInfos,
    amount: req.amount,
    max_fee: Amounts.stringify(amount),
    max_wire_fee: Amounts.stringify(amount),
    wire_method: p.targetType,
    timestamp: nowRounded,
    merchant_base_url: "",
    summary: "",
    nonce: noncePair.pub,
    wire_transfer_deadline: nowRounded,
    order_id: "",
    h_wire: wireHash,
    pay_deadline: AbsoluteTime.toTimestamp(
      AbsoluteTime.addDuration(now, durationFromSpec({ hours: 1 })),
    ),
    merchant: {
      name: "(wallet)",
    },
    merchant_pub: merchantPair.pub,
    refund_deadline: TalerProtocolTimestamp.zero(),
  };

  const { h: contractTermsHash } = await ws.cryptoApi.hashString({
    str: canonicalJson(contractTerms),
  });

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
    timestampCreated: AbsoluteTime.toTimestamp(now),
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
    retryInfo: resetRetryInfo(),
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
          return AbsoluteTime.isBetween(
            AbsoluteTime.now(),
            AbsoluteTime.fromTimestamp(x.startStamp),
            AbsoluteTime.fromTimestamp(x.endStamp),
          );
        })?.wireFee;
        if (fee) {
          fees.push(fee);
        }
      }
    });
  return Amounts.sub(Amounts.sum(amt).amount, Amounts.sum(fees).amount).amount;
}

export interface DepositGroupFees {
  coin: AmountJson;
  wire: AmountJson;
  refresh: AmountJson;
}

/**
 * Get the fee amount that will be charged when trying to deposit the
 * specified amount using the selected coins and the wire method.
 */
export async function getTotalFeesForDepositAmount(
  ws: InternalWalletState,
  wireType: string,
  total: AmountJson,
  pcs: PayCoinSelection,
): Promise<DepositGroupFees> {
  const wireFee: AmountJson[] = [];
  const coinFee: AmountJson[] = [];
  const refreshFee: AmountJson[] = [];
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
        const fee = exchangeDetails.wireInfo.feesForType[wireType]?.find(
          (x) => {
            return AbsoluteTime.isBetween(
              AbsoluteTime.now(),
              AbsoluteTime.fromTimestamp(x.startStamp),
              AbsoluteTime.fromTimestamp(x.endStamp),
            );
          },
        )?.wireFee;
        if (fee) {
          wireFee.push(fee);
        }
      }
    });

  return {
    coin: Amounts.sumOrZero(total.currency, coinFee).amount,
    wire: Amounts.sumOrZero(total.currency, wireFee).amount,
    refresh: Amounts.sumOrZero(total.currency, refreshFee).amount,
  };
}
