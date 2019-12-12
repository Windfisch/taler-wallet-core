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

import { AmountJson } from "../util/amounts";
import {
  Auditor,
  ExchangeHandle,
  MerchantRefundResponse,
  PayReq,
  Proposal,
  ContractTerms,
  MerchantRefundPermission,
  RefundRequest,
} from "../types/talerTypes";
import {
  Timestamp,
  CoinSelectionResult,
  CoinWithDenom,
  PayCoinInfo,
  getTimestampNow,
  PreparePayResult,
  ConfirmPayResult,
  OperationError,
} from "../types/walletTypes";
import {
  Database
} from "../util/query";
import {
  Stores,
  CoinStatus,
  DenominationRecord,
  ProposalRecord,
  PurchaseRecord,
  CoinRecord,
  ProposalStatus,
  initRetryInfo,
  updateRetryInfoTimeout,
} from "../types/dbTypes";
import * as Amounts from "../util/amounts";
import {
  amountToPretty,
  strcmp,
  canonicalJson,
  extractTalerStampOrThrow,
  extractTalerDurationOrThrow,
  extractTalerDuration,
} from "../util/helpers";
import { Logger } from "../util/logging";
import { InternalWalletState } from "./state";
import {
  parsePayUri,
  parseRefundUri,
  getOrderDownloadUrl,
} from "../util/taleruri";
import { getTotalRefreshCost, refresh } from "./refresh";
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";
import { guardOperationException } from "./errors";
import { assertUnreachable } from "../util/assertUnreachable";
import { NotificationType } from "../types/notifications";

export interface SpeculativePayData {
  payCoinInfo: PayCoinInfo;
  exchangeUrl: string;
  orderDownloadId: string;
  proposal: ProposalRecord;
}

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

    const coins = await ws.db.iterIndex(
      Stores.coins.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

    const denoms = await ws.db.iterIndex(
      Stores.denominations.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

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
  payCoinInfo: PayCoinInfo,
  chosenExchange: string,
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
    coins: payCoinInfo.sigs,
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
    refundsDone: {},
    refundsPending: {},
    acceptTimestamp: getTimestampNow(),
    lastRefundStatusTimestamp: undefined,
    proposalId: proposal.proposalId,
    lastPayError: undefined,
    lastRefundStatusError: undefined,
    payRetryInfo: initRetryInfo(),
    refundStatusRetryInfo: initRetryInfo(),
    refundStatusRequested: false,
    lastRefundApplyError: undefined,
    refundApplyRetryInfo: initRetryInfo(),
    firstSuccessfulPayTimestamp: undefined,
    autoRefundDeadline: undefined,
    paymentSubmitPending: true,
  };

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.purchases, Stores.proposals],
    async tx => {
      const p = await tx.get(Stores.proposals, proposal.proposalId);
      if (p) {
        p.proposalStatus = ProposalStatus.ACCEPTED;
        p.lastError = undefined;
        p.retryInfo = initRetryInfo(false);
        await tx.put(Stores.proposals, p);
      }
      await tx.put(Stores.purchases, t);
      for (let c of payCoinInfo.updatedCoins) {
        await tx.put(Stores.coins, c);
      }
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
  if (purchase.firstSuccessfulPayTimestamp) {
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
  await acceptRefundResponse(ws, purchase.proposalId, refundResponse);

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

async function incrementPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  console.log("incrementing purchase refund query retry with error", err);
  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
    const pr = await tx.get(Stores.purchases, proposalId);
    if (!pr) {
      return;
    }
    if (!pr.refundStatusRetryInfo) {
      return;
    }
    pr.refundStatusRetryInfo.retryCounter++;
    updateRetryInfoTimeout(pr.refundStatusRetryInfo);
    pr.lastRefundStatusError = err;
    await tx.put(Stores.purchases, pr);
  });
  ws.notify({ type: NotificationType.RefundStatusOperationError });
}

async function incrementPurchaseApplyRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  console.log("incrementing purchase refund apply retry with error", err);
  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
    const pr = await tx.get(Stores.purchases, proposalId);
    if (!pr) {
      return;
    }
    if (!pr.refundApplyRetryInfo) {
      return;
    }
    pr.refundApplyRetryInfo.retryCounter++;
    updateRetryInfoTimeout(pr.refundStatusRetryInfo);
    pr.lastRefundApplyError = err;
    await tx.put(Stores.purchases, pr);
  });
  ws.notify({ type: NotificationType.RefundApplyOperationError });
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
      p.download = {
        contractTerms: proposalResp.contract_terms,
        merchantSig: proposalResp.sig,
        contractTermsHash,
      };
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
    const existingRecord = await tx.getIndexed(Stores.proposals.urlAndOrderIdIndex, [
      merchantBaseUrl,
      orderId,
    ]);
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
  const isFirst = purchase.firstSuccessfulPayTimestamp === undefined;
  purchase.firstSuccessfulPayTimestamp = getTimestampNow();
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
          t_ms: getTimestampNow().t_ms + autoRefundDelay.d_ms,
        };
      }
    }
  }

  const modifiedCoins: CoinRecord[] = [];
  for (const pc of purchase.payReq.coins) {
    const c = await ws.db.get(Stores.coins, pc.coin_pub);
    if (!c) {
      console.error("coin not found");
      throw Error("coin used in payment not found");
    }
    c.status = CoinStatus.Dirty;
    modifiedCoins.push(c);
  }

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.purchases],
    async tx => {
      for (let c of modifiedCoins) {
        await tx.put(Stores.coins, c);
      }
      await tx.put(Stores.purchases, purchase);
    },
  );

  for (const c of purchase.payReq.coins) {
    refresh(ws, c.coin_pub).catch(e => {
      console.log("error in refreshing after payment:", e);
    });
  }

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

    // Only create speculative signature if we don't already have one for this proposal
    if (
      !ws.speculativePayData ||
      (ws.speculativePayData &&
        ws.speculativePayData.orderDownloadId !== proposalId)
    ) {
      const { exchangeUrl, cds, totalAmount } = res;
      const payCoinInfo = await ws.cryptoApi.signDeposit(
        contractTerms,
        cds,
        totalAmount,
      );
      ws.speculativePayData = {
        exchangeUrl,
        payCoinInfo,
        proposal,
        orderDownloadId: proposalId,
      };
      logger.trace("created speculative pay data for payment");
    }

    return {
      status: "payment-possible",
      contractTerms: contractTerms,
      proposalId: proposal.proposalId,
      totalFees: res.totalFees,
    };
  }

  if (uriResult.sessionId) {
    await submitPay(ws, proposalId);
  }

  return {
    status: "paid",
    contractTerms: purchase.contractTerms,
    nextUrl: getNextUrl(purchase.contractTerms),
  };
}

/**
 * Get the speculative pay data, but only if coins have not changed in between.
 */
async function getSpeculativePayData(
  ws: InternalWalletState,
  proposalId: string,
): Promise<SpeculativePayData | undefined> {
  const sp = ws.speculativePayData;
  if (!sp) {
    return;
  }
  if (sp.orderDownloadId !== proposalId) {
    return;
  }
  const coinKeys = sp.payCoinInfo.updatedCoins.map(x => x.coinPub);
  const coins: CoinRecord[] = [];
  for (let coinKey of coinKeys) {
    const cc = await ws.db.get(Stores.coins, coinKey);
    if (cc) {
      coins.push(cc);
    }
  }
  for (let i = 0; i < coins.length; i++) {
    const specCoin = sp.payCoinInfo.originalCoins[i];
    const currentCoin = coins[i];

    // Coin does not exist anymore!
    if (!currentCoin) {
      return;
    }
    if (Amounts.cmp(specCoin.currentAmount, currentCoin.currentAmount) !== 0) {
      return;
    }
  }
  return sp;
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

  const sd = await getSpeculativePayData(ws, proposalId);
  if (!sd) {
    const { exchangeUrl, cds, totalAmount } = res;
    const payCoinInfo = await ws.cryptoApi.signDeposit(
      d.contractTerms,
      cds,
      totalAmount,
    );
    purchase = await recordConfirmPay(
      ws,
      proposal,
      payCoinInfo,
      exchangeUrl,
      sessionIdOverride,
    );
  } else {
    purchase = await recordConfirmPay(
      ws,
      sd.proposal,
      sd.payCoinInfo,
      sd.exchangeUrl,
      sessionIdOverride,
    );
  }

  logger.trace("confirmPay: submitting payment after creating purchase record");
  return submitPay(ws, proposalId);
}

export async function getFullRefundFees(
  ws: InternalWalletState,
  refundPermissions: MerchantRefundPermission[],
): Promise<AmountJson> {
  if (refundPermissions.length === 0) {
    throw Error("no refunds given");
  }
  const coin0 = await ws.db.get(
    Stores.coins,
    refundPermissions[0].coin_pub,
  );
  if (!coin0) {
    throw Error("coin not found");
  }
  let feeAcc = Amounts.getZero(
    Amounts.parseOrThrow(refundPermissions[0].refund_amount).currency,
  );

  const denoms = await ws.db.iterIndex(
    Stores.denominations.exchangeBaseUrlIndex,
    coin0.exchangeBaseUrl,
  ).toArray();

  for (const rp of refundPermissions) {
    const coin = await ws.db.get(Stores.coins, rp.coin_pub);
    if (!coin) {
      throw Error("coin not found");
    }
    const denom = await ws.db.get(Stores.denominations, [
      coin0.exchangeBaseUrl,
      coin.denomPub,
    ]);
    if (!denom) {
      throw Error(`denom not found (${coin.denomPub})`);
    }
    // FIXME:  this assumes that the refund already happened.
    // When it hasn't, the refresh cost is inaccurate.  To fix this,
    // we need introduce a flag to tell if a coin was refunded or
    // refreshed normally (and what about incremental refunds?)
    const refundAmount = Amounts.parseOrThrow(rp.refund_amount);
    const refundFee = Amounts.parseOrThrow(rp.refund_fee);
    const refreshCost = getTotalRefreshCost(
      denoms,
      denom,
      Amounts.sub(refundAmount, refundFee).amount,
    );
    feeAcc = Amounts.add(feeAcc, refreshCost, refundFee).amount;
  }
  return feeAcc;
}

async function acceptRefundResponse(
  ws: InternalWalletState,
  proposalId: string,
  refundResponse: MerchantRefundResponse,
): Promise<void> {
  const refundPermissions = refundResponse.refund_permissions;

  let numNewRefunds = 0;

  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
    const p = await tx.get(Stores.purchases, proposalId);
    if (!p) {
      console.error("purchase not found, not adding refunds");
      return;
    }

    if (!p.refundStatusRequested) {
      return;
    }

    for (const perm of refundPermissions) {
      if (
        !p.refundsPending[perm.merchant_sig] &&
        !p.refundsDone[perm.merchant_sig]
      ) {
        p.refundsPending[perm.merchant_sig] = perm;
        numNewRefunds++;
      }
    }

    // Are we done with querying yet, or do we need to do another round
    // after a retry delay?
    let queryDone = true;

    if (numNewRefunds === 0) {
      if (
        p.autoRefundDeadline &&
        p.autoRefundDeadline.t_ms > getTimestampNow().t_ms
      ) {
        queryDone = false;
      }
    }

    if (queryDone) {
      p.lastRefundStatusTimestamp = getTimestampNow();
      p.lastRefundStatusError = undefined;
      p.refundStatusRetryInfo = initRetryInfo();
      p.refundStatusRequested = false;
      console.log("refund query done");
    } else {
      // No error, but we need to try again!
      p.lastRefundStatusTimestamp = getTimestampNow();
      p.refundStatusRetryInfo.retryCounter++;
      updateRetryInfoTimeout(p.refundStatusRetryInfo);
      p.lastRefundStatusError = undefined;
      console.log("refund query not done");
    }

    if (numNewRefunds) {
      p.lastRefundApplyError = undefined;
      p.refundApplyRetryInfo = initRetryInfo();
    }

    await tx.put(Stores.purchases, p);
  });
  ws.notify({
    type: NotificationType.RefundQueried,
  });
  if (numNewRefunds > 0) {
    await processPurchaseApplyRefund(ws, proposalId);
  }
}

async function startRefundQuery(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const success = await ws.db.runWithWriteTransaction(
    [Stores.purchases],
    async tx => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        console.log("no purchase found for refund URL");
        return false;
      }
      p.refundStatusRequested = true;
      p.lastRefundStatusError = undefined;
      p.refundStatusRetryInfo = initRetryInfo();
      await tx.put(Stores.purchases, p);
      return true;
    },
  );

  if (!success) {
    return;
  }

  ws.notify({
    type: NotificationType.RefundStarted,
  });

  await processPurchaseQueryRefund(ws, proposalId);
}

/**
 * Accept a refund, return the contract hash for the contract
 * that was involved in the refund.
 */
export async function applyRefund(
  ws: InternalWalletState,
  talerRefundUri: string,
): Promise<string> {
  const parseResult = parseRefundUri(talerRefundUri);

  console.log("applying refund");

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  const purchase = await ws.db.getIndexed(
    Stores.purchases.orderIdIndex,
    [parseResult.merchantBaseUrl, parseResult.orderId],
  );

  if (!purchase) {
    throw Error("no purchase for the taler://refund/ URI was found");
  }

  console.log("processing purchase for refund");
  await startRefundQuery(ws, purchase.proposalId);

  return purchase.contractTermsHash;
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

export async function processPurchaseQueryRefund(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementPurchaseQueryRefundRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchaseQueryRefundImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
) {
  await ws.db.mutate(Stores.purchases, proposalId, x => {
    if (x.refundStatusRetryInfo.active) {
      x.refundStatusRetryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processPurchaseQueryRefundImpl(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetPurchaseQueryRefundRetry(ws, proposalId);
  }
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    return;
  }
  if (!purchase.refundStatusRequested) {
    return;
  }

  const refundUrlObj = new URL(
    "refund",
    purchase.contractTerms.merchant_base_url,
  );
  refundUrlObj.searchParams.set("order_id", purchase.contractTerms.order_id);
  const refundUrl = refundUrlObj.href;
  let resp;
  try {
    resp = await ws.http.get(refundUrl);
  } catch (e) {
    console.error("error downloading refund permission", e);
    throw e;
  }
  if (resp.status !== 200) {
    throw Error(`unexpected status code (${resp.status}) for /refund`);
  }

  const refundResponse = MerchantRefundResponse.checked(await resp.json());
  await acceptRefundResponse(ws, proposalId, refundResponse);
}

export async function processPurchaseApplyRefund(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementPurchaseApplyRefundRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchaseApplyRefundImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchaseApplyRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
) {
  await ws.db.mutate(Stores.purchases, proposalId, x => {
    if (x.refundApplyRetryInfo.active) {
      x.refundApplyRetryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processPurchaseApplyRefundImpl(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetPurchaseApplyRefundRetry(ws, proposalId);
  }
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    console.error("not submitting refunds, payment not found:");
    return;
  }
  const pendingKeys = Object.keys(purchase.refundsPending);
  if (pendingKeys.length === 0) {
    console.log("no pending refunds");
    return;
  }
  for (const pk of pendingKeys) {
    const perm = purchase.refundsPending[pk];
    const req: RefundRequest = {
      coin_pub: perm.coin_pub,
      h_contract_terms: purchase.contractTermsHash,
      merchant_pub: purchase.contractTerms.merchant_pub,
      merchant_sig: perm.merchant_sig,
      refund_amount: perm.refund_amount,
      refund_fee: perm.refund_fee,
      rtransaction_id: perm.rtransaction_id,
    };
    console.log("sending refund permission", perm);
    // FIXME: not correct once we support multiple exchanges per payment
    const exchangeUrl = purchase.payReq.coins[0].exchange_url;
    const reqUrl = new URL("refund", exchangeUrl);
    const resp = await ws.http.postJson(reqUrl.href, req);
    console.log("sent refund permission");
    if (resp.status !== 200) {
      console.error("refund failed", resp);
      continue;
    }

    let allRefundsProcessed = false;

    await ws.db.runWithWriteTransaction(
      [Stores.purchases, Stores.coins],
      async tx => {
        const p = await tx.get(Stores.purchases, proposalId);
        if (!p) {
          return;
        }
        if (p.refundsPending[pk]) {
          p.refundsDone[pk] = p.refundsPending[pk];
          delete p.refundsPending[pk];
        }
        if (Object.keys(p.refundsPending).length === 0) {
          p.refundStatusRetryInfo = initRetryInfo();
          p.lastRefundStatusError = undefined;
          allRefundsProcessed = true;
        }
        await tx.put(Stores.purchases, p);
        const c = await tx.get(Stores.coins, perm.coin_pub);
        if (!c) {
          console.warn("coin not found, can't apply refund");
          return;
        }
        const refundAmount = Amounts.parseOrThrow(perm.refund_amount);
        const refundFee = Amounts.parseOrThrow(perm.refund_fee);
        c.status = CoinStatus.Dirty;
        c.currentAmount = Amounts.add(c.currentAmount, refundAmount).amount;
        c.currentAmount = Amounts.sub(c.currentAmount, refundFee).amount;
        await tx.put(Stores.coins, c);
      },
    );
    if (allRefundsProcessed) {
      ws.notify({
        type: NotificationType.RefundFinished,
      });
    }
    await refresh(ws, perm.coin_pub);
  }

  ws.notify({
    type: NotificationType.RefundsSubmitted,
    proposalId,
  });
}
