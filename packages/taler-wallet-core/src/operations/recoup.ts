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
  codecForReserveStatus,
  CoinStatus,
  encodeCrock,
  getRandomBytes,
  j2s,
  Logger,
  NotificationType,
  RefreshReason,
  TalerProtocolTimestamp,
  URL,
} from "@gnu-taler/taler-util";
import {
  CoinRecord,
  CoinSourceType,
  RecoupGroupRecord,
  RefreshCoinSource,
  WalletStoresV1,
  WithdrawalGroupStatus,
  WithdrawalRecordType,
  WithdrawCoinSource,
} from "../db.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { readSuccessResponseJsonOrThrow } from "../util/http.js";
import { checkDbInvariant } from "../util/invariants.js";
import { GetReadWriteAccess } from "../util/query.js";
import {
  OperationAttemptResult,
  runOperationHandlerForResult,
} from "../util/retries.js";
import { createRefreshGroup, processRefreshGroup } from "./refresh.js";
import { internalCreateWithdrawalGroup } from "./withdraw.js";

const logger = new Logger("operations/recoup.ts");

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
    .mktx((stores) => [
      stores.recoupGroups,
      stores.denominations,
      stores.refreshGroups,
      stores.coins,
    ])
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
    .mktx((x) => [x.denominations])
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
    .mktx((x) => [x.coins, x.denominations, x.recoupGroups, x.refreshGroups])
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
    .mktx((x) => [x.coins, x.denominations])
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
    .mktx((x) => [x.coins, x.denominations, x.recoupGroups, x.refreshGroups])
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
      const oldCoinDenom = await ws.getDenomInfo(
        ws,
        tx,
        oldCoin.exchangeBaseUrl,
        oldCoin.denomPubHash,
      );
      const revokedCoinDenom = await ws.getDenomInfo(
        ws,
        tx,
        revokedCoin.exchangeBaseUrl,
        revokedCoin.denomPubHash,
      );
      checkDbInvariant(!!oldCoinDenom);
      checkDbInvariant(!!revokedCoinDenom);
      revokedCoin.status = CoinStatus.Dormant;
      recoupGroup.scheduleRefreshCoins.push({
        coinPub: oldCoin.coinPub,
        amount: Amounts.sub(oldCoinDenom.value, revokedCoinDenom.value).amount,
      });
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
  await runOperationHandlerForResult(
    await processRecoupGroupHandler(ws, recoupGroupId, options),
  );
  return;
}

export async function processRecoupGroupHandler(
  ws: InternalWalletState,
  recoupGroupId: string,
  options: {
    forceNow?: boolean;
  } = {},
): Promise<OperationAttemptResult> {
  const forceNow = options.forceNow ?? false;
  let recoupGroup = await ws.db
    .mktx((x) => [x.recoupGroups])
    .runReadOnly(async (tx) => {
      return tx.recoupGroups.get(recoupGroupId);
    });
  if (!recoupGroup) {
    return OperationAttemptResult.finishedEmpty();
  }
  if (recoupGroup.timestampFinished) {
    logger.trace("recoup group finished");
    return OperationAttemptResult.finishedEmpty();
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
    .mktx((x) => [x.recoupGroups])
    .runReadOnly(async (tx) => {
      return tx.recoupGroups.get(recoupGroupId);
    });
  if (!recoupGroup) {
    return OperationAttemptResult.finishedEmpty();
  }

  for (const b of recoupGroup.recoupFinishedPerCoin) {
    if (!b) {
      return OperationAttemptResult.finishedEmpty();
    }
  }

  logger.info("all recoups of recoup group are finished");

  const reserveSet = new Set<string>();
  const reservePrivMap: Record<string, string> = {};
  for (let i = 0; i < recoupGroup.coinPubs.length; i++) {
    const coinPub = recoupGroup.coinPubs[i];
    await ws.db
      .mktx((x) => [x.coins, x.reserves])
      .runReadOnly(async (tx) => {
        const coin = await tx.coins.get(coinPub);
        if (!coin) {
          throw Error(`Coin ${coinPub} not found, can't request recoup`);
        }
        if (coin.coinSource.type === CoinSourceType.Withdraw) {
          const reserve = await tx.reserves.indexes.byReservePub.get(
            coin.coinSource.reservePub,
          );
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
      reserveStatus: WithdrawalGroupStatus.QueryingStatus,
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
    .mktx((x) => [
      x.recoupGroups,
      x.coinAvailability,
      x.denominations,
      x.refreshGroups,
      x.coins,
    ])
    .runReadWrite(async (tx) => {
      const rg2 = await tx.recoupGroups.get(recoupGroupId);
      if (!rg2) {
        return;
      }
      rg2.timestampFinished = TalerProtocolTimestamp.now();
      if (rg2.scheduleRefreshCoins.length > 0) {
        const refreshGroupId = await createRefreshGroup(
          ws,
          tx,
          rg2.scheduleRefreshCoins,
          RefreshReason.Recoup,
        );
        processRefreshGroup(ws, refreshGroupId.refreshGroupId).catch((e) => {
          logger.error(`error while refreshing after recoup ${e}`);
        });
      }
      await tx.recoupGroups.put(rg2);
    });
  return OperationAttemptResult.finishedEmpty();
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
    timestampFinished: undefined,
    timestampStarted: TalerProtocolTimestamp.now(),
    recoupFinishedPerCoin: coinPubs.map(() => false),
    scheduleRefreshCoins: [],
  };

  for (let coinIdx = 0; coinIdx < coinPubs.length; coinIdx++) {
    const coinPub = coinPubs[coinIdx];
    const coin = await tx.coins.get(coinPub);
    if (!coin) {
      await putGroupAsFinished(ws, tx, recoupGroup, coinIdx);
      continue;
    }
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
    .mktx((x) => [x.recoupGroups, x.coins])
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
