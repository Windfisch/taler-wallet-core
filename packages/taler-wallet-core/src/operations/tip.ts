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

import { InternalWalletState } from "./state";
import { parseTipUri } from "../util/taleruri";
import { TipStatus, OperationErrorDetails } from "../types/walletTypes";
import {
  TipPlanchetDetail,
  codecForTipPickupGetResponse,
  codecForTipResponse,
} from "../types/talerTypes";
import * as Amounts from "../util/amounts";
import {
  Stores,
  PlanchetRecord,
  WithdrawalGroupRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
  WithdrawalSourceType,
  TipPlanchet,
} from "../types/dbTypes";
import {
  getExchangeWithdrawalInfo,
  selectWithdrawalDenoms,
  processWithdrawGroup,
  denomSelectionInfoToState,
} from "./withdraw";
import { updateExchangeFromUrl } from "./exchanges";
import { getRandomBytes, encodeCrock } from "../crypto/talerCrypto";
import { guardOperationException } from "./errors";
import { NotificationType } from "../types/notifications";
import { getTimestampNow } from "../util/time";
import { readSuccessResponseJsonOrThrow } from "../util/http";
import { URL } from "../util/url";

export async function getTipStatus(
  ws: InternalWalletState,
  talerTipUri: string,
): Promise<TipStatus> {
  const res = parseTipUri(talerTipUri);
  if (!res) {
    throw Error("invalid taler://tip URI");
  }

  const tipStatusUrl = new URL("tip-pickup", res.merchantBaseUrl);
  tipStatusUrl.searchParams.set("tip_id", res.merchantTipId);
  console.log("checking tip status from", tipStatusUrl.href);
  const merchantResp = await ws.http.get(tipStatusUrl.href);
  const tipPickupStatus = await readSuccessResponseJsonOrThrow(
    merchantResp,
    codecForTipPickupGetResponse(),
  );
  console.log("status", tipPickupStatus);

  const amount = Amounts.parseOrThrow(tipPickupStatus.amount);

  const merchantOrigin = new URL(res.merchantBaseUrl).origin;

  let tipRecord = await ws.db.get(Stores.tips, [
    res.merchantTipId,
    merchantOrigin,
  ]);

  if (!tipRecord) {
    await updateExchangeFromUrl(ws, tipPickupStatus.exchange_url);
    const withdrawDetails = await getExchangeWithdrawalInfo(
      ws,
      tipPickupStatus.exchange_url,
      amount,
    );

    const tipId = encodeCrock(getRandomBytes(32));
    const selectedDenoms = await selectWithdrawalDenoms(
      ws,
      tipPickupStatus.exchange_url,
      amount,
    );

    tipRecord = {
      tipId,
      acceptedTimestamp: undefined,
      rejectedTimestamp: undefined,
      amount,
      deadline: tipPickupStatus.stamp_expire,
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
      denomsSel: denomSelectionInfoToState(selectedDenoms),
    };
    await ws.db.put(Stores.tips, tipRecord);
  }

  const tipStatus: TipStatus = {
    accepted: !!tipRecord && !!tipRecord.acceptedTimestamp,
    amount: Amounts.parseOrThrow(tipPickupStatus.amount),
    amountLeft: Amounts.parseOrThrow(tipPickupStatus.amount_left),
    exchangeUrl: tipPickupStatus.exchange_url,
    nextUrl: tipPickupStatus.extra.next_url,
    merchantOrigin: merchantOrigin,
    merchantTipId: res.merchantTipId,
    expirationTimestamp: tipPickupStatus.stamp_expire,
    timestamp: tipPickupStatus.stamp_created,
    totalFees: tipRecord.totalFees,
    tipId: tipRecord.tipId,
  };

  return tipStatus;
}

async function incrementTipRetry(
  ws: InternalWalletState,
  refreshSessionId: string,
  err: OperationErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.tips], async (tx) => {
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
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: OperationErrorDetails): Promise<void> =>
    incrementTipRetry(ws, tipId, e);
  await guardOperationException(
    () => processTipImpl(ws, tipId, forceNow),
    onOpErr,
  );
}

async function resetTipRetry(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  await ws.db.mutate(Stores.tips, tipId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processTipImpl(
  ws: InternalWalletState,
  tipId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetTipRetry(ws, tipId);
  }
  let tipRecord = await ws.db.get(Stores.tips, tipId);
  if (!tipRecord) {
    return;
  }

  if (tipRecord.pickedUp) {
    console.log("tip already picked up");
    return;
  }

  const denomsForWithdraw = tipRecord.denomsSel;

  if (!tipRecord.planchets) {
    const planchets: TipPlanchet[] = [];

    for (const sd of denomsForWithdraw.selectedDenoms) {
      const denom = await ws.db.getIndexed(
        Stores.denominations.denomPubHashIndex,
        sd.denomPubHash,
      );
      if (!denom) {
        throw Error("denom does not exist anymore");
      }
      for (let i = 0; i < sd.count; i++) {
        const r = await ws.cryptoApi.createTipPlanchet(denom);
        planchets.push(r);
      }
    }
    await ws.db.mutate(Stores.tips, tipId, (r) => {
      if (!r.planchets) {
        r.planchets = planchets;
      }
      return r;
    });
  }

  tipRecord = await ws.db.get(Stores.tips, tipId);
  if (!tipRecord) {
    throw Error("tip not in database");
  }

  if (!tipRecord.planchets) {
    throw Error("invariant violated");
  }

  console.log("got planchets for tip!");

  // Planchets in the form that the merchant expects
  const planchetsDetail: TipPlanchetDetail[] = tipRecord.planchets.map((p) => ({
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

  const response = codecForTipResponse().decode(await merchantResp.json());

  if (response.reserve_sigs.length !== tipRecord.planchets.length) {
    throw Error("number of tip responses does not match requested planchets");
  }

  const withdrawalGroupId = encodeCrock(getRandomBytes(32));
  const planchets: PlanchetRecord[] = [];

  for (let i = 0; i < tipRecord.planchets.length; i++) {
    const tipPlanchet = tipRecord.planchets[i];
    const coinEvHash = await ws.cryptoApi.hashEncoded(tipPlanchet.coinEv);
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
      coinEvHash,
      coinIdx: i,
      withdrawalDone: false,
      withdrawalGroupId: withdrawalGroupId,
    };
    planchets.push(planchet);
  }

  const withdrawalGroup: WithdrawalGroupRecord = {
    exchangeBaseUrl: tipRecord.exchangeUrl,
    source: {
      type: WithdrawalSourceType.Tip,
      tipId: tipRecord.tipId,
    },
    timestampStart: getTimestampNow(),
    withdrawalGroupId: withdrawalGroupId,
    rawWithdrawalAmount: tipRecord.amount,
    lastErrorPerCoin: {},
    retryInfo: initRetryInfo(),
    timestampFinish: undefined,
    lastError: undefined,
    denomsSel: tipRecord.denomsSel,
  };

  await ws.db.runWithWriteTransaction(
    [Stores.tips, Stores.withdrawalGroups],
    async (tx) => {
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
      await tx.put(Stores.withdrawalGroups, withdrawalGroup);
      for (const p of planchets) {
        await tx.put(Stores.planchets, p);
      }
    },
  );

  await processWithdrawGroup(ws, withdrawalGroupId);
}

export async function acceptTip(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  const tipRecord = await ws.db.get(Stores.tips, tipId);
  if (!tipRecord) {
    console.log("tip not found");
    return;
  }

  tipRecord.acceptedTimestamp = getTimestampNow();
  await ws.db.put(Stores.tips, tipRecord);

  await processTip(ws, tipId);
  return;
}
