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
import { InternalWalletState, EXCHANGE_COINS_LOCK } from "./state";
import { Logger } from "../util/logging";
import { getWithdrawDenomList, isWithdrawableDenom } from "./withdraw";
import { updateExchangeFromUrl } from "./exchanges";
import {
  TalerErrorDetails,
  CoinPublicKey,
  RefreshReason,
  RefreshGroupId,
} from "../types/walletTypes";
import { guardOperationException } from "./errors";
import { NotificationType } from "../types/notifications";
import { getRandomBytes, encodeCrock } from "../crypto/talerCrypto";
import {
  getTimestampNow,
  Duration,
  Timestamp,
  isTimestampExpired,
  durationFromSpec,
  timestampMin,
  timestampAddDuration,
  timestampDifference,
  durationMax,
  durationMul,
} from "../util/time";
import {
  readSuccessResponseJsonOrThrow,
  HttpResponse,
  throwUnexpectedRequestError,
} from "../util/http";
import {
  codecForExchangeMeltResponse,
  codecForExchangeRevealResponse,
} from "../types/talerTypes";
import { URL } from "../util/url";
import { checkDbInvariant } from "../util/invariants";

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
    ...withdrawDenoms.selectedDenoms.map(
      (d) => Amounts.mult(d.denom.value, d.count).amount,
    ),
  ).amount;
  const totalCost = Amounts.sub(amountLeft, resultingAmount).amount;
  logger.trace(
    `total refresh cost for ${amountToPretty(amountLeft)} is ${amountToPretty(
      totalCost,
    )}`,
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

  const availableAmount = Amounts.sub(
    refreshGroup.inputPerCoin[coinIndex],
    oldDenom.feeRefresh,
  ).amount;

  const newCoinDenoms = getWithdrawDenomList(availableAmount, availableDenoms);

  if (newCoinDenoms.selectedDenoms.length === 0) {
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

  // Store refresh session for this coin in the database.
  await ws.db.runWithWriteTransaction(
    [Stores.refreshGroups, Stores.coins],
    async (tx) => {
      const rg = await tx.get(Stores.refreshGroups, refreshGroupId);
      if (!rg) {
        return;
      }
      if (rg.refreshSessionPerCoin[coinIndex]) {
        return;
      }
      rg.refreshSessionPerCoin[coinIndex] = refreshSession;
      await tx.put(Stores.refreshGroups, rg);
    },
  );
  logger.info(
    `created refresh session for coin #${coinIndex} in ${refreshGroupId}`,
  );
  ws.notify({ type: NotificationType.RefreshStarted });
}

function getRefreshRequestTimeout(rg: RefreshGroupRecord): Duration {
  return { d_ms: 5000 };
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

  const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], async () => {
    return await ws.http.postJson(reqUrl.href, meltReq, {
      timeout: getRefreshRequestTimeout(refreshGroup),
    });
  });

  const meltResponse = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeMeltResponse(),
  );

  const norevealIndex = meltResponse.noreveal_index;

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

  const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], async () => {
    return await ws.http.postJson(reqUrl.href, req, {
      timeout: getRefreshRequestTimeout(refreshGroup),
    });
  });

  const reveal = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeRevealResponse(),
  );

  const coins: CoinRecord[] = [];

  for (let i = 0; i < reveal.ev_sigs.length; i++) {
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
      reveal.ev_sigs[i].ev_sig,
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
        logger.warn("no refresh session found");
        return;
      }
      const rs = rg.refreshSessionPerCoin[coinIndex];
      if (!rs) {
        return;
      }
      if (rs.finishedTimestamp) {
        logger.warn("refresh session already finished");
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
  logger.trace("refresh finished (end of reveal)");
  ws.notify({
    type: NotificationType.RefreshRevealed,
  });
}

async function incrementRefreshRetry(
  ws: InternalWalletState,
  refreshGroupId: string,
  err: TalerErrorDetails | undefined,
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
  if (err) {
    ws.notify({ type: NotificationType.RefreshOperationError, error: err });
  }
}

/**
 * Actually process a refresh group that has been created.
 */
export async function processRefreshGroup(
  ws: InternalWalletState,
  refreshGroupId: string,
  forceNow = false,
): Promise<void> {
  await ws.memoProcessRefresh.memo(refreshGroupId, async () => {
    const onOpErr = (e: TalerErrorDetails): Promise<void> =>
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
 *
 * Refreshes the remaining amount on the coin, effectively capturing the remaining
 * value in the refresh group.
 *
 * The caller must ensure that
 * the remaining amount was updated correctly before the coin was deposited or
 * credited.
 *
 * The caller must also ensure that the coins that should be refreshed exist
 * in the current database transaction.
 */
export async function createRefreshGroup(
  ws: InternalWalletState,
  tx: TransactionHandle,
  oldCoinPubs: CoinPublicKey[],
  reason: RefreshReason,
): Promise<RefreshGroupId> {
  const refreshGroupId = encodeCrock(getRandomBytes(32));

  const inputPerCoin: AmountJson[] = [];
  const estimatedOutputPerCoin: AmountJson[] = [];

  const denomsPerExchange: Record<string, DenominationRecord[]> = {};

  const getDenoms = async (
    exchangeBaseUrl: string,
  ): Promise<DenominationRecord[]> => {
    if (denomsPerExchange[exchangeBaseUrl]) {
      return denomsPerExchange[exchangeBaseUrl];
    }
    const allDenoms = await tx
      .iterIndexed(Stores.denominations.exchangeBaseUrlIndex, exchangeBaseUrl)
      .filter((x) => {
        return isWithdrawableDenom(x);
      });
    denomsPerExchange[exchangeBaseUrl] = allDenoms;
    return allDenoms;
  };

  for (const ocp of oldCoinPubs) {
    const coin = await tx.get(Stores.coins, ocp.coinPub);
    checkDbInvariant(!!coin, "coin must be in database");
    const denom = await tx.get(Stores.denominations, [
      coin.exchangeBaseUrl,
      coin.denomPub,
    ]);
    checkDbInvariant(
      !!denom,
      "denomination for existing coin must be in database",
    );
    const refreshAmount = coin.currentAmount;
    inputPerCoin.push(refreshAmount);
    coin.currentAmount = Amounts.getZero(refreshAmount.currency);
    coin.status = CoinStatus.Dormant;
    await tx.put(Stores.coins, coin);
    const denoms = await getDenoms(coin.exchangeBaseUrl);
    const cost = getTotalRefreshCost(denoms, denom, refreshAmount);
    const output = Amounts.sub(refreshAmount, cost).amount;
    estimatedOutputPerCoin.push(output);
  }

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
    inputPerCoin,
    estimatedOutputPerCoin,
  };

  if (oldCoinPubs.length == 0) {
    logger.warn("created refresh group with zero coins");
    refreshGroup.timestampFinished = getTimestampNow();
  }

  await tx.put(Stores.refreshGroups, refreshGroup);

  logger.trace(`created refresh group ${refreshGroupId}`);

  processRefreshGroup(ws, refreshGroupId).catch((e) => {
    logger.warn(`processing refresh group ${refreshGroupId} failed`);
  });

  return {
    refreshGroupId,
  };
}

/**
 * Timestamp after which the wallet would do the next check for an auto-refresh.
 */
function getAutoRefreshCheckThreshold(d: DenominationRecord): Timestamp {
  const delta = timestampDifference(
    d.stampExpireWithdraw,
    d.stampExpireDeposit,
  );
  const deltaDiv = durationMul(delta, 0.75);
  return timestampAddDuration(d.stampExpireWithdraw, deltaDiv);
}

/**
 * Timestamp after which the wallet would do an auto-refresh.
 */
function getAutoRefreshExecuteThreshold(d: DenominationRecord): Timestamp {
  const delta = timestampDifference(
    d.stampExpireWithdraw,
    d.stampExpireDeposit,
  );
  const deltaDiv = durationMul(delta, 0.5);
  return timestampAddDuration(d.stampExpireWithdraw, deltaDiv);
}

export async function autoRefresh(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  await updateExchangeFromUrl(ws, exchangeBaseUrl, true);
  await ws.db.runWithWriteTransaction(
    [
      Stores.coins,
      Stores.denominations,
      Stores.refreshGroups,
      Stores.exchanges,
    ],
    async (tx) => {
      const exchange = await tx.get(Stores.exchanges, exchangeBaseUrl);
      if (!exchange) {
        return;
      }
      const coins = await tx
        .iterIndexed(Stores.coins.exchangeBaseUrlIndex, exchangeBaseUrl)
        .toArray();
      const refreshCoins: CoinPublicKey[] = [];
      for (const coin of coins) {
        if (coin.status !== CoinStatus.Fresh) {
          continue;
        }
        if (coin.suspended) {
          continue;
        }
        const denom = await tx.get(Stores.denominations, [
          exchangeBaseUrl,
          coin.denomPub,
        ]);
        if (!denom) {
          logger.warn("denomination not in database");
          continue;
        }
        const executeThreshold = getAutoRefreshExecuteThreshold(denom);
        if (isTimestampExpired(executeThreshold)) {
          refreshCoins.push(coin);
        }
      }
      if (refreshCoins.length > 0) {
        await createRefreshGroup(ws, tx, refreshCoins, RefreshReason.Scheduled);
      }

      const denoms = await tx
        .iterIndexed(Stores.denominations.exchangeBaseUrlIndex, exchangeBaseUrl)
        .toArray();
      let minCheckThreshold = timestampAddDuration(
        getTimestampNow(),
        durationFromSpec({ days: 1 }),
      );
      for (const denom of denoms) {
        const checkThreshold = getAutoRefreshCheckThreshold(denom);
        const executeThreshold = getAutoRefreshExecuteThreshold(denom);
        if (isTimestampExpired(executeThreshold)) {
          // No need to consider this denomination, we already did an auto refresh check.
          continue;
        }
        minCheckThreshold = timestampMin(minCheckThreshold, checkThreshold);
      }
      exchange.nextRefreshCheck = minCheckThreshold;
      await tx.put(Stores.exchanges, exchange);
    },
  );
}
