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
} from "../talerTypes";
import {
  Timestamp,
  CoinSelectionResult,
  CoinWithDenom,
  PayCoinInfo,
  getTimestampNow,
  PreparePayResult,
  ConfirmPayResult,
} from "../walletTypes";
import {
  oneShotIter,
  oneShotIterIndex,
  oneShotGet,
  runWithWriteTransaction,
  oneShotPut,
  oneShotGetIndexed,
} from "../util/query";
import {
  Stores,
  CoinStatus,
  DenominationRecord,
  ProposalRecord,
  PurchaseRecord,
  CoinRecord,
  ProposalStatus,
} from "../dbTypes";
import * as Amounts from "../util/amounts";
import {
  amountToPretty,
  strcmp,
  extractTalerStamp,
  canonicalJson,
} from "../util/helpers";
import { Logger } from "../util/logging";
import { InternalWalletState } from "./state";
import { parsePayUri } from "../util/taleruri";
import { getTotalRefreshCost, refresh } from "./refresh";
import { acceptRefundResponse } from "./refund";
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";

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

  const exchanges = await oneShotIter(ws.db, Stores.exchanges).toArray();

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

    const coins = await oneShotIterIndex(
      ws.db,
      Stores.coins.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

    const denoms = await oneShotIterIndex(
      ws.db,
      Stores.denominations.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

    if (!coins || coins.length === 0) {
      continue;
    }

    // Denomination of the first coin, we assume that all other
    // coins have the same currency
    const firstDenom = await oneShotGet(ws.db, Stores.denominations, [
      exchange.baseUrl,
      coins[0].denomPub,
    ]);
    if (!firstDenom) {
      throw Error("db inconsistent");
    }
    const currency = firstDenom.value.currency;
    const cds: CoinWithDenom[] = [];
    for (const coin of coins) {
      const denom = await oneShotGet(ws.db, Stores.denominations, [
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
): Promise<PurchaseRecord> {
  const payReq: PayReq = {
    coins: payCoinInfo.sigs,
    merchant_pub: proposal.contractTerms.merchant_pub,
    mode: "pay",
    order_id: proposal.contractTerms.order_id,
  };
  const t: PurchaseRecord = {
    abortDone: false,
    abortRequested: false,
    contractTerms: proposal.contractTerms,
    contractTermsHash: proposal.contractTermsHash,
    finished: false,
    lastSessionId: undefined,
    merchantSig: proposal.merchantSig,
    payReq,
    refundsDone: {},
    refundsPending: {},
    timestamp: getTimestampNow(),
    timestamp_refund: undefined,
  };

  await runWithWriteTransaction(
    ws.db,
    [Stores.coins, Stores.purchases],
    async tx => {
      await tx.put(Stores.purchases, t);
      for (let c of payCoinInfo.updatedCoins) {
        await tx.put(Stores.coins, c);
      }
    },
  );

  ws.badge.showNotification();
  ws.notifier.notify();
  return t;
}

function getNextUrl(contractTerms: ContractTerms): string {
  const fu = new URL(contractTerms.fulfillment_url)
  fu.searchParams.set("order_id", contractTerms.order_id);
  return fu.href;
}

export async function abortFailedPayment(
  ws: InternalWalletState,
  contractTermsHash: string,
): Promise<void> {
  const purchase = await oneShotGet(ws.db, Stores.purchases, contractTermsHash);
  if (!purchase) {
    throw Error("Purchase not found, unable to abort with refund");
  }
  if (purchase.finished) {
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
  await oneShotPut(ws.db, Stores.purchases, purchase);

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

  const refundResponse = MerchantRefundResponse.checked(resp.responseJson);
  await acceptRefundResponse(ws, refundResponse);

  await runWithWriteTransaction(ws.db, [Stores.purchases], async tx => {
    const p = await tx.get(Stores.purchases, purchase.contractTermsHash);
    if (!p) {
      return;
    }
    p.abortDone = true;
    await tx.put(Stores.purchases, p);
  });
}

/**
 * Download a proposal and store it in the database.
 * Returns an id for it to retrieve it later.
 *
 * @param sessionId Current session ID, if the proposal is being
 *  downloaded in the context of a session ID.
 */
async function downloadProposal(
  ws: InternalWalletState,
  url: string,
  sessionId?: string,
): Promise<string> {
  const oldProposal = await oneShotGetIndexed(
    ws.db,
    Stores.proposals.urlIndex,
    url,
  );
  if (oldProposal) {
    return oldProposal.proposalId;
  }

  const { priv, pub } = await ws.cryptoApi.createEddsaKeypair();
  const parsed_url = new URL(url);
  parsed_url.searchParams.set("nonce", pub);
  const urlWithNonce = parsed_url.href;
  console.log("downloading contract from '" + urlWithNonce + "'");
  let resp;
  try {
    resp = await ws.http.get(urlWithNonce);
  } catch (e) {
    console.log("contract download failed", e);
    throw e;
  }

  const proposal = Proposal.checked(resp.responseJson);

  const contractTermsHash = await ws.cryptoApi.hashString(
    canonicalJson(proposal.contract_terms),
  );

  const proposalId = encodeCrock(getRandomBytes(32));

  const proposalRecord: ProposalRecord = {
    contractTerms: proposal.contract_terms,
    contractTermsHash,
    merchantSig: proposal.sig,
    noncePriv: priv,
    timestamp: getTimestampNow(),
    url,
    downloadSessionId: sessionId,
    proposalId: proposalId,
    proposalStatus: ProposalStatus.PROPOSED,
  };
  await oneShotPut(ws.db, Stores.proposals, proposalRecord);
  ws.notifier.notify();

  return proposalId;
}

async function submitPay(
  ws: InternalWalletState,
  contractTermsHash: string,
  sessionId: string | undefined,
): Promise<ConfirmPayResult> {
  const purchase = await oneShotGet(ws.db, Stores.purchases, contractTermsHash);
  if (!purchase) {
    throw Error("Purchase not found: " + contractTermsHash);
  }
  if (purchase.abortRequested) {
    throw Error("not submitting payment for aborted purchase");
  }
  let resp;
  const payReq = { ...purchase.payReq, session_id: sessionId };

  const payUrl = new URL("pay", purchase.contractTerms.merchant_base_url).href;

  try {
    resp = await ws.http.postJson(payUrl, payReq);
  } catch (e) {
    // Gives the user the option to retry / abort and refresh
    console.log("payment failed", e);
    throw e;
  }
  const merchantResp = resp.responseJson;
  console.log("got success from pay URL");

  const merchantPub = purchase.contractTerms.merchant_pub;
  const valid: boolean = await ws.cryptoApi.isValidPaymentSignature(
    merchantResp.sig,
    contractTermsHash,
    merchantPub,
  );
  if (!valid) {
    console.error("merchant payment signature invalid");
    // FIXME: properly display error
    throw Error("merchant payment signature invalid");
  }
  purchase.finished = true;
  const modifiedCoins: CoinRecord[] = [];
  for (const pc of purchase.payReq.coins) {
    const c = await oneShotGet(ws.db, Stores.coins, pc.coin_pub);
    if (!c) {
      console.error("coin not found");
      throw Error("coin used in payment not found");
    }
    c.status = CoinStatus.Dirty;
    modifiedCoins.push(c);
  }

  await runWithWriteTransaction(
    ws.db,
    [Stores.coins, Stores.purchases],
    async tx => {
      for (let c of modifiedCoins) {
        tx.put(Stores.coins, c);
      }
      tx.put(Stores.purchases, purchase);
    },
  );

  for (const c of purchase.payReq.coins) {
    refresh(ws, c.coin_pub);
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

  let proposalId: string;
  try {
    proposalId = await downloadProposal(
      ws,
      uriResult.downloadUrl,
      uriResult.sessionId,
    );
  } catch (e) {
    return {
      status: "error",
      error: e.toString(),
    };
  }
  const proposal = await oneShotGet(ws.db, Stores.proposals, proposalId);
  if (!proposal) {
    throw Error(`could not get proposal ${proposalId}`);
  }

  console.log("proposal", proposal);

  const differentPurchase = await oneShotGetIndexed(
    ws.db,
    Stores.purchases.fulfillmentUrlIndex,
    proposal.contractTerms.fulfillment_url,
  );

  let fulfillmentUrl = proposal.contractTerms.fulfillment_url;
  let doublePurchaseDetection = false;
  if (fulfillmentUrl.startsWith("http")) {
    doublePurchaseDetection = true;
  }

  if (differentPurchase && doublePurchaseDetection) {
    // We do this check to prevent merchant B to find out if we bought a
    // digital product with merchant A by abusing the existing payment
    // redirect feature.
    if (
      differentPurchase.contractTerms.merchant_pub !=
      proposal.contractTerms.merchant_pub
    ) {
      console.warn(
        "merchant with different public key offered contract with same fulfillment URL as an existing purchase",
      );
    } else {
      if (uriResult.sessionId) {
        await submitPay(
          ws,
          differentPurchase.contractTermsHash,
          uriResult.sessionId,
        );
      }
      return {
        status: "paid",
        contractTerms: differentPurchase.contractTerms,
        nextUrl: getNextUrl(differentPurchase.contractTerms),
      };
    }
  }

  // First check if we already payed for it.
  const purchase = await oneShotGet(
    ws.db,
    Stores.purchases,
    proposal.contractTermsHash,
  );

  if (!purchase) {
    const paymentAmount = Amounts.parseOrThrow(proposal.contractTerms.amount);
    let wireFeeLimit;
    if (proposal.contractTerms.max_wire_fee) {
      wireFeeLimit = Amounts.parseOrThrow(proposal.contractTerms.max_wire_fee);
    } else {
      wireFeeLimit = Amounts.getZero(paymentAmount.currency);
    }
    // If not already payed, check if we could pay for it.
    const res = await getCoinsForPayment(ws, {
      allowedAuditors: proposal.contractTerms.auditors,
      allowedExchanges: proposal.contractTerms.exchanges,
      depositFeeLimit: Amounts.parseOrThrow(proposal.contractTerms.max_fee),
      paymentAmount,
      wireFeeAmortization: proposal.contractTerms.wire_fee_amortization || 1,
      wireFeeLimit,
      // FIXME: parse this properly
      wireFeeTime: extractTalerStamp(proposal.contractTerms.timestamp) || {
        t_ms: 0,
      },
      wireMethod: proposal.contractTerms.wire_method,
    });

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return {
        status: "insufficient-balance",
        contractTerms: proposal.contractTerms,
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
        proposal.contractTerms,
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
      contractTerms: proposal.contractTerms,
      proposalId: proposal.proposalId,
      totalFees: res.totalFees,
    };
  }

  if (uriResult.sessionId) {
    await submitPay(ws, purchase.contractTermsHash, uriResult.sessionId);
  }

  return {
    status: "paid",
    contractTerms: proposal.contractTerms,
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
    const cc = await oneShotGet(ws.db, Stores.coins, coinKey);
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
  const proposal = await oneShotGet(ws.db, Stores.proposals, proposalId);

  if (!proposal) {
    throw Error(`proposal with id ${proposalId} not found`);
  }

  const sessionId = sessionIdOverride || proposal.downloadSessionId;

  let purchase = await oneShotGet(
    ws.db,
    Stores.purchases,
    proposal.contractTermsHash,
  );

  if (purchase) {
    return submitPay(ws, purchase.contractTermsHash, sessionId);
  }

  const contractAmount = Amounts.parseOrThrow(proposal.contractTerms.amount);

  let wireFeeLimit;
  if (!proposal.contractTerms.max_wire_fee) {
    wireFeeLimit = Amounts.getZero(contractAmount.currency);
  } else {
    wireFeeLimit = Amounts.parseOrThrow(proposal.contractTerms.max_wire_fee);
  }

  const res = await getCoinsForPayment(ws, {
    allowedAuditors: proposal.contractTerms.auditors,
    allowedExchanges: proposal.contractTerms.exchanges,
    depositFeeLimit: Amounts.parseOrThrow(proposal.contractTerms.max_fee),
    paymentAmount: Amounts.parseOrThrow(proposal.contractTerms.amount),
    wireFeeAmortization: proposal.contractTerms.wire_fee_amortization || 1,
    wireFeeLimit,
    // FIXME: parse this properly
    wireFeeTime: extractTalerStamp(proposal.contractTerms.timestamp) || {
      t_ms: 0,
    },
    wireMethod: proposal.contractTerms.wire_method,
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
      proposal.contractTerms,
      cds,
      totalAmount,
    );
    purchase = await recordConfirmPay(ws, proposal, payCoinInfo, exchangeUrl);
  } else {
    purchase = await recordConfirmPay(
      ws,
      sd.proposal,
      sd.payCoinInfo,
      sd.exchangeUrl,
    );
  }

  return submitPay(ws, purchase.contractTermsHash, sessionId);
}
