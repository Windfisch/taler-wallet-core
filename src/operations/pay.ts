/*
 This file is part of GNU Taler
 (C) Taler Systems S.A.

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
  CoinRecord,
  CoinStatus,
  DenominationRecord,
  initRetryInfo,
  ProposalRecord,
  ProposalStatus,
  PurchaseRecord,
  RefundReason,
  Stores,
  updateRetryInfoTimeout,
  PayEventRecord,
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import {
  Auditor,
  ContractTerms,
  ExchangeHandle,
  MerchantRefundResponse,
  PayReq,
  Proposal,
} from "../types/talerTypes";
import {
  CoinSelectionResult,
  CoinWithDenom,
  ConfirmPayResult,
  getTimestampNow,
  OperationError,
  PaySigInfo,
  PreparePayResult,
  RefreshReason,
  Timestamp,
} from "../types/walletTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import {
  amountToPretty,
  canonicalJson,
  extractTalerDuration,
  extractTalerStampOrThrow,
  strcmp,
} from "../util/helpers";
import { Logger } from "../util/logging";
import { getOrderDownloadUrl, parsePayUri } from "../util/taleruri";
import { guardOperationException } from "./errors";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import { acceptRefundResponse } from "./refund";
import { InternalWalletState } from "./state";

interface CoinsForPaymentArgs {
  allowedAuditors: Auditor[];
  allowedExchanges: ExchangeHandle[];
  depositFeeLimit: AmountJson;
  paymentAmount: AmountJson;
  wireFeeAmortization: number;
  wireFeeLimit: AmountJson;
  wireFeeTime: Timestamp;
  wireMethod: string;
}

interface SelectPayCoinsResult {
  cds: CoinWithDenom[];
  totalFees: AmountJson;
}

const logger = new Logger("pay.ts");

/**
 * Select coins for a payment under the merchant's constraints.
 *
 * @param denoms all available denoms, used to compute refresh fees
 */
export function selectPayCoins(
  denoms: DenominationRecord[],
  cds: CoinWithDenom[],
  paymentAmount: AmountJson,
  depositFeeLimit: AmountJson,
): SelectPayCoinsResult | undefined {
  if (cds.length === 0) {
    return undefined;
  }
  // Sort by ascending deposit fee and denomPub if deposit fee is the same
  // (to guarantee deterministic results)
  cds.sort(
    (o1, o2) =>
      Amounts.cmp(o1.denom.feeDeposit, o2.denom.feeDeposit) ||
      strcmp(o1.denom.denomPub, o2.denom.denomPub),
  );
  const currency = cds[0].denom.value.currency;
  const cdsResult: CoinWithDenom[] = [];
  let accDepositFee: AmountJson = Amounts.getZero(currency);
  let accAmount: AmountJson = Amounts.getZero(currency);
  for (const { coin, denom } of cds) {
    if (coin.suspended) {
      continue;
    }
    if (coin.status !== CoinStatus.Fresh) {
      continue;
    }
    if (Amounts.cmp(denom.feeDeposit, coin.currentAmount) >= 0) {
      continue;
    }
    cdsResult.push({ coin, denom });
    accDepositFee = Amounts.add(denom.feeDeposit, accDepositFee).amount;
    let leftAmount = Amounts.sub(
      coin.currentAmount,
      Amounts.sub(paymentAmount, accAmount).amount,
    ).amount;
    accAmount = Amounts.add(coin.currentAmount, accAmount).amount;
    const coversAmount = Amounts.cmp(accAmount, paymentAmount) >= 0;
    const coversAmountWithFee =
      Amounts.cmp(
        accAmount,
        Amounts.add(paymentAmount, denom.feeDeposit).amount,
      ) >= 0;
    const isBelowFee = Amounts.cmp(accDepositFee, depositFeeLimit) <= 0;

    logger.trace("candidate coin selection", {
      coversAmount,
      isBelowFee,
      accDepositFee,
      accAmount,
      paymentAmount,
    });

    if ((coversAmount && isBelowFee) || coversAmountWithFee) {
      const depositFeeToCover = Amounts.sub(accDepositFee, depositFeeLimit)
        .amount;
      leftAmount = Amounts.sub(leftAmount, depositFeeToCover).amount;
      logger.trace("deposit fee to cover", amountToPretty(depositFeeToCover));
      let totalFees: AmountJson = Amounts.getZero(currency);
      if (coversAmountWithFee && !isBelowFee) {
        // these are the fees the customer has to pay
        // because the merchant doesn't cover them
        totalFees = Amounts.sub(depositFeeLimit, accDepositFee).amount;
      }
      totalFees = Amounts.add(
        totalFees,
        getTotalRefreshCost(denoms, denom, leftAmount),
      ).amount;
      return { cds: cdsResult, totalFees };
    }
  }
  return undefined;
}

/**
 * Get exchanges and associated coins that are still spendable, but only
 * if the sum the coins' remaining value covers the payment amount and fees.
 */
async function getCoinsForPayment(
  ws: InternalWalletState,
  args: CoinsForPaymentArgs,
): Promise<CoinSelectionResult | undefined> {
  const {
    allowedAuditors,
    allowedExchanges,
    depositFeeLimit,
    paymentAmount,
    wireFeeAmortization,
    wireFeeLimit,
    wireFeeTime,
    wireMethod,
  } = args;

  let remainingAmount = paymentAmount;

  const exchanges = await ws.db.iter(Stores.exchanges).toArray();

  for (const exchange of exchanges) {
    let isOkay: boolean = false;
    const exchangeDetails = exchange.details;
    if (!exchangeDetails) {
      continue;
    }
    const exchangeFees = exchange.wireInfo;
    if (!exchangeFees) {
      continue;
    }

    // is the exchange explicitly allowed?
    for (const allowedExchange of allowedExchanges) {
      if (allowedExchange.master_pub === exchangeDetails.masterPublicKey) {
        isOkay = true;
        break;
      }
    }

    // is the exchange allowed because of one of its auditors?
    if (!isOkay) {
      for (const allowedAuditor of allowedAuditors) {
        for (const auditor of exchangeDetails.auditors) {
          if (auditor.auditor_pub === allowedAuditor.auditor_pub) {
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

    const denoms = await ws.db
      .iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl)
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
    const cds: CoinWithDenom[] = [];
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
      cds.push({ coin, denom });
    }

    let totalFees = Amounts.getZero(currency);
    let wireFee: AmountJson | undefined;
    for (const fee of exchangeFees.feesForType[wireMethod] || []) {
      if (fee.startStamp <= wireFeeTime && fee.endStamp >= wireFeeTime) {
        wireFee = fee.wireFee;
        break;
      }
    }

    if (wireFee) {
      const amortizedWireFee = Amounts.divide(wireFee, wireFeeAmortization);
      if (Amounts.cmp(wireFeeLimit, amortizedWireFee) < 0) {
        totalFees = Amounts.add(amortizedWireFee, totalFees).amount;
        remainingAmount = Amounts.add(amortizedWireFee, remainingAmount).amount;
      }
    }

    const res = selectPayCoins(denoms, cds, remainingAmount, depositFeeLimit);

    if (res) {
      totalFees = Amounts.add(totalFees, res.totalFees).amount;
      return {
        cds: res.cds,
        exchangeUrl: exchange.baseUrl,
        totalAmount: remainingAmount,
        totalFees,
      };
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
  payCoinInfo: PaySigInfo,
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
    coins: payCoinInfo.coinInfo.map((x) => x.sig),
    merchant_pub: d.contractTerms.merchant_pub,
    mode: "pay",
    order_id: d.contractTerms.order_id,
  };
  const t: PurchaseRecord = {
    abortDone: false,
    abortRequested: false,
    contractTerms: d.contractTerms,
    contractTermsHash: d.contractTermsHash,
    lastSessionId: sessionId,
    merchantSig: d.merchantSig,
    payReq,
    timestampAccept: getTimestampNow(),
    timestampLastRefundStatus: undefined,
    proposalId: proposal.proposalId,
    lastPayError: undefined,
    lastRefundStatusError: undefined,
    payRetryInfo: initRetryInfo(),
    refundStatusRetryInfo: initRetryInfo(),
    refundStatusRequested: false,
    lastRefundApplyError: undefined,
    refundApplyRetryInfo: initRetryInfo(),
    timestampFirstSuccessfulPay: undefined,
    autoRefundDeadline: undefined,
    paymentSubmitPending: true,
    refundState: {
      refundGroups: [],
      refundsDone: {},
      refundsFailed: {},
      refundsPending: {},
    },
  };

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.purchases, Stores.proposals, Stores.refreshGroups],
    async tx => {
      const p = await tx.get(Stores.proposals, proposal.proposalId);
      if (p) {
        p.proposalStatus = ProposalStatus.ACCEPTED;
        p.lastError = undefined;
        p.retryInfo = initRetryInfo(false);
        await tx.put(Stores.proposals, p);
      }
      await tx.put(Stores.purchases, t);
      for (let coinInfo of payCoinInfo.coinInfo) {
        const coin = await tx.get(Stores.coins, coinInfo.coinPub);
        if (!coin) {
          throw Error("coin allocated for payment doesn't exist anymore");
        }
        coin.status = CoinStatus.Dormant;
        const remaining = Amounts.sub(coin.currentAmount, coinInfo.subtractedAmount);
        if (remaining.saturated) {
          throw Error("not enough remaining balance on coin for payment");
        }
        coin.currentAmount = remaining.amount;
        await tx.put(Stores.coins, coin);
      }
      const refreshCoinPubs = payCoinInfo.coinInfo.map((x) => ({coinPub: x.coinPub}));
      await createRefreshGroup(tx, refreshCoinPubs, RefreshReason.Pay);
    },
  );

  ws.notify({
    type: NotificationType.ProposalAccepted,
    proposalId: proposal.proposalId,
  });
  return t;
}

function getNextUrl(contractTerms: ContractTerms): string {
  const f = contractTerms.fulfillment_url;
  if (f.startsWith("http://") || f.startsWith("https://")) {
    const fu = new URL(contractTerms.fulfillment_url);
    fu.searchParams.set("order_id", contractTerms.order_id);
    return fu.href;
  } else {
    return f;
  }
}

export async function abortFailedPayment(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    throw Error("Purchase not found, unable to abort with refund");
  }
  if (purchase.timestampFirstSuccessfulPay) {
    throw Error("Purchase already finished, not aborting");
  }
  if (purchase.abortDone) {
    console.warn("abort requested on already aborted purchase");
    return;
  }

  purchase.abortRequested = true;

  // From now on, we can't retry payment anymore,
  // so mark this in the DB in case the /pay abort
  // does not complete on the first try.
  await ws.db.put(Stores.purchases, purchase);

  let resp;

  const abortReq = { ...purchase.payReq, mode: "abort-refund" };

  const payUrl = new URL("pay", purchase.contractTerms.merchant_base_url).href;

  try {
    resp = await ws.http.postJson(payUrl, abortReq);
  } catch (e) {
    // Gives the user the option to retry / abort and refresh
    console.log("aborting payment failed", e);
    throw e;
  }

  if (resp.status !== 200) {
    throw Error(`unexpected status for /pay (${resp.status})`);
  }

  const refundResponse = MerchantRefundResponse.checked(await resp.json());
  await acceptRefundResponse(
    ws,
    purchase.proposalId,
    refundResponse,
    RefundReason.AbortRefund,
  );

  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
    const p = await tx.get(Stores.purchases, proposalId);
    if (!p) {
      return;
    }
    p.abortDone = true;
    await tx.put(Stores.purchases, p);
  });
}

async function incrementProposalRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.proposals], async tx => {
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
  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
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
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (err: OperationError) =>
    incrementProposalRetry(ws, proposalId, err);
  await guardOperationException(
    () => processDownloadProposalImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetDownloadProposalRetry(
  ws: InternalWalletState,
  proposalId: string,
) {
  await ws.db.mutate(Stores.proposals, proposalId, x => {
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

  const proposalResp = Proposal.checked(await resp.json());

  const contractTermsHash = await ws.cryptoApi.hashString(
    canonicalJson(proposalResp.contract_terms),
  );

  const fulfillmentUrl = proposalResp.contract_terms.fulfillment_url;

  await ws.db.runWithWriteTransaction(
    [Stores.proposals, Stores.purchases],
    async tx => {
      const p = await tx.get(Stores.proposals, proposalId);
      if (!p) {
        return;
      }
      if (p.proposalStatus !== ProposalStatus.DOWNLOADING) {
        return;
      }
      p.download = {
        contractTerms: proposalResp.contract_terms,
        merchantSig: proposalResp.sig,
        contractTermsHash,
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

  await ws.db.runWithWriteTransaction([Stores.proposals], async tx => {
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

  const payUrl = new URL("pay", purchase.contractTerms.merchant_base_url).href;

  try {
    resp = await ws.http.postJson(payUrl, payReq);
  } catch (e) {
    // Gives the user the option to retry / abort and refresh
    console.log("payment failed", e);
    throw e;
  }
  if (resp.status !== 200) {
    throw Error(`unexpected status (${resp.status}) for /pay`);
  }
  const merchantResp = await resp.json();
  console.log("got success from pay URL", merchantResp);

  const now = getTimestampNow();

  const merchantPub = purchase.contractTerms.merchant_pub;
  const valid: boolean = await ws.cryptoApi.isValidPaymentSignature(
    merchantResp.sig,
    purchase.contractTermsHash,
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
    const ar = purchase.contractTerms.auto_refund;
    if (ar) {
      console.log("auto_refund present");
      const autoRefundDelay = extractTalerDuration(ar);
      console.log("auto_refund valid", autoRefundDelay);
      if (autoRefundDelay) {
        purchase.refundStatusRequested = true;
        purchase.refundStatusRetryInfo = initRetryInfo();
        purchase.lastRefundStatusError = undefined;
        purchase.autoRefundDeadline = {
          t_ms: now.t_ms + autoRefundDelay.d_ms,
        };
      }
    }
  }

  await ws.db.runWithWriteTransaction(
    [Stores.purchases, Stores.payEvents],
    async tx => {
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

  const nextUrl = getNextUrl(purchase.contractTerms);
  ws.cachedNextUrl[purchase.contractTerms.fulfillment_url] = {
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
export async function preparePay(
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
  const contractTerms = d.contractTerms;
  const merchantSig = d.merchantSig;
  if (!contractTerms || !merchantSig) {
    throw Error("BUG: proposal is in invalid state");
  }

  proposalId = proposal.proposalId;

  // First check if we already payed for it.
  const purchase = await ws.db.get(Stores.purchases, proposalId);

  if (!purchase) {
    const paymentAmount = Amounts.parseOrThrow(contractTerms.amount);
    let wireFeeLimit;
    if (contractTerms.max_wire_fee) {
      wireFeeLimit = Amounts.parseOrThrow(contractTerms.max_wire_fee);
    } else {
      wireFeeLimit = Amounts.getZero(paymentAmount.currency);
    }
    // If not already payed, check if we could pay for it.
    const res = await getCoinsForPayment(ws, {
      allowedAuditors: contractTerms.auditors,
      allowedExchanges: contractTerms.exchanges,
      depositFeeLimit: Amounts.parseOrThrow(contractTerms.max_fee),
      paymentAmount,
      wireFeeAmortization: contractTerms.wire_fee_amortization || 1,
      wireFeeLimit,
      wireFeeTime: extractTalerStampOrThrow(contractTerms.timestamp),
      wireMethod: contractTerms.wire_method,
    });

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return {
        status: "insufficient-balance",
        contractTerms: contractTerms,
        proposalId: proposal.proposalId,
      };
    }

    return {
      status: "payment-possible",
      contractTerms: contractTerms,
      proposalId: proposal.proposalId,
      totalFees: res.totalFees,
    };
  }

  if (uriResult.sessionId && purchase.lastSessionId !== uriResult.sessionId) {
    console.log("automatically re-submitting payment with different session ID")
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
    contractTerms: purchase.contractTerms,
    nextUrl: getNextUrl(purchase.contractTerms),
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

  let purchase = await ws.db.get(Stores.purchases, d.contractTermsHash);

  if (purchase) {
    if (
      sessionIdOverride !== undefined &&
      sessionIdOverride != purchase.lastSessionId
    ) {
      logger.trace(`changing session ID to ${sessionIdOverride}`);
      await ws.db.mutate(Stores.purchases, purchase.proposalId, x => {
        x.lastSessionId = sessionIdOverride;
        x.paymentSubmitPending = true;
        return x;
      });
    }
    logger.trace("confirmPay: submitting payment for existing purchase");
    return submitPay(ws, proposalId);
  }

  logger.trace("confirmPay: purchase record does not exist yet");

  const contractAmount = Amounts.parseOrThrow(d.contractTerms.amount);

  let wireFeeLimit;
  if (!d.contractTerms.max_wire_fee) {
    wireFeeLimit = Amounts.getZero(contractAmount.currency);
  } else {
    wireFeeLimit = Amounts.parseOrThrow(d.contractTerms.max_wire_fee);
  }

  const res = await getCoinsForPayment(ws, {
    allowedAuditors: d.contractTerms.auditors,
    allowedExchanges: d.contractTerms.exchanges,
    depositFeeLimit: Amounts.parseOrThrow(d.contractTerms.max_fee),
    paymentAmount: Amounts.parseOrThrow(d.contractTerms.amount),
    wireFeeAmortization: d.contractTerms.wire_fee_amortization || 1,
    wireFeeLimit,
    wireFeeTime: extractTalerStampOrThrow(d.contractTerms.timestamp),
    wireMethod: d.contractTerms.wire_method,
  });

  logger.trace("coin selection result", res);

  if (!res) {
    // Should not happen, since checkPay should be called first
    console.log("not confirming payment, insufficient coins");
    throw Error("insufficient balance");
  }

  const { cds, totalAmount } = res;
  const payCoinInfo = await ws.cryptoApi.signDeposit(
    d.contractTerms,
    cds,
    totalAmount,
  );
  purchase = await recordConfirmPay(
    ws,
    proposal,
    payCoinInfo,
    sessionIdOverride
  );

  logger.trace("confirmPay: submitting payment after creating purchase record");
  return submitPay(ws, proposalId);
}

export async function processPurchasePay(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementPurchasePayRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchasePayImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchasePayRetry(
  ws: InternalWalletState,
  proposalId: string,
) {
  await ws.db.mutate(Stores.purchases, proposalId, x => {
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
