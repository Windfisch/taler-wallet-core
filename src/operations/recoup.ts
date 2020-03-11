/*
 This file is part of GNU Taler
 (C) 2019-2010 Taler Systems SA

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
import { InternalWalletState } from "./state";
import {
  Stores,
  CoinStatus,
  CoinSourceType,
  CoinRecord,
  WithdrawCoinSource,
  RefreshCoinSource,
  ReserveRecordStatus,
  RecoupGroupRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
} from "../types/dbTypes";

import { codecForRecoupConfirmation } from "../types/talerTypes";
import { NotificationType } from "../types/notifications";
import { processReserve } from "./reserves";

import * as Amounts from "../util/amounts";
import { createRefreshGroup, processRefreshGroup } from "./refresh";
import { RefreshReason, OperationError } from "../types/walletTypes";
import { TransactionHandle } from "../util/query";
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";
import { getTimestampNow } from "../util/time";
import { guardOperationException } from "./errors";

async function incrementRecoupRetry(
  ws: InternalWalletState,
  recoupGroupId: string,
  err: OperationError | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.recoupGroups], async tx => {
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
  ws.notify({ type: NotificationType.RecoupOperationError });
}

async function putGroupAsFinished(
  tx: TransactionHandle,
  recoupGroup: RecoupGroupRecord,
  coinIdx: number,
): Promise<void> {
  recoupGroup.recoupFinishedPerCoin[coinIdx] = true;
  let allFinished = true;
  for (const b of recoupGroup.recoupFinishedPerCoin) {
    if (!b) {
      allFinished = false;
    }
  }
  if (allFinished) {
    recoupGroup.timestampFinished = getTimestampNow();
    recoupGroup.retryInfo = initRetryInfo(false);
    recoupGroup.lastError = undefined;
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
  await ws.db.runWithWriteTransaction([Stores.recoupGroups], async tx => {
    const recoupGroup = await tx.get(Stores.recoupGroups, recoupGroupId);
    if (!recoupGroup) {
      return;
    }
    if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
      return;
    }
    await putGroupAsFinished(tx, recoupGroup, coinIdx);
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
  const resp = await ws.http.postJson(reqUrl.href, recoupRequest);
  if (resp.status !== 200) {
    throw Error("recoup request failed");
  }
  const recoupConfirmation = codecForRecoupConfirmation().decode(
    await resp.json(),
  );

  if (recoupConfirmation.reserve_pub !== reservePub) {
    throw Error(`Coin's reserve doesn't match reserve on recoup`);
  }

  // FIXME: verify that our expectations about the amount match

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.reserves, Stores.recoupGroups],
    async tx => {
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
      updatedReserve.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
      await tx.put(Stores.coins, updatedCoin);
      await tx.put(Stores.reserves, updatedReserve);
      await putGroupAsFinished(tx, recoupGroup, coinIdx);
    },
  );

  ws.notify({
    type: NotificationType.RecoupFinished,
  });

  processReserve(ws, reserve.reservePub).catch(e => {
    console.log("processing reserve after recoup failed:", e);
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
  const resp = await ws.http.postJson(reqUrl.href, recoupRequest);
  if (resp.status !== 200) {
    throw Error("recoup request failed");
  }
  const recoupConfirmation = codecForRecoupConfirmation().decode(
    await resp.json(),
  );

  if (recoupConfirmation.old_coin_pub != cs.oldCoinPub) {
    throw Error(`Coin's oldCoinPub doesn't match reserve on recoup`);
  }

  const refreshGroupId = await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.reserves],
    async tx => {
      const recoupGroup = await tx.get(Stores.recoupGroups, recoupGroupId);
      if (!recoupGroup) {
        return;
      }
      if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
        return;
      }
      const oldCoin = await tx.get(Stores.coins, cs.oldCoinPub);
      const updatedCoin = await tx.get(Stores.coins, coin.coinPub);
      if (!updatedCoin) {
        return;
      }
      if (!oldCoin) {
        return;
      }
      updatedCoin.status = CoinStatus.Dormant;
      oldCoin.currentAmount = Amounts.add(
        oldCoin.currentAmount,
        updatedCoin.currentAmount,
      ).amount;
      await tx.put(Stores.coins, updatedCoin);
      await putGroupAsFinished(tx, recoupGroup, coinIdx);
      return await createRefreshGroup(
        tx,
        [{ coinPub: oldCoin.coinPub }],
        RefreshReason.Recoup,
      );
    },
  );

  if (refreshGroupId) {
    processRefreshGroup(ws, refreshGroupId.refreshGroupId).then(e => {
      console.error("error while refreshing after recoup", e);
    });
  }
}

async function resetRecoupGroupRetry(
  ws: InternalWalletState,
  recoupGroupId: string,
) {
  await ws.db.mutate(Stores.recoupGroups, recoupGroupId, x => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

export async function processRecoupGroup(
  ws: InternalWalletState,
  recoupGroupId: string,
  forceNow: boolean = false,
): Promise<void> {
  await ws.memoProcessRecoup.memo(recoupGroupId, async () => {
    const onOpErr = (e: OperationError) =>
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
  forceNow: boolean = false,
): Promise<void> {
  if (forceNow) {
    await resetRecoupGroupRetry(ws, recoupGroupId);
  }
  const recoupGroup = await ws.db.get(Stores.recoupGroups, recoupGroupId);
  if (!recoupGroup) {
    return;
  }
  if (recoupGroup.timestampFinished) {
    return;
  }
  const ps = recoupGroup.coinPubs.map((x, i) =>
    processRecoup(ws, recoupGroupId, i),
  );
  await Promise.all(ps);
}

export async function createRecoupGroup(
  ws: InternalWalletState,
  tx: TransactionHandle,
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
  };

  for (let coinIdx = 0; coinIdx < coinPubs.length; coinIdx++) {
    const coinPub = coinPubs[coinIdx];
    const coin = await tx.get(Stores.coins, coinPub);
    if (!coin) {
      recoupGroup.recoupFinishedPerCoin[coinIdx] = true;
      continue;
    }
    if (Amounts.isZero(coin.currentAmount)) {
      recoupGroup.recoupFinishedPerCoin[coinIdx] = true;
      continue;
    }
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

  let coin = await ws.db.get(Stores.coins, coinPub);
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
