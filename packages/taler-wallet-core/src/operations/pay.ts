/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";
import {
  CoinStatus,
  ProposalRecord,
  ProposalStatus,
  PurchaseRecord,
  Stores,
  WalletContractData,
  CoinRecord,
  DenominationRecord,
  PayCoinSelection,
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import {
  codecForProposal,
  codecForContractTerms,
  CoinDepositPermission,
  codecForMerchantPayResponse,
} from "../types/talerTypes";
import {
  ConfirmPayResult,
  TalerErrorDetails,
  PreparePayResult,
  RefreshReason,
  PreparePayResultType,
  ConfirmPayResultType,
} from "../types/walletTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { Logger } from "../util/logging";
import { parsePayUri } from "../util/taleruri";
import { guardOperationException, OperationFailedError } from "./errors";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import { InternalWalletState, EXCHANGE_COINS_LOCK } from "./state";
import {
  getTimestampNow,
  timestampAddDuration,
  Duration,
  durationMax,
  durationMin,
  isTimestampExpired,
  durationMul,
  durationAdd,
} from "../util/time";
import { strcmp, canonicalJson } from "../util/helpers";
import {
  readSuccessResponseJsonOrThrow,
  throwUnexpectedRequestError,
  getHttpResponseErrorDetails,
  readSuccessResponseJsonOrErrorCode,
} from "../util/http";
import { TalerErrorCode } from "../TalerErrorCode";
import { URL } from "../util/url";
import { initRetryInfo, updateRetryInfoTimeout, getRetryDuration } from "../util/retries";

/**
 * Logger.
 */
const logger = new Logger("pay.ts");

/**
 * Structure to describe a coin that is available to be
 * used in a payment.
 */
export interface AvailableCoinInfo {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Coin's denomination public key.
   */
  denomPub: string;

  /**
   * Amount still remaining (typically the full amount,
   * as coins are always refreshed after use.)
   */
  availableAmount: AmountJson;

  /**
   * Deposit fee for the coin.
   */
  feeDeposit: AmountJson;
}


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
  const costs = [];
  for (let i = 0; i < pcs.coinPubs.length; i++) {
    const coin = await ws.db.get(Stores.coins, pcs.coinPubs[i]);
    if (!coin) {
      throw Error("can't calculate payment cost, coin not found");
    }
    const denom = await ws.db.get(Stores.denominations, [
      coin.exchangeBaseUrl,
      coin.denomPub,
    ]);
    if (!denom) {
      throw Error(
        "can't calculate payment cost, denomination for coin not found",
      );
    }
    const allDenoms = await ws.db
      .iterIndex(
        Stores.denominations.exchangeBaseUrlIndex,
        coin.exchangeBaseUrl,
      )
      .toArray();
    const amountLeft = Amounts.sub(denom.value, pcs.coinContributions[i])
      .amount;
    const refreshCost = getTotalRefreshCost(allDenoms, denom, amountLeft);
    costs.push(pcs.coinContributions[i]);
    costs.push(refreshCost);
  }
  return Amounts.sum(costs).amount;
}

/**
 * Given a list of available coins, select coins to spend under the merchant's
 * constraints.
 *
 * This function is only exported for the sake of unit tests.
 */
export function selectPayCoins(
  acis: AvailableCoinInfo[],
  contractTermsAmount: AmountJson,
  customerWireFees: AmountJson,
  depositFeeLimit: AmountJson,
): PayCoinSelection | undefined {
  if (acis.length === 0) {
    return undefined;
  }
  const coinPubs: string[] = [];
  const coinContributions: AmountJson[] = [];
  // Sort by available amount (descending),  deposit fee (ascending) and
  // denomPub (ascending) if deposit fee is the same
  // (to guarantee deterministic results)
  acis.sort(
    (o1, o2) =>
      -Amounts.cmp(o1.availableAmount, o2.availableAmount) ||
      Amounts.cmp(o1.feeDeposit, o2.feeDeposit) ||
      strcmp(o1.denomPub, o2.denomPub),
  );
  const paymentAmount = Amounts.add(contractTermsAmount, customerWireFees)
    .amount;
  const currency = paymentAmount.currency;
  let amountPayRemaining = paymentAmount;
  let amountDepositFeeLimitRemaining = depositFeeLimit;
  const customerDepositFees = Amounts.getZero(currency);
  for (const aci of acis) {
    // Don't use this coin if depositing it is more expensive than
    // the amount it would give the merchant.
    if (Amounts.cmp(aci.feeDeposit, aci.availableAmount) >= 0) {
      continue;
    }
    if (amountPayRemaining.value === 0 && amountPayRemaining.fraction === 0) {
      // We have spent enough!
      break;
    }

    // How much does the user spend on deposit fees for this coin?
    const depositFeeSpend = Amounts.sub(
      aci.feeDeposit,
      amountDepositFeeLimitRemaining,
    ).amount;

    if (Amounts.isZero(depositFeeSpend)) {
      // Fees are still covered by the merchant.
      amountDepositFeeLimitRemaining = Amounts.sub(
        amountDepositFeeLimitRemaining,
        aci.feeDeposit,
      ).amount;
    } else {
      amountDepositFeeLimitRemaining = Amounts.getZero(currency);
    }

    let coinSpend: AmountJson;
    const amountActualAvailable = Amounts.sub(
      aci.availableAmount,
      depositFeeSpend,
    ).amount;

    if (Amounts.cmp(amountActualAvailable, amountPayRemaining) > 0) {
      // Partial spending, as the coin is worth more than the remaining
      // amount to pay.
      coinSpend = Amounts.add(amountPayRemaining, depositFeeSpend).amount;
      // Make sure we contribute at least the deposit fee, otherwise
      // contributing this coin would cause a loss for the merchant.
      if (Amounts.cmp(coinSpend, aci.feeDeposit) < 0) {
        coinSpend = aci.feeDeposit;
      }
      amountPayRemaining = Amounts.getZero(currency);
    } else {
      // Spend the full remaining amount on the coin
      coinSpend = aci.availableAmount;
      amountPayRemaining = Amounts.add(amountPayRemaining, depositFeeSpend)
        .amount;
      amountPayRemaining = Amounts.sub(amountPayRemaining, aci.availableAmount)
        .amount;
    }

    coinPubs.push(aci.coinPub);
    coinContributions.push(coinSpend);
  }
  if (Amounts.isZero(amountPayRemaining)) {
    return {
      paymentAmount: contractTermsAmount,
      coinContributions,
      coinPubs,
      customerDepositFees,
      customerWireFees,
    };
  }
  return undefined;
}

export function isSpendableCoin(
  coin: CoinRecord,
  denom: DenominationRecord,
): boolean {
  if (coin.suspended) {
    return false;
  }
  if (coin.status !== CoinStatus.Fresh) {
    return false;
  }
  if (isTimestampExpired(denom.stampExpireDeposit)) {
    return false;
  }
  return true;
}

/**
 * Select coins from the wallet's database that can be used
 * to pay for the given contract.
 *
 * If payment is impossible, undefined is returned.
 */
async function getCoinsForPayment(
  ws: InternalWalletState,
  contractData: WalletContractData,
): Promise<PayCoinSelection | undefined> {
  const remainingAmount = contractData.amount;

  const exchanges = await ws.db.iter(Stores.exchanges).toArray();

  for (const exchange of exchanges) {
    let isOkay = false;
    const exchangeDetails = exchange.details;
    if (!exchangeDetails) {
      continue;
    }
    const exchangeFees = exchange.wireInfo;
    if (!exchangeFees) {
      continue;
    }

    // is the exchange explicitly allowed?
    for (const allowedExchange of contractData.allowedExchanges) {
      if (allowedExchange.exchangePub === exchangeDetails.masterPublicKey) {
        isOkay = true;
        break;
      }
    }

    // is the exchange allowed because of one of its auditors?
    if (!isOkay) {
      for (const allowedAuditor of contractData.allowedAuditors) {
        for (const auditor of exchangeDetails.auditors) {
          if (auditor.auditor_pub === allowedAuditor.auditorPub) {
            isOkay = true;
            break;
          }
        }
        if (isOkay) {
          break;
        }
      }
    }

    if (!isOkay) {
      continue;
    }

    const coins = await ws.db
      .iterIndex(Stores.coins.exchangeBaseUrlIndex, exchange.baseUrl)
      .toArray();

    if (!coins || coins.length === 0) {
      continue;
    }

    // Denomination of the first coin, we assume that all other
    // coins have the same currency
    const firstDenom = await ws.db.get(Stores.denominations, [
      exchange.baseUrl,
      coins[0].denomPub,
    ]);
    if (!firstDenom) {
      throw Error("db inconsistent");
    }
    const currency = firstDenom.value.currency;
    const acis: AvailableCoinInfo[] = [];
    for (const coin of coins) {
      const denom = await ws.db.get(Stores.denominations, [
        exchange.baseUrl,
        coin.denomPub,
      ]);
      if (!denom) {
        throw Error("db inconsistent");
      }
      if (denom.value.currency !== currency) {
        logger.warn(
          `same pubkey for different currencies at exchange ${exchange.baseUrl}`,
        );
        continue;
      }
      if (!isSpendableCoin(coin, denom)) {
        continue;
      }
      acis.push({
        availableAmount: coin.currentAmount,
        coinPub: coin.coinPub,
        denomPub: coin.denomPub,
        feeDeposit: denom.feeDeposit,
      });
    }

    let wireFee: AmountJson | undefined;
    for (const fee of exchangeFees.feesForType[contractData.wireMethod] || []) {
      if (
        fee.startStamp <= contractData.timestamp &&
        fee.endStamp >= contractData.timestamp
      ) {
        wireFee = fee.wireFee;
        break;
      }
    }

    let customerWireFee: AmountJson;

    if (wireFee) {
      const amortizedWireFee = Amounts.divide(
        wireFee,
        contractData.wireFeeAmortization,
      );
      if (Amounts.cmp(contractData.maxWireFee, amortizedWireFee) < 0) {
        customerWireFee = amortizedWireFee;
      } else {
        customerWireFee = Amounts.getZero(currency);
      }
    } else {
      customerWireFee = Amounts.getZero(currency);
    }

    // Try if paying using this exchange works
    const res = selectPayCoins(
      acis,
      remainingAmount,
      customerWireFee,
      contractData.maxDepositFee,
    );
    if (res) {
      return res;
    }
  }
  return undefined;
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
  logger.trace(`recording payment with session ID ${sessionId}`);
  const payCostInfo = await getTotalPaymentCost(ws, coinSelection);
  const t: PurchaseRecord = {
    abortDone: false,
    abortRequested: false,
    contractTermsRaw: d.contractTermsRaw,
    contractData: d.contractData,
    lastSessionId: sessionId,
    payCoinSelection: coinSelection,
    totalPayCost: payCostInfo,
    coinDepositPermissions,
    timestampAccept: getTimestampNow(),
    timestampLastRefundStatus: undefined,
    proposalId: proposal.proposalId,
    lastPayError: undefined,
    lastRefundStatusError: undefined,
    payRetryInfo: initRetryInfo(),
    refundStatusRetryInfo: initRetryInfo(),
    refundStatusRequested: false,
    timestampFirstSuccessfulPay: undefined,
    autoRefundDeadline: undefined,
    paymentSubmitPending: true,
    refunds: {},
    merchantPaySig: undefined,
  };

  await ws.db.runWithWriteTransaction(
    [
      Stores.coins,
      Stores.purchases,
      Stores.proposals,
      Stores.refreshGroups,
      Stores.denominations,
    ],
    async (tx) => {
      const p = await tx.get(Stores.proposals, proposal.proposalId);
      if (p) {
        p.proposalStatus = ProposalStatus.ACCEPTED;
        p.lastError = undefined;
        p.retryInfo = initRetryInfo(false);
        await tx.put(Stores.proposals, p);
      }
      await tx.put(Stores.purchases, t);
      for (let i = 0; i < coinSelection.coinPubs.length; i++) {
        const coin = await tx.get(Stores.coins, coinSelection.coinPubs[i]);
        if (!coin) {
          throw Error("coin allocated for payment doesn't exist anymore");
        }
        coin.status = CoinStatus.Dormant;
        const remaining = Amounts.sub(
          coin.currentAmount,
          coinSelection.coinContributions[i],
        );
        if (remaining.saturated) {
          throw Error("not enough remaining balance on coin for payment");
        }
        coin.currentAmount = remaining.amount;
        await tx.put(Stores.coins, coin);
      }
      const refreshCoinPubs = coinSelection.coinPubs.map((x) => ({
        coinPub: x,
      }));
      await createRefreshGroup(ws, tx, refreshCoinPubs, RefreshReason.Pay);
    },
  );

  ws.notify({
    type: NotificationType.ProposalAccepted,
    proposalId: proposal.proposalId,
  });
  return t;
}

async function incrementProposalRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.proposals], async (tx) => {
    const pr = await tx.get(Stores.proposals, proposalId);
    if (!pr) {
      return;
    }
    if (!pr.retryInfo) {
      return;
    }
    pr.retryInfo.retryCounter++;
    updateRetryInfoTimeout(pr.retryInfo);
    pr.lastError = err;
    await tx.put(Stores.proposals, pr);
  });
  if (err) {
    ws.notify({ type: NotificationType.ProposalOperationError, error: err });
  }
}

async function incrementPurchasePayRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetails | undefined,
): Promise<void> {
  logger.warn("incrementing purchase pay retry with error", err);
  await ws.db.runWithWriteTransaction([Stores.purchases], async (tx) => {
    const pr = await tx.get(Stores.purchases, proposalId);
    if (!pr) {
      return;
    }
    if (!pr.payRetryInfo) {
      return;
    }
    pr.payRetryInfo.retryCounter++;
    updateRetryInfoTimeout(pr.payRetryInfo);
    pr.lastPayError = err;
    await tx.put(Stores.purchases, pr);
  });
  if (err) {
    ws.notify({ type: NotificationType.PayOperationError, error: err });
  }
}

export async function processDownloadProposal(
  ws: InternalWalletState,
  proposalId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (err: TalerErrorDetails): Promise<void> =>
    incrementProposalRetry(ws, proposalId, err);
  await guardOperationException(
    () => processDownloadProposalImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetDownloadProposalRetry(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db.mutate(Stores.proposals, proposalId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

function getProposalRequestTimeout(proposal: ProposalRecord): Duration {
  return durationMax(
    { d_ms: 60000 },
    durationMin({ d_ms: 5000 }, getRetryDuration(proposal.retryInfo)),
  );
}

function getPayRequestTimeout(purchase: PurchaseRecord): Duration {
  return durationMul({ d_ms: 5000 }, 1 + purchase.payCoinSelection.coinPubs.length / 20);
}

async function processDownloadProposalImpl(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetDownloadProposalRetry(ws, proposalId);
  }
  const proposal = await ws.db.get(Stores.proposals, proposalId);
  if (!proposal) {
    return;
  }
  if (proposal.proposalStatus != ProposalStatus.DOWNLOADING) {
    return;
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

  const httpResponse = await ws.http.postJson(orderClaimUrl, requestBody, {
    timeout: getProposalRequestTimeout(proposal),
  });
  const r = await readSuccessResponseJsonOrErrorCode(
    httpResponse,
    codecForProposal(),
  );
  if (r.isError) {
    switch (r.talerErrorResponse.code) {
      case TalerErrorCode.ORDERS_ALREADY_CLAIMED:
        throw OperationFailedError.fromCode(
          TalerErrorCode.WALLET_ORDER_ALREADY_CLAIMED,
          "order already claimed (likely by other wallet)",
          {
            orderId: proposal.orderId,
            claimUrl: orderClaimUrl,
          },
        );
      default:
        throwUnexpectedRequestError(httpResponse, r.talerErrorResponse);
    }
  }
  const proposalResp = r.response;

  // The proposalResp contains the contract terms as raw JSON,
  // as the coded to parse them doesn't necessarily round-trip.
  // We need this raw JSON to compute the contract terms hash.

  const contractTermsHash = await ws.cryptoApi.hashString(
    canonicalJson(proposalResp.contract_terms),
  );

  const parsedContractTerms = codecForContractTerms().decode(
    proposalResp.contract_terms,
  );
  const fulfillmentUrl = parsedContractTerms.fulfillment_url;

  await ws.db.runWithWriteTransaction(
    [Stores.proposals, Stores.purchases],
    async (tx) => {
      const p = await tx.get(Stores.proposals, proposalId);
      if (!p) {
        return;
      }
      if (p.proposalStatus !== ProposalStatus.DOWNLOADING) {
        return;
      }
      const amount = Amounts.parseOrThrow(parsedContractTerms.amount);
      let maxWireFee: AmountJson;
      if (parsedContractTerms.max_wire_fee) {
        maxWireFee = Amounts.parseOrThrow(parsedContractTerms.max_wire_fee);
      } else {
        maxWireFee = Amounts.getZero(amount.currency);
      }
      p.download = {
        contractData: {
          amount,
          contractTermsHash: contractTermsHash,
          fulfillmentUrl: parsedContractTerms.fulfillment_url ?? "",
          merchantBaseUrl: parsedContractTerms.merchant_base_url,
          merchantPub: parsedContractTerms.merchant_pub,
          merchantSig: proposalResp.sig,
          orderId: parsedContractTerms.order_id,
          summary: parsedContractTerms.summary,
          autoRefund: parsedContractTerms.auto_refund,
          maxWireFee,
          payDeadline: parsedContractTerms.pay_deadline,
          refundDeadline: parsedContractTerms.refund_deadline,
          wireFeeAmortization: parsedContractTerms.wire_fee_amortization || 1,
          allowedAuditors: parsedContractTerms.auditors.map((x) => ({
            auditorBaseUrl: x.url,
            auditorPub: x.master_pub,
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
        },
        contractTermsRaw: JSON.stringify(proposalResp.contract_terms),
      };
      if (
        fulfillmentUrl &&
        (fulfillmentUrl.startsWith("http://") ||
          fulfillmentUrl.startsWith("https://"))
      ) {
        const differentPurchase = await tx.getIndexed(
          Stores.purchases.fulfillmentUrlIndex,
          fulfillmentUrl,
        );
        if (differentPurchase) {
          logger.warn("repurchase detected");
          p.proposalStatus = ProposalStatus.REPURCHASE;
          p.repurchaseProposalId = differentPurchase.proposalId;
          await tx.put(Stores.proposals, p);
          return;
        }
      }
      p.proposalStatus = ProposalStatus.PROPOSED;
      await tx.put(Stores.proposals, p);
    },
  );

  ws.notify({
    type: NotificationType.ProposalDownloaded,
    proposalId: proposal.proposalId,
  });
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
): Promise<string> {
  const oldProposal = await ws.db.getIndexed(
    Stores.proposals.urlAndOrderIdIndex,
    [merchantBaseUrl, orderId],
  );
  if (oldProposal) {
    await processDownloadProposal(ws, oldProposal.proposalId);
    return oldProposal.proposalId;
  }

  const { priv, pub } = await ws.cryptoApi.createEddsaKeypair();
  const proposalId = encodeCrock(getRandomBytes(32));

  const proposalRecord: ProposalRecord = {
    download: undefined,
    noncePriv: priv,
    noncePub: pub,
    claimToken,
    timestamp: getTimestampNow(),
    merchantBaseUrl,
    orderId,
    proposalId: proposalId,
    proposalStatus: ProposalStatus.DOWNLOADING,
    repurchaseProposalId: undefined,
    retryInfo: initRetryInfo(),
    lastError: undefined,
    downloadSessionId: sessionId,
  };

  await ws.db.runWithWriteTransaction([Stores.proposals], async (tx) => {
    const existingRecord = await tx.getIndexed(
      Stores.proposals.urlAndOrderIdIndex,
      [merchantBaseUrl, orderId],
    );
    if (existingRecord) {
      // Created concurrently
      return;
    }
    await tx.put(Stores.proposals, proposalRecord);
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
  const now = getTimestampNow();
  await ws.db.runWithWriteTransaction(
    [Stores.purchases],
    async (tx) => {
      const purchase = await tx.get(Stores.purchases, proposalId);

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
      purchase.lastPayError = undefined;
      purchase.lastSessionId = sessionId;
      purchase.payRetryInfo = initRetryInfo(false);
      purchase.merchantPaySig = paySig;
      if (isFirst) {
        const ar = purchase.contractData.autoRefund;
        if (ar) {
          logger.info("auto_refund present");
          purchase.refundStatusRequested = true;
          purchase.refundStatusRetryInfo = initRetryInfo();
          purchase.lastRefundStatusError = undefined;
          purchase.autoRefundDeadline = timestampAddDuration(now, ar);
        }
      }

      await tx.put(Stores.purchases, purchase);
    },
  );
}

async function storePayReplaySuccess(
  ws: InternalWalletState,
  proposalId: string,
  sessionId: string | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction(
    [Stores.purchases],
    async (tx) => {
      const purchase = await tx.get(Stores.purchases, proposalId);

      if (!purchase) {
        logger.warn("purchase does not exist anymore");
        return;
      }
      const isFirst = purchase.timestampFirstSuccessfulPay === undefined;
      if (isFirst) {
        throw Error("invalid payment state");
      }
      purchase.paymentSubmitPending = false;
      purchase.lastPayError = undefined;
      purchase.payRetryInfo = initRetryInfo(false);
      purchase.lastSessionId = sessionId;
      await tx.put(Stores.purchases, purchase);
    },
  );
}

/**
 * Submit a payment to the merchant.
 *
 * If the wallet has previously paid, it just transmits the merchant's
 * own signature certifying that the wallet has previously paid.
 */
export async function submitPay(
  ws: InternalWalletState,
  proposalId: string,
): Promise<ConfirmPayResult> {
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    throw Error("Purchase not found: " + proposalId);
  }
  if (purchase.abortRequested) {
    throw Error("not submitting payment for aborted purchase");
  }
  const sessionId = purchase.lastSessionId;

  logger.trace("paying with session ID", sessionId);

  if (!purchase.merchantPaySig) {
    const payUrl = new URL(
      `orders/${purchase.contractData.orderId}/pay`,
      purchase.contractData.merchantBaseUrl,
    ).href;

    const reqBody = {
      coins: purchase.coinDepositPermissions,
      session_id: purchase.lastSessionId,
    };

    logger.trace("making pay request", JSON.stringify(reqBody, undefined, 2));

    const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], () =>
      ws.http.postJson(payUrl, reqBody, {
        timeout: getPayRequestTimeout(purchase),
      }),
    );

    const merchantResp = await readSuccessResponseJsonOrThrow(
      resp,
      codecForMerchantPayResponse(),
    );

    logger.trace("got success from pay URL", merchantResp);

    const merchantPub = purchase.contractData.merchantPub;
    const valid: boolean = await ws.cryptoApi.isValidPaymentSignature(
      merchantResp.sig,
      purchase.contractData.contractTermsHash,
      merchantPub,
    );

    if (!valid) {
      logger.error("merchant payment signature invalid");
      // FIXME: properly display error
      throw Error("merchant payment signature invalid");
    }

    await storeFirstPaySuccess(ws, proposalId, sessionId, merchantResp.sig);
  } else {
    const payAgainUrl = new URL(
      `orders/${purchase.contractData.orderId}/paid`,
      purchase.contractData.merchantBaseUrl,
    ).href;
    const reqBody = {
      sig: purchase.merchantPaySig,
      h_contract: purchase.contractData.contractTermsHash,
      session_id: sessionId ?? "",
    };
    const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], () =>
      ws.http.postJson(payAgainUrl, reqBody),
    );
    if (resp.status !== 204) {
      throw OperationFailedError.fromCode(
        TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
        "/paid failed",
        getHttpResponseErrorDetails(resp),
      );
    }
    await storePayReplaySuccess(ws, proposalId, sessionId);
  }

  return {
    type: ConfirmPayResultType.Done,
    contractTerms: JSON.parse(purchase.contractTermsRaw),
  };
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
    throw OperationFailedError.fromCode(
      TalerErrorCode.WALLET_INVALID_TALER_PAY_URI,
      `invalid taler://pay URI (${talerPayUri})`,
      {
        talerPayUri,
      },
    );
  }

  let proposalId = await startDownloadProposal(
    ws,
    uriResult.merchantBaseUrl,
    uriResult.orderId,
    uriResult.sessionId,
    uriResult.claimToken,
  );

  let proposal = await ws.db.get(Stores.proposals, proposalId);
  if (!proposal) {
    throw Error(`could not get proposal ${proposalId}`);
  }
  if (proposal.proposalStatus === ProposalStatus.REPURCHASE) {
    const existingProposalId = proposal.repurchaseProposalId;
    if (!existingProposalId) {
      throw Error("invalid proposal state");
    }
    logger.trace("using existing purchase for same product");
    proposal = await ws.db.get(Stores.proposals, existingProposalId);
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

  // First check if we already payed for it.
  const purchase = await ws.db.get(Stores.purchases, proposalId);

  if (!purchase) {
    // If not already paid, check if we could pay for it.
    const res = await getCoinsForPayment(ws, contractData);

    if (!res) {
      logger.info("not confirming payment, insufficient coins");
      return {
        status: PreparePayResultType.InsufficientBalance,
        contractTerms: JSON.parse(d.contractTermsRaw),
        proposalId: proposal.proposalId,
        amountRaw: Amounts.stringify(d.contractData.amount),
      };
    }

    const totalCost = await getTotalPaymentCost(ws, res);
    logger.trace("costInfo", totalCost);
    logger.trace("coinsForPayment", res);

    return {
      status: PreparePayResultType.PaymentPossible,
      contractTerms: JSON.parse(d.contractTermsRaw),
      proposalId: proposal.proposalId,
      amountEffective: Amounts.stringify(totalCost),
      amountRaw: Amounts.stringify(res.paymentAmount),
    };
  }

  if (purchase.lastSessionId !== uriResult.sessionId) {
    logger.trace(
      "automatically re-submitting payment with different session ID",
    );
    await ws.db.runWithWriteTransaction([Stores.purchases], async (tx) => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        return;
      }
      p.lastSessionId = uriResult.sessionId;
      await tx.put(Stores.purchases, p);
    });
    const r = await submitPay(ws, proposalId);
    if (r.type !== ConfirmPayResultType.Done) {
      throw Error("submitting pay failed");
    }
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: JSON.parse(purchase.contractTermsRaw),
      contractTermsHash: purchase.contractData.contractTermsHash,
      paid: true,
      amountRaw: Amounts.stringify(purchase.contractData.amount),
      amountEffective: Amounts.stringify(purchase.totalPayCost),
      proposalId,
    };
  } else if (!purchase.timestampFirstSuccessfulPay) {
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: JSON.parse(purchase.contractTermsRaw),
      contractTermsHash: purchase.contractData.contractTermsHash,
      paid: false,
      amountRaw: Amounts.stringify(purchase.contractData.amount),
      amountEffective: Amounts.stringify(purchase.totalPayCost),
      proposalId,
    };
  } else {
    const paid = !purchase.paymentSubmitPending;
    return {
      status: PreparePayResultType.AlreadyConfirmed,
      contractTerms: JSON.parse(purchase.contractTermsRaw),
      contractTermsHash: purchase.contractData.contractTermsHash,
      paid,
      amountRaw: Amounts.stringify(purchase.contractData.amount),
      amountEffective: Amounts.stringify(purchase.totalPayCost),
      ...(paid ? { nextUrl: purchase.contractData.orderId } : {}),
      proposalId,
    };
  }
}

/**
 * Add a contract to the wallet and sign coins, and send them.
 */
export async function confirmPay(
  ws: InternalWalletState,
  proposalId: string,
  sessionIdOverride: string | undefined,
): Promise<ConfirmPayResult> {
  logger.trace(
    `executing confirmPay with proposalId ${proposalId} and sessionIdOverride ${sessionIdOverride}`,
  );
  const proposal = await ws.db.get(Stores.proposals, proposalId);

  if (!proposal) {
    throw Error(`proposal with id ${proposalId} not found`);
  }

  const d = proposal.download;
  if (!d) {
    throw Error("proposal is in invalid state");
  }

  let purchase = await ws.db.get(
    Stores.purchases,
    d.contractData.contractTermsHash,
  );

  if (purchase) {
    if (
      sessionIdOverride !== undefined &&
      sessionIdOverride != purchase.lastSessionId
    ) {
      logger.trace(`changing session ID to ${sessionIdOverride}`);
      await ws.db.mutate(Stores.purchases, purchase.proposalId, (x) => {
        x.lastSessionId = sessionIdOverride;
        x.paymentSubmitPending = true;
        return x;
      });
    }
    logger.trace("confirmPay: submitting payment for existing purchase");
    return submitPay(ws, proposalId);
  }

  logger.trace("confirmPay: purchase record does not exist yet");

  const res = await getCoinsForPayment(ws, d.contractData);

  logger.trace("coin selection result", res);

  if (!res) {
    // Should not happen, since checkPay should be called first
    logger.warn("not confirming payment, insufficient coins");
    throw Error("insufficient balance");
  }

  const depositPermissions: CoinDepositPermission[] = [];
  for (let i = 0; i < res.coinPubs.length; i++) {
    const coin = await ws.db.get(Stores.coins, res.coinPubs[i]);
    if (!coin) {
      throw Error("can't pay, allocated coin not found anymore");
    }
    const denom = await ws.db.get(Stores.denominations, [
      coin.exchangeBaseUrl,
      coin.denomPub,
    ]);
    if (!denom) {
      throw Error(
        "can't pay, denomination of allocated coin not found anymore",
      );
    }
    const dp = await ws.cryptoApi.signDepositPermission({
      coinPriv: coin.coinPriv,
      coinPub: coin.coinPub,
      contractTermsHash: d.contractData.contractTermsHash,
      denomPubHash: coin.denomPubHash,
      denomSig: coin.denomSig,
      exchangeBaseUrl: coin.exchangeBaseUrl,
      feeDeposit: denom.feeDeposit,
      merchantPub: d.contractData.merchantPub,
      refundDeadline: d.contractData.refundDeadline,
      spendAmount: res.coinContributions[i],
      timestamp: d.contractData.timestamp,
      wireInfoHash: d.contractData.wireInfoHash,
    });
    depositPermissions.push(dp);
  }
  purchase = await recordConfirmPay(
    ws,
    proposal,
    res,
    depositPermissions,
    sessionIdOverride,
  );

  return submitPay(ws, proposalId);
}

export async function processPurchasePay(
  ws: InternalWalletState,
  proposalId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: TalerErrorDetails): Promise<void> =>
    incrementPurchasePayRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchasePayImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchasePayRetry(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db.mutate(Stores.purchases, proposalId, (x) => {
    if (x.payRetryInfo.active) {
      x.payRetryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processPurchasePayImpl(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetPurchasePayRetry(ws, proposalId);
  }
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    return;
  }
  if (!purchase.paymentSubmitPending) {
    return;
  }
  logger.trace(`processing purchase pay ${proposalId}`);
  await submitPay(ws, proposalId);
}

export async function refuseProposal(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const success = await ws.db.runWithWriteTransaction(
    [Stores.proposals],
    async (tx) => {
      const proposal = await tx.get(Stores.proposals, proposalId);
      if (!proposal) {
        logger.trace(`proposal ${proposalId} not found, won't refuse proposal`);
        return false;
      }
      if (proposal.proposalStatus !== ProposalStatus.PROPOSED) {
        return false;
      }
      proposal.proposalStatus = ProposalStatus.REFUSED;
      await tx.put(Stores.proposals, proposal);
      return true;
    },
  );
  if (success) {
    ws.notify({
      type: NotificationType.ProposalRefused,
    });
  }
}
