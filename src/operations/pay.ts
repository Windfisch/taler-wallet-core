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
  initRetryInfo,
  ProposalRecord,
  ProposalStatus,
  PurchaseRecord,
  Stores,
  updateRetryInfoTimeout,
  PayEventRecord,
  WalletContractData,
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import {
  PayReq,
  codecForProposal,
  codecForContractTerms,
  CoinDepositPermission,
} from "../types/talerTypes";
import {
  ConfirmPayResult,
  OperationError,
  PreparePayResult,
  RefreshReason,
} from "../types/walletTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { Logger } from "../util/logging";
import { getOrderDownloadUrl, parsePayUri } from "../util/taleruri";
import { guardOperationException } from "./errors";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import { InternalWalletState } from "./state";
import { getTimestampNow, timestampAddDuration } from "../util/time";
import { strcmp, canonicalJson } from "../util/helpers";

/**
 * Logger.
 */
const logger = new Logger("pay.ts");

/**
 * Result of selecting coins, contains the exchange, and selected
 * coins with their denomination.
 */
export interface PayCoinSelection {
  /**
   * Amount requested by the merchant.
   */
  paymentAmount: AmountJson;

  /**
   * Public keys of the coins that were selected.
   */
  coinPubs: string[];

  /**
   * Amount that each coin contributes.
   */
  coinContributions: AmountJson[];

  /**
   * How much of the wire fees is the customer paying?
   */
  customerWireFees: AmountJson;

  /**
   * How much of the deposit fees is the customer paying?
   */
  customerDepositFees: AmountJson;
}

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

export interface PayCostInfo {
  totalCost: AmountJson;
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
): Promise<PayCostInfo> {
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
  return {
    totalCost: Amounts.sum(costs).amount
  };
}

/**
 * Given a list of available coins, select coins to spend under the merchant's
 * constraints.
 *
 * This function is only exported for the sake of unit tests.
 */
export function selectPayCoins(
  acis: AvailableCoinInfo[],
  paymentAmount: AmountJson,
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
  const currency = paymentAmount.currency;
  let totalFees = Amounts.getZero(currency);
  let amountPayRemaining = paymentAmount;
  let amountDepositFeeLimitRemaining = depositFeeLimit;
  const customerWireFees = Amounts.getZero(currency);
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
    totalFees = Amounts.add(totalFees, depositFeeSpend).amount;
  }
  if (Amounts.isZero(amountPayRemaining)) {
    return {
      paymentAmount,
      coinContributions,
      coinPubs,
      customerDepositFees,
      customerWireFees,
    };
  }
  return undefined;
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
  let remainingAmount = contractData.amount;

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
        console.warn(
          `same pubkey for different currencies at exchange ${exchange.baseUrl}`,
        );
        continue;
      }
      if (coin.suspended) {
        continue;
      }
      if (coin.status !== CoinStatus.Fresh) {
        continue;
      }
      acis.push({
        availableAmount: coin.currentAmount,
        coinPub: coin.coinPub,
        denomPub: coin.denomPub,
        feeDeposit: denom.feeDeposit,
      });
    }

    let totalFees = Amounts.getZero(currency);
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

    if (wireFee) {
      const amortizedWireFee = Amounts.divide(
        wireFee,
        contractData.wireFeeAmortization,
      );
      if (Amounts.cmp(contractData.maxWireFee, amortizedWireFee) < 0) {
        totalFees = Amounts.add(amortizedWireFee, totalFees).amount;
        remainingAmount = Amounts.add(amortizedWireFee, remainingAmount).amount;
      }
    }

    // Try if paying using this exchange works
    const res = selectPayCoins(
      acis,
      remainingAmount,
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
  const payReq: PayReq = {
    coins: coinDepositPermissions,
    merchant_pub: d.contractData.merchantPub,
    mode: "pay",
    order_id: d.contractData.orderId,
  };
  const payCostInfo = await getTotalPaymentCost(ws, coinSelection);
  const t: PurchaseRecord = {
    abortDone: false,
    abortRequested: false,
    contractTermsRaw: d.contractTermsRaw,
    contractData: d.contractData,
    lastSessionId: sessionId,
    payCoinSelection: coinSelection,
    payReq,
    payCostInfo,
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
    refundGroups: [],
    refundsDone: {},
    refundsFailed: {},
    refundsPending: {},
    refundsRefreshCost: {},
  };

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.purchases, Stores.proposals, Stores.refreshGroups],
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
      await createRefreshGroup(tx, refreshCoinPubs, RefreshReason.Pay);
    },
  );

  ws.notify({
    type: NotificationType.ProposalAccepted,
    proposalId: proposal.proposalId,
  });
  return t;
}

function getNextUrl(contractData: WalletContractData): string {
  const f = contractData.fulfillmentUrl;
  if (f.startsWith("http://") || f.startsWith("https://")) {
    const fu = new URL(contractData.fulfillmentUrl);
    fu.searchParams.set("order_id", contractData.orderId);
    return fu.href;
  } else {
    return f;
  }
}

async function incrementProposalRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
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
  ws.notify({ type: NotificationType.ProposalOperationError });
}

async function incrementPurchasePayRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  console.log("incrementing purchase pay retry with error", err);
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
  ws.notify({ type: NotificationType.PayOperationError });
}

export async function processDownloadProposal(
  ws: InternalWalletState,
  proposalId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (err: OperationError): Promise<void> =>
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

  const parsedUrl = new URL(
    getOrderDownloadUrl(proposal.merchantBaseUrl, proposal.orderId),
  );
  parsedUrl.searchParams.set("nonce", proposal.noncePub);
  const urlWithNonce = parsedUrl.href;
  console.log("downloading contract from '" + urlWithNonce + "'");
  let resp;
  try {
    resp = await ws.http.get(urlWithNonce);
  } catch (e) {
    console.log("contract download failed", e);
    throw e;
  }

  if (resp.status !== 200) {
    throw Error(`contract download failed with status ${resp.status}`);
  }

  const proposalResp = codecForProposal().decode(await resp.json());

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
          fulfillmentUrl: parsedContractTerms.fulfillment_url,
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
        fulfillmentUrl.startsWith("http://") ||
        fulfillmentUrl.startsWith("https://")
      ) {
        const differentPurchase = await tx.getIndexed(
          Stores.purchases.fulfillmentUrlIndex,
          fulfillmentUrl,
        );
        if (differentPurchase) {
          console.log("repurchase detected");
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
  let resp;
  const payReq = { ...purchase.payReq, session_id: sessionId };

  console.log("paying with session ID", sessionId);

  const payUrl = new URL("pay", purchase.contractData.merchantBaseUrl).href;

  try {
    console.log("pay req", payReq);
    resp = await ws.http.postJson(payUrl, payReq);
  } catch (e) {
    // Gives the user the option to retry / abort and refresh
    console.log("payment failed", e);
    throw e;
  }
  if (resp.status !== 200) {
    console.log(await resp.json());
    throw Error(`unexpected status (${resp.status}) for /pay`);
  }
  const merchantResp = await resp.json();
  console.log("got success from pay URL", merchantResp);

  const now = getTimestampNow();

  const merchantPub = purchase.contractData.merchantPub;
  const valid: boolean = await ws.cryptoApi.isValidPaymentSignature(
    merchantResp.sig,
    purchase.contractData.contractTermsHash,
    merchantPub,
  );
  if (!valid) {
    console.error("merchant payment signature invalid");
    // FIXME: properly display error
    throw Error("merchant payment signature invalid");
  }
  const isFirst = purchase.timestampFirstSuccessfulPay === undefined;
  purchase.timestampFirstSuccessfulPay = now;
  purchase.paymentSubmitPending = false;
  purchase.lastPayError = undefined;
  purchase.payRetryInfo = initRetryInfo(false);
  if (isFirst) {
    const ar = purchase.contractData.autoRefund;
    if (ar) {
      console.log("auto_refund present");
      purchase.refundStatusRequested = true;
      purchase.refundStatusRetryInfo = initRetryInfo();
      purchase.lastRefundStatusError = undefined;
      purchase.autoRefundDeadline = timestampAddDuration(now, ar);
    }
  }

  await ws.db.runWithWriteTransaction(
    [Stores.purchases, Stores.payEvents],
    async (tx) => {
      await tx.put(Stores.purchases, purchase);
      const payEvent: PayEventRecord = {
        proposalId,
        sessionId,
        timestamp: now,
        isReplay: !isFirst,
      };
      await tx.put(Stores.payEvents, payEvent);
    },
  );

  const nextUrl = getNextUrl(purchase.contractData);
  ws.cachedNextUrl[purchase.contractData.fulfillmentUrl] = {
    nextUrl,
    lastSessionId: sessionId,
  };

  return { nextUrl };
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
    return {
      status: "error",
      error: "URI not supported",
    };
  }

  let proposalId = await startDownloadProposal(
    ws,
    uriResult.merchantBaseUrl,
    uriResult.orderId,
    uriResult.sessionId,
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
    console.log("using existing purchase for same product");
    proposal = await ws.db.get(Stores.proposals, existingProposalId);
    if (!proposal) {
      throw Error("existing proposal is in wrong state");
    }
  }
  const d = proposal.download;
  if (!d) {
    console.error("bad proposal", proposal);
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
      console.log("not confirming payment, insufficient coins");
      return {
        status: "insufficient-balance",
        contractTermsRaw: d.contractTermsRaw,
        proposalId: proposal.proposalId,
      };
    }

    const costInfo = await getTotalPaymentCost(ws, res);
    const totalFees = Amounts.sub(costInfo.totalCost, res.paymentAmount).amount;

    return {
      status: "payment-possible",
      contractTermsRaw: d.contractTermsRaw,
      proposalId: proposal.proposalId,
      totalFees,
    };
  }

  if (uriResult.sessionId && purchase.lastSessionId !== uriResult.sessionId) {
    console.log(
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
    await submitPay(ws, proposalId);
  }

  return {
    status: "paid",
    contractTermsRaw: purchase.contractTermsRaw,
    nextUrl: getNextUrl(purchase.contractData),
  };
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
    console.log("not confirming payment, insufficient coins");
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
      denomPub: coin.denomPub,
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

  logger.trace("confirmPay: submitting payment after creating purchase record");
  logger.trace("purchaseRecord:", purchase);
  return submitPay(ws, proposalId);
}

export async function processPurchasePay(
  ws: InternalWalletState,
  proposalId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: OperationError): Promise<void> =>
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
      type: NotificationType.Wildcard,
    });
  }
}
