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

import { Amounts, AmountJson } from "../util/amounts";
import {
  DenominationRecord,
  Stores,
  CoinStatus,
  RefreshPlanchetRecord,
  CoinRecord,
  RefreshSessionRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
  RefreshGroupRecord,
  CoinSourceType,
} from "../types/dbTypes";
import { amountToPretty } from "../util/helpers";
import { TransactionHandle } from "../util/query";
import { InternalWalletState } from "./state";
import { Logger } from "../util/logging";
import { getWithdrawDenomList } from "./withdraw";
import { updateExchangeFromUrl } from "./exchanges";
import {
  OperationError,
  CoinPublicKey,
  RefreshReason,
  RefreshGroupId,
} from "../types/walletTypes";
import { guardOperationException } from "./errors";
import { NotificationType } from "../types/notifications";
import { getRandomBytes, encodeCrock } from "../crypto/talerCrypto";
import { getTimestampNow } from "../util/time";

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
    ...withdrawDenoms.map((d) => d.value),
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

/**
 * Create a refresh session inside a refresh group.
 */
async function refreshCreateSession(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  logger.trace(
    `creating refresh session for coin ${coinIndex} in refresh group ${refreshGroupId}`,
  );
  const refreshGroup = await ws.db.get(Stores.refreshGroups, refreshGroupId);
  if (!refreshGroup) {
    return;
  }
  if (refreshGroup.finishedPerCoin[coinIndex]) {
    return;
  }
  const existingRefreshSession = refreshGroup.refreshSessionPerCoin[coinIndex];
  if (existingRefreshSession) {
    return;
  }
  const oldCoinPub = refreshGroup.oldCoinPubs[coinIndex];
  const coin = await ws.db.get(Stores.coins, oldCoinPub);
  if (!coin) {
    throw Error("Can't refresh, coin not found");
  }

  const exchange = await updateExchangeFromUrl(ws, coin.exchangeBaseUrl);
  if (!exchange) {
    throw Error("db inconsistent: exchange of coin not found");
  }

  const oldDenom = await ws.db.get(Stores.denominations, [
    exchange.baseUrl,
    coin.denomPub,
  ]);

  if (!oldDenom) {
    throw Error("db inconsistent: denomination for coin not found");
  }

  const availableDenoms: DenominationRecord[] = await ws.db
    .iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl)
    .toArray();

  const availableAmount = Amounts.sub(coin.currentAmount, oldDenom.feeRefresh)
    .amount;

  const newCoinDenoms = getWithdrawDenomList(availableAmount, availableDenoms);

  if (newCoinDenoms.length === 0) {
    logger.trace(
      `not refreshing, available amount ${amountToPretty(
        availableAmount,
      )} too small`,
    );
    await ws.db.runWithWriteTransaction(
      [Stores.coins, Stores.refreshGroups],
      async (tx) => {
        const rg = await tx.get(Stores.refreshGroups, refreshGroupId);
        if (!rg) {
          return;
        }
        rg.finishedPerCoin[coinIndex] = true;
        let allDone = true;
        for (const f of rg.finishedPerCoin) {
          if (!f) {
            allDone = false;
            break;
          }
        }
        if (allDone) {
          rg.timestampFinished = getTimestampNow();
          rg.retryInfo = initRetryInfo(false);
        }
        await tx.put(Stores.refreshGroups, rg);
      },
    );
    ws.notify({ type: NotificationType.RefreshUnwarranted });
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
  await ws.db.runWithWriteTransaction(
    [Stores.refreshGroups, Stores.coins],
    async (tx) => {
      const c = await tx.get(Stores.coins, coin.coinPub);
      if (!c) {
        throw Error("coin not found, but marked for refresh");
      }
      const r = Amounts.sub(c.currentAmount, refreshSession.amountRefreshInput);
      if (r.saturated) {
        console.log("can't refresh coin, no amount left");
        return;
      }
      c.currentAmount = r.amount;
      c.status = CoinStatus.Dormant;
      const rg = await tx.get(Stores.refreshGroups, refreshGroupId);
      if (!rg) {
        return;
      }
      if (rg.refreshSessionPerCoin[coinIndex]) {
        return;
      }
      rg.refreshSessionPerCoin[coinIndex] = refreshSession;
      await tx.put(Stores.refreshGroups, rg);
      await tx.put(Stores.coins, c);
    },
  );
  logger.info(
    `created refresh session for coin #${coinIndex} in ${refreshGroupId}`,
  );
  ws.notify({ type: NotificationType.RefreshStarted });
}

async function refreshMelt(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  const refreshGroup = await ws.db.get(Stores.refreshGroups, refreshGroupId);
  if (!refreshGroup) {
    return;
  }
  const refreshSession = refreshGroup.refreshSessionPerCoin[coinIndex];
  if (!refreshSession) {
    return;
  }
  if (refreshSession.norevealIndex !== undefined) {
    return;
  }

  const coin = await ws.db.get(Stores.coins, refreshSession.meltCoinPub);

  if (!coin) {
    console.error("can't melt coin, it does not exist");
    return;
  }

  const reqUrl = new URL(
    `coins/${coin.coinPub}/melt`,
    refreshSession.exchangeBaseUrl,
  );
  const meltReq = {
    coin_pub: coin.coinPub,
    confirm_sig: refreshSession.confirmSig,
    denom_pub_hash: coin.denomPubHash,
    denom_sig: coin.denomSig,
    rc: refreshSession.hash,
    value_with_fee: Amounts.stringify(refreshSession.amountRefreshInput),
  };
  logger.trace(`melt request for coin:`, meltReq);
  const resp = await ws.http.postJson(reqUrl.href, meltReq);
  if (resp.status !== 200) {
    console.log(`got status ${resp.status} for refresh/melt`);
    try {
      const respJson = await resp.json();
      console.log(
        `body of refresh/melt error response:`,
        JSON.stringify(respJson, undefined, 2),
      );
    } catch (e) {
      console.log(`body of refresh/melt error response is not JSON`);
    }
    throw Error(`unexpected status code ${resp.status} for refresh/melt`);
  }

  const respJson = await resp.json();

  logger.trace("melt response:", respJson);

  if (resp.status !== 200) {
    console.error(respJson);
    throw Error("refresh failed");
  }

  const norevealIndex = respJson.noreveal_index;

  if (typeof norevealIndex !== "number") {
    throw Error("invalid response");
  }

  refreshSession.norevealIndex = norevealIndex;

  await ws.db.mutate(Stores.refreshGroups, refreshGroupId, (rg) => {
    const rs = rg.refreshSessionPerCoin[coinIndex];
    if (!rs) {
      return;
    }
    if (rs.norevealIndex !== undefined) {
      return;
    }
    if (rs.finishedTimestamp) {
      return;
    }
    rs.norevealIndex = norevealIndex;
    return rg;
  });

  ws.notify({
    type: NotificationType.RefreshMelted,
  });
}

async function refreshReveal(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  const refreshGroup = await ws.db.get(Stores.refreshGroups, refreshGroupId);
  if (!refreshGroup) {
    return;
  }
  const refreshSession = refreshGroup.refreshSessionPerCoin[coinIndex];
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

  const meltCoinRecord = await ws.db.get(
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

  const reqUrl = new URL(
    `refreshes/${refreshSession.hash}/reveal`,
    refreshSession.exchangeBaseUrl,
  );
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

  const respJson = await resp.json();

  if (!respJson.ev_sigs || !Array.isArray(respJson.ev_sigs)) {
    console.error("/refresh/reveal did not contain ev_sigs");
    return;
  }

  const coins: CoinRecord[] = [];

  for (let i = 0; i < respJson.ev_sigs.length; i++) {
    const denom = await ws.db.get(Stores.denominations, [
      refreshSession.exchangeBaseUrl,
      refreshSession.newDenoms[i],
    ]);
    if (!denom) {
      console.error("denom not found");
      continue;
    }
    const pc = refreshSession.planchetsForGammas[norevealIndex][i];
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
      status: CoinStatus.Fresh,
      coinSource: {
        type: CoinSourceType.Refresh,
        oldCoinPub: refreshSession.meltCoinPub,
      },
      suspended: false,
    };

    coins.push(coin);
  }

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.refreshGroups],
    async (tx) => {
      const rg = await tx.get(Stores.refreshGroups, refreshGroupId);
      if (!rg) {
        console.log("no refresh session found");
        return;
      }
      const rs = rg.refreshSessionPerCoin[coinIndex];
      if (!rs) {
        return;
      }
      if (rs.finishedTimestamp) {
        console.log("refresh session already finished");
        return;
      }
      rs.finishedTimestamp = getTimestampNow();
      rg.finishedPerCoin[coinIndex] = true;
      let allDone = true;
      for (const f of rg.finishedPerCoin) {
        if (!f) {
          allDone = false;
          break;
        }
      }
      if (allDone) {
        rg.timestampFinished = getTimestampNow();
        rg.retryInfo = initRetryInfo(false);
      }
      for (const coin of coins) {
        await tx.put(Stores.coins, coin);
      }
      await tx.put(Stores.refreshGroups, rg);
    },
  );
  console.log("refresh finished (end of reveal)");
  ws.notify({
    type: NotificationType.RefreshRevealed,
  });
}

async function incrementRefreshRetry(
  ws: InternalWalletState,
  refreshGroupId: string,
  err: OperationError | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.refreshGroups], async (tx) => {
    const r = await tx.get(Stores.refreshGroups, refreshGroupId);
    if (!r) {
      return;
    }
    if (!r.retryInfo) {
      return;
    }
    r.retryInfo.retryCounter++;
    updateRetryInfoTimeout(r.retryInfo);
    r.lastError = err;
    await tx.put(Stores.refreshGroups, r);
  });
  ws.notify({ type: NotificationType.RefreshOperationError });
}

export async function processRefreshGroup(
  ws: InternalWalletState,
  refreshGroupId: string,
  forceNow = false,
): Promise<void> {
  await ws.memoProcessRefresh.memo(refreshGroupId, async () => {
    const onOpErr = (e: OperationError): Promise<void> =>
      incrementRefreshRetry(ws, refreshGroupId, e);
    return await guardOperationException(
      async () => await processRefreshGroupImpl(ws, refreshGroupId, forceNow),
      onOpErr,
    );
  });
}

async function resetRefreshGroupRetry(
  ws: InternalWalletState,
  refreshSessionId: string,
): Promise<void> {
  await ws.db.mutate(Stores.refreshGroups, refreshSessionId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processRefreshGroupImpl(
  ws: InternalWalletState,
  refreshGroupId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetRefreshGroupRetry(ws, refreshGroupId);
  }
  const refreshGroup = await ws.db.get(Stores.refreshGroups, refreshGroupId);
  if (!refreshGroup) {
    return;
  }
  if (refreshGroup.timestampFinished) {
    return;
  }
  const ps = refreshGroup.oldCoinPubs.map((x, i) =>
    processRefreshSession(ws, refreshGroupId, i),
  );
  await Promise.all(ps);
  logger.trace("refresh finished");
}

async function processRefreshSession(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  logger.trace(
    `processing refresh session for coin ${coinIndex} of group ${refreshGroupId}`,
  );
  let refreshGroup = await ws.db.get(Stores.refreshGroups, refreshGroupId);
  if (!refreshGroup) {
    return;
  }
  if (refreshGroup.finishedPerCoin[coinIndex]) {
    return;
  }
  if (!refreshGroup.refreshSessionPerCoin[coinIndex]) {
    await refreshCreateSession(ws, refreshGroupId, coinIndex);
    refreshGroup = await ws.db.get(Stores.refreshGroups, refreshGroupId);
    if (!refreshGroup) {
      return;
    }
  }
  const refreshSession = refreshGroup.refreshSessionPerCoin[coinIndex];
  if (!refreshSession) {
    if (!refreshGroup.finishedPerCoin[coinIndex]) {
      throw Error(
        "BUG: refresh session was not created and coin not marked as finished",
      );
    }
    return;
  }
  if (refreshSession.norevealIndex === undefined) {
    await refreshMelt(ws, refreshGroupId, coinIndex);
  }
  await refreshReveal(ws, refreshGroupId, coinIndex);
}

/**
 * Create a refresh group for a list of coins.
 */
export async function createRefreshGroup(
  tx: TransactionHandle,
  oldCoinPubs: CoinPublicKey[],
  reason: RefreshReason,
): Promise<RefreshGroupId> {
  const refreshGroupId = encodeCrock(getRandomBytes(32));

  const refreshGroup: RefreshGroupRecord = {
    timestampFinished: undefined,
    finishedPerCoin: oldCoinPubs.map((x) => false),
    lastError: undefined,
    lastErrorPerCoin: {},
    oldCoinPubs: oldCoinPubs.map((x) => x.coinPub),
    reason,
    refreshGroupId,
    refreshSessionPerCoin: oldCoinPubs.map((x) => undefined),
    retryInfo: initRetryInfo(),
  };

  await tx.put(Stores.refreshGroups, refreshGroup);
  return {
    refreshGroupId,
  };
}
