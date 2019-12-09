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

 
import { oneShotGet, oneShotPut, oneShotMutate, runWithWriteTransaction } from "../util/query";
import { InternalWalletState } from "./state";
import { parseTipUri } from "../util/taleruri";
import { TipStatus, getTimestampNow, OperationError, NotificationType } from "../walletTypes";
import { TipPickupGetResponse, TipPlanchetDetail, TipResponse } from "../talerTypes";
import * as Amounts from "../util/amounts";
import { Stores, PlanchetRecord, WithdrawalSessionRecord, initRetryInfo, updateRetryInfoTimeout } from "../dbTypes";
import { getWithdrawDetailsForAmount, getVerifiedWithdrawDenomList, processWithdrawSession } from "./withdraw";
import { getTalerStampSec, extractTalerStampOrThrow } from "../util/helpers";
import { updateExchangeFromUrl } from "./exchanges";
import { getRandomBytes, encodeCrock } from "../crypto/talerCrypto";
import { guardOperationException } from "./errors";


export async function getTipStatus(
  ws: InternalWalletState,
  talerTipUri: string): Promise<TipStatus> {
  const res = parseTipUri(talerTipUri);
  if (!res) {
    throw Error("invalid taler://tip URI");
  }

  const tipStatusUrl = new URL("tip-pickup", res.merchantBaseUrl);
  tipStatusUrl.searchParams.set("tip_id", res.merchantTipId);
  console.log("checking tip status from", tipStatusUrl.href);
  const merchantResp = await ws.http.get(tipStatusUrl.href);
  if (merchantResp.status !== 200) {
    throw Error(`unexpected status ${merchantResp.status} for tip-pickup`);
  }
  const respJson = await merchantResp.json();
  console.log("resp:", respJson);
  const tipPickupStatus = TipPickupGetResponse.checked(respJson);

  console.log("status", tipPickupStatus);

  let amount = Amounts.parseOrThrow(tipPickupStatus.amount);

  let tipRecord = await oneShotGet(ws.db, Stores.tips, [
    res.merchantTipId,
    res.merchantOrigin,
  ]);

  if (!tipRecord) {
    const withdrawDetails = await getWithdrawDetailsForAmount(
      ws,
      tipPickupStatus.exchange_url,
      amount,
    );

    const tipId = encodeCrock(getRandomBytes(32));

    tipRecord = {
      tipId,
      accepted: false,
      amount,
      deadline: extractTalerStampOrThrow(tipPickupStatus.stamp_expire),
      exchangeUrl: tipPickupStatus.exchange_url,
      merchantBaseUrl: res.merchantBaseUrl,
      nextUrl: undefined,
      pickedUp: false,
      planchets: undefined,
      response: undefined,
      createdTimestamp: getTimestampNow(),
      merchantTipId: res.merchantTipId,
      totalFees: Amounts.add(
        withdrawDetails.overhead,
        withdrawDetails.withdrawFee,
      ).amount,
      retryInfo: initRetryInfo(),
      lastError: undefined,
    };
    await oneShotPut(ws.db, Stores.tips, tipRecord);
  }

  const tipStatus: TipStatus = {
    accepted: !!tipRecord && tipRecord.accepted,
    amount: Amounts.parseOrThrow(tipPickupStatus.amount),
    amountLeft: Amounts.parseOrThrow(tipPickupStatus.amount_left),
    exchangeUrl: tipPickupStatus.exchange_url,
    nextUrl: tipPickupStatus.extra.next_url,
    merchantOrigin: res.merchantOrigin,
    merchantTipId: res.merchantTipId,
    expirationTimestamp: getTalerStampSec(tipPickupStatus.stamp_expire)!,
    timestamp: getTalerStampSec(tipPickupStatus.stamp_created)!,
    totalFees: tipRecord.totalFees,
    tipId: tipRecord.tipId,
  };

  return tipStatus;
}

async function incrementTipRetry(
  ws: InternalWalletState,
  refreshSessionId: string,
  err: OperationError | undefined,
): Promise<void> {
  await runWithWriteTransaction(ws.db, [Stores.tips], async tx => {
    const t = await tx.get(Stores.tips, refreshSessionId);
    if (!t) {
      return;
    }
    if (!t.retryInfo) {
      return;
    }
    t.retryInfo.retryCounter++;
    updateRetryInfoTimeout(t.retryInfo);
    t.lastError = err;
    await tx.put(Stores.tips, t);
  });
  ws.notify({ type: NotificationType.TipOperationError });
}

export async function processTip(
  ws: InternalWalletState,
  tipId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) => incrementTipRetry(ws, tipId, e);
  await guardOperationException(() => processTipImpl(ws, tipId, forceNow), onOpErr);
}

async function resetTipRetry(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  await oneShotMutate(ws.db, Stores.tips, tipId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  })
}

async function processTipImpl(
  ws: InternalWalletState,
  tipId: string,
  forceNow: boolean,
) {
  if (forceNow) {
    await resetTipRetry(ws, tipId);
  }
  let tipRecord = await oneShotGet(ws.db, Stores.tips, tipId);
  if (!tipRecord) {
    return;
  }

  if (tipRecord.pickedUp) {
    console.log("tip already picked up");
    return;
  }

  if (!tipRecord.planchets) {
    await updateExchangeFromUrl(ws, tipRecord.exchangeUrl);
    const denomsForWithdraw = await getVerifiedWithdrawDenomList(
      ws,
      tipRecord.exchangeUrl,
      tipRecord.amount,
    );

    const planchets = await Promise.all(
      denomsForWithdraw.map(d => ws.cryptoApi.createTipPlanchet(d)),
    );

    await oneShotMutate(ws.db, Stores.tips, tipId, r => {
      if (!r.planchets) {
        r.planchets = planchets;
      }
      return r;
    });
  }

  tipRecord = await oneShotGet(ws.db, Stores.tips, tipId);
  if (!tipRecord) {
    throw Error("tip not in database");
  }

  if (!tipRecord.planchets) {
    throw Error("invariant violated");
  }

  console.log("got planchets for tip!");

  // Planchets in the form that the merchant expects
  const planchetsDetail: TipPlanchetDetail[] = tipRecord.planchets.map(p => ({
    coin_ev: p.coinEv,
    denom_pub_hash: p.denomPubHash,
  }));

  let merchantResp;

  const tipStatusUrl = new URL("tip-pickup", tipRecord.merchantBaseUrl);

  try {
    const req = { planchets: planchetsDetail, tip_id: tipRecord.merchantTipId };
    merchantResp = await ws.http.postJson(tipStatusUrl.href, req);
    if (merchantResp.status !== 200) {
      throw Error(`unexpected status ${merchantResp.status} for tip-pickup`);
    }
    console.log("got merchant resp:", merchantResp);
  } catch (e) {
    console.log("tipping failed", e);
    throw e;
  }

  const response = TipResponse.checked(await merchantResp.json());

  if (response.reserve_sigs.length !== tipRecord.planchets.length) {
    throw Error("number of tip responses does not match requested planchets");
  }

  const planchets: PlanchetRecord[] = [];

  for (let i = 0; i < tipRecord.planchets.length; i++) {
    const tipPlanchet = tipRecord.planchets[i];
    const planchet: PlanchetRecord = {
      blindingKey: tipPlanchet.blindingKey,
      coinEv: tipPlanchet.coinEv,
      coinPriv: tipPlanchet.coinPriv,
      coinPub: tipPlanchet.coinPub,
      coinValue: tipPlanchet.coinValue,
      denomPub: tipPlanchet.denomPub,
      denomPubHash: tipPlanchet.denomPubHash,
      reservePub: response.reserve_pub,
      withdrawSig: response.reserve_sigs[i].reserve_sig,
      isFromTip: true,
    };
    planchets.push(planchet);
  }

  const withdrawalSessionId = encodeCrock(getRandomBytes(32));

  const withdrawalSession: WithdrawalSessionRecord = {
    denoms: planchets.map((x) => x.denomPub),
    exchangeBaseUrl: tipRecord.exchangeUrl,
    planchets: planchets,
    source: {
      type: "tip",
      tipId: tipRecord.tipId,
    },
    startTimestamp: getTimestampNow(),
    withdrawSessionId: withdrawalSessionId,
    rawWithdrawalAmount: tipRecord.amount,
    withdrawn: planchets.map((x) => false),
    totalCoinValue: Amounts.sum(planchets.map((p) => p.coinValue)).amount,
    lastCoinErrors: planchets.map((x) => undefined),
    retryInfo: initRetryInfo(),
    finishTimestamp: undefined,
    lastError: undefined,
  };


  await runWithWriteTransaction(ws.db, [Stores.tips, Stores.withdrawalSession], async (tx) => {
    const tr = await tx.get(Stores.tips, tipId);
    if (!tr) {
      return;
    }
    if (tr.pickedUp) {
      return;
    }
    tr.pickedUp = true;
    tr.retryInfo = initRetryInfo(false);

    await tx.put(Stores.tips, tr);
    await tx.put(Stores.withdrawalSession, withdrawalSession);
  });

  await processWithdrawSession(ws, withdrawalSessionId);

  return;
}

export async function acceptTip(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  const tipRecord = await oneShotGet(ws.db, Stores.tips, tipId);
  if (!tipRecord) {
    console.log("tip not found");
    return;
  }

  tipRecord.accepted = true;
  await oneShotPut(ws.db, Stores.tips, tipRecord);

  await processTip(ws, tipId);
  return;
}
