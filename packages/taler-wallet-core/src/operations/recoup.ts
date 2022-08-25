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
  encodeCrock,
  getRandomBytes,
  j2s,
  Logger,
  NotificationType,
  RefreshReason,
  TalerErrorDetail,
  TalerProtocolTimestamp,
  URL,
  codecForReserveStatus,
} from "@gnu-taler/taler-util";
import {
  CoinRecord,
  CoinSourceType,
  CoinStatus,
  RecoupGroupRecord,
  RefreshCoinSource,
  ReserveRecordStatus,
  WalletStoresV1,
  WithdrawalRecordType,
  WithdrawCoinSource,
} from "../db.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { readSuccessResponseJsonOrThrow } from "../util/http.js";
import { GetReadWriteAccess } from "../util/query.js";
import { RetryInfo } from "../util/retries.js";
import { guardOperationException } from "./common.js";
import { createRefreshGroup, processRefreshGroup } from "./refresh.js";
import { internalCreateWithdrawalGroup } from "./withdraw.js";

const logger = new Logger("operations/recoup.ts");

async function setupRecoupRetry(
  ws: InternalWalletState,
  recoupGroupId: string,
  options: {
    reset: boolean;
  },
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.recoupGroups.get(recoupGroupId);
      if (!r) {
        return;
      }
      if (options.reset) {
        r.retryInfo = RetryInfo.reset();
      } else {
        r.retryInfo = RetryInfo.increment(r.retryInfo);
      }
      delete r.lastError;
      await tx.recoupGroups.put(r);
    });
}

async function reportRecoupError(
  ws: InternalWalletState,
  recoupGroupId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.recoupGroups.get(recoupGroupId);
      if (!r) {
        return;
      }
      if (!r.retryInfo) {
        logger.error(
          "reporting error for inactive recoup group (no retry info)",
        );
      }
      r.lastError = err;
      await tx.recoupGroups.put(r);
    });
  ws.notify({ type: NotificationType.RecoupOperationError, error: err });
}

/**
 * Store a recoup group record in the database after marking
 * a coin in the group as finished.
 */
async function putGroupAsFinished(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    recoupGroups: typeof WalletStoresV1.recoupGroups;
    denominations: typeof WalletStoresV1.denominations;
    refreshGroups: typeof WalletStoresV1.refreshGroups;
    coins: typeof WalletStoresV1.coins;
  }>,
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
  await tx.recoupGroups.put(recoupGroup);
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
  await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
      denominations: WalletStoresV1.denominations,
      refreshGroups: WalletStoresV1.refreshGroups,
      coins: WalletStoresV1.coins,
    }))
    .runReadWrite(async (tx) => {
      const recoupGroup = await tx.recoupGroups.get(recoupGroupId);
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
  const denomInfo = await ws.db
    .mktx((x) => ({
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const denomInfo = await ws.getDenomInfo(
        ws,
        tx,
        coin.exchangeBaseUrl,
        coin.denomPubHash,
      );
      return denomInfo;
    });
  if (!denomInfo) {
    // FIXME:  We should at least emit some pending operation / warning for this?
    return;
  }

  ws.notify({
    type: NotificationType.RecoupStarted,
  });

  const recoupRequest = await ws.cryptoApi.createRecoupRequest({
    blindingKey: coin.blindingKey,
    coinPriv: coin.coinPriv,
    coinPub: coin.coinPub,
    denomPub: denomInfo.denomPub,
    denomPubHash: coin.denomPubHash,
    denomSig: coin.denomSig,
  });
  const reqUrl = new URL(`/coins/${coin.coinPub}/recoup`, coin.exchangeBaseUrl);
  logger.trace(`requesting recoup via ${reqUrl.href}`);
  const resp = await ws.http.postJson(reqUrl.href, recoupRequest);
  const recoupConfirmation = await readSuccessResponseJsonOrThrow(
    resp,
    codecForRecoupConfirmation(),
  );

  logger.trace(`got recoup confirmation ${j2s(recoupConfirmation)}`);

  if (recoupConfirmation.reserve_pub !== reservePub) {
    throw Error(`Coin's reserve doesn't match reserve on recoup`);
  }

  // FIXME: verify that our expectations about the amount match

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      recoupGroups: x.recoupGroups,
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const recoupGroup = await tx.recoupGroups.get(recoupGroupId);
      if (!recoupGroup) {
        return;
      }
      if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
        return;
      }
      const updatedCoin = await tx.coins.get(coin.coinPub);
      if (!updatedCoin) {
        return;
      }
      updatedCoin.status = CoinStatus.Dormant;
      const currency = updatedCoin.currentAmount.currency;
      updatedCoin.currentAmount = Amounts.getZero(currency);
      await tx.coins.put(updatedCoin);
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
    });

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
  const d = await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const denomInfo = await ws.getDenomInfo(
        ws,
        tx,
        coin.exchangeBaseUrl,
        coin.denomPubHash,
      );
      if (!denomInfo) {
        return;
      }
      return { denomInfo };
    });
  if (!d) {
    // FIXME:  We should at least emit some pending operation / warning for this?
    return;
  }

  ws.notify({
    type: NotificationType.RecoupStarted,
  });

  const recoupRequest = await ws.cryptoApi.createRecoupRefreshRequest({
    blindingKey: coin.blindingKey,
    coinPriv: coin.coinPriv,
    coinPub: coin.coinPub,
    denomPub: d.denomInfo.denomPub,
    denomPubHash: coin.denomPubHash,
    denomSig: coin.denomSig,
  });
  const reqUrl = new URL(
    `/coins/${coin.coinPub}/recoup-refresh`,
    coin.exchangeBaseUrl,
  );
  logger.trace(`making recoup request for ${coin.coinPub}`);

  const resp = await ws.http.postJson(reqUrl.href, recoupRequest);
  const recoupConfirmation = await readSuccessResponseJsonOrThrow(
    resp,
    codecForRecoupConfirmation(),
  );

  if (recoupConfirmation.old_coin_pub != cs.oldCoinPub) {
    throw Error(`Coin's oldCoinPub doesn't match reserve on recoup`);
  }

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      recoupGroups: x.recoupGroups,
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const recoupGroup = await tx.recoupGroups.get(recoupGroupId);
      if (!recoupGroup) {
        return;
      }
      if (recoupGroup.recoupFinishedPerCoin[coinIdx]) {
        return;
      }
      const oldCoin = await tx.coins.get(cs.oldCoinPub);
      const revokedCoin = await tx.coins.get(coin.coinPub);
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
      await tx.coins.put(revokedCoin);
      await tx.coins.put(oldCoin);
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
    });
}

export async function processRecoupGroup(
  ws: InternalWalletState,
  recoupGroupId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<void> {
  await ws.memoProcessRecoup.memo(recoupGroupId, async () => {
    const onOpErr = (e: TalerErrorDetail): Promise<void> =>
      reportRecoupError(ws, recoupGroupId, e);
    return await guardOperationException(
      async () => await processRecoupGroupImpl(ws, recoupGroupId, options),
      onOpErr,
    );
  });
}

async function processRecoupGroupImpl(
  ws: InternalWalletState,
  recoupGroupId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<void> {
  const forceNow = options.forceNow ?? false;
  await setupRecoupRetry(ws, recoupGroupId, { reset: forceNow });
  let recoupGroup = await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
    }))
    .runReadOnly(async (tx) => {
      return tx.recoupGroups.get(recoupGroupId);
    });
  if (!recoupGroup) {
    return;
  }
  if (recoupGroup.timestampFinished) {
    logger.trace("recoup group finished");
    return;
  }
  const ps = recoupGroup.coinPubs.map(async (x, i) => {
    try {
      await processRecoup(ws, recoupGroupId, i);
    } catch (e) {
      logger.warn(`processRecoup failed: ${e}`);
      throw e;
    }
  });
  await Promise.all(ps);

  recoupGroup = await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
    }))
    .runReadOnly(async (tx) => {
      return tx.recoupGroups.get(recoupGroupId);
    });
  if (!recoupGroup) {
    return;
  }

  for (const b of recoupGroup.recoupFinishedPerCoin) {
    if (!b) {
      return;
    }
  }

  logger.info("all recoups of recoup group are finished");

  const reserveSet = new Set<string>();
  const reservePrivMap: Record<string, string> = {};
  for (let i = 0; i < recoupGroup.coinPubs.length; i++) {
    const coinPub = recoupGroup.coinPubs[i];
    await ws.db
      .mktx((x) => ({
        coins: x.coins,
        reserves: x.reserves,
      }))
      .runReadOnly(async (tx) => {
        const coin = await tx.coins.get(coinPub);
        if (!coin) {
          throw Error(`Coin ${coinPub} not found, can't request recoup`);
        }
        if (coin.coinSource.type === CoinSourceType.Withdraw) {
          const reserve = await tx.reserves.get(coin.coinSource.reservePub);
          if (!reserve) {
            return;
          }
          reserveSet.add(coin.coinSource.reservePub);
          reservePrivMap[coin.coinSource.reservePub] = reserve.reservePriv;
        }
      });
  }

  for (const reservePub of reserveSet) {
    const reserveUrl = new URL(
      `reserves/${reservePub}`,
      recoupGroup.exchangeBaseUrl,
    );
    logger.info(`querying reserve status for recoup via ${reserveUrl}`);

    const resp = await ws.http.get(reserveUrl.href);

    const result = await readSuccessResponseJsonOrThrow(
      resp,
      codecForReserveStatus(),
    );
    await internalCreateWithdrawalGroup(ws, {
      amount: Amounts.parseOrThrow(result.balance),
      exchangeBaseUrl: recoupGroup.exchangeBaseUrl,
      reserveStatus: ReserveRecordStatus.QueryingStatus,
      reserveKeyPair: {
        pub: reservePub,
        priv: reservePrivMap[reservePub],
      },
      wgInfo: {
        withdrawalType: WithdrawalRecordType.Recoup,
      },
    });
  }

  await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
      denominations: WalletStoresV1.denominations,
      refreshGroups: WalletStoresV1.refreshGroups,
      coins: WalletStoresV1.coins,
    }))
    .runReadWrite(async (tx) => {
      const rg2 = await tx.recoupGroups.get(recoupGroupId);
      if (!rg2) {
        return;
      }
      rg2.timestampFinished = TalerProtocolTimestamp.now();
      rg2.retryInfo = RetryInfo.reset();
      rg2.lastError = undefined;
      if (rg2.scheduleRefreshCoins.length > 0) {
        const refreshGroupId = await createRefreshGroup(
          ws,
          tx,
          rg2.scheduleRefreshCoins.map((x) => ({ coinPub: x })),
          RefreshReason.Recoup,
        );
        processRefreshGroup(ws, refreshGroupId.refreshGroupId).catch((e) => {
          logger.error(`error while refreshing after recoup ${e}`);
        });
      }
      await tx.recoupGroups.put(rg2);
    });
}

export async function createRecoupGroup(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    recoupGroups: typeof WalletStoresV1.recoupGroups;
    denominations: typeof WalletStoresV1.denominations;
    refreshGroups: typeof WalletStoresV1.refreshGroups;
    coins: typeof WalletStoresV1.coins;
  }>,
  exchangeBaseUrl: string,
  coinPubs: string[],
): Promise<string> {
  const recoupGroupId = encodeCrock(getRandomBytes(32));

  const recoupGroup: RecoupGroupRecord = {
    recoupGroupId,
    exchangeBaseUrl: exchangeBaseUrl,
    coinPubs: coinPubs,
    lastError: undefined,
    timestampFinished: undefined,
    timestampStarted: TalerProtocolTimestamp.now(),
    retryInfo: RetryInfo.reset(),
    recoupFinishedPerCoin: coinPubs.map(() => false),
    // Will be populated later
    oldAmountPerCoin: [],
    scheduleRefreshCoins: [],
  };

  for (let coinIdx = 0; coinIdx < coinPubs.length; coinIdx++) {
    const coinPub = coinPubs[coinIdx];
    const coin = await tx.coins.get(coinPub);
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
    await tx.coins.put(coin);
  }

  await tx.recoupGroups.put(recoupGroup);

  return recoupGroupId;
}

/**
 * Run the recoup protocol for a single coin in a recoup group.
 */
async function processRecoup(
  ws: InternalWalletState,
  recoupGroupId: string,
  coinIdx: number,
): Promise<void> {
  const coin = await ws.db
    .mktx((x) => ({
      recoupGroups: x.recoupGroups,
      coins: x.coins,
    }))
    .runReadOnly(async (tx) => {
      const recoupGroup = await tx.recoupGroups.get(recoupGroupId);
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

      const coin = await tx.coins.get(coinPub);
      if (!coin) {
        throw Error(`Coin ${coinPub} not found, can't request recoup`);
      }
      return coin;
    });

  if (!coin) {
    return;
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
