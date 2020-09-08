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
import { PrepareTipResult, TalerErrorDetails } from "../types/walletTypes";
import {
  TipPlanchetDetail,
  codecForTipPickupGetResponse,
  codecForTipResponse,
} from "../types/talerTypes";
import * as Amounts from "../util/amounts";
import {
  Stores,
  TipPlanchet,
  CoinRecord,
  CoinSourceType,
  CoinStatus,
} from "../types/dbTypes";
import {
  getExchangeWithdrawalInfo,
  selectWithdrawalDenoms,
  denomSelectionInfoToState,
} from "./withdraw";
import { updateExchangeFromUrl } from "./exchanges";
import { getRandomBytes, encodeCrock } from "../crypto/talerCrypto";
import { guardOperationException, makeErrorDetails } from "./errors";
import { NotificationType } from "../types/notifications";
import { getTimestampNow } from "../util/time";
import { readSuccessResponseJsonOrThrow } from "../util/http";
import { URL } from "../util/url";
import { Logger } from "../util/logging";
import { checkDbInvariant } from "../util/invariants";
import { TalerErrorCode } from "../TalerErrorCode";
import { initRetryInfo, updateRetryInfoTimeout } from "../util/retries";

const logger = new Logger("operations/tip.ts");

export async function prepareTip(
  ws: InternalWalletState,
  talerTipUri: string,
): Promise<PrepareTipResult> {
  const res = parseTipUri(talerTipUri);
  if (!res) {
    throw Error("invalid taler://tip URI");
  }

  const tipStatusUrl = new URL(
    `tips/${res.merchantTipId}`,
    res.merchantBaseUrl,
  );
  logger.trace("checking tip status from", tipStatusUrl.href);
  const merchantResp = await ws.http.get(tipStatusUrl.href);
  const tipPickupStatus = await readSuccessResponseJsonOrThrow(
    merchantResp,
    codecForTipPickupGetResponse(),
  );
  logger.trace(`status ${tipPickupStatus}`);

  const amount = Amounts.parseOrThrow(tipPickupStatus.tip_amount);

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

    const walletTipId = encodeCrock(getRandomBytes(32));
    const selectedDenoms = await selectWithdrawalDenoms(
      ws,
      tipPickupStatus.exchange_url,
      amount,
    );

    tipRecord = {
      walletTipId: walletTipId,
      acceptedTimestamp: undefined,
      tipAmountRaw: amount,
      tipExpiration: tipPickupStatus.expiration,
      exchangeBaseUrl: tipPickupStatus.exchange_url,
      merchantBaseUrl: res.merchantBaseUrl,
      planchets: undefined,
      createdTimestamp: getTimestampNow(),
      merchantTipId: res.merchantTipId,
      tipAmountEffective: Amounts.sub(
        amount,
        Amounts.add(withdrawDetails.overhead, withdrawDetails.withdrawFee)
          .amount,
      ).amount,
      retryInfo: initRetryInfo(),
      lastError: undefined,
      denomsSel: denomSelectionInfoToState(selectedDenoms),
      pickedUpTimestamp: undefined,
    };
    await ws.db.put(Stores.tips, tipRecord);
  }

  const tipStatus: PrepareTipResult = {
    accepted: !!tipRecord && !!tipRecord.acceptedTimestamp,
    tipAmountRaw: Amounts.stringify(tipPickupStatus.tip_amount),
    exchangeBaseUrl: tipPickupStatus.exchange_url,
    expirationTimestamp: tipPickupStatus.expiration,
    tipAmountEffective: Amounts.stringify(tipRecord.tipAmountEffective),
    walletTipId: tipRecord.walletTipId,
  };

  return tipStatus;
}

async function incrementTipRetry(
  ws: InternalWalletState,
  refreshSessionId: string,
  err: TalerErrorDetails | undefined,
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
  if (err) {
    ws.notify({ type: NotificationType.TipOperationError, error: err });
  }
}

export async function processTip(
  ws: InternalWalletState,
  tipId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: TalerErrorDetails): Promise<void> =>
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
  walletTipId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetTipRetry(ws, walletTipId);
  }
  let tipRecord = await ws.db.get(Stores.tips, walletTipId);
  if (!tipRecord) {
    return;
  }

  if (tipRecord.pickedUpTimestamp) {
    logger.warn("tip already picked up");
    return;
  }

  const denomsForWithdraw = tipRecord.denomsSel;

  if (!tipRecord.planchets) {
    const planchets: TipPlanchet[] = [];

    for (const sd of denomsForWithdraw.selectedDenoms) {
      const denom = await ws.db.get(Stores.denominations, [
        tipRecord.exchangeBaseUrl,
        sd.denomPubHash,
      ]);
      if (!denom) {
        throw Error("denom does not exist anymore");
      }
      for (let i = 0; i < sd.count; i++) {
        const r = await ws.cryptoApi.createTipPlanchet(denom);
        planchets.push(r);
      }
    }
    await ws.db.mutate(Stores.tips, walletTipId, (r) => {
      if (!r.planchets) {
        r.planchets = planchets;
      }
      return r;
    });
  }

  tipRecord = await ws.db.get(Stores.tips, walletTipId);
  checkDbInvariant(!!tipRecord, "tip record should be in database");
  checkDbInvariant(!!tipRecord.planchets, "tip record should have planchets");

  // Planchets in the form that the merchant expects
  const planchetsDetail: TipPlanchetDetail[] = tipRecord.planchets.map((p) => ({
    coin_ev: p.coinEv,
    denom_pub_hash: p.denomPubHash,
  }));

  const tipStatusUrl = new URL(
    `/tips/${tipRecord.merchantTipId}/pickup`,
    tipRecord.merchantBaseUrl,
  );

  const req = { planchets: planchetsDetail };
  const merchantResp = await ws.http.postJson(tipStatusUrl.href, req);
  const response = await readSuccessResponseJsonOrThrow(
    merchantResp,
    codecForTipResponse(),
  );

  if (response.blind_sigs.length !== tipRecord.planchets.length) {
    throw Error("number of tip responses does not match requested planchets");
  }

  const newCoinRecords: CoinRecord[] = [];

  for (let i = 0; i < response.blind_sigs.length; i++) {
    const blindedSig = response.blind_sigs[i].blind_sig;

    const planchet = tipRecord.planchets[i];

    const denomSig = await ws.cryptoApi.rsaUnblind(
      blindedSig,
      planchet.blindingKey,
      planchet.denomPub,
    );

    const isValid = await ws.cryptoApi.rsaVerify(
      planchet.coinPub,
      denomSig,
      planchet.denomPub,
    );

    if (!isValid) {
      await ws.db.runWithWriteTransaction([Stores.planchets], async (tx) => {
        const tipRecord = await tx.get(Stores.tips, walletTipId);
        if (!tipRecord) {
          return;
        }
        tipRecord.lastError = makeErrorDetails(
          TalerErrorCode.WALLET_TIPPING_COIN_SIGNATURE_INVALID,
          "invalid signature from the exchange (via merchant tip) after unblinding",
          {},
        );
        await tx.put(Stores.tips, tipRecord);
      });
      return;
    }

    newCoinRecords.push({
      blindingKey: planchet.blindingKey,
      coinPriv: planchet.coinPriv,
      coinPub: planchet.coinPub,
      coinSource: {
        type: CoinSourceType.Tip,
        coinIndex: i,
        walletTipId: walletTipId,
      },
      currentAmount: planchet.coinValue,
      denomPub: planchet.denomPub,
      denomPubHash: planchet.denomPubHash,
      denomSig: denomSig,
      exchangeBaseUrl: tipRecord.exchangeBaseUrl,
      status: CoinStatus.Fresh,
      suspended: false,
    });
  }

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.tips, Stores.withdrawalGroups],
    async (tx) => {
      const tr = await tx.get(Stores.tips, walletTipId);
      if (!tr) {
        return;
      }
      if (tr.pickedUpTimestamp) {
        return;
      }
      tr.pickedUpTimestamp = getTimestampNow();
      tr.lastError = undefined;
      tr.retryInfo = initRetryInfo(false);
      await tx.put(Stores.tips, tr);
      for (const cr of newCoinRecords) {
        await tx.put(Stores.coins, cr);
      }
    },
  );
}

export async function acceptTip(
  ws: InternalWalletState,
  tipId: string,
): Promise<void> {
  const tipRecord = await ws.db.get(Stores.tips, tipId);
  if (!tipRecord) {
    logger.error("tip not found");
    return;
  }

  tipRecord.acceptedTimestamp = getTimestampNow();
  await ws.db.put(Stores.tips, tipRecord);

  await processTip(ws, tipId);
  return;
}
