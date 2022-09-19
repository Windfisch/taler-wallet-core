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
  AbsoluteTime,
  AgeRestriction,
  AmountJson,
  Amounts,
  codecForContractTerms,
  codecForMerchantPayResponse,
  codecForProposal,
  CoinDepositPermission,
  ConfirmPayResult,
  ConfirmPayResultType,
  ContractTerms,
  ContractTermsUtil,
  DenominationInfo,
  Duration,
  encodeCrock,
  ForcedCoinSel,
  getRandomBytes,
  HttpStatusCode,
  j2s,
  Logger,
  NotificationType,
  parsePaytoUri,
  parsePayUri,
  PayCoinSelection,
  PreparePayResult,
  PreparePayResultType,
  RefreshReason,
  strcmp,
  TalerErrorCode,
  TalerErrorDetail,
  TalerProtocolTimestamp,
  TransactionType,
  URL,
} from "@gnu-taler/taler-util";
import { EddsaKeypair } from "../crypto/cryptoImplementation.js";
import {
  AbortStatus,
  AllowedAuditorInfo,
  AllowedExchangeInfo,
  BackupProviderStateTag,
  CoinRecord,
  CoinStatus,
  DenominationRecord,
  ProposalRecord,
  ProposalStatus,
  PurchaseRecord,
  WalletContractData,
} from "../db.js";
import {
  makeErrorDetail,
  makePendingOperationFailedError,
  TalerError,
} from "../errors.js";
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
  spendCoins,
  storeOperationError,
  storeOperationPending,
} from "../wallet.js";
import { getExchangeDetails } from "./exchanges.js";
import { getTotalRefreshCost } from "./refresh.js";
import { makeEventId } from "./transactions.js";

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
        costs.push(pcs.coinContributions[i]);
        costs.push(refreshCost);
      }
      const zero = Amounts.getZero(pcs.paymentAmount.currency);
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

/**
 * Record all information that is necessary to
 * pay for a proposal in the wallet's database.
 */
async function recordConfirmPay(
  ws: InternalWalletState,
  proposal: ProposalRecord,
  coinSelection: PayCoinSelection,
  coinDepositPermissions: CoinDepositPermission[],
  sessionIdOverride: string | undefined,
): Promise<PurchaseRecord> {
  const d = proposal.download;
  if (!d) {
    throw Error("proposal is in invalid state");
  }
  let sessionId;
  if (sessionIdOverride) {
    sessionId = sessionIdOverride;
  } else {
    sessionId = proposal.downloadSessionId;
  }
  logger.trace(
    `recording payment on ${proposal.orderId} with session ID ${sessionId}`,
  );
  const payCostInfo = await getTotalPaymentCost(ws, coinSelection);
  const t: PurchaseRecord = {
    abortStatus: AbortStatus.None,
    download: d,
    lastSessionId: sessionId,
    payCoinSelection: coinSelection,
    payCoinSelectionUid: encodeCrock(getRandomBytes(32)),
    totalPayCost: payCostInfo,
    coinDepositPermissions,
    timestampAccept: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    timestampLastRefundStatus: undefined,
    proposalId: proposal.proposalId,
    refundQueryRequested: false,
    timestampFirstSuccessfulPay: undefined,
    autoRefundDeadline: undefined,
    refundAwaiting: undefined,
    paymentSubmitPending: true,
    refunds: {},
    merchantPaySig: undefined,
    noncePriv: proposal.noncePriv,
    noncePub: proposal.noncePub,
  };

  await ws.db
    .mktx((x) => [
      x.proposals,
      x.purchases,
      x.coins,
      x.refreshGroups,
      x.denominations,
      x.coinAvailability,
    ])
    .runReadWrite(async (tx) => {
      const p = await tx.proposals.get(proposal.proposalId);
      if (p) {
        p.proposalStatus = ProposalStatus.Accepted;
        await tx.proposals.put(p);
      }
      await tx.purchases.put(t);
      await spendCoins(ws, tx, {
        allocationId: `proposal:${t.proposalId}`,
        coinPubs: coinSelection.coinPubs,
        contributions: coinSelection.coinContributions,
        refreshReason: RefreshReason.PayMerchant,
      });
    });

  ws.notify({
    type: NotificationType.ProposalAccepted,
    proposalId: proposal.proposalId,
  });
  return t;
}

async function failProposalPermanently(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.proposals])
    .runReadWrite(async (tx) => {
      const p = await tx.proposals.get(proposalId);
      if (!p) {
        return;
      }
      p.proposalStatus = ProposalStatus.PermanentlyFailed;
      await tx.proposals.put(p);
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
    1 + purchase.payCoinSelection.coinPubs.length / 5,
  );
}

export function extractContractData(
  parsedContractTerms: ContractTerms,
  contractTermsHash: string,
  merchantSig: string,
): WalletContractData {
  const amount = Amounts.parseOrThrow(parsedContractTerms.amount);
  let maxWireFee: AmountJson;
  if (parsedContractTerms.max_wire_fee) {
    maxWireFee = Amounts.parseOrThrow(parsedContractTerms.max_wire_fee);
  } else {
    maxWireFee = Amounts.getZero(amount.currency);
  }
  return {
    amount,
    contractTermsHash: contractTermsHash,
    fulfillmentUrl: parsedContractTerms.fulfillment_url ?? "",
    merchantBaseUrl: parsedContractTerms.merchant_base_url,
    merchantPub: parsedContractTerms.merchant_pub,
    merchantSig,
    orderId: parsedContractTerms.order_id,
    summary: parsedContractTerms.summary,
    autoRefund: parsedContractTerms.auto_refund,
    maxWireFee,
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
    maxDepositFee: Amounts.parseOrThrow(parsedContractTerms.max_fee),
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
    .mktx((x) => [x.proposals])
    .runReadOnly(async (tx) => {
      return await tx.proposals.get(proposalId);
    });

  if (!proposal) {
    return {
      type: OperationAttemptResultType.Finished,
      result: undefined,
    };
  }

  if (proposal.proposalStatus != ProposalStatus.Downloading) {
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

  const opId = RetryTags.forProposalClaim(proposal);
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

  let parsedContractTerms: ContractTerms;

  try {
    parsedContractTerms = codecForContractTerms().decode(
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
    .mktx((x) => [x.purchases, x.proposals])
    .runReadWrite(async (tx) => {
      const p = await tx.proposals.get(proposalId);
      if (!p) {
        return;
      }
      if (p.proposalStatus !== ProposalStatus.Downloading) {
        return;
      }
      p.download = {
        contractData,
        contractTermsRaw: proposalResp.contract_terms,
      };
      if (
        fulfillmentUrl &&
        (fulfillmentUrl.startsWith("http://") ||
          fulfillmentUrl.startsWith("https://"))
      ) {
        const differentPurchase =
          await tx.purchases.indexes.byFulfillmentUrl.get(fulfillmentUrl);
        if (differentPurchase) {
          logger.warn("repurchase detected");
          p.proposalStatus = ProposalStatus.Repurchase;
          p.repurchaseProposalId = differentPurchase.proposalId;
          await tx.proposals.put(p);
          return;
        }
      }
      p.proposalStatus = ProposalStatus.Proposed;
      await tx.proposals.put(p);
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
    .mktx((x) => [x.proposals])
    .runReadOnly(async (tx) => {
      return tx.proposals.indexes.byUrlAndOrderId.get([
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

  const proposalRecord: ProposalRecord = {
    download: undefined,
    noncePriv: priv,
    noncePub: pub,
    claimToken,
    timestamp: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    merchantBaseUrl,
    orderId,
    proposalId: proposalId,
    proposalStatus: ProposalStatus.Downloading,
    repurchaseProposalId: undefined,
    downloadSessionId: sessionId,
  };

  await ws.db
    .mktx((x) => [x.proposals])
    .runReadWrite(async (tx) => {
      const existingRecord = await tx.proposals.indexes.byUrlAndOrderId.get([
        merchantBaseUrl,
        orderId,
      ]);
      if (existingRecord) {
        // Created concurrently
        return;
      }
      await tx.proposals.put(proposalRecord);
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
    .mktx((x) => [x.purchases])
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
      purchase.timestampFirstSuccessfulPay = now;
      purchase.paymentSubmitPending = false;
      purchase.lastSessionId = sessionId;
      purchase.merchantPaySig = paySig;
      const protoAr = purchase.download.contractData.autoRefund;
      if (protoAr) {
        const ar = Duration.fromTalerProtocolDuration(protoAr);
        logger.info("auto_refund present");
        purchase.refundQueryRequested = true;
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
      purchase.paymentSubmitPending = false;
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

  const brokenCoinPub = (err as any).coin_pub;

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

  logger.trace(`got error details: ${j2s(err)}`);

  const { contractData } = proposal.download;

  const prevPayCoins: PreviousPayCoins = [];

  await ws.db
    .mktx((x) => [x.coins, x.denominations])
    .runReadOnly(async (tx) => {
      for (let i = 0; i < proposal.payCoinSelection.coinPubs.length; i++) {
        const coinPub = proposal.payCoinSelection.coinPubs[i];
        if (coinPub === brokenCoinPub) {
          continue;
        }
        const contrib = proposal.payCoinSelection.coinContributions[i];
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
          contribution: contrib,
          exchangeBaseUrl: coin.exchangeBaseUrl,
          feeDeposit: denom.fees.feeDeposit,
        });
      }
    });

  const res = await selectPayCoinsNew(ws, {
    auditors: contractData.allowedAuditors,
    exchanges: contractData.allowedExchanges,
    wireMethod: contractData.wireMethod,
    contractTermsAmount: contractData.amount,
    depositFeeLimit: contractData.maxDepositFee,
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: contractData.maxWireFee,
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
      p.payCoinSelection = res;
      p.payCoinSelectionUid = encodeCrock(getRandomBytes(32));
      p.coinDepositPermissions = undefined;
      await tx.purchases.put(p);
      await spendCoins(ws, tx, {
        allocationId: `proposal:${p.proposalId}`,
        coinPubs: p.payCoinSelection.coinPubs,
        contributions: p.payCoinSelection.coinContributions,
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
          if (bp.state.tag === BackupProviderStateTag.Retrying) {
            bp.state = {
              tag: BackupProviderStateTag.Ready,
              nextBackupTimestamp: TalerProtocolTimestamp.now(),
            };
          }
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
          if (!denom.isOffered) {
            continue;
          }
          // FIXME: validation status and isOffered!
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
        aci.feeDeposit,
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

  const coinPubs: string[] = [];
  const coinContributions: AmountJson[] = [];
  const currency = contractTermsAmount.currency;

  let tally: CoinSelectionTally = {
    amountPayRemaining: contractTermsAmount,
    amountWireFeeLimitRemaining: wireFeeLimit,
    amountDepositFeeLimitRemaining: depositFeeLimit,
    customerDepositFees: Amounts.getZero(currency),
    customerWireFees: Amounts.getZero(currency),
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
    paymentAmount: contractTermsAmount,
    coinContributions,
    coinPubs,
    customerDepositFees: tally.customerDepositFees,
    customerWireFees: tally.customerWireFees,
  };
}

export async function checkPaymentByProposalId(
  ws: InternalWalletState,
  proposalId: string,
  sessionId?: string,
): Promise<PreparePayResult> {
  let proposal = await ws.db
    .mktx((x) => [x.proposals])
    .runReadOnly(async (tx) => {
      return tx.proposals.get(proposalId);
    });
  if (!proposal) {
    throw Error(`could not get proposal ${proposalId}`);
  }
  if (proposal.proposalStatus === ProposalStatus.Repurchase) {
    const existingProposalId = proposal.repurchaseProposalId;
    if (!existingProposalId) {
      throw Error("invalid proposal state");
    }
    logger.trace("using existing purchase for same product");
    proposal = await ws.db
      .mktx((x) => [x.proposals])
      .runReadOnly(async (tx) => {
        return tx.proposals.get(existingProposalId);
      });
    if (!proposal) {
      throw Error("existing proposal is in wrong state");
    }
  }
  const d = proposal.download;
  if (!d) {
    logger.error("bad proposal", proposal);
    throw Error("proposal is in invalid state");
  }
  const contractData = d.contractData;
  const merchantSig = d.contractData.merchantSig;
  if (!merchantSig) {
    throw Error("BUG: proposal is in invalid state");
  }

  proposalId = proposal.proposalId;

  // First check if we already paid for it.
  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });

  if (!purchase) {
    // If not already paid, check if we could pay for it.
    const res = await selectPayCoinsNew(ws, {
      auditors: contractData.allowedAuditors,
      exchanges: contractData.allowedExchanges,
      contractTermsAmount: contractData.amount,
      depositFeeLimit: contractData.maxDepositFee,
      wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
      wireFeeLimit: contractData.maxWireFee,
      prevPayCoins: [],
      requiredMinimumAge: contractData.minimumAge,
      wireMethod: contractData.wireMethod,
    });

    if (!res) {
      logger.info("not confirming payment, insufficient coins");
      return {
        status: PreparePayResultType.InsufficientBalance,
        contractTerms: d.contractTermsRaw,
        proposalId: proposal.proposalId,
        noncePriv: proposal.noncePriv,
        amountRaw: Amounts.stringify(d.contractData.amount),
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
    };
  }

  if (purchase.lastSessionId !== sessionId) {
    logger.trace(
      "automatically re-submitting payment with different session ID",
    );
    await ws.db
      .mktx((x) => [x.purchases])
      .runReadWrite(async (tx) => {
        const p = await tx.purchases.get(proposalId);
        if (!p) {
          return;
        }
        p.lastSessionId = sessionId;
        p.paymentSubmitPending = true;
        await tx.purchases.put(p);
      });
    const r = await processPurchasePay(ws, proposalId, { forceNow: true });
    if (r.type !== OperationAttemptResultType.Finished) {
      // FIXME: This does not surface the original error
      throw Error("submitting pay failed");
    }
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: purchase.download.contractTermsRaw,
      contractTermsHash: purchase.download.contractData.contractTermsHash,
      paid: true,
      amountRaw: Amounts.stringify(purchase.download.contractData.amount),
      amountEffective: Amounts.stringify(purchase.totalPayCost),
      proposalId,
    };
  } else if (!purchase.timestampFirstSuccessfulPay) {
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: purchase.download.contractTermsRaw,
      contractTermsHash: purchase.download.contractData.contractTermsHash,
      paid: false,
      amountRaw: Amounts.stringify(purchase.download.contractData.amount),
      amountEffective: Amounts.stringify(purchase.totalPayCost),
      proposalId,
    };
  } else {
    const paid = !purchase.paymentSubmitPending;
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: purchase.download.contractTermsRaw,
      contractTermsHash: purchase.download.contractData.contractTermsHash,
      paid,
      amountRaw: Amounts.stringify(purchase.download.contractData.amount),
      amountEffective: Amounts.stringify(purchase.totalPayCost),
      ...(paid ? { nextUrl: purchase.download.contractData.orderId } : {}),
      proposalId,
    };
  }
}

export async function getContractTermsDetails(
  ws: InternalWalletState,
  proposalId: string,
): Promise<WalletContractData> {
  const proposal = await ws.db
    .mktx((x) => [x.proposals])
    .runReadOnly(async (tx) => {
      return tx.proposals.get(proposalId);
    });

  if (!proposal) {
    throw Error(`proposal with id ${proposalId} not found`);
  }

  if (!proposal.download || !proposal.download.contractData) {
    throw Error("proposal is in invalid state");
  }

  return proposal.download.contractData;
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

  let proposalId = await startDownloadProposal(
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
      feeDeposit: denom.fees.feeDeposit,
      merchantPub: contractData.merchantPub,
      refundDeadline: contractData.refundDeadline,
      spendAmount: payCoinSel.coinContributions[i],
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
      if (!purchase?.download) {
        throw Error("purchase record not available anymore");
      }
      return {
        type: ConfirmPayResultType.Done,
        contractTerms: purchase.download.contractTermsRaw,
        transactionId: makeEventId(TransactionType.Payment, proposalId),
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
          transactionId: makeEventId(TransactionType.Payment, proposalId),
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
      await storeOperationPending(ws, `${PendingTaskType.Pay}:${proposalId}`);
      return {
        type: ConfirmPayResultType.Pending,
        transactionId: makeEventId(TransactionType.Payment, proposalId),
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
    .mktx((x) => [x.proposals])
    .runReadOnly(async (tx) => {
      return tx.proposals.get(proposalId);
    });

  if (!proposal) {
    throw Error(`proposal with id ${proposalId} not found`);
  }

  const d = proposal.download;
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
        purchase.paymentSubmitPending = true;
        await tx.purchases.put(purchase);
      }
      return purchase;
    });

  if (existingPurchase) {
    logger.trace("confirmPay: submitting payment for existing purchase");
    return runPayForConfirmPay(ws, proposalId);
  }

  logger.trace("confirmPay: purchase record does not exist yet");

  const contractData = d.contractData;

  let res: PayCoinSelection | undefined = undefined;

  res = await selectPayCoinsNew(ws, {
    auditors: contractData.allowedAuditors,
    exchanges: contractData.allowedExchanges,
    wireMethod: contractData.wireMethod,
    contractTermsAmount: contractData.amount,
    depositFeeLimit: contractData.maxDepositFee,
    wireFeeAmortization: contractData.wireFeeAmortization ?? 1,
    wireFeeLimit: contractData.maxWireFee,
    prevPayCoins: [],
    requiredMinimumAge: contractData.minimumAge,
    forcedSelection: forcedCoinSel,
  });

  logger.trace("coin selection result", res);

  if (!res) {
    // Should not happen, since checkPay should be called first
    // FIXME: Actually, this should be handled gracefully,
    // and the status should be stored in the DB.
    logger.warn("not confirming payment, insufficient coins");
    throw Error("insufficient balance");
  }

  const depositPermissions = await generateDepositPermissions(
    ws,
    res,
    d.contractData,
  );

  await recordConfirmPay(
    ws,
    proposal,
    res,
    depositPermissions,
    sessionIdOverride,
  );

  return runPayForConfirmPay(ws, proposalId);
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
  if (!purchase.paymentSubmitPending) {
    OperationAttemptResult.finishedEmpty();
  }
  logger.trace(`processing purchase pay ${proposalId}`);

  const sessionId = purchase.lastSessionId;

  logger.trace("paying with session ID", sessionId);

  if (!purchase.merchantPaySig) {
    const payUrl = new URL(
      `orders/${purchase.download.contractData.orderId}/pay`,
      purchase.download.contractData.merchantBaseUrl,
    ).href;

    let depositPermissions: CoinDepositPermission[];

    if (purchase.coinDepositPermissions) {
      depositPermissions = purchase.coinDepositPermissions;
    } else {
      // FIXME: also cache!
      depositPermissions = await generateDepositPermissions(
        ws,
        purchase.payCoinSelection,
        purchase.download.contractData,
      );
    }

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
          purch.payFrozen = true;
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

    const merchantPub = purchase.download.contractData.merchantPub;
    const { valid } = await ws.cryptoApi.isValidPaymentSignature({
      contractHash: purchase.download.contractData.contractTermsHash,
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
      `orders/${purchase.download.contractData.orderId}/paid`,
      purchase.download.contractData.merchantBaseUrl,
    ).href;
    const reqBody = {
      sig: purchase.merchantPaySig,
      h_contract: purchase.download.contractData.contractTermsHash,
      session_id: sessionId ?? "",
    };
    const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], () =>
      ws.http.postJson(payAgainUrl, reqBody),
    );
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
    .mktx((x) => [x.proposals])
    .runReadWrite(async (tx) => {
      const proposal = await tx.proposals.get(proposalId);
      if (!proposal) {
        logger.trace(`proposal ${proposalId} not found, won't refuse proposal`);
        return false;
      }
      if (proposal.proposalStatus !== ProposalStatus.Proposed) {
        return false;
      }
      proposal.proposalStatus = ProposalStatus.Refused;
      await tx.proposals.put(proposal);
      return true;
    });
  if (success) {
    ws.notify({
      type: NotificationType.ProposalRefused,
    });
  }
}
