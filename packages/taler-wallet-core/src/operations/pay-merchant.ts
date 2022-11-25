/*
 This file is part of GNU Taler
 (C) 2019-2022 Taler Systems S.A.

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
 * Implementation of the payment operation, including downloading and
 * claiming of proposals.
 *
 * @author Florian Dold
 */

/**
 * Imports.
 */
import { GlobalIDB } from "@gnu-taler/idb-bridge";
import {
  AbortingCoin,
  AbortRequest,
  AbsoluteTime,
  AgeRestriction,
  AmountJson,
  Amounts,
  ApplyRefundResponse,
  codecForAbortResponse,
  codecForMerchantContractTerms,
  codecForMerchantOrderRefundPickupResponse,
  codecForMerchantOrderStatusPaid,
  codecForMerchantPayResponse,
  codecForProposal,
  CoinDepositPermission,
  CoinRefreshRequest,
  CoinStatus,
  ConfirmPayResult,
  ConfirmPayResultType,
  MerchantContractTerms,
  ContractTermsUtil,
  DenominationInfo,
  Duration,
  encodeCrock,
  ForcedCoinSel,
  getRandomBytes,
  HttpStatusCode,
  j2s,
  Logger,
  MerchantCoinRefundFailureStatus,
  MerchantCoinRefundStatus,
  MerchantCoinRefundSuccessStatus,
  NotificationType,
  parsePaytoUri,
  parsePayUri,
  parseRefundUri,
  PayCoinSelection,
  PreparePayResult,
  PreparePayResultType,
  PrepareRefundResult,
  RefreshReason,
  strcmp,
  TalerErrorCode,
  TalerErrorDetail,
  TalerProtocolTimestamp,
  TransactionType,
  URL,
  constructPayUri,
} from "@gnu-taler/taler-util";
import { EddsaKeypair } from "../crypto/cryptoImplementation.js";
import {
  AllowedAuditorInfo,
  AllowedExchangeInfo,
  BackupProviderStateTag,
  CoinRecord,
  DenominationRecord,
  PurchaseRecord,
  PurchaseStatus,
  RefundReason,
  RefundState,
  WalletContractData,
  WalletStoresV1,
} from "../db.js";
import {
  makeErrorDetail,
  makePendingOperationFailedError,
  TalerError,
  TalerProtocolViolationError,
} from "../errors.js";
import { GetReadWriteAccess } from "../index.browser.js";
import {
  EXCHANGE_COINS_LOCK,
  InternalWalletState,
} from "../internal-wallet-state.js";
import { PendingTaskType } from "../pending-types.js";
import { assertUnreachable } from "../util/assertUnreachable.js";
import {
  CoinSelectionTally,
  PreviousPayCoins,
  tallyFees,
} from "../util/coinSelection.js";
import {
  getHttpResponseErrorDetails,
  readSuccessResponseJsonOrErrorCode,
  readSuccessResponseJsonOrThrow,
  readTalerErrorResponse,
  readUnexpectedResponseDetails,
  throwUnexpectedRequestError,
} from "../util/http.js";
import { checkDbInvariant, checkLogicInvariant } from "../util/invariants.js";
import {
  OperationAttemptResult,
  OperationAttemptResultType,
  RetryInfo,
  RetryTags,
  scheduleRetry,
} from "../util/retries.js";
import {
  makeTransactionId,
  spendCoins,
  storeOperationError,
  storeOperationPending,
} from "./common.js";
import { getExchangeDetails } from "./exchanges.js";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh.js";
import { GetReadOnlyAccess } from "../util/query.js";

/**
 * Logger.
 */
const logger = new Logger("pay.ts");

/**
 * Compute the total cost of a payment to the customer.
 *
 * This includes the amount taken by the merchant, fees (wire/deposit) contributed
 * by the customer, refreshing fees, fees for withdraw-after-refresh and "trimmings"
 * of coins that are too small to spend.
 */
export async function getTotalPaymentCost(
  ws: InternalWalletState,
  pcs: PayCoinSelection,
): Promise<AmountJson> {
  return ws.db
    .mktx((x) => [x.coins, x.denominations])
    .runReadOnly(async (tx) => {
      const costs: AmountJson[] = [];
      for (let i = 0; i < pcs.coinPubs.length; i++) {
        const coin = await tx.coins.get(pcs.coinPubs[i]);
        if (!coin) {
          throw Error("can't calculate payment cost, coin not found");
        }
        const denom = await tx.denominations.get([
          coin.exchangeBaseUrl,
          coin.denomPubHash,
        ]);
        if (!denom) {
          throw Error(
            "can't calculate payment cost, denomination for coin not found",
          );
        }
        const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
          .iter(coin.exchangeBaseUrl)
          .filter((x) =>
            Amounts.isSameCurrency(
              DenominationRecord.getValue(x),
              pcs.coinContributions[i],
            ),
          );
        const amountLeft = Amounts.sub(
          DenominationRecord.getValue(denom),
          pcs.coinContributions[i],
        ).amount;
        const refreshCost = getTotalRefreshCost(
          allDenoms,
          DenominationRecord.toDenomInfo(denom),
          amountLeft,
        );
        costs.push(Amounts.parseOrThrow(pcs.coinContributions[i]));
        costs.push(refreshCost);
      }
      const zero = Amounts.zeroOfAmount(pcs.paymentAmount);
      return Amounts.sum([zero, ...costs]).amount;
    });
}

export interface CoinSelectionRequest {
  amount: AmountJson;

  allowedAuditors: AllowedAuditorInfo[];
  allowedExchanges: AllowedExchangeInfo[];

  /**
   * Timestamp of the contract.
   */
  timestamp: TalerProtocolTimestamp;

  wireMethod: string;

  wireFeeAmortization: number;

  maxWireFee: AmountJson;

  maxDepositFee: AmountJson;

  /**
   * Minimum age requirement for the coin selection.
   *
   * When present, only select coins with either no age restriction
   * or coins with an age commitment that matches the minimum age.
   */
  minimumAge?: number;
}

async function failProposalPermanently(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
      if (!p) {
        return;
      }
      p.purchaseStatus = PurchaseStatus.ProposalDownloadFailed;
      await tx.purchases.put(p);
    });
}

function getProposalRequestTimeout(retryInfo?: RetryInfo): Duration {
  return Duration.clamp({
    lower: Duration.fromSpec({ seconds: 1 }),
    upper: Duration.fromSpec({ seconds: 60 }),
    value: retryInfo ? RetryInfo.getDuration(retryInfo) : Duration.fromSpec({}),
  });
}

function getPayRequestTimeout(purchase: PurchaseRecord): Duration {
  return Duration.multiply(
    { d_ms: 15000 },
    1 + (purchase.payInfo?.payCoinSelection.coinPubs.length ?? 0) / 5,
  );
}

/**
 * Return the proposal download data for a purchase, throw if not available.
 *
 * (Async since in the future this will query the DB.)
 */
export async function expectProposalDownload(
  ws: InternalWalletState,
  p: PurchaseRecord,
  parentTx?: GetReadOnlyAccess<{
    contractTerms: typeof WalletStoresV1.contractTerms;
  }>,
): Promise<{
  contractData: WalletContractData;
  contractTermsRaw: any;
}> {
  if (!p.download) {
    throw Error("expected proposal to be downloaded");
  }
  const download = p.download;

  async function getFromTransaction(
    tx: Exclude<typeof parentTx, undefined>,
  ): Promise<ReturnType<typeof expectProposalDownload>> {
    const contractTerms = await tx.contractTerms.get(
      download.contractTermsHash,
    );
    if (!contractTerms) {
      throw Error("contract terms not found");
    }
    return {
      contractData: extractContractData(
        contractTerms.contractTermsRaw,
        download.contractTermsHash,
        download.contractTermsMerchantSig,
      ),
      contractTermsRaw: contractTerms.contractTermsRaw,
    };
  }

  if (parentTx) {
    return getFromTransaction(parentTx);
  }
  return await ws.db
    .mktx((x) => [x.contractTerms])
    .runReadOnly(getFromTransaction);
}

export function extractContractData(
  parsedContractTerms: MerchantContractTerms,
  contractTermsHash: string,
  merchantSig: string,
): WalletContractData {
  const amount = Amounts.parseOrThrow(parsedContractTerms.amount);
  let maxWireFee: AmountJson;
  if (parsedContractTerms.max_wire_fee) {
    maxWireFee = Amounts.parseOrThrow(parsedContractTerms.max_wire_fee);
  } else {
    maxWireFee = Amounts.zeroOfCurrency(amount.currency);
  }
  return {
    amount: Amounts.stringify(amount),
    contractTermsHash: contractTermsHash,
    fulfillmentUrl: parsedContractTerms.fulfillment_url ?? "",
    merchantBaseUrl: parsedContractTerms.merchant_base_url,
    merchantPub: parsedContractTerms.merchant_pub,
    merchantSig,
    orderId: parsedContractTerms.order_id,
    summary: parsedContractTerms.summary,
    autoRefund: parsedContractTerms.auto_refund,
    maxWireFee: Amounts.stringify(maxWireFee),
    payDeadline: parsedContractTerms.pay_deadline,
    refundDeadline: parsedContractTerms.refund_deadline,
    wireFeeAmortization: parsedContractTerms.wire_fee_amortization || 1,
    allowedAuditors: parsedContractTerms.auditors.map((x) => ({
      auditorBaseUrl: x.url,
      auditorPub: x.auditor_pub,
    })),
    allowedExchanges: parsedContractTerms.exchanges.map((x) => ({
      exchangeBaseUrl: x.url,
      exchangePub: x.master_pub,
    })),
    timestamp: parsedContractTerms.timestamp,
    wireMethod: parsedContractTerms.wire_method,
    wireInfoHash: parsedContractTerms.h_wire,
    maxDepositFee: Amounts.stringify(parsedContractTerms.max_fee),
    merchant: parsedContractTerms.merchant,
    products: parsedContractTerms.products,
    summaryI18n: parsedContractTerms.summary_i18n,
    minimumAge: parsedContractTerms.minimum_age,
    deliveryDate: parsedContractTerms.delivery_date,
    deliveryLocation: parsedContractTerms.delivery_location,
  };
}

export async function processDownloadProposal(
  ws: InternalWalletState,
  proposalId: string,
  options: object = {},
): Promise<OperationAttemptResult> {
  const proposal = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return await tx.purchases.get(proposalId);
    });

  if (!proposal) {
    return {
      type: OperationAttemptResultType.Finished,
      result: undefined,
    };
  }

  if (proposal.purchaseStatus != PurchaseStatus.DownloadingProposal) {
    return {
      type: OperationAttemptResultType.Finished,
      result: undefined,
    };
  }

  const orderClaimUrl = new URL(
    `orders/${proposal.orderId}/claim`,
    proposal.merchantBaseUrl,
  ).href;
  logger.trace("downloading contract from '" + orderClaimUrl + "'");

  const requestBody: {
    nonce: string;
    token?: string;
  } = {
    nonce: proposal.noncePub,
  };
  if (proposal.claimToken) {
    requestBody.token = proposal.claimToken;
  }

  const opId = RetryTags.forPay(proposal);
  const retryRecord = await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadOnly(async (tx) => {
      return tx.operationRetries.get(opId);
    });

  // FIXME: Do this in the background using the new return value
  const httpResponse = await ws.http.postJson(orderClaimUrl, requestBody, {
    timeout: getProposalRequestTimeout(retryRecord?.retryInfo),
  });
  const r = await readSuccessResponseJsonOrErrorCode(
    httpResponse,
    codecForProposal(),
  );
  if (r.isError) {
    switch (r.talerErrorResponse.code) {
      case TalerErrorCode.MERCHANT_POST_ORDERS_ID_CLAIM_ALREADY_CLAIMED:
        throw TalerError.fromDetail(
          TalerErrorCode.WALLET_ORDER_ALREADY_CLAIMED,
          {
            orderId: proposal.orderId,
            claimUrl: orderClaimUrl,
          },
          "order already claimed (likely by other wallet)",
        );
      default:
        throwUnexpectedRequestError(httpResponse, r.talerErrorResponse);
    }
  }
  const proposalResp = r.response;

  // The proposalResp contains the contract terms as raw JSON,
  // as the coded to parse them doesn't necessarily round-trip.
  // We need this raw JSON to compute the contract terms hash.

  // FIXME: Do better error handling, check if the
  // contract terms have all their forgettable information still
  // present.  The wallet should never accept contract terms
  // with missing information from the merchant.

  const isWellFormed = ContractTermsUtil.validateForgettable(
    proposalResp.contract_terms,
  );

  if (!isWellFormed) {
    logger.trace(
      `malformed contract terms: ${j2s(proposalResp.contract_terms)}`,
    );
    const err = makeErrorDetail(
      TalerErrorCode.WALLET_CONTRACT_TERMS_MALFORMED,
      {},
      "validation for well-formedness failed",
    );
    await failProposalPermanently(ws, proposalId, err);
    throw makePendingOperationFailedError(
      err,
      TransactionType.Payment,
      proposalId,
    );
  }

  const contractTermsHash = ContractTermsUtil.hashContractTerms(
    proposalResp.contract_terms,
  );

  logger.info(`Contract terms hash: ${contractTermsHash}`);

  let parsedContractTerms: MerchantContractTerms;

  try {
    parsedContractTerms = codecForMerchantContractTerms().decode(
      proposalResp.contract_terms,
    );
  } catch (e) {
    const err = makeErrorDetail(
      TalerErrorCode.WALLET_CONTRACT_TERMS_MALFORMED,
      {},
      `schema validation failed: ${e}`,
    );
    await failProposalPermanently(ws, proposalId, err);
    throw makePendingOperationFailedError(
      err,
      TransactionType.Payment,
      proposalId,
    );
  }

  const sigValid = await ws.cryptoApi.isValidContractTermsSignature({
    contractTermsHash,
    merchantPub: parsedContractTerms.merchant_pub,
    sig: proposalResp.sig,
  });

  if (!sigValid) {
    const err = makeErrorDetail(
      TalerErrorCode.WALLET_CONTRACT_TERMS_SIGNATURE_INVALID,
      {
        merchantPub: parsedContractTerms.merchant_pub,
        orderId: parsedContractTerms.order_id,
      },
      "merchant's signature on contract terms is invalid",
    );
    await failProposalPermanently(ws, proposalId, err);
    throw makePendingOperationFailedError(
      err,
      TransactionType.Payment,
      proposalId,
    );
  }

  const fulfillmentUrl = parsedContractTerms.fulfillment_url;

  const baseUrlForDownload = proposal.merchantBaseUrl;
  const baseUrlFromContractTerms = parsedContractTerms.merchant_base_url;

  if (baseUrlForDownload !== baseUrlFromContractTerms) {
    const err = makeErrorDetail(
      TalerErrorCode.WALLET_CONTRACT_TERMS_BASE_URL_MISMATCH,
      {
        baseUrlForDownload,
        baseUrlFromContractTerms,
      },
      "merchant base URL mismatch",
    );
    await failProposalPermanently(ws, proposalId, err);
    throw makePendingOperationFailedError(
      err,
      TransactionType.Payment,
      proposalId,
    );
  }

  const contractData = extractContractData(
    parsedContractTerms,
    contractTermsHash,
    proposalResp.sig,
  );

  logger.trace(`extracted contract data: ${j2s(contractData)}`);

  await ws.db
    .mktx((x) => [x.purchases, x.contractTerms])
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
      if (!p) {
        return;
      }
      if (p.purchaseStatus !== PurchaseStatus.DownloadingProposal) {
        return;
      }
      p.download = {
        contractTermsHash,
        contractTermsMerchantSig: contractData.merchantSig,
        currency: Amounts.currencyOf(contractData.amount),
        fulfillmentUrl: contractData.fulfillmentUrl,
      };
      await tx.contractTerms.put({
        h: contractTermsHash,
        contractTermsRaw: proposalResp.contract_terms,
      });
      if (
        fulfillmentUrl &&
        (fulfillmentUrl.startsWith("http://") ||
          fulfillmentUrl.startsWith("https://"))
      ) {
        const differentPurchase =
          await tx.purchases.indexes.byFulfillmentUrl.get(fulfillmentUrl);
        if (differentPurchase) {
          logger.warn("repurchase detected");
          p.purchaseStatus = PurchaseStatus.RepurchaseDetected;
          p.repurchaseProposalId = differentPurchase.proposalId;
          await tx.purchases.put(p);
          return;
        }
      }
      p.purchaseStatus = PurchaseStatus.Proposed;
      await tx.purchases.put(p);
    });

  ws.notify({
    type: NotificationType.ProposalDownloaded,
    proposalId: proposal.proposalId,
  });

  return {
    type: OperationAttemptResultType.Finished,
    result: undefined,
  };
}

/**
 * Download a proposal and store it in the database.
 * Returns an id for it to retrieve it later.
 *
 * @param sessionId Current session ID, if the proposal is being
 *  downloaded in the context of a session ID.
 */
async function startDownloadProposal(
  ws: InternalWalletState,
  merchantBaseUrl: string,
  orderId: string,
  sessionId: string | undefined,
  claimToken: string | undefined,
  noncePriv: string | undefined,
): Promise<string> {
  const oldProposal = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.indexes.byUrlAndOrderId.get([
        merchantBaseUrl,
        orderId,
      ]);
    });

  /* If we have already claimed this proposal with the same sessionId
   * nonce and claim token, reuse it. */
  if (
    oldProposal &&
    oldProposal.downloadSessionId === sessionId &&
    (!noncePriv || oldProposal.noncePriv === noncePriv) &&
    oldProposal.claimToken === claimToken
  ) {
    await processDownloadProposal(ws, oldProposal.proposalId);
    return oldProposal.proposalId;
  }

  let noncePair: EddsaKeypair;
  if (noncePriv) {
    noncePair = {
      priv: noncePriv,
      pub: (await ws.cryptoApi.eddsaGetPublic({ priv: noncePriv })).pub,
    };
  } else {
    noncePair = await ws.cryptoApi.createEddsaKeypair({});
  }

  const { priv, pub } = noncePair;
  const proposalId = encodeCrock(getRandomBytes(32));

  const proposalRecord: PurchaseRecord = {
    download: undefined,
    noncePriv: priv,
    noncePub: pub,
    claimToken,
    timestamp: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    merchantBaseUrl,
    orderId,
    proposalId: proposalId,
    purchaseStatus: PurchaseStatus.DownloadingProposal,
    repurchaseProposalId: undefined,
    downloadSessionId: sessionId,
    autoRefundDeadline: undefined,
    lastSessionId: undefined,
    merchantPaySig: undefined,
    payInfo: undefined,
    refundAmountAwaiting: undefined,
    refunds: {},
    timestampAccept: undefined,
    timestampFirstSuccessfulPay: undefined,
    timestampLastRefundStatus: undefined,
    pendingRemovedCoinPubs: undefined,
  };

  await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const existingRecord = await tx.purchases.indexes.byUrlAndOrderId.get([
        merchantBaseUrl,
        orderId,
      ]);
      if (existingRecord) {
        // Created concurrently
        return;
      }
      await tx.purchases.put(proposalRecord);
    });

  await processDownloadProposal(ws, proposalId);
  return proposalId;
}

async function storeFirstPaySuccess(
  ws: InternalWalletState,
  proposalId: string,
  sessionId: string | undefined,
  paySig: string,
): Promise<void> {
  const now = AbsoluteTime.toTimestamp(AbsoluteTime.now());
  await ws.db
    .mktx((x) => [x.purchases, x.contractTerms])
    .runReadWrite(async (tx) => {
      const purchase = await tx.purchases.get(proposalId);

      if (!purchase) {
        logger.warn("purchase does not exist anymore");
        return;
      }
      const isFirst = purchase.timestampFirstSuccessfulPay === undefined;
      if (!isFirst) {
        logger.warn("payment success already stored");
        return;
      }
      if (purchase.purchaseStatus === PurchaseStatus.Paying) {
        purchase.purchaseStatus = PurchaseStatus.Paid;
      }
      purchase.timestampFirstSuccessfulPay = now;
      purchase.lastSessionId = sessionId;
      purchase.merchantPaySig = paySig;
      const dl = purchase.download;
      checkDbInvariant(!!dl);
      const contractTermsRecord = await tx.contractTerms.get(
        dl.contractTermsHash,
      );
      checkDbInvariant(!!contractTermsRecord);
      const contractData = extractContractData(
        contractTermsRecord.contractTermsRaw,
        dl.contractTermsHash,
        dl.contractTermsMerchantSig,
      );
      const protoAr = contractData.autoRefund;
      if (protoAr) {
        const ar = Duration.fromTalerProtocolDuration(protoAr);
        logger.info("auto_refund present");
        purchase.purchaseStatus = PurchaseStatus.QueryingAutoRefund;
        purchase.autoRefundDeadline = AbsoluteTime.toTimestamp(
          AbsoluteTime.addDuration(AbsoluteTime.now(), ar),
        );
      }
      await tx.purchases.put(purchase);
    });
}

async function storePayReplaySuccess(
  ws: InternalWalletState,
  proposalId: string,
  sessionId: string | undefined,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const purchase = await tx.purchases.get(proposalId);

      if (!purchase) {
        logger.warn("purchase does not exist anymore");
        return;
      }
      const isFirst = purchase.timestampFirstSuccessfulPay === undefined;
      if (isFirst) {
        throw Error("invalid payment state");
      }
      if (
        purchase.purchaseStatus === PurchaseStatus.Paying ||
        purchase.purchaseStatus === PurchaseStatus.PayingReplay
      ) {
        purchase.purchaseStatus = PurchaseStatus.Paid;
      }
      purchase.lastSessionId = sessionId;
      await tx.purchases.put(purchase);
    });
}

/**
 * Handle a 409 Conflict response from the merchant.
 *
 * We do this by going through the coin history provided by the exchange and
 * (1) verifying the signatures from the exchange
 * (2) adjusting the remaining coin value and refreshing it
 * (3) re-do coin selection with the bad coin removed
 */
async function handleInsufficientFunds(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetail,
): Promise<void> {
  logger.trace("handling insufficient funds, trying to re-select coins");

  const proposal = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });
  if (!proposal) {
    return;
  }

  logger.trace(`got error details: ${j2s(err)}`);

  const exchangeReply = (err as any).exchange_reply;
  if (
    exchangeReply.code !== TalerErrorCode.EXCHANGE_GENERIC_INSUFFICIENT_FUNDS
  ) {
    // FIXME: set as failed
    if (logger.shouldLogTrace()) {
      logger.trace("got exchange error reply (see below)");
      logger.trace(j2s(exchangeReply));
    }
    throw Error(`unable to handle /pay error response (${exchangeReply.code})`);
  }

  const brokenCoinPub = (exchangeReply as any).coin_pub;
  logger.trace(`excluded broken coin pub=${brokenCoinPub}`);

  if (!brokenCoinPub) {
    throw new TalerProtocolViolationError();
  }

  const { contractData } = await expectProposalDownload(ws, proposal);

  const prevPayCoins: PreviousPayCoins = [];

  const payInfo = proposal.payInfo;
  if (!payInfo) {
    return;
  }

  const payCoinSelection = payInfo.payCoinSelection;

  await ws.db
    .mktx((x) => [x.coins, x.denominations])
    .runReadOnly(async (tx) => {
      for (let i = 0; i < payCoinSelection.coinPubs.length; i++) {
        const coinPub = payCoinSelection.coinPubs[i];
        if (coinPub === brokenCoinPub) {
          continue;
        }
        const contrib = payCoinSelection.coinContributions[i];
        const coin = await tx.coins.get(coinPub);
        if (!coin) {
          continue;
        }
        const denom = await tx.denominations.get([
          coin.exchangeBaseUrl,
          coin.denomPubHash,
        ]);
        if (!denom) {
          continue;
        }
        prevPayCoins.push({
          coinPub,
          contribution: Amounts.parseOrThrow(contrib),
          exchangeBaseUrl: coin.exchangeBaseUrl,
          feeDeposit: Amounts.parseOrThrow(denom.fees.feeDeposit),
        });
      }
    });

  const res = await selectPayCoinsNew(ws, {
    auditors: contractData.allowedAuditors,
    exchanges: contractData.allowedExchanges,
    wireMethod: contractData.wireMethod,
    contractTermsAmount: Amounts.parseOrThrow(contractData.amount),
    depositFeeLimit: Amounts.parseOrThrow(contractData.maxDepositFee),
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: Amounts.parseOrThrow(contractData.maxWireFee),
    prevPayCoins,
    requiredMinimumAge: contractData.minimumAge,
  });

  if (!res) {
    logger.trace("insufficient funds for coin re-selection");
    return;
  }

  logger.trace("re-selected coins");

  await ws.db
    .mktx((x) => [
      x.purchases,
      x.coins,
      x.coinAvailability,
      x.denominations,
      x.refreshGroups,
    ])
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
      if (!p) {
        return;
      }
      const payInfo = p.payInfo;
      if (!payInfo) {
        return;
      }
      payInfo.payCoinSelection = res;
      payInfo.payCoinSelection = res;
      payInfo.payCoinSelectionUid = encodeCrock(getRandomBytes(32));
      await tx.purchases.put(p);
      await spendCoins(ws, tx, {
        allocationId: `txn:proposal:${p.proposalId}`,
        coinPubs: payInfo.payCoinSelection.coinPubs,
        contributions: payInfo.payCoinSelection.coinContributions.map((x) =>
          Amounts.parseOrThrow(x),
        ),
        refreshReason: RefreshReason.PayMerchant,
      });
    });
}

async function unblockBackup(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.backupProviders])
    .runReadWrite(async (tx) => {
      await tx.backupProviders.indexes.byPaymentProposalId
        .iter(proposalId)
        .forEachAsync(async (bp) => {
          bp.state = {
            tag: BackupProviderStateTag.Ready,
            nextBackupTimestamp: TalerProtocolTimestamp.now(),
          };
          tx.backupProviders.put(bp);
        });
    });
}

export interface SelectPayCoinRequestNg {
  exchanges: AllowedExchangeInfo[];
  auditors: AllowedAuditorInfo[];
  wireMethod: string;
  contractTermsAmount: AmountJson;
  depositFeeLimit: AmountJson;
  wireFeeLimit: AmountJson;
  wireFeeAmortization: number;
  prevPayCoins?: PreviousPayCoins;
  requiredMinimumAge?: number;
  forcedSelection?: ForcedCoinSel;
}

export type AvailableDenom = DenominationInfo & {
  maxAge: number;
  numAvailable: number;
};

export async function selectCandidates(
  ws: InternalWalletState,
  req: SelectPayCoinRequestNg,
): Promise<[AvailableDenom[], Record<string, AmountJson>]> {
  return await ws.db
    .mktx((x) => [
      x.exchanges,
      x.exchangeDetails,
      x.denominations,
      x.coinAvailability,
    ])
    .runReadOnly(async (tx) => {
      const denoms: AvailableDenom[] = [];
      const exchanges = await tx.exchanges.iter().toArray();
      const wfPerExchange: Record<string, AmountJson> = {};
      for (const exchange of exchanges) {
        const exchangeDetails = await getExchangeDetails(tx, exchange.baseUrl);
        if (exchangeDetails?.currency !== req.contractTermsAmount.currency) {
          continue;
        }
        let wireMethodSupported = false;
        for (const acc of exchangeDetails.wireInfo.accounts) {
          const pp = parsePaytoUri(acc.payto_uri);
          checkLogicInvariant(!!pp);
          if (pp.targetType === req.wireMethod) {
            wireMethodSupported = true;
            break;
          }
        }
        if (!wireMethodSupported) {
          break;
        }
        exchangeDetails.wireInfo.accounts;
        let accepted = false;
        for (const allowedExchange of req.exchanges) {
          if (allowedExchange.exchangePub === exchangeDetails.masterPublicKey) {
            accepted = true;
            break;
          }
        }
        for (const allowedAuditor of req.auditors) {
          for (const providedAuditor of exchangeDetails.auditors) {
            if (allowedAuditor.auditorPub === providedAuditor.auditor_pub) {
              accepted = true;
              break;
            }
          }
        }
        if (!accepted) {
          continue;
        }
        let ageLower = 0;
        let ageUpper = AgeRestriction.AGE_UNRESTRICTED;
        if (req.requiredMinimumAge) {
          ageLower = req.requiredMinimumAge;
        }
        const myExchangeDenoms =
          await tx.coinAvailability.indexes.byExchangeAgeAvailability.getAll(
            GlobalIDB.KeyRange.bound(
              [exchangeDetails.exchangeBaseUrl, ageLower, 1],
              [
                exchangeDetails.exchangeBaseUrl,
                ageUpper,
                Number.MAX_SAFE_INTEGER,
              ],
            ),
          );
        // FIXME: Check that the individual denomination is audited!
        // FIXME: Should we exclude denominations that are
        // not spendable anymore?
        for (const denomAvail of myExchangeDenoms) {
          const denom = await tx.denominations.get([
            denomAvail.exchangeBaseUrl,
            denomAvail.denomPubHash,
          ]);
          checkDbInvariant(!!denom);
          if (denom.isRevoked || !denom.isOffered) {
            continue;
          }
          denoms.push({
            ...DenominationRecord.toDenomInfo(denom),
            numAvailable: denomAvail.freshCoinCount ?? 0,
            maxAge: denomAvail.maxAge,
          });
        }
      }
      // Sort by available amount (descending),  deposit fee (ascending) and
      // denomPub (ascending) if deposit fee is the same
      // (to guarantee deterministic results)
      denoms.sort(
        (o1, o2) =>
          -Amounts.cmp(o1.value, o2.value) ||
          Amounts.cmp(o1.feeDeposit, o2.feeDeposit) ||
          strcmp(o1.denomPubHash, o2.denomPubHash),
      );
      return [denoms, wfPerExchange];
    });
}

function makeAvailabilityKey(
  exchangeBaseUrl: string,
  denomPubHash: string,
  maxAge: number,
): string {
  return `${denomPubHash};${maxAge};${exchangeBaseUrl}`;
}

/**
 * Selection result.
 */
interface SelResult {
  /**
   * Map from an availability key
   * to an array of contributions.
   */
  [avKey: string]: {
    exchangeBaseUrl: string;
    denomPubHash: string;
    maxAge: number;
    contributions: AmountJson[];
  };
}

export function selectGreedy(
  req: SelectPayCoinRequestNg,
  candidateDenoms: AvailableDenom[],
  wireFeesPerExchange: Record<string, AmountJson>,
  tally: CoinSelectionTally,
): SelResult | undefined {
  const { wireFeeAmortization } = req;
  const selectedDenom: SelResult = {};
  for (const aci of candidateDenoms) {
    const contributions: AmountJson[] = [];
    for (let i = 0; i < aci.numAvailable; i++) {
      // Don't use this coin if depositing it is more expensive than
      // the amount it would give the merchant.
      if (Amounts.cmp(aci.feeDeposit, aci.value) > 0) {
        continue;
      }

      if (Amounts.isZero(tally.amountPayRemaining)) {
        // We have spent enough!
        break;
      }

      tally = tallyFees(
        tally,
        wireFeesPerExchange,
        wireFeeAmortization,
        aci.exchangeBaseUrl,
        Amounts.parseOrThrow(aci.feeDeposit),
      );

      let coinSpend = Amounts.max(
        Amounts.min(tally.amountPayRemaining, aci.value),
        aci.feeDeposit,
      );

      tally.amountPayRemaining = Amounts.sub(
        tally.amountPayRemaining,
        coinSpend,
      ).amount;
      contributions.push(coinSpend);
    }

    if (contributions.length) {
      const avKey = makeAvailabilityKey(
        aci.exchangeBaseUrl,
        aci.denomPubHash,
        aci.maxAge,
      );
      let sd = selectedDenom[avKey];
      if (!sd) {
        sd = {
          contributions: [],
          denomPubHash: aci.denomPubHash,
          exchangeBaseUrl: aci.exchangeBaseUrl,
          maxAge: aci.maxAge,
        };
      }
      sd.contributions.push(...contributions);
      selectedDenom[avKey] = sd;
    }

    if (Amounts.isZero(tally.amountPayRemaining)) {
      return selectedDenom;
    }
  }
  return undefined;
}

export function selectForced(
  req: SelectPayCoinRequestNg,
  candidateDenoms: AvailableDenom[],
): SelResult | undefined {
  const selectedDenom: SelResult = {};

  const forcedSelection = req.forcedSelection;
  checkLogicInvariant(!!forcedSelection);

  for (const forcedCoin of forcedSelection.coins) {
    let found = false;
    for (const aci of candidateDenoms) {
      if (aci.numAvailable <= 0) {
        continue;
      }
      if (Amounts.cmp(aci.value, forcedCoin.value) === 0) {
        aci.numAvailable--;
        const avKey = makeAvailabilityKey(
          aci.exchangeBaseUrl,
          aci.denomPubHash,
          aci.maxAge,
        );
        let sd = selectedDenom[avKey];
        if (!sd) {
          sd = {
            contributions: [],
            denomPubHash: aci.denomPubHash,
            exchangeBaseUrl: aci.exchangeBaseUrl,
            maxAge: aci.maxAge,
          };
        }
        sd.contributions.push(Amounts.parseOrThrow(forcedCoin.value));
        selectedDenom[avKey] = sd;
        found = true;
        break;
      }
    }
    if (!found) {
      throw Error("can't find coin for forced coin selection");
    }
  }

  return selectedDenom;
}

/**
 * Given a list of candidate coins, select coins to spend under the merchant's
 * constraints.
 *
 * The prevPayCoins can be specified to "repair" a coin selection
 * by adding additional coins, after a broken (e.g. double-spent) coin
 * has been removed from the selection.
 *
 * This function is only exported for the sake of unit tests.
 */
export async function selectPayCoinsNew(
  ws: InternalWalletState,
  req: SelectPayCoinRequestNg,
): Promise<PayCoinSelection | undefined> {
  const {
    contractTermsAmount,
    depositFeeLimit,
    wireFeeLimit,
    wireFeeAmortization,
  } = req;

  const [candidateDenoms, wireFeesPerExchange] = await selectCandidates(
    ws,
    req,
  );

  // logger.trace(`candidate denoms: ${j2s(candidateDenoms)}`);

  const coinPubs: string[] = [];
  const coinContributions: AmountJson[] = [];
  const currency = contractTermsAmount.currency;

  let tally: CoinSelectionTally = {
    amountPayRemaining: contractTermsAmount,
    amountWireFeeLimitRemaining: wireFeeLimit,
    amountDepositFeeLimitRemaining: depositFeeLimit,
    customerDepositFees: Amounts.zeroOfCurrency(currency),
    customerWireFees: Amounts.zeroOfCurrency(currency),
    wireFeeCoveredForExchange: new Set(),
  };

  const prevPayCoins = req.prevPayCoins ?? [];

  // Look at existing pay coin selection and tally up
  for (const prev of prevPayCoins) {
    tally = tallyFees(
      tally,
      wireFeesPerExchange,
      wireFeeAmortization,
      prev.exchangeBaseUrl,
      prev.feeDeposit,
    );
    tally.amountPayRemaining = Amounts.sub(
      tally.amountPayRemaining,
      prev.contribution,
    ).amount;

    coinPubs.push(prev.coinPub);
    coinContributions.push(prev.contribution);
  }

  let selectedDenom: SelResult | undefined;
  if (req.forcedSelection) {
    selectedDenom = selectForced(req, candidateDenoms);
  } else {
    // FIXME:  Here, we should select coins in a smarter way.
    // Instead of always spending the next-largest coin,
    // we should try to find the smallest coin that covers the
    // amount.
    selectedDenom = selectGreedy(
      req,
      candidateDenoms,
      wireFeesPerExchange,
      tally,
    );
  }

  if (!selectedDenom) {
    return undefined;
  }

  const finalSel = selectedDenom;

  logger.trace(`coin selection request ${j2s(req)}`);
  logger.trace(`selected coins (via denoms) for payment: ${j2s(finalSel)}`);

  await ws.db
    .mktx((x) => [x.coins, x.denominations])
    .runReadOnly(async (tx) => {
      for (const dph of Object.keys(finalSel)) {
        const selInfo = finalSel[dph];
        const numRequested = selInfo.contributions.length;
        const query = [
          selInfo.exchangeBaseUrl,
          selInfo.denomPubHash,
          selInfo.maxAge,
          CoinStatus.Fresh,
        ];
        logger.info(`query: ${j2s(query)}`);
        const coins =
          await tx.coins.indexes.byExchangeDenomPubHashAndAgeAndStatus.getAll(
            query,
            numRequested,
          );
        if (coins.length != numRequested) {
          throw Error(
            `coin selection failed (not available anymore, got only ${coins.length}/${numRequested})`,
          );
        }
        coinPubs.push(...coins.map((x) => x.coinPub));
        coinContributions.push(...selInfo.contributions);
      }
    });

  return {
    paymentAmount: Amounts.stringify(contractTermsAmount),
    coinContributions: coinContributions.map((x) => Amounts.stringify(x)),
    coinPubs,
    customerDepositFees: Amounts.stringify(tally.customerDepositFees),
    customerWireFees: Amounts.stringify(tally.customerWireFees),
  };
}

export async function checkPaymentByProposalId(
  ws: InternalWalletState,
  proposalId: string,
  sessionId?: string,
): Promise<PreparePayResult> {
  let proposal = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });
  if (!proposal) {
    // throw Error(`could not get proposal ${proposalId}`);
    return {
      status: PreparePayResultType.Lost,
    };
  }
  if (proposal.purchaseStatus === PurchaseStatus.RepurchaseDetected) {
    const existingProposalId = proposal.repurchaseProposalId;
    if (!existingProposalId) {
      throw Error("invalid proposal state");
    }
    logger.trace("using existing purchase for same product");
    proposal = await ws.db
      .mktx((x) => [x.purchases])
      .runReadOnly(async (tx) => {
        return tx.purchases.get(existingProposalId);
      });
    if (!proposal) {
      throw Error("existing proposal is in wrong state");
    }
  }
  const d = await expectProposalDownload(ws, proposal);
  const contractData = d.contractData;
  const merchantSig = d.contractData.merchantSig;
  if (!merchantSig) {
    throw Error("BUG: proposal is in invalid state");
  }

  proposalId = proposal.proposalId;

  const talerUri = constructPayUri(
    proposal.merchantBaseUrl,
    proposal.orderId,
    proposal.lastSessionId ?? proposal.downloadSessionId ?? "",
    proposal.claimToken,
    proposal.noncePriv,
  );

  // First check if we already paid for it.
  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });

  if (!purchase || purchase.purchaseStatus === PurchaseStatus.Proposed) {
    // If not already paid, check if we could pay for it.
    const res = await selectPayCoinsNew(ws, {
      auditors: contractData.allowedAuditors,
      exchanges: contractData.allowedExchanges,
      contractTermsAmount: Amounts.parseOrThrow(contractData.amount),
      depositFeeLimit: Amounts.parseOrThrow(contractData.maxDepositFee),
      wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
      wireFeeLimit: Amounts.parseOrThrow(contractData.maxWireFee),
      prevPayCoins: [],
      requiredMinimumAge: contractData.minimumAge,
      wireMethod: contractData.wireMethod,
    });

    if (!res) {
      logger.info("not allowing payment, insufficient coins");
      return {
        status: PreparePayResultType.InsufficientBalance,
        contractTerms: d.contractTermsRaw,
        proposalId: proposal.proposalId,
        noncePriv: proposal.noncePriv,
        amountRaw: Amounts.stringify(d.contractData.amount),
        talerUri,
      };
    }

    const totalCost = await getTotalPaymentCost(ws, res);
    logger.trace("costInfo", totalCost);
    logger.trace("coinsForPayment", res);

    return {
      status: PreparePayResultType.PaymentPossible,
      contractTerms: d.contractTermsRaw,
      proposalId: proposal.proposalId,
      noncePriv: proposal.noncePriv,
      amountEffective: Amounts.stringify(totalCost),
      amountRaw: Amounts.stringify(res.paymentAmount),
      contractTermsHash: d.contractData.contractTermsHash,
      talerUri,
    };
  }

  if (
    purchase.purchaseStatus === PurchaseStatus.Paid &&
    purchase.lastSessionId !== sessionId
  ) {
    logger.trace(
      "automatically re-submitting payment with different session ID",
    );
    logger.trace(`last: ${purchase.lastSessionId}, current: ${sessionId}`);
    await ws.db
      .mktx((x) => [x.purchases])
      .runReadWrite(async (tx) => {
        const p = await tx.purchases.get(proposalId);
        if (!p) {
          return;
        }
        p.lastSessionId = sessionId;
        p.purchaseStatus = PurchaseStatus.PayingReplay;
        await tx.purchases.put(p);
      });
    const r = await processPurchasePay(ws, proposalId, { forceNow: true });
    if (r.type !== OperationAttemptResultType.Finished) {
      // FIXME: This does not surface the original error
      throw Error("submitting pay failed");
    }
    const download = await expectProposalDownload(ws, purchase);
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: download.contractTermsRaw,
      contractTermsHash: download.contractData.contractTermsHash,
      paid: true,
      amountRaw: Amounts.stringify(download.contractData.amount),
      amountEffective: Amounts.stringify(purchase.payInfo?.totalPayCost!),
      proposalId,
      talerUri,
    };
  } else if (!purchase.timestampFirstSuccessfulPay) {
    const download = await expectProposalDownload(ws, purchase);
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: download.contractTermsRaw,
      contractTermsHash: download.contractData.contractTermsHash,
      paid: false,
      amountRaw: Amounts.stringify(download.contractData.amount),
      amountEffective: Amounts.stringify(purchase.payInfo?.totalPayCost!),
      proposalId,
      talerUri,
    };
  } else {
    const paid =
      purchase.purchaseStatus === PurchaseStatus.Paid ||
      purchase.purchaseStatus === PurchaseStatus.QueryingRefund ||
      purchase.purchaseStatus === PurchaseStatus.QueryingAutoRefund;
    const download = await expectProposalDownload(ws, purchase);
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: download.contractTermsRaw,
      contractTermsHash: download.contractData.contractTermsHash,
      paid,
      amountRaw: Amounts.stringify(download.contractData.amount),
      amountEffective: Amounts.stringify(purchase.payInfo?.totalPayCost!),
      ...(paid ? { nextUrl: download.contractData.orderId } : {}),
      proposalId,
      talerUri,
    };
  }
}

export async function getContractTermsDetails(
  ws: InternalWalletState,
  proposalId: string,
): Promise<WalletContractData> {
  const proposal = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });

  if (!proposal) {
    throw Error(`proposal with id ${proposalId} not found`);
  }

  const d = await expectProposalDownload(ws, proposal);

  return d.contractData;
}

/**
 * Check if a payment for the given taler://pay/ URI is possible.
 *
 * If the payment is possible, the signature are already generated but not
 * yet send to the merchant.
 */
export async function preparePayForUri(
  ws: InternalWalletState,
  talerPayUri: string,
): Promise<PreparePayResult> {
  const uriResult = parsePayUri(talerPayUri);

  if (!uriResult) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_INVALID_TALER_PAY_URI,
      {
        talerPayUri,
      },
      `invalid taler://pay URI (${talerPayUri})`,
    );
  }

  const proposalId = await startDownloadProposal(
    ws,
    uriResult.merchantBaseUrl,
    uriResult.orderId,
    uriResult.sessionId,
    uriResult.claimToken,
    uriResult.noncePriv,
  );

  return checkPaymentByProposalId(ws, proposalId, uriResult.sessionId);
}

/**
 * Generate deposit permissions for a purchase.
 *
 * Accesses the database and the crypto worker.
 */
export async function generateDepositPermissions(
  ws: InternalWalletState,
  payCoinSel: PayCoinSelection,
  contractData: WalletContractData,
): Promise<CoinDepositPermission[]> {
  const depositPermissions: CoinDepositPermission[] = [];
  const coinWithDenom: Array<{
    coin: CoinRecord;
    denom: DenominationRecord;
  }> = [];
  await ws.db
    .mktx((x) => [x.coins, x.denominations])
    .runReadOnly(async (tx) => {
      for (let i = 0; i < payCoinSel.coinPubs.length; i++) {
        const coin = await tx.coins.get(payCoinSel.coinPubs[i]);
        if (!coin) {
          throw Error("can't pay, allocated coin not found anymore");
        }
        const denom = await tx.denominations.get([
          coin.exchangeBaseUrl,
          coin.denomPubHash,
        ]);
        if (!denom) {
          throw Error(
            "can't pay, denomination of allocated coin not found anymore",
          );
        }
        coinWithDenom.push({ coin, denom });
      }
    });

  for (let i = 0; i < payCoinSel.coinPubs.length; i++) {
    const { coin, denom } = coinWithDenom[i];
    let wireInfoHash: string;
    wireInfoHash = contractData.wireInfoHash;
    logger.trace(
      `signing deposit permission for coin with ageRestriction=${j2s(
        coin.ageCommitmentProof,
      )}`,
    );
    const dp = await ws.cryptoApi.signDepositPermission({
      coinPriv: coin.coinPriv,
      coinPub: coin.coinPub,
      contractTermsHash: contractData.contractTermsHash,
      denomPubHash: coin.denomPubHash,
      denomKeyType: denom.denomPub.cipher,
      denomSig: coin.denomSig,
      exchangeBaseUrl: coin.exchangeBaseUrl,
      feeDeposit: Amounts.parseOrThrow(denom.fees.feeDeposit),
      merchantPub: contractData.merchantPub,
      refundDeadline: contractData.refundDeadline,
      spendAmount: Amounts.parseOrThrow(payCoinSel.coinContributions[i]),
      timestamp: contractData.timestamp,
      wireInfoHash,
      ageCommitmentProof: coin.ageCommitmentProof,
      requiredMinimumAge: contractData.minimumAge,
    });
    depositPermissions.push(dp);
  }
  return depositPermissions;
}

/**
 * Run the operation handler for a payment
 * and return the result as a {@link ConfirmPayResult}.
 */
export async function runPayForConfirmPay(
  ws: InternalWalletState,
  proposalId: string,
): Promise<ConfirmPayResult> {
  const res = await processPurchasePay(ws, proposalId, { forceNow: true });
  switch (res.type) {
    case OperationAttemptResultType.Finished: {
      const purchase = await ws.db
        .mktx((x) => [x.purchases])
        .runReadOnly(async (tx) => {
          return tx.purchases.get(proposalId);
        });
      if (!purchase) {
        throw Error("purchase record not available anymore");
      }
      const d = await expectProposalDownload(ws, purchase);
      return {
        type: ConfirmPayResultType.Done,
        contractTerms: d.contractTermsRaw,
        transactionId: makeTransactionId(TransactionType.Payment, proposalId),
      };
    }
    case OperationAttemptResultType.Error: {
      // We hide transient errors from the caller.
      const opRetry = await ws.db
        .mktx((x) => [x.operationRetries])
        .runReadOnly(async (tx) =>
          tx.operationRetries.get(RetryTags.byPaymentProposalId(proposalId)),
        );
      const maxRetry = 3;
      const numRetry = opRetry?.retryInfo.retryCounter ?? 0;
      if (
        res.errorDetail.code ===
          TalerErrorCode.WALLET_PAY_MERCHANT_SERVER_ERROR &&
        numRetry < maxRetry
      ) {
        // Pretend the operation is pending instead of reporting
        // an error, but only up to maxRetry attempts.
        await storeOperationPending(
          ws,
          RetryTags.byPaymentProposalId(proposalId),
        );
        return {
          type: ConfirmPayResultType.Pending,
          lastError: opRetry?.lastError,
          transactionId: makeTransactionId(TransactionType.Payment, proposalId),
        };
      } else {
        // FIXME: allocate error code!
        await storeOperationError(
          ws,
          RetryTags.byPaymentProposalId(proposalId),
          res.errorDetail,
        );
        throw Error("payment failed");
      }
    }
    case OperationAttemptResultType.Pending:
      await storeOperationPending(
        ws,
        `${PendingTaskType.Purchase}:${proposalId}`,
      );
      return {
        type: ConfirmPayResultType.Pending,
        transactionId: makeTransactionId(TransactionType.Payment, proposalId),
        lastError: undefined,
      };
    case OperationAttemptResultType.Longpoll:
      throw Error("unexpected processPurchasePay result (longpoll)");
    default:
      assertUnreachable(res);
  }
}

/**
 * Confirm payment for a proposal previously claimed by the wallet.
 */
export async function confirmPay(
  ws: InternalWalletState,
  proposalId: string,
  sessionIdOverride?: string,
  forcedCoinSel?: ForcedCoinSel,
): Promise<ConfirmPayResult> {
  logger.trace(
    `executing confirmPay with proposalId ${proposalId} and sessionIdOverride ${sessionIdOverride}`,
  );
  const proposal = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });

  if (!proposal) {
    throw Error(`proposal with id ${proposalId} not found`);
  }

  const d = await expectProposalDownload(ws, proposal);
  if (!d) {
    throw Error("proposal is in invalid state");
  }

  const existingPurchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const purchase = await tx.purchases.get(proposalId);
      if (
        purchase &&
        sessionIdOverride !== undefined &&
        sessionIdOverride != purchase.lastSessionId
      ) {
        logger.trace(`changing session ID to ${sessionIdOverride}`);
        purchase.lastSessionId = sessionIdOverride;
        if (purchase.purchaseStatus === PurchaseStatus.Paid) {
          purchase.purchaseStatus = PurchaseStatus.PayingReplay;
        }
        await tx.purchases.put(purchase);
      }
      return purchase;
    });

  if (existingPurchase && existingPurchase.payInfo) {
    logger.trace("confirmPay: submitting payment for existing purchase");
    return runPayForConfirmPay(ws, proposalId);
  }

  logger.trace("confirmPay: purchase record does not exist yet");

  const contractData = d.contractData;

  let maybeCoinSelection: PayCoinSelection | undefined = undefined;

  maybeCoinSelection = await selectPayCoinsNew(ws, {
    auditors: contractData.allowedAuditors,
    exchanges: contractData.allowedExchanges,
    wireMethod: contractData.wireMethod,
    contractTermsAmount: Amounts.parseOrThrow(contractData.amount),
    depositFeeLimit: Amounts.parseOrThrow(contractData.maxDepositFee),
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: Amounts.parseOrThrow(contractData.maxWireFee),
    prevPayCoins: [],
    requiredMinimumAge: contractData.minimumAge,
    forcedSelection: forcedCoinSel,
  });

  logger.trace("coin selection result", maybeCoinSelection);

  if (!maybeCoinSelection) {
    // Should not happen, since checkPay should be called first
    // FIXME: Actually, this should be handled gracefully,
    // and the status should be stored in the DB.
    logger.warn("not confirming payment, insufficient coins");
    throw Error("insufficient balance");
  }

  const coinSelection = maybeCoinSelection;

  const depositPermissions = await generateDepositPermissions(
    ws,
    coinSelection,
    d.contractData,
  );

  const payCostInfo = await getTotalPaymentCost(ws, coinSelection);

  let sessionId: string | undefined;
  if (sessionIdOverride) {
    sessionId = sessionIdOverride;
  } else {
    sessionId = proposal.downloadSessionId;
  }

  logger.trace(
    `recording payment on ${proposal.orderId} with session ID ${sessionId}`,
  );

  await ws.db
    .mktx((x) => [
      x.purchases,
      x.coins,
      x.refreshGroups,
      x.denominations,
      x.coinAvailability,
    ])
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposal.proposalId);
      if (!p) {
        return;
      }
      switch (p.purchaseStatus) {
        case PurchaseStatus.Proposed:
          p.payInfo = {
            payCoinSelection: coinSelection,
            payCoinSelectionUid: encodeCrock(getRandomBytes(16)),
            totalPayCost: Amounts.stringify(payCostInfo),
          };
          p.lastSessionId = sessionId;
          p.timestampAccept = TalerProtocolTimestamp.now();
          p.purchaseStatus = PurchaseStatus.Paying;
          await tx.purchases.put(p);
          await spendCoins(ws, tx, {
            allocationId: `txn:proposal:${p.proposalId}`,
            coinPubs: coinSelection.coinPubs,
            contributions: coinSelection.coinContributions.map((x) =>
              Amounts.parseOrThrow(x),
            ),
            refreshReason: RefreshReason.PayMerchant,
          });
          break;
        case PurchaseStatus.Paid:
        case PurchaseStatus.Paying:
        default:
          break;
      }
    });

  ws.notify({
    type: NotificationType.ProposalAccepted,
    proposalId: proposal.proposalId,
  });

  return runPayForConfirmPay(ws, proposalId);
}

export async function processPurchase(
  ws: InternalWalletState,
  proposalId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<OperationAttemptResult> {
  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });
  if (!purchase) {
    return {
      type: OperationAttemptResultType.Error,
      errorDetail: {
        // FIXME: allocate more specific error code
        code: TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
        hint: `trying to pay for purchase that is not in the database`,
        proposalId: proposalId,
      },
    };
  }

  switch (purchase.purchaseStatus) {
    case PurchaseStatus.DownloadingProposal:
      return processDownloadProposal(ws, proposalId, options);
    case PurchaseStatus.Paying:
    case PurchaseStatus.PayingReplay:
      return processPurchasePay(ws, proposalId, options);
    case PurchaseStatus.QueryingRefund:
    case PurchaseStatus.QueryingAutoRefund:
    case PurchaseStatus.AbortingWithRefund:
      return processPurchaseQueryRefund(ws, proposalId, options);
    case PurchaseStatus.ProposalDownloadFailed:
    case PurchaseStatus.Paid:
    case PurchaseStatus.RepurchaseDetected:
    case PurchaseStatus.Proposed:
    case PurchaseStatus.ProposalRefused:
    case PurchaseStatus.PaymentAbortFinished:
      return {
        type: OperationAttemptResultType.Finished,
        result: undefined,
      };
    default:
      assertUnreachable(purchase.purchaseStatus);
    // throw Error(`unexpected purchase status (${purchase.purchaseStatus})`);
  }
}

export async function processPurchasePay(
  ws: InternalWalletState,
  proposalId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<OperationAttemptResult> {
  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });
  if (!purchase) {
    return {
      type: OperationAttemptResultType.Error,
      errorDetail: {
        // FIXME: allocate more specific error code
        code: TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
        hint: `trying to pay for purchase that is not in the database`,
        proposalId: proposalId,
      },
    };
  }
  switch (purchase.purchaseStatus) {
    case PurchaseStatus.Paying:
    case PurchaseStatus.PayingReplay:
      break;
    default:
      return OperationAttemptResult.finishedEmpty();
  }
  logger.trace(`processing purchase pay ${proposalId}`);

  const sessionId = purchase.lastSessionId;

  logger.trace(`paying with session ID ${sessionId}`);
  const payInfo = purchase.payInfo;
  checkDbInvariant(!!payInfo, "payInfo");

  const download = await expectProposalDownload(ws, purchase);
  if (!purchase.merchantPaySig) {
    const payUrl = new URL(
      `orders/${download.contractData.orderId}/pay`,
      download.contractData.merchantBaseUrl,
    ).href;

    let depositPermissions: CoinDepositPermission[];
    // FIXME: Cache!
    depositPermissions = await generateDepositPermissions(
      ws,
      payInfo.payCoinSelection,
      download.contractData,
    );

    const reqBody = {
      coins: depositPermissions,
      session_id: purchase.lastSessionId,
    };

    logger.trace(
      "making pay request ... ",
      JSON.stringify(reqBody, undefined, 2),
    );

    const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], () =>
      ws.http.postJson(payUrl, reqBody, {
        timeout: getPayRequestTimeout(purchase),
      }),
    );

    logger.trace(`got resp ${JSON.stringify(resp)}`);

    if (resp.status >= 500 && resp.status <= 599) {
      const errDetails = await readUnexpectedResponseDetails(resp);
      return {
        type: OperationAttemptResultType.Error,
        errorDetail: makeErrorDetail(
          TalerErrorCode.WALLET_PAY_MERCHANT_SERVER_ERROR,
          {
            requestError: errDetails,
          },
        ),
      };
    }

    if (resp.status === HttpStatusCode.BadRequest) {
      const errDetails = await readUnexpectedResponseDetails(resp);
      logger.warn("unexpected 400 response for /pay");
      logger.warn(j2s(errDetails));
      await ws.db
        .mktx((x) => [x.purchases])
        .runReadWrite(async (tx) => {
          const purch = await tx.purchases.get(proposalId);
          if (!purch) {
            return;
          }
          // FIXME: Should be some "PayPermanentlyFailed" and error info should be stored
          purch.purchaseStatus = PurchaseStatus.PaymentAbortFinished;
          await tx.purchases.put(purch);
        });
      throw makePendingOperationFailedError(
        errDetails,
        TransactionType.Payment,
        proposalId,
      );
    }

    if (resp.status === HttpStatusCode.Gone) {
      const errDetails = await readUnexpectedResponseDetails(resp);
      logger.warn("unexpected 410 response for /pay");
      logger.warn(j2s(errDetails));
      await ws.db
        .mktx((x) => [x.purchases])
        .runReadWrite(async (tx) => {
          const purch = await tx.purchases.get(proposalId);
          if (!purch) {
            return;
          }
          // FIXME: Should be some "PayPermanentlyFailed" and error info should be stored
          purch.purchaseStatus = PurchaseStatus.PaymentAbortFinished;
          await tx.purchases.put(purch);
        });
      throw makePendingOperationFailedError(
        errDetails,
        TransactionType.Payment,
        proposalId,
      );
    }

    if (resp.status === HttpStatusCode.Conflict) {
      const err = await readTalerErrorResponse(resp);
      if (
        err.code ===
        TalerErrorCode.MERCHANT_POST_ORDERS_ID_PAY_INSUFFICIENT_FUNDS
      ) {
        // Do this in the background, as it might take some time
        handleInsufficientFunds(ws, proposalId, err).catch(async (e) => {
          console.log("handling insufficient funds failed");

          await scheduleRetry(ws, RetryTags.forPay(purchase), {
            code: TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
            message: "unexpected exception",
            hint: "unexpected exception",
            details: {
              exception: e.toString(),
            },
          });
        });

        return {
          type: OperationAttemptResultType.Pending,
          result: undefined,
        };
      }
    }

    const merchantResp = await readSuccessResponseJsonOrThrow(
      resp,
      codecForMerchantPayResponse(),
    );

    logger.trace("got success from pay URL", merchantResp);

    const merchantPub = download.contractData.merchantPub;
    const { valid } = await ws.cryptoApi.isValidPaymentSignature({
      contractHash: download.contractData.contractTermsHash,
      merchantPub,
      sig: merchantResp.sig,
    });

    if (!valid) {
      logger.error("merchant payment signature invalid");
      // FIXME: properly display error
      throw Error("merchant payment signature invalid");
    }

    await storeFirstPaySuccess(ws, proposalId, sessionId, merchantResp.sig);
    await unblockBackup(ws, proposalId);
  } else {
    const payAgainUrl = new URL(
      `orders/${download.contractData.orderId}/paid`,
      download.contractData.merchantBaseUrl,
    ).href;
    const reqBody = {
      sig: purchase.merchantPaySig,
      h_contract: download.contractData.contractTermsHash,
      session_id: sessionId ?? "",
    };
    logger.trace(`/paid request body: ${j2s(reqBody)}`);
    const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], () =>
      ws.http.postJson(payAgainUrl, reqBody),
    );
    logger.trace(`/paid response status: ${resp.status}`);
    if (resp.status !== 204) {
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
        getHttpResponseErrorDetails(resp),
        "/paid failed",
      );
    }
    await storePayReplaySuccess(ws, proposalId, sessionId);
    await unblockBackup(ws, proposalId);
  }

  ws.notify({
    type: NotificationType.PayOperationSuccess,
    proposalId: purchase.proposalId,
  });

  return OperationAttemptResult.finishedEmpty();
}

export async function refuseProposal(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const success = await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const proposal = await tx.purchases.get(proposalId);
      if (!proposal) {
        logger.trace(`proposal ${proposalId} not found, won't refuse proposal`);
        return false;
      }
      if (proposal.purchaseStatus !== PurchaseStatus.Proposed) {
        return false;
      }
      proposal.purchaseStatus = PurchaseStatus.ProposalRefused;
      await tx.purchases.put(proposal);
      return true;
    });
  if (success) {
    ws.notify({
      type: NotificationType.ProposalRefused,
    });
  }
}

export async function prepareRefund(
  ws: InternalWalletState,
  talerRefundUri: string,
): Promise<PrepareRefundResult> {
  const parseResult = parseRefundUri(talerRefundUri);

  logger.trace("preparing refund offer", parseResult);

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.indexes.byUrlAndOrderId.get([
        parseResult.merchantBaseUrl,
        parseResult.orderId,
      ]);
    });

  if (!purchase) {
    throw Error(
      `no purchase for the taler://refund/ URI (${talerRefundUri}) was found`,
    );
  }

  const awaiting = await queryAndSaveAwaitingRefund(ws, purchase);
  const summary = await calculateRefundSummary(ws, purchase);
  const proposalId = purchase.proposalId;

  const { contractData: c } = await expectProposalDownload(ws, purchase);

  return {
    proposalId,
    effectivePaid: Amounts.stringify(summary.amountEffectivePaid),
    gone: Amounts.stringify(summary.amountRefundGone),
    granted: Amounts.stringify(summary.amountRefundGranted),
    pending: summary.pendingAtExchange,
    awaiting: Amounts.stringify(awaiting),
    info: {
      contractTermsHash: c.contractTermsHash,
      merchant: c.merchant,
      orderId: c.orderId,
      products: c.products,
      summary: c.summary,
      fulfillmentMessage: c.fulfillmentMessage,
      summary_i18n: c.summaryI18n,
      fulfillmentMessage_i18n: c.fulfillmentMessageI18n,
    },
  };
}

function getRefundKey(d: MerchantCoinRefundStatus): string {
  return `${d.coin_pub}-${d.rtransaction_id}`;
}

async function applySuccessfulRefund(
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  p: PurchaseRecord,
  refreshCoinsMap: Record<string, CoinRefreshRequest>,
  r: MerchantCoinRefundSuccessStatus,
): Promise<void> {
  // FIXME: check signature before storing it as valid!

  const refundKey = getRefundKey(r);
  const coin = await tx.coins.get(r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.denominations.get([
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);
  if (!denom) {
    throw Error("inconsistent database");
  }
  const refundAmount = Amounts.parseOrThrow(r.refund_amount);
  const refundFee = denom.fees.feeRefund;
  const amountLeft = Amounts.sub(refundAmount, refundFee).amount;
  coin.status = CoinStatus.Dormant;
  await tx.coins.put(coin);

  const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
    .iter(coin.exchangeBaseUrl)
    .toArray();
  const totalRefreshCostBound = getTotalRefreshCost(
    allDenoms,
    DenominationRecord.toDenomInfo(denom),
    amountLeft,
  );

  refreshCoinsMap[coin.coinPub] = {
    coinPub: coin.coinPub,
    amount: Amounts.stringify(amountLeft),
  };

  p.refunds[refundKey] = {
    type: RefundState.Applied,
    obtainedTime: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    executionTime: r.execution_time,
    refundAmount: Amounts.stringify(r.refund_amount),
    refundFee: Amounts.stringify(denom.fees.feeRefund),
    totalRefreshCostBound: Amounts.stringify(totalRefreshCostBound),
    coinPub: r.coin_pub,
    rtransactionId: r.rtransaction_id,
  };
}

async function storePendingRefund(
  tx: GetReadWriteAccess<{
    denominations: typeof WalletStoresV1.denominations;
    coins: typeof WalletStoresV1.coins;
  }>,
  p: PurchaseRecord,
  r: MerchantCoinRefundFailureStatus,
): Promise<void> {
  const refundKey = getRefundKey(r);

  const coin = await tx.coins.get(r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.denominations.get([
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
    .iter(coin.exchangeBaseUrl)
    .toArray();

  // Refunded amount after fees.
  const amountLeft = Amounts.sub(
    Amounts.parseOrThrow(r.refund_amount),
    denom.fees.feeRefund,
  ).amount;

  const totalRefreshCostBound = getTotalRefreshCost(
    allDenoms,
    DenominationRecord.toDenomInfo(denom),
    amountLeft,
  );

  p.refunds[refundKey] = {
    type: RefundState.Pending,
    obtainedTime: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    executionTime: r.execution_time,
    refundAmount: Amounts.stringify(r.refund_amount),
    refundFee: Amounts.stringify(denom.fees.feeRefund),
    totalRefreshCostBound: Amounts.stringify(totalRefreshCostBound),
    coinPub: r.coin_pub,
    rtransactionId: r.rtransaction_id,
  };
}

async function storeFailedRefund(
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  p: PurchaseRecord,
  refreshCoinsMap: Record<string, CoinRefreshRequest>,
  r: MerchantCoinRefundFailureStatus,
): Promise<void> {
  const refundKey = getRefundKey(r);

  const coin = await tx.coins.get(r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.denominations.get([
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
    .iter(coin.exchangeBaseUrl)
    .toArray();

  const amountLeft = Amounts.sub(
    Amounts.parseOrThrow(r.refund_amount),
    denom.fees.feeRefund,
  ).amount;

  const totalRefreshCostBound = getTotalRefreshCost(
    allDenoms,
    DenominationRecord.toDenomInfo(denom),
    amountLeft,
  );

  p.refunds[refundKey] = {
    type: RefundState.Failed,
    obtainedTime: TalerProtocolTimestamp.now(),
    executionTime: r.execution_time,
    refundAmount: Amounts.stringify(r.refund_amount),
    refundFee: Amounts.stringify(denom.fees.feeRefund),
    totalRefreshCostBound: Amounts.stringify(totalRefreshCostBound),
    coinPub: r.coin_pub,
    rtransactionId: r.rtransaction_id,
  };

  if (p.purchaseStatus === PurchaseStatus.AbortingWithRefund) {
    // Refund failed because the merchant didn't even try to deposit
    // the coin yet, so we try to refresh.
    // FIXME: Is this case tested?!
    if (r.exchange_code === TalerErrorCode.EXCHANGE_REFUND_DEPOSIT_NOT_FOUND) {
      const coin = await tx.coins.get(r.coin_pub);
      if (!coin) {
        logger.warn("coin not found, can't apply refund");
        return;
      }
      const denom = await tx.denominations.get([
        coin.exchangeBaseUrl,
        coin.denomPubHash,
      ]);
      if (!denom) {
        logger.warn("denomination for coin missing");
        return;
      }
      const payCoinSelection = p.payInfo?.payCoinSelection;
      if (!payCoinSelection) {
        logger.warn("no pay coin selection, can't apply refund");
        return;
      }
      let contrib: AmountJson | undefined;
      for (let i = 0; i < payCoinSelection.coinPubs.length; i++) {
        if (payCoinSelection.coinPubs[i] === r.coin_pub) {
          contrib = Amounts.parseOrThrow(payCoinSelection.coinContributions[i]);
        }
      }
      // FIXME: Is this case tested?!
      refreshCoinsMap[coin.coinPub] = {
        coinPub: coin.coinPub,
        amount: Amounts.stringify(amountLeft),
      };
      await tx.coins.put(coin);
    }
  }
}

async function acceptRefunds(
  ws: InternalWalletState,
  proposalId: string,
  refunds: MerchantCoinRefundStatus[],
  reason: RefundReason,
): Promise<void> {
  logger.trace("handling refunds", refunds);
  const now = TalerProtocolTimestamp.now();

  await ws.db
    .mktx((x) => [
      x.purchases,
      x.coins,
      x.coinAvailability,
      x.denominations,
      x.refreshGroups,
    ])
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
      if (!p) {
        logger.error("purchase not found, not adding refunds");
        return;
      }

      const refreshCoinsMap: Record<string, CoinRefreshRequest> = {};

      for (const refundStatus of refunds) {
        const refundKey = getRefundKey(refundStatus);
        const existingRefundInfo = p.refunds[refundKey];

        const isPermanentFailure =
          refundStatus.type === "failure" &&
          refundStatus.exchange_status >= 400 &&
          refundStatus.exchange_status < 500;

        // Already failed.
        if (existingRefundInfo?.type === RefundState.Failed) {
          continue;
        }

        // Already applied.
        if (existingRefundInfo?.type === RefundState.Applied) {
          continue;
        }

        // Still pending.
        if (
          refundStatus.type === "failure" &&
          !isPermanentFailure &&
          existingRefundInfo?.type === RefundState.Pending
        ) {
          continue;
        }

        // Invariant: (!existingRefundInfo) || (existingRefundInfo === Pending)

        if (refundStatus.type === "success") {
          await applySuccessfulRefund(tx, p, refreshCoinsMap, refundStatus);
        } else if (isPermanentFailure) {
          await storeFailedRefund(tx, p, refreshCoinsMap, refundStatus);
        } else {
          await storePendingRefund(tx, p, refundStatus);
        }
      }

      const refreshCoinsPubs = Object.values(refreshCoinsMap);
      logger.info(`refreshCoinMap ${j2s(refreshCoinsMap)}`);
      if (refreshCoinsPubs.length > 0) {
        await createRefreshGroup(
          ws,
          tx,
          refreshCoinsPubs,
          RefreshReason.Refund,
        );
      }

      // Are we done with querying yet, or do we need to do another round
      // after a retry delay?
      let queryDone = true;

      let numPendingRefunds = 0;
      for (const ri of Object.values(p.refunds)) {
        switch (ri.type) {
          case RefundState.Pending:
            numPendingRefunds++;
            break;
        }
      }

      if (numPendingRefunds > 0) {
        queryDone = false;
      }

      if (queryDone) {
        p.timestampLastRefundStatus = now;
        if (p.purchaseStatus === PurchaseStatus.AbortingWithRefund) {
          p.purchaseStatus = PurchaseStatus.PaymentAbortFinished;
        } else if (p.purchaseStatus === PurchaseStatus.QueryingAutoRefund) {
          const autoRefundDeadline = p.autoRefundDeadline;
          checkDbInvariant(!!autoRefundDeadline);
          if (
            AbsoluteTime.isExpired(
              AbsoluteTime.fromTimestamp(autoRefundDeadline),
            )
          ) {
            p.purchaseStatus = PurchaseStatus.Paid;
          }
        } else if (p.purchaseStatus === PurchaseStatus.QueryingRefund) {
          p.purchaseStatus = PurchaseStatus.Paid;
        }
        logger.trace("refund query done");
      } else {
        // No error, but we need to try again!
        p.timestampLastRefundStatus = now;
        logger.trace("refund query not done");
      }

      await tx.purchases.put(p);
    });

  ws.notify({
    type: NotificationType.RefundQueried,
  });
}

async function calculateRefundSummary(
  ws: InternalWalletState,
  p: PurchaseRecord,
): Promise<RefundSummary> {
  const download = await expectProposalDownload(ws, p);
  let amountRefundGranted = Amounts.zeroOfAmount(download.contractData.amount);
  let amountRefundGone = Amounts.zeroOfAmount(download.contractData.amount);

  let pendingAtExchange = false;

  const payInfo = p.payInfo;
  if (!payInfo) {
    throw Error("can't calculate refund summary without payInfo");
  }

  Object.keys(p.refunds).forEach((rk) => {
    const refund = p.refunds[rk];
    if (refund.type === RefundState.Pending) {
      pendingAtExchange = true;
    }
    if (
      refund.type === RefundState.Applied ||
      refund.type === RefundState.Pending
    ) {
      amountRefundGranted = Amounts.add(
        amountRefundGranted,
        Amounts.sub(
          refund.refundAmount,
          refund.refundFee,
          refund.totalRefreshCostBound,
        ).amount,
      ).amount;
    } else {
      amountRefundGone = Amounts.add(
        amountRefundGone,
        refund.refundAmount,
      ).amount;
    }
  });
  return {
    amountEffectivePaid: Amounts.parseOrThrow(payInfo.totalPayCost),
    amountRefundGone,
    amountRefundGranted,
    pendingAtExchange,
  };
}

/**
 * Summary of the refund status of a purchase.
 */
export interface RefundSummary {
  pendingAtExchange: boolean;
  amountEffectivePaid: AmountJson;
  amountRefundGranted: AmountJson;
  amountRefundGone: AmountJson;
}

/**
 * Accept a refund, return the contract hash for the contract
 * that was involved in the refund.
 */
export async function applyRefund(
  ws: InternalWalletState,
  talerRefundUri: string,
): Promise<ApplyRefundResponse> {
  const parseResult = parseRefundUri(talerRefundUri);

  logger.trace("applying refund", parseResult);

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.indexes.byUrlAndOrderId.get([
        parseResult.merchantBaseUrl,
        parseResult.orderId,
      ]);
    });

  if (!purchase) {
    throw Error(
      `no purchase for the taler://refund/ URI (${talerRefundUri}) was found`,
    );
  }

  return applyRefundFromPurchaseId(ws, purchase.proposalId);
}

export async function applyRefundFromPurchaseId(
  ws: InternalWalletState,
  proposalId: string,
): Promise<ApplyRefundResponse> {
  logger.trace("applying refund for purchase", proposalId);

  logger.info("processing purchase for refund");
  const success = await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
      if (!p) {
        logger.error("no purchase found for refund URL");
        return false;
      }
      if (p.purchaseStatus === PurchaseStatus.Paid) {
        p.purchaseStatus = PurchaseStatus.QueryingRefund;
      }
      await tx.purchases.put(p);
      return true;
    });

  if (success) {
    ws.notify({
      type: NotificationType.RefundStarted,
    });
    await processPurchaseQueryRefund(ws, proposalId, {
      forceNow: true,
      waitForAutoRefund: false,
    });
  }

  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });

  if (!purchase) {
    throw Error("purchase no longer exists");
  }

  const summary = await calculateRefundSummary(ws, purchase);
  const download = await expectProposalDownload(ws, purchase);

  return {
    contractTermsHash: download.contractData.contractTermsHash,
    proposalId: purchase.proposalId,
    transactionId: makeTransactionId(TransactionType.Payment, proposalId), //FIXME: can we have the tx id of the refund
    amountEffectivePaid: Amounts.stringify(summary.amountEffectivePaid),
    amountRefundGone: Amounts.stringify(summary.amountRefundGone),
    amountRefundGranted: Amounts.stringify(summary.amountRefundGranted),
    pendingAtExchange: summary.pendingAtExchange,
    info: {
      contractTermsHash: download.contractData.contractTermsHash,
      merchant: download.contractData.merchant,
      orderId: download.contractData.orderId,
      products: download.contractData.products,
      summary: download.contractData.summary,
      fulfillmentMessage: download.contractData.fulfillmentMessage,
      summary_i18n: download.contractData.summaryI18n,
      fulfillmentMessage_i18n: download.contractData.fulfillmentMessageI18n,
    },
  };
}

async function queryAndSaveAwaitingRefund(
  ws: InternalWalletState,
  purchase: PurchaseRecord,
  waitForAutoRefund?: boolean,
): Promise<AmountJson> {
  const download = await expectProposalDownload(ws, purchase);
  const requestUrl = new URL(
    `orders/${download.contractData.orderId}`,
    download.contractData.merchantBaseUrl,
  );
  requestUrl.searchParams.set(
    "h_contract",
    download.contractData.contractTermsHash,
  );
  // Long-poll for one second
  if (waitForAutoRefund) {
    requestUrl.searchParams.set("timeout_ms", "1000");
    requestUrl.searchParams.set("await_refund_obtained", "yes");
    logger.trace("making long-polling request for auto-refund");
  }
  const resp = await ws.http.get(requestUrl.href);
  const orderStatus = await readSuccessResponseJsonOrThrow(
    resp,
    codecForMerchantOrderStatusPaid(),
  );
  if (!orderStatus.refunded) {
    // Wait for retry ...
    return Amounts.zeroOfAmount(download.contractData.amount);
  }

  const refundAwaiting = Amounts.sub(
    Amounts.parseOrThrow(orderStatus.refund_amount),
    Amounts.parseOrThrow(orderStatus.refund_taken),
  ).amount;

  if (
    purchase.refundAmountAwaiting === undefined ||
    Amounts.cmp(refundAwaiting, purchase.refundAmountAwaiting) !== 0
  ) {
    await ws.db
      .mktx((x) => [x.purchases])
      .runReadWrite(async (tx) => {
        const p = await tx.purchases.get(purchase.proposalId);
        if (!p) {
          logger.warn("purchase does not exist anymore");
          return;
        }
        p.refundAmountAwaiting = Amounts.stringify(refundAwaiting);
        await tx.purchases.put(p);
      });
  }

  return refundAwaiting;
}

export async function processPurchaseQueryRefund(
  ws: InternalWalletState,
  proposalId: string,
  options: {
    forceNow?: boolean;
    waitForAutoRefund?: boolean;
  } = {},
): Promise<OperationAttemptResult> {
  logger.trace(`processing refund query for proposal ${proposalId}`);
  const waitForAutoRefund = options.waitForAutoRefund ?? false;
  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });
  if (!purchase) {
    return OperationAttemptResult.finishedEmpty();
  }

  if (
    !(
      purchase.purchaseStatus === PurchaseStatus.QueryingAutoRefund ||
      purchase.purchaseStatus === PurchaseStatus.QueryingRefund ||
      purchase.purchaseStatus === PurchaseStatus.AbortingWithRefund
    )
  ) {
    return OperationAttemptResult.finishedEmpty();
  }

  const download = await expectProposalDownload(ws, purchase);

  if (purchase.timestampFirstSuccessfulPay) {
    if (
      !purchase.autoRefundDeadline ||
      !AbsoluteTime.isExpired(
        AbsoluteTime.fromTimestamp(purchase.autoRefundDeadline),
      )
    ) {
      const awaitingAmount = await queryAndSaveAwaitingRefund(
        ws,
        purchase,
        waitForAutoRefund,
      );
      if (Amounts.isZero(awaitingAmount)) {
        return OperationAttemptResult.finishedEmpty();
      }
    }

    const requestUrl = new URL(
      `orders/${download.contractData.orderId}/refund`,
      download.contractData.merchantBaseUrl,
    );

    logger.trace(`making refund request to ${requestUrl.href}`);

    const request = await ws.http.postJson(requestUrl.href, {
      h_contract: download.contractData.contractTermsHash,
    });

    const refundResponse = await readSuccessResponseJsonOrThrow(
      request,
      codecForMerchantOrderRefundPickupResponse(),
    );

    await acceptRefunds(
      ws,
      proposalId,
      refundResponse.refunds,
      RefundReason.NormalRefund,
    );
  } else if (purchase.purchaseStatus === PurchaseStatus.AbortingWithRefund) {
    const requestUrl = new URL(
      `orders/${download.contractData.orderId}/abort`,
      download.contractData.merchantBaseUrl,
    );

    const abortingCoins: AbortingCoin[] = [];

    const payCoinSelection = purchase.payInfo?.payCoinSelection;
    if (!payCoinSelection) {
      throw Error("can't abort, no coins selected");
    }

    await ws.db
      .mktx((x) => [x.coins])
      .runReadOnly(async (tx) => {
        for (let i = 0; i < payCoinSelection.coinPubs.length; i++) {
          const coinPub = payCoinSelection.coinPubs[i];
          const coin = await tx.coins.get(coinPub);
          checkDbInvariant(!!coin, "expected coin to be present");
          abortingCoins.push({
            coin_pub: coinPub,
            contribution: Amounts.stringify(
              payCoinSelection.coinContributions[i],
            ),
            exchange_url: coin.exchangeBaseUrl,
          });
        }
      });

    const abortReq: AbortRequest = {
      h_contract: download.contractData.contractTermsHash,
      coins: abortingCoins,
    };

    logger.trace(`making order abort request to ${requestUrl.href}`);

    const request = await ws.http.postJson(requestUrl.href, abortReq);
    const abortResp = await readSuccessResponseJsonOrThrow(
      request,
      codecForAbortResponse(),
    );

    const refunds: MerchantCoinRefundStatus[] = [];

    if (abortResp.refunds.length != abortingCoins.length) {
      // FIXME: define error code!
      throw Error("invalid order abort response");
    }

    for (let i = 0; i < abortResp.refunds.length; i++) {
      const r = abortResp.refunds[i];
      refunds.push({
        ...r,
        coin_pub: payCoinSelection.coinPubs[i],
        refund_amount: Amounts.stringify(payCoinSelection.coinContributions[i]),
        rtransaction_id: 0,
        execution_time: AbsoluteTime.toTimestamp(
          AbsoluteTime.addDuration(
            AbsoluteTime.fromTimestamp(download.contractData.timestamp),
            Duration.fromSpec({ seconds: 1 }),
          ),
        ),
      });
    }
    await acceptRefunds(ws, proposalId, refunds, RefundReason.AbortRefund);
  }
  return OperationAttemptResult.finishedEmpty();
}

export async function abortFailedPayWithRefund(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.purchases])
    .runReadWrite(async (tx) => {
      const purchase = await tx.purchases.get(proposalId);
      if (!purchase) {
        throw Error("purchase not found");
      }
      if (purchase.timestampFirstSuccessfulPay) {
        // No point in aborting it.  We don't even report an error.
        logger.warn(`tried to abort successful payment`);
        return;
      }
      if (purchase.purchaseStatus === PurchaseStatus.Paying) {
        purchase.purchaseStatus = PurchaseStatus.AbortingWithRefund;
      }
      await tx.purchases.put(purchase);
    });
  processPurchaseQueryRefund(ws, proposalId, {
    forceNow: true,
  }).catch((e) => {
    logger.trace(`error during refund processing after abort pay: ${e}`);
  });
}
