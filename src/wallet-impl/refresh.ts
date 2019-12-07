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
import * as Amounts from "../util/amounts";
import {
  DenominationRecord,
  Stores,
  CoinStatus,
  RefreshPlanchetRecord,
  CoinRecord,
  RefreshSessionRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
} from "../dbTypes";
import { amountToPretty } from "../util/helpers";
import {
  oneShotGet,
  oneShotMutate,
  runWithWriteTransaction,
  TransactionAbort,
  oneShotIterIndex,
} from "../util/query";
import { InternalWalletState } from "./state";
import { Logger } from "../util/logging";
import { getWithdrawDenomList } from "./withdraw";
import { updateExchangeFromUrl } from "./exchanges";
import {
  getTimestampNow,
  OperationError,
  NotificationType,
} from "../walletTypes";
import { guardOperationException } from "./errors";

const logger = new Logger("refresh.ts");

/**
 * Get the amount that we lose when refreshing a coin of the given denomination
 * with a certain amount left.
 *
 * If the amount left is zero, then the refresh cost
 * is also considered to be zero.  If a refresh isn't possible (e.g. due to lack of
 * the right denominations), then the cost is the full amount left.
 *
 * Considers refresh fees, withdrawal fees after refresh and amounts too small
 * to refresh.
 */
export function getTotalRefreshCost(
  denoms: DenominationRecord[],
  refreshedDenom: DenominationRecord,
  amountLeft: AmountJson,
): AmountJson {
  const withdrawAmount = Amounts.sub(amountLeft, refreshedDenom.feeRefresh)
    .amount;
  const withdrawDenoms = getWithdrawDenomList(withdrawAmount, denoms);
  const resultingAmount = Amounts.add(
    Amounts.getZero(withdrawAmount.currency),
    ...withdrawDenoms.map(d => d.value),
  ).amount;
  const totalCost = Amounts.sub(amountLeft, resultingAmount).amount;
  logger.trace(
    "total refresh cost for",
    amountToPretty(amountLeft),
    "is",
    amountToPretty(totalCost),
  );
  return totalCost;
}

async function refreshMelt(
  ws: InternalWalletState,
  refreshSessionId: string,
): Promise<void> {
  const refreshSession = await oneShotGet(
    ws.db,
    Stores.refresh,
    refreshSessionId,
  );
  if (!refreshSession) {
    return;
  }
  if (refreshSession.norevealIndex !== undefined) {
    return;
  }

  const coin = await oneShotGet(
    ws.db,
    Stores.coins,
    refreshSession.meltCoinPub,
  );

  if (!coin) {
    console.error("can't melt coin, it does not exist");
    return;
  }

  const reqUrl = new URL("refresh/melt", refreshSession.exchangeBaseUrl);
  const meltReq = {
    coin_pub: coin.coinPub,
    confirm_sig: refreshSession.confirmSig,
    denom_pub_hash: coin.denomPubHash,
    denom_sig: coin.denomSig,
    rc: refreshSession.hash,
    value_with_fee: refreshSession.valueWithFee,
  };
  logger.trace("melt request:", meltReq);
  const resp = await ws.http.postJson(reqUrl.href, meltReq);

  logger.trace("melt response:", resp.responseJson);

  if (resp.status !== 200) {
    console.error(resp.responseJson);
    throw Error("refresh failed");
  }

  const respJson = resp.responseJson;

  const norevealIndex = respJson.noreveal_index;

  if (typeof norevealIndex !== "number") {
    throw Error("invalid response");
  }

  refreshSession.norevealIndex = norevealIndex;

  await oneShotMutate(ws.db, Stores.refresh, refreshSessionId, rs => {
    if (rs.norevealIndex !== undefined) {
      return;
    }
    if (rs.finishedTimestamp) {
      return;
    }
    rs.norevealIndex = norevealIndex;
    return rs;
  });

  ws.notify({
    type: NotificationType.RefreshMelted,
  });
}

async function refreshReveal(
  ws: InternalWalletState,
  refreshSessionId: string,
): Promise<void> {
  const refreshSession = await oneShotGet(
    ws.db,
    Stores.refresh,
    refreshSessionId,
  );
  if (!refreshSession) {
    return;
  }
  const norevealIndex = refreshSession.norevealIndex;
  if (norevealIndex === undefined) {
    throw Error("can't reveal without melting first");
  }
  const privs = Array.from(refreshSession.transferPrivs);
  privs.splice(norevealIndex, 1);

  const planchets = refreshSession.planchetsForGammas[norevealIndex];
  if (!planchets) {
    throw Error("refresh index error");
  }

  const meltCoinRecord = await oneShotGet(
    ws.db,
    Stores.coins,
    refreshSession.meltCoinPub,
  );
  if (!meltCoinRecord) {
    throw Error("inconsistent database");
  }

  const evs = planchets.map((x: RefreshPlanchetRecord) => x.coinEv);

  const linkSigs: string[] = [];
  for (let i = 0; i < refreshSession.newDenoms.length; i++) {
    const linkSig = await ws.cryptoApi.signCoinLink(
      meltCoinRecord.coinPriv,
      refreshSession.newDenomHashes[i],
      refreshSession.meltCoinPub,
      refreshSession.transferPubs[norevealIndex],
      planchets[i].coinEv,
    );
    linkSigs.push(linkSig);
  }

  const req = {
    coin_evs: evs,
    new_denoms_h: refreshSession.newDenomHashes,
    rc: refreshSession.hash,
    transfer_privs: privs,
    transfer_pub: refreshSession.transferPubs[norevealIndex],
    link_sigs: linkSigs,
  };

  const reqUrl = new URL("refresh/reveal", refreshSession.exchangeBaseUrl);
  logger.trace("reveal request:", req);

  let resp;
  try {
    resp = await ws.http.postJson(reqUrl.href, req);
  } catch (e) {
    console.error("got error during /refresh/reveal request");
    console.error(e);
    return;
  }

  logger.trace("session:", refreshSession);
  logger.trace("reveal response:", resp);

  if (resp.status !== 200) {
    console.error("error: /refresh/reveal returned status " + resp.status);
    return;
  }

  const respJson = resp.responseJson;

  if (!respJson.ev_sigs || !Array.isArray(respJson.ev_sigs)) {
    console.error("/refresh/reveal did not contain ev_sigs");
    return;
  }

  const coins: CoinRecord[] = [];

  for (let i = 0; i < respJson.ev_sigs.length; i++) {
    const denom = await oneShotGet(ws.db, Stores.denominations, [
      refreshSession.exchangeBaseUrl,
      refreshSession.newDenoms[i],
    ]);
    if (!denom) {
      console.error("denom not found");
      continue;
    }
    const pc =
      refreshSession.planchetsForGammas[refreshSession.norevealIndex!][i];
    const denomSig = await ws.cryptoApi.rsaUnblind(
      respJson.ev_sigs[i].ev_sig,
      pc.blindingKey,
      denom.denomPub,
    );
    const coin: CoinRecord = {
      blindingKey: pc.blindingKey,
      coinPriv: pc.privateKey,
      coinPub: pc.publicKey,
      currentAmount: denom.value,
      denomPub: denom.denomPub,
      denomPubHash: denom.denomPubHash,
      denomSig,
      exchangeBaseUrl: refreshSession.exchangeBaseUrl,
      reservePub: undefined,
      status: CoinStatus.Fresh,
      coinIndex: -1,
      withdrawSessionId: "",
    };

    coins.push(coin);
  }

  await runWithWriteTransaction(
    ws.db,
    [Stores.coins, Stores.refresh],
    async tx => {
      const rs = await tx.get(Stores.refresh, refreshSessionId);
      if (!rs) {
        console.log("no refresh session found");
        return;
      }
      if (rs.finishedTimestamp) {
        console.log("refresh session already finished");
        return;
      }
      rs.finishedTimestamp = getTimestampNow();
      rs.retryInfo = initRetryInfo(false);
      for (let coin of coins) {
        await tx.put(Stores.coins, coin);
      }
      await tx.put(Stores.refresh, rs);
    },
  );
  console.log("refresh finished (end of reveal)");
  ws.notify({
    type: NotificationType.RefreshRevealed,
  });
}

async function incrementRefreshRetry(
  ws: InternalWalletState,
  refreshSessionId: string,
  err: OperationError | undefined,
): Promise<void> {
  await runWithWriteTransaction(ws.db, [Stores.refresh], async tx => {
    const r = await tx.get(Stores.refresh, refreshSessionId);
    if (!r) {
      return;
    }
    if (!r.retryInfo) {
      return;
    }
    r.retryInfo.retryCounter++;
    updateRetryInfoTimeout(r.retryInfo);
    r.lastError = err;
    await tx.put(Stores.refresh, r);
  });
  ws.notify({ type: NotificationType.RefreshOperationError });
}

export async function processRefreshSession(
  ws: InternalWalletState,
  refreshSessionId: string,
  forceNow: boolean = false,
) {
  return ws.memoProcessRefresh.memo(refreshSessionId, async () => {
    const onOpErr = (e: OperationError) =>
      incrementRefreshRetry(ws, refreshSessionId, e);
    return guardOperationException(
      () => processRefreshSessionImpl(ws, refreshSessionId, forceNow),
      onOpErr,
    );
  });
}

async function resetRefreshSessionRetry(
  ws: InternalWalletState,
  refreshSessionId: string,
) {
  await oneShotMutate(ws.db, Stores.refresh, refreshSessionId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processRefreshSessionImpl(
  ws: InternalWalletState,
  refreshSessionId: string,
  forceNow: boolean,
) {
  if (forceNow) {
    await resetRefreshSessionRetry(ws, refreshSessionId);
  }
  const refreshSession = await oneShotGet(
    ws.db,
    Stores.refresh,
    refreshSessionId,
  );
  if (!refreshSession) {
    return;
  }
  if (refreshSession.finishedTimestamp) {
    return;
  }
  if (typeof refreshSession.norevealIndex !== "number") {
    await refreshMelt(ws, refreshSession.refreshSessionId);
  }
  await refreshReveal(ws, refreshSession.refreshSessionId);
  logger.trace("refresh finished");
}

export async function refresh(
  ws: InternalWalletState,
  oldCoinPub: string,
  force: boolean = false,
): Promise<void> {
  const coin = await oneShotGet(ws.db, Stores.coins, oldCoinPub);
  if (!coin) {
    console.warn("can't refresh, coin not in database");
    return;
  }
  switch (coin.status) {
    case CoinStatus.Dirty:
      break;
    case CoinStatus.Dormant:
      return;
    case CoinStatus.Fresh:
      if (!force) {
        return;
      }
      break;
  }

  const exchange = await updateExchangeFromUrl(ws, coin.exchangeBaseUrl);
  if (!exchange) {
    throw Error("db inconsistent: exchange of coin not found");
  }

  const oldDenom = await oneShotGet(ws.db, Stores.denominations, [
    exchange.baseUrl,
    coin.denomPub,
  ]);

  if (!oldDenom) {
    throw Error("db inconsistent: denomination for coin not found");
  }

  const availableDenoms: DenominationRecord[] = await oneShotIterIndex(
    ws.db,
    Stores.denominations.exchangeBaseUrlIndex,
    exchange.baseUrl,
  ).toArray();

  const availableAmount = Amounts.sub(coin.currentAmount, oldDenom.feeRefresh)
    .amount;

  const newCoinDenoms = getWithdrawDenomList(availableAmount, availableDenoms);

  if (newCoinDenoms.length === 0) {
    logger.trace(
      `not refreshing, available amount ${amountToPretty(
        availableAmount,
      )} too small`,
    );
    await oneShotMutate(ws.db, Stores.coins, oldCoinPub, x => {
      if (x.status != coin.status) {
        // Concurrent modification?
        return;
      }
      x.status = CoinStatus.Dormant;
      return x;
    });
    ws.notify({ type: NotificationType.RefreshRefused });
    return;
  }

  const refreshSession: RefreshSessionRecord = await ws.cryptoApi.createRefreshSession(
    exchange.baseUrl,
    3,
    coin,
    newCoinDenoms,
    oldDenom.feeRefresh,
  );

  // Store refresh session and subtract refreshed amount from
  // coin in the same transaction.
  await runWithWriteTransaction(
    ws.db,
    [Stores.refresh, Stores.coins],
    async tx => {
      const c = await tx.get(Stores.coins, coin.coinPub);
      if (!c) {
        return;
      }
      if (c.status !== CoinStatus.Dirty) {
        return;
      }
      const r = Amounts.sub(c.currentAmount, refreshSession.valueWithFee);
      if (r.saturated) {
        console.log("can't refresh coin, no amount left");
        return;
      }
      c.currentAmount = r.amount;
      c.status = CoinStatus.Dormant;
      await tx.put(Stores.refresh, refreshSession);
      await tx.put(Stores.coins, c);
    },
  );
  logger.info(`created refresh session ${refreshSession.refreshSessionId}`);
  ws.notify({ type: NotificationType.RefreshStarted });

  await processRefreshSession(ws, refreshSession.refreshSessionId);
}
