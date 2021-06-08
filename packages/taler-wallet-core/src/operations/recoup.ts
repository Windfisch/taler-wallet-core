/*
 This file is part of GNU Taler
 (C) 2019-2020 Taler Systems SA

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
 * Implementation of the recoup operation, which allows to recover the
 * value of coins held in a revoked denomination.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import {
  Amounts,
  codecForRecoupConfirmation,
  getTimestampNow,
  NotificationType,
  RefreshReason,
  TalerErrorDetails,
} from "@gnu-taler/taler-util";
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";
import {
  CoinRecord,
  CoinSourceType,
  CoinStatus,
  RecoupGroupRecord,
  RefreshCoinSource,
  ReserveRecordStatus,
  Stores,
  WithdrawCoinSource,
} from "../db.js";

import { readSuccessResponseJsonOrThrow } from "../util/http";
import { Logger } from "@gnu-taler/taler-util";
import { TransactionHandle } from "../util/query";
import { initRetryInfo, updateRetryInfoTimeout } from "../util/retries";
import { URL } from "../util/url";
import { guardOperationException } from "./errors";
import { getExchangeDetails } from "./exchanges.js";
import { createRefreshGroup, processRefreshGroup } from "./refresh";
import { getReserveRequestTimeout, processReserve } from "./reserves";
import { InternalWalletState } from "./state";

const logger = new Logger("operations/recoup.ts");

async function incrementRecoupRetry(
  ws: InternalWalletState,
  recoupGroupId: string,
  err: TalerErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.recoupGroups], async (tx) => {
    const r = await tx.get(Stores.recoupGroups, recoupGroupId);
    if (!r) {
      return;
    }
    if (!r.retryInfo) {
      return;
    }
    r.retryInfo.retryCounter++;
    updateRetryInfoTimeout(r.retryInfo);
    r.lastError = err;
    await tx.put(Stores.recoupGroups, r);
  });
  if (err) {
    ws.notify({ type: NotificationType.RecoupOperationError, error: err });
  }
}

async function putGroupAsFinished(
  ws: InternalWalletState,
  tx: TransactionHandle<typeof Stores.recoupGroups>,
  recoupGroup: RecoupGroupRecord,
  coinIdx: number,
): Promise<void> {
  logger.trace(
    `setting coin ${coinIdx} of ${recoupGroup.coinPubs.length} as finished`,
  );
  if (recoupGroup.timestampFinished) {
    return;
  }
  recoupGroup.recoupFinishedPerCoin[coinIdx] = true;
  let allFinished = true;
  for (const b of recoupGroup.recoupFinishedPerCoin) {
    if (!b) {
      allFinished = false;
    }
  }
  if (allFinished) {
    logger.trace("all recoups of recoup group are finished");
    recoupGroup.timestampFinished = getTimestampNow();
    recoupGroup.retryInfo = initRetryInfo(false);
    recoupGroup.lastError = undefined;
    if (recoupGroup.scheduleRefreshCoins.length > 0) {
      const refreshGroupId = await createRefreshGroup(
        ws,
        tx,
        recoupGroup.scheduleRefreshCoins.map((x) => ({ coinPub: x })),
        RefreshReason.Recoup,
      );
      processRefreshGroup(ws, refreshGroupId.refreshGroupId).then((e) => {
        console.error("error while refreshing after recoup", e);
      });
    }
  }
  await tx.put(Stores.recoupGroups, recoupGroup);
}

async function recoupTipCoin(
  ws: InternalWalletState,
  recoupGroupId: string,
  coinIdx: number,
  coin: CoinRecord,
): Promise<void> {
  // We can't really recoup a coin we got via tipping.
  // Thus we just put the coin to sleep.
  // FIXME: somehow report this to the user
  await ws.db.runWithWriteTransaction([Stores.recoupGroups], async (tx) => {
    const recoupGroup = await tx.get(Stores.recoupGroups, recoupGroupId);
    if (!recoupGroup) {
      return;
    }
    if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
      return;
    }
    await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
  });
}

async function recoupWithdrawCoin(
  ws: InternalWalletState,
  recoupGroupId: string,
  coinIdx: number,
  coin: CoinRecord,
  cs: WithdrawCoinSource,
): Promise<void> {
  const reservePub = cs.reservePub;
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  if (!reserve) {
    // FIXME:  We should at least emit some pending operation / warning for this?
    return;
  }

  ws.notify({
    type: NotificationType.RecoupStarted,
  });

  const recoupRequest = await ws.cryptoApi.createRecoupRequest(coin);
  const reqUrl = new URL(`/coins/${coin.coinPub}/recoup`, coin.exchangeBaseUrl);
  const resp = await ws.http.postJson(reqUrl.href, recoupRequest, {
    timeout: getReserveRequestTimeout(reserve),
  });
  const recoupConfirmation = await readSuccessResponseJsonOrThrow(
    resp,
    codecForRecoupConfirmation(),
  );

  if (recoupConfirmation.reserve_pub !== reservePub) {
    throw Error(`Coin's reserve doesn't match reserve on recoup`);
  }

  const exchangeDetails = await ws.db.runWithReadTransaction(
    [Stores.exchanges, Stores.exchangeDetails],
    async (tx) => {
      return getExchangeDetails(tx, reserve.exchangeBaseUrl);
    },
  );

  if (!exchangeDetails) {
    // FIXME: report inconsistency?
    return;
  }

  // FIXME: verify that our expectations about the amount match

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.denominations, Stores.reserves, Stores.recoupGroups],
    async (tx) => {
      const recoupGroup = await tx.get(Stores.recoupGroups, recoupGroupId);
      if (!recoupGroup) {
        return;
      }
      if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
        return;
      }
      const updatedCoin = await tx.get(Stores.coins, coin.coinPub);
      if (!updatedCoin) {
        return;
      }
      const updatedReserve = await tx.get(Stores.reserves, reserve.reservePub);
      if (!updatedReserve) {
        return;
      }
      updatedCoin.status = CoinStatus.Dormant;
      const currency = updatedCoin.currentAmount.currency;
      updatedCoin.currentAmount = Amounts.getZero(currency);
      if (updatedReserve.reserveStatus === ReserveRecordStatus.DORMANT) {
        updatedReserve.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
        updatedReserve.retryInfo = initRetryInfo();
      } else {
        updatedReserve.requestedQuery = true;
        updatedReserve.retryInfo = initRetryInfo();
      }
      await tx.put(Stores.coins, updatedCoin);
      await tx.put(Stores.reserves, updatedReserve);
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
    },
  );

  ws.notify({
    type: NotificationType.RecoupFinished,
  });
}

async function recoupRefreshCoin(
  ws: InternalWalletState,
  recoupGroupId: string,
  coinIdx: number,
  coin: CoinRecord,
  cs: RefreshCoinSource,
): Promise<void> {
  ws.notify({
    type: NotificationType.RecoupStarted,
  });

  const recoupRequest = await ws.cryptoApi.createRecoupRequest(coin);
  const reqUrl = new URL(`/coins/${coin.coinPub}/recoup`, coin.exchangeBaseUrl);
  logger.trace(`making recoup request for ${coin.coinPub}`);

  const resp = await ws.http.postJson(reqUrl.href, recoupRequest);
  const recoupConfirmation = await readSuccessResponseJsonOrThrow(
    resp,
    codecForRecoupConfirmation(),
  );

  if (recoupConfirmation.old_coin_pub != cs.oldCoinPub) {
    throw Error(`Coin's oldCoinPub doesn't match reserve on recoup`);
  }

  const exchangeDetails = await ws.db.runWithReadTransaction(
    [Stores.exchanges, Stores.exchangeDetails],
    async (tx) => {
      // FIXME:  Get the exchange details based on the
      // exchange master public key instead of via just the URL.
      return getExchangeDetails(tx, coin.exchangeBaseUrl);
    },
  );
  if (!exchangeDetails) {
    // FIXME: report inconsistency?
    logger.warn("exchange details for recoup not found");
    return;
  }

  await ws.db.runWithWriteTransaction(
    [
      Stores.coins,
      Stores.denominations,
      Stores.reserves,
      Stores.recoupGroups,
      Stores.refreshGroups,
    ],
    async (tx) => {
      const recoupGroup = await tx.get(Stores.recoupGroups, recoupGroupId);
      if (!recoupGroup) {
        return;
      }
      if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
        return;
      }
      const oldCoin = await tx.get(Stores.coins, cs.oldCoinPub);
      const revokedCoin = await tx.get(Stores.coins, coin.coinPub);
      if (!revokedCoin) {
        logger.warn("revoked coin for recoup not found");
        return;
      }
      if (!oldCoin) {
        logger.warn("refresh old coin for recoup not found");
        return;
      }
      revokedCoin.status = CoinStatus.Dormant;
      oldCoin.currentAmount = Amounts.add(
        oldCoin.currentAmount,
        recoupGroup.oldAmountPerCoin[coinIdx],
      ).amount;
      logger.trace(
        "recoup: setting old coin amount to",
        Amounts.stringify(oldCoin.currentAmount),
      );
      recoupGroup.scheduleRefreshCoins.push(oldCoin.coinPub);
      await tx.put(Stores.coins, revokedCoin);
      await tx.put(Stores.coins, oldCoin);
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
    },
  );
}

async function resetRecoupGroupRetry(
  ws: InternalWalletState,
  recoupGroupId: string,
): Promise<void> {
  await ws.db.mutate(Stores.recoupGroups, recoupGroupId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

export async function processRecoupGroup(
  ws: InternalWalletState,
  recoupGroupId: string,
  forceNow = false,
): Promise<void> {
  await ws.memoProcessRecoup.memo(recoupGroupId, async () => {
    const onOpErr = (e: TalerErrorDetails): Promise<void> =>
      incrementRecoupRetry(ws, recoupGroupId, e);
    return await guardOperationException(
      async () => await processRecoupGroupImpl(ws, recoupGroupId, forceNow),
      onOpErr,
    );
  });
}

async function processRecoupGroupImpl(
  ws: InternalWalletState,
  recoupGroupId: string,
  forceNow = false,
): Promise<void> {
  if (forceNow) {
    await resetRecoupGroupRetry(ws, recoupGroupId);
  }
  const recoupGroup = await ws.db.get(Stores.recoupGroups, recoupGroupId);
  if (!recoupGroup) {
    return;
  }
  if (recoupGroup.timestampFinished) {
    logger.trace("recoup group finished");
    return;
  }
  const ps = recoupGroup.coinPubs.map((x, i) =>
    processRecoup(ws, recoupGroupId, i),
  );
  await Promise.all(ps);

  const reserveSet = new Set<string>();
  for (let i = 0; i < recoupGroup.coinPubs.length; i++) {
    const coinPub = recoupGroup.coinPubs[i];
    const coin = await ws.db.get(Stores.coins, coinPub);
    if (!coin) {
      throw Error(`Coin ${coinPub} not found, can't request payback`);
    }
    if (coin.coinSource.type === CoinSourceType.Withdraw) {
      reserveSet.add(coin.coinSource.reservePub);
    }
  }

  for (const r of reserveSet.values()) {
    processReserve(ws, r).catch((e) => {
      logger.error(`processing reserve ${r} after recoup failed`);
    });
  }
}

export async function createRecoupGroup(
  ws: InternalWalletState,
  tx: TransactionHandle<typeof Stores.recoupGroups | typeof Stores.coins>,
  coinPubs: string[],
): Promise<string> {
  const recoupGroupId = encodeCrock(getRandomBytes(32));

  const recoupGroup: RecoupGroupRecord = {
    recoupGroupId,
    coinPubs: coinPubs,
    lastError: undefined,
    timestampFinished: undefined,
    timestampStarted: getTimestampNow(),
    retryInfo: initRetryInfo(),
    recoupFinishedPerCoin: coinPubs.map(() => false),
    // Will be populated later
    oldAmountPerCoin: [],
    scheduleRefreshCoins: [],
  };

  for (let coinIdx = 0; coinIdx < coinPubs.length; coinIdx++) {
    const coinPub = coinPubs[coinIdx];
    const coin = await tx.get(Stores.coins, coinPub);
    if (!coin) {
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
      continue;
    }
    if (Amounts.isZero(coin.currentAmount)) {
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
      continue;
    }
    recoupGroup.oldAmountPerCoin[coinIdx] = coin.currentAmount;
    coin.currentAmount = Amounts.getZero(coin.currentAmount.currency);
    await tx.put(Stores.coins, coin);
  }

  await tx.put(Stores.recoupGroups, recoupGroup);

  return recoupGroupId;
}

async function processRecoup(
  ws: InternalWalletState,
  recoupGroupId: string,
  coinIdx: number,
): Promise<void> {
  const recoupGroup = await ws.db.get(Stores.recoupGroups, recoupGroupId);
  if (!recoupGroup) {
    return;
  }
  if (recoupGroup.timestampFinished) {
    return;
  }
  if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
    return;
  }

  const coinPub = recoupGroup.coinPubs[coinIdx];

  const coin = await ws.db.get(Stores.coins, coinPub);
  if (!coin) {
    throw Error(`Coin ${coinPub} not found, can't request payback`);
  }

  const cs = coin.coinSource;

  switch (cs.type) {
    case CoinSourceType.Tip:
      return recoupTipCoin(ws, recoupGroupId, coinIdx, coin);
    case CoinSourceType.Refresh:
      return recoupRefreshCoin(ws, recoupGroupId, coinIdx, coin, cs);
    case CoinSourceType.Withdraw:
      return recoupWithdrawCoin(ws, recoupGroupId, coinIdx, coin, cs);
    default:
      throw Error("unknown coin source type");
  }
}
