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

import {
  CoinPublicKeyString,
  DenomKeyType,
  encodeCrock,
  ExchangeMeltRequest,
  ExchangeProtocolVersion,
  ExchangeRefreshRevealRequest,
  getRandomBytes,
  HttpStatusCode,
  TalerProtocolTimestamp,
} from "@gnu-taler/taler-util";
import {
  CoinRecord,
  CoinSourceType,
  CoinStatus,
  DenominationRecord,
  OperationStatus,
  RefreshCoinStatus,
  RefreshGroupRecord,
  WalletStoresV1,
} from "../db.js";
import {
  codecForExchangeMeltResponse,
  codecForExchangeRevealResponse,
  CoinPublicKey,
  fnutil,
  NotificationType,
  RefreshGroupId,
  RefreshReason,
  TalerErrorDetail,
} from "@gnu-taler/taler-util";
import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { amountToPretty } from "@gnu-taler/taler-util";
import {
  readSuccessResponseJsonOrThrow,
  readUnexpectedResponseDetails,
} from "../util/http.js";
import { checkDbInvariant } from "../util/invariants.js";
import { Logger } from "@gnu-taler/taler-util";
import { initRetryInfo, updateRetryInfoTimeout } from "../util/retries.js";
import {
  Duration,
  durationFromSpec,
  durationMul,
  AbsoluteTime,
  URL,
} from "@gnu-taler/taler-util";
import { updateExchangeFromUrl } from "./exchanges.js";
import {
  DenomInfo,
  EXCHANGE_COINS_LOCK,
  InternalWalletState,
} from "../internal-wallet-state.js";
import {
  isWithdrawableDenom,
  selectWithdrawalDenominations,
} from "./withdraw.js";
import {
  DerivedRefreshSession,
  RefreshNewDenomInfo,
} from "../crypto/cryptoTypes.js";
import { GetReadWriteAccess } from "../util/query.js";
import { guardOperationException } from "./common.js";
import { CryptoApiStoppedError } from "../crypto/workers/cryptoDispatcher.js";
import { TalerCryptoInterface } from "../crypto/cryptoImplementation.js";

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
  refreshedDenom: DenomInfo,
  amountLeft: AmountJson,
): AmountJson {
  const withdrawAmount = Amounts.sub(
    amountLeft,
    refreshedDenom.feeRefresh,
  ).amount;
  const withdrawDenoms = selectWithdrawalDenominations(withdrawAmount, denoms);
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

function updateGroupStatus(rg: RefreshGroupRecord): void {
  let allDone = fnutil.all(
    rg.statusPerCoin,
    (x) => x === RefreshCoinStatus.Finished || x === RefreshCoinStatus.Frozen,
  );
  let anyFrozen = fnutil.any(
    rg.statusPerCoin,
    (x) => x === RefreshCoinStatus.Frozen,
  );
  if (allDone) {
    if (anyFrozen) {
      rg.frozen = true;
      rg.retryInfo = initRetryInfo();
    } else {
      rg.timestampFinished = AbsoluteTime.toTimestamp(AbsoluteTime.now());
      rg.operationStatus = OperationStatus.Finished;
      rg.retryInfo = initRetryInfo();
    }
  }
}

/**
 * Create a refresh session for one particular coin inside a refresh group.
 */
async function refreshCreateSession(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  logger.trace(
    `creating refresh session for coin ${coinIndex} in refresh group ${refreshGroupId}`,
  );

  const d = await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
      coins: x.coins,
    }))
    .runReadWrite(async (tx) => {
      const refreshGroup = await tx.refreshGroups.get(refreshGroupId);
      if (!refreshGroup) {
        return;
      }
      if (
        refreshGroup.statusPerCoin[coinIndex] === RefreshCoinStatus.Finished
      ) {
        return;
      }
      const existingRefreshSession =
        refreshGroup.refreshSessionPerCoin[coinIndex];
      if (existingRefreshSession) {
        return;
      }
      const oldCoinPub = refreshGroup.oldCoinPubs[coinIndex];
      const coin = await tx.coins.get(oldCoinPub);
      if (!coin) {
        throw Error("Can't refresh, coin not found");
      }
      return { refreshGroup, coin };
    });

  if (!d) {
    return;
  }

  const { refreshGroup, coin } = d;

  const { exchange } = await updateExchangeFromUrl(ws, coin.exchangeBaseUrl);
  if (!exchange) {
    throw Error("db inconsistent: exchange of coin not found");
  }

  // FIXME: use helper functions from withdraw.ts
  // to update and filter withdrawable denoms.

  const { availableAmount, availableDenoms } = await ws.db
    .mktx((x) => ({
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const oldDenom = await ws.getDenomInfo(
        ws,
        tx,
        exchange.baseUrl,
        coin.denomPubHash,
      );

      if (!oldDenom) {
        throw Error("db inconsistent: denomination for coin not found");
      }

      // FIXME: use an index here, based on the withdrawal expiration time.
      const availableDenoms: DenominationRecord[] =
        await tx.denominations.indexes.byExchangeBaseUrl
          .iter(exchange.baseUrl)
          .toArray();

      const availableAmount = Amounts.sub(
        refreshGroup.inputPerCoin[coinIndex],
        oldDenom.feeRefresh,
      ).amount;
      return { availableAmount, availableDenoms };
    });

  const newCoinDenoms = selectWithdrawalDenominations(
    availableAmount,
    availableDenoms,
  );

  if (newCoinDenoms.selectedDenoms.length === 0) {
    logger.trace(
      `not refreshing, available amount ${amountToPretty(
        availableAmount,
      )} too small`,
    );
    await ws.db
      .mktx((x) => ({
        coins: x.coins,
        refreshGroups: x.refreshGroups,
      }))
      .runReadWrite(async (tx) => {
        const rg = await tx.refreshGroups.get(refreshGroupId);
        if (!rg) {
          return;
        }
        rg.statusPerCoin[coinIndex] = RefreshCoinStatus.Finished;
        updateGroupStatus(rg);

        await tx.refreshGroups.put(rg);
      });
    ws.notify({ type: NotificationType.RefreshUnwarranted });
    return;
  }

  const sessionSecretSeed = encodeCrock(getRandomBytes(64));

  // Store refresh session for this coin in the database.
  await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
      coins: x.coins,
    }))
    .runReadWrite(async (tx) => {
      const rg = await tx.refreshGroups.get(refreshGroupId);
      if (!rg) {
        return;
      }
      if (rg.refreshSessionPerCoin[coinIndex]) {
        return;
      }
      rg.refreshSessionPerCoin[coinIndex] = {
        norevealIndex: undefined,
        sessionSecretSeed: sessionSecretSeed,
        newDenoms: newCoinDenoms.selectedDenoms.map((x) => ({
          count: x.count,
          denomPubHash: x.denom.denomPubHash,
        })),
        amountRefreshOutput: newCoinDenoms.totalCoinValue,
      };
      await tx.refreshGroups.put(rg);
    });
  logger.info(
    `created refresh session for coin #${coinIndex} in ${refreshGroupId}`,
  );
  ws.notify({ type: NotificationType.RefreshStarted });
}

function getRefreshRequestTimeout(rg: RefreshGroupRecord): Duration {
  return Duration.fromSpec({
    seconds: 5,
  });
}

async function refreshMelt(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  const d = await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
      coins: x.coins,
      denominations: x.denominations,
    }))
    .runReadWrite(async (tx) => {
      const refreshGroup = await tx.refreshGroups.get(refreshGroupId);
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

      const oldCoin = await tx.coins.get(refreshGroup.oldCoinPubs[coinIndex]);
      checkDbInvariant(!!oldCoin, "melt coin doesn't exist");
      const oldDenom = await ws.getDenomInfo(
        ws,
        tx,
        oldCoin.exchangeBaseUrl,
        oldCoin.denomPubHash,
      );
      checkDbInvariant(
        !!oldDenom,
        "denomination for melted coin doesn't exist",
      );

      const newCoinDenoms: RefreshNewDenomInfo[] = [];

      for (const dh of refreshSession.newDenoms) {
        const newDenom = await ws.getDenomInfo(
          ws,
          tx,
          oldCoin.exchangeBaseUrl,
          dh.denomPubHash,
        );
        checkDbInvariant(
          !!newDenom,
          "new denomination for refresh not in database",
        );
        newCoinDenoms.push({
          count: dh.count,
          denomPub: newDenom.denomPub,
          denomPubHash: newDenom.denomPubHash,
          feeWithdraw: newDenom.feeWithdraw,
          value: newDenom.value,
        });
      }
      return { newCoinDenoms, oldCoin, oldDenom, refreshGroup, refreshSession };
    });

  if (!d) {
    return;
  }

  const { newCoinDenoms, oldCoin, oldDenom, refreshGroup, refreshSession } = d;

  let exchangeProtocolVersion: ExchangeProtocolVersion;
  switch (d.oldDenom.denomPub.cipher) {
    case DenomKeyType.Rsa: {
      exchangeProtocolVersion = ExchangeProtocolVersion.V12;
      break;
    }
    default:
      throw Error("unsupported key type");
  }

  const derived = await ws.cryptoApi.deriveRefreshSession({
    exchangeProtocolVersion,
    kappa: 3,
    meltCoinDenomPubHash: oldCoin.denomPubHash,
    meltCoinPriv: oldCoin.coinPriv,
    meltCoinPub: oldCoin.coinPub,
    feeRefresh: oldDenom.feeRefresh,
    newCoinDenoms,
    sessionSecretSeed: refreshSession.sessionSecretSeed,
  });

  const reqUrl = new URL(
    `coins/${oldCoin.coinPub}/melt`,
    oldCoin.exchangeBaseUrl,
  );
  const meltReqBody: ExchangeMeltRequest = {
    coin_pub: oldCoin.coinPub,
    confirm_sig: derived.confirmSig,
    denom_pub_hash: oldCoin.denomPubHash,
    denom_sig: oldCoin.denomSig,
    rc: derived.hash,
    value_with_fee: Amounts.stringify(derived.meltValueWithFee),
  };

  const resp = await ws.runSequentialized([EXCHANGE_COINS_LOCK], async () => {
    return await ws.http.postJson(reqUrl.href, meltReqBody, {
      timeout: getRefreshRequestTimeout(refreshGroup),
    });
  });

  if (resp.status === HttpStatusCode.NotFound) {
    const errDetails = await readUnexpectedResponseDetails(resp);
    await ws.db
      .mktx((x) => ({
        refreshGroups: x.refreshGroups,
      }))
      .runReadWrite(async (tx) => {
        const rg = await tx.refreshGroups.get(refreshGroupId);
        if (!rg) {
          return;
        }
        if (rg.timestampFinished) {
          return;
        }
        if (rg.statusPerCoin[coinIndex] !== RefreshCoinStatus.Pending) {
          return;
        }
        rg.statusPerCoin[coinIndex] = RefreshCoinStatus.Frozen;
        rg.lastErrorPerCoin[coinIndex] = errDetails;
        updateGroupStatus(rg);
        await tx.refreshGroups.put(rg);
      });
    return;
  }

  const meltResponse = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeMeltResponse(),
  );

  const norevealIndex = meltResponse.noreveal_index;

  refreshSession.norevealIndex = norevealIndex;

  await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const rg = await tx.refreshGroups.get(refreshGroupId);
      if (!rg) {
        return;
      }
      if (rg.timestampFinished) {
        return;
      }
      const rs = rg.refreshSessionPerCoin[coinIndex];
      if (!rs) {
        return;
      }
      if (rs.norevealIndex !== undefined) {
        return;
      }
      rs.norevealIndex = norevealIndex;
      await tx.refreshGroups.put(rg);
    });

  ws.notify({
    type: NotificationType.RefreshMelted,
  });
}

export async function assembleRefreshRevealRequest(args: {
  cryptoApi: TalerCryptoInterface;
  derived: DerivedRefreshSession;
  norevealIndex: number;
  oldCoinPub: CoinPublicKeyString;
  oldCoinPriv: string;
  newDenoms: {
    denomPubHash: string;
    count: number;
  }[];
}): Promise<ExchangeRefreshRevealRequest> {
  const {
    derived,
    norevealIndex,
    cryptoApi,
    oldCoinPriv,
    oldCoinPub,
    newDenoms,
  } = args;
  const privs = Array.from(derived.transferPrivs);
  privs.splice(norevealIndex, 1);

  const planchets = derived.planchetsForGammas[norevealIndex];
  if (!planchets) {
    throw Error("refresh index error");
  }

  const newDenomsFlat: string[] = [];
  const linkSigs: string[] = [];

  for (let i = 0; i < newDenoms.length; i++) {
    const dsel = newDenoms[i];
    for (let j = 0; j < dsel.count; j++) {
      const newCoinIndex = linkSigs.length;
      const linkSig = await cryptoApi.signCoinLink({
        coinEv: planchets[newCoinIndex].coinEv,
        newDenomHash: dsel.denomPubHash,
        oldCoinPriv: oldCoinPriv,
        oldCoinPub: oldCoinPub,
        transferPub: derived.transferPubs[norevealIndex],
      });
      linkSigs.push(linkSig.sig);
      newDenomsFlat.push(dsel.denomPubHash);
    }
  }

  const req: ExchangeRefreshRevealRequest = {
    coin_evs: planchets.map((x) => x.coinEv),
    new_denoms_h: newDenomsFlat,
    transfer_privs: privs,
    transfer_pub: derived.transferPubs[norevealIndex],
    link_sigs: linkSigs,
  };
  return req;
}

async function refreshReveal(
  ws: InternalWalletState,
  refreshGroupId: string,
  coinIndex: number,
): Promise<void> {
  logger.info("doing refresh reveal");
  const d = await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
      coins: x.coins,
      denominations: x.denominations,
    }))
    .runReadOnly(async (tx) => {
      const refreshGroup = await tx.refreshGroups.get(refreshGroupId);
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

      const oldCoin = await tx.coins.get(refreshGroup.oldCoinPubs[coinIndex]);
      checkDbInvariant(!!oldCoin, "melt coin doesn't exist");
      const oldDenom = await ws.getDenomInfo(
        ws,
        tx,
        oldCoin.exchangeBaseUrl,
        oldCoin.denomPubHash,
      );
      checkDbInvariant(
        !!oldDenom,
        "denomination for melted coin doesn't exist",
      );

      const newCoinDenoms: RefreshNewDenomInfo[] = [];

      for (const dh of refreshSession.newDenoms) {
        const newDenom = await ws.getDenomInfo(
          ws,
          tx,
          oldCoin.exchangeBaseUrl,
          dh.denomPubHash,
        );
        checkDbInvariant(
          !!newDenom,
          "new denomination for refresh not in database",
        );
        newCoinDenoms.push({
          count: dh.count,
          denomPub: newDenom.denomPub,
          denomPubHash: newDenom.denomPubHash,
          feeWithdraw: newDenom.feeWithdraw,
          value: newDenom.value,
        });
      }
      return {
        oldCoin,
        oldDenom,
        newCoinDenoms,
        refreshSession,
        refreshGroup,
        norevealIndex,
      };
    });

  if (!d) {
    return;
  }

  const {
    oldCoin,
    oldDenom,
    newCoinDenoms,
    refreshSession,
    refreshGroup,
    norevealIndex,
  } = d;

  let exchangeProtocolVersion: ExchangeProtocolVersion;
  switch (d.oldDenom.denomPub.cipher) {
    case DenomKeyType.Rsa: {
      exchangeProtocolVersion = ExchangeProtocolVersion.V12;
      break;
    }
    default:
      throw Error("unsupported key type");
  }

  const derived = await ws.cryptoApi.deriveRefreshSession({
    exchangeProtocolVersion,
    kappa: 3,
    meltCoinDenomPubHash: oldCoin.denomPubHash,
    meltCoinPriv: oldCoin.coinPriv,
    meltCoinPub: oldCoin.coinPub,
    feeRefresh: oldDenom.feeRefresh,
    newCoinDenoms,
    sessionSecretSeed: refreshSession.sessionSecretSeed,
  });

  const reqUrl = new URL(
    `refreshes/${derived.hash}/reveal`,
    oldCoin.exchangeBaseUrl,
  );

  const req = await assembleRefreshRevealRequest({
    cryptoApi: ws.cryptoApi,
    derived,
    newDenoms: newCoinDenoms,
    norevealIndex: norevealIndex,
    oldCoinPriv: oldCoin.coinPriv,
    oldCoinPub: oldCoin.coinPub,
  });

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

  for (let i = 0; i < refreshSession.newDenoms.length; i++) {
    const ncd = newCoinDenoms[i];
    for (let j = 0; j < refreshSession.newDenoms[i].count; j++) {
      const newCoinIndex = coins.length;
      const pc = derived.planchetsForGammas[norevealIndex][newCoinIndex];
      if (ncd.denomPub.cipher !== DenomKeyType.Rsa) {
        throw Error("cipher unsupported");
      }
      const evSig = reveal.ev_sigs[newCoinIndex].ev_sig;
      const denomSig = await ws.cryptoApi.unblindDenominationSignature({
        planchet: {
          blindingKey: pc.blindingKey,
          denomPub: ncd.denomPub,
        },
        evSig,
      });
      const coin: CoinRecord = {
        blindingKey: pc.blindingKey,
        coinPriv: pc.coinPriv,
        coinPub: pc.coinPub,
        currentAmount: ncd.value,
        denomPubHash: ncd.denomPubHash,
        denomSig,
        exchangeBaseUrl: oldCoin.exchangeBaseUrl,
        status: CoinStatus.Fresh,
        coinSource: {
          type: CoinSourceType.Refresh,
          oldCoinPub: refreshGroup.oldCoinPubs[coinIndex],
        },
        suspended: false,
        coinEvHash: pc.coinEvHash,
      };

      coins.push(coin);
    }
  }

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const rg = await tx.refreshGroups.get(refreshGroupId);
      if (!rg) {
        logger.warn("no refresh session found");
        return;
      }
      const rs = rg.refreshSessionPerCoin[coinIndex];
      if (!rs) {
        return;
      }
      rg.statusPerCoin[coinIndex] = RefreshCoinStatus.Finished;
      updateGroupStatus(rg);
      for (const coin of coins) {
        await tx.coins.put(coin);
      }
      await tx.refreshGroups.put(rg);
    });
  logger.trace("refresh finished (end of reveal)");
  ws.notify({
    type: NotificationType.RefreshRevealed,
  });
}

async function incrementRefreshRetry(
  ws: InternalWalletState,
  refreshGroupId: string,
  err: TalerErrorDetail | undefined,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.refreshGroups.get(refreshGroupId);
      if (!r) {
        return;
      }
      if (!r.retryInfo) {
        return;
      }
      r.retryInfo.retryCounter++;
      updateRetryInfoTimeout(r.retryInfo);
      r.lastError = err;
      await tx.refreshGroups.put(r);
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
    const onOpErr = (e: TalerErrorDetail): Promise<void> =>
      incrementRefreshRetry(ws, refreshGroupId, e);
    return await guardOperationException(
      async () => await processRefreshGroupImpl(ws, refreshGroupId, forceNow),
      onOpErr,
    );
  });
}

async function resetRefreshGroupRetry(
  ws: InternalWalletState,
  refreshGroupId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const x = await tx.refreshGroups.get(refreshGroupId);
      if (x) {
        x.retryInfo = initRetryInfo();
        await tx.refreshGroups.put(x);
      }
    });
}

async function processRefreshGroupImpl(
  ws: InternalWalletState,
  refreshGroupId: string,
  forceNow: boolean,
): Promise<void> {
  logger.info(`processing refresh group ${refreshGroupId}`);
  if (forceNow) {
    await resetRefreshGroupRetry(ws, refreshGroupId);
  }
  const refreshGroup = await ws.db
    .mktx((x) => ({
      refreshGroups: x.refreshGroups,
    }))
    .runReadOnly(async (tx) => {
      return tx.refreshGroups.get(refreshGroupId);
    });
  if (!refreshGroup) {
    return;
  }
  if (refreshGroup.timestampFinished) {
    return;
  }
  // Process refresh sessions of the group in parallel.
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
  logger.info(
    `processing refresh session for coin ${coinIndex} of group ${refreshGroupId}`,
  );
  let refreshGroup = await ws.db
    .mktx((x) => ({ refreshGroups: x.refreshGroups }))
    .runReadOnly(async (tx) => {
      return tx.refreshGroups.get(refreshGroupId);
    });
  if (!refreshGroup) {
    return;
  }
  if (refreshGroup.statusPerCoin[coinIndex] === RefreshCoinStatus.Finished) {
    return;
  }
  if (!refreshGroup.refreshSessionPerCoin[coinIndex]) {
    await refreshCreateSession(ws, refreshGroupId, coinIndex);
    refreshGroup = await ws.db
      .mktx((x) => ({ refreshGroups: x.refreshGroups }))
      .runReadOnly(async (tx) => {
        return tx.refreshGroups.get(refreshGroupId);
      });
    if (!refreshGroup) {
      return;
    }
  }
  const refreshSession = refreshGroup.refreshSessionPerCoin[coinIndex];
  if (!refreshSession) {
    if (refreshGroup.statusPerCoin[coinIndex] !== RefreshCoinStatus.Finished) {
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
  tx: GetReadWriteAccess<{
    denominations: typeof WalletStoresV1.denominations;
    coins: typeof WalletStoresV1.coins;
    refreshGroups: typeof WalletStoresV1.refreshGroups;
  }>,
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
    const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
      .iter(exchangeBaseUrl)
      .filter((x) => {
        return isWithdrawableDenom(x);
      });
    denomsPerExchange[exchangeBaseUrl] = allDenoms;
    return allDenoms;
  };

  for (const ocp of oldCoinPubs) {
    const coin = await tx.coins.get(ocp.coinPub);
    checkDbInvariant(!!coin, "coin must be in database");
    const denom = await ws.getDenomInfo(
      ws,
      tx,
      coin.exchangeBaseUrl,
      coin.denomPubHash,
    );
    checkDbInvariant(
      !!denom,
      "denomination for existing coin must be in database",
    );
    const refreshAmount = coin.currentAmount;
    inputPerCoin.push(refreshAmount);
    coin.currentAmount = Amounts.getZero(refreshAmount.currency);
    coin.status = CoinStatus.Dormant;
    await tx.coins.put(coin);
    const denoms = await getDenoms(coin.exchangeBaseUrl);
    const cost = getTotalRefreshCost(denoms, denom, refreshAmount);
    const output = Amounts.sub(refreshAmount, cost).amount;
    estimatedOutputPerCoin.push(output);
  }

  const refreshGroup: RefreshGroupRecord = {
    operationStatus: OperationStatus.Pending,
    timestampFinished: undefined,
    statusPerCoin: oldCoinPubs.map(() => RefreshCoinStatus.Pending),
    lastError: undefined,
    lastErrorPerCoin: {},
    oldCoinPubs: oldCoinPubs.map((x) => x.coinPub),
    reason,
    refreshGroupId,
    refreshSessionPerCoin: oldCoinPubs.map(() => undefined),
    retryInfo: initRetryInfo(),
    inputPerCoin,
    estimatedOutputPerCoin,
    timestampCreated: TalerProtocolTimestamp.now(),
  };

  if (oldCoinPubs.length == 0) {
    logger.warn("created refresh group with zero coins");
    refreshGroup.timestampFinished = TalerProtocolTimestamp.now();
    refreshGroup.operationStatus = OperationStatus.Finished;
  }

  await tx.refreshGroups.put(refreshGroup);

  logger.info(`created refresh group ${refreshGroupId}`);

  processRefreshGroup(ws, refreshGroupId).catch((e) => {
    if (e instanceof CryptoApiStoppedError) {
      return;
    }
    logger.warn(`processing refresh group ${refreshGroupId} failed: ${e}`);
  });

  return {
    refreshGroupId,
  };
}

/**
 * Timestamp after which the wallet would do the next check for an auto-refresh.
 */
function getAutoRefreshCheckThreshold(d: DenominationRecord): AbsoluteTime {
  const expireWithdraw = AbsoluteTime.fromTimestamp(d.stampExpireWithdraw);
  const expireDeposit = AbsoluteTime.fromTimestamp(d.stampExpireDeposit);
  const delta = AbsoluteTime.difference(expireWithdraw, expireDeposit);
  const deltaDiv = durationMul(delta, 0.75);
  return AbsoluteTime.addDuration(expireWithdraw, deltaDiv);
}

/**
 * Timestamp after which the wallet would do an auto-refresh.
 */
function getAutoRefreshExecuteThreshold(d: DenominationRecord): AbsoluteTime {
  const expireWithdraw = AbsoluteTime.fromTimestamp(d.stampExpireWithdraw);
  const expireDeposit = AbsoluteTime.fromTimestamp(d.stampExpireDeposit);
  const delta = AbsoluteTime.difference(expireWithdraw, expireDeposit);
  const deltaDiv = durationMul(delta, 0.5);
  return AbsoluteTime.addDuration(expireWithdraw, deltaDiv);
}

export async function autoRefresh(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  logger.info(`doing auto-refresh check for '${exchangeBaseUrl}'`);
  await updateExchangeFromUrl(ws, exchangeBaseUrl, undefined, true);
  let minCheckThreshold = AbsoluteTime.addDuration(
    AbsoluteTime.now(),
    durationFromSpec({ days: 1 }),
  );
  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      refreshGroups: x.refreshGroups,
      exchanges: x.exchanges,
    }))
    .runReadWrite(async (tx) => {
      const exchange = await tx.exchanges.get(exchangeBaseUrl);
      if (!exchange) {
        return;
      }
      const coins = await tx.coins.indexes.byBaseUrl
        .iter(exchangeBaseUrl)
        .toArray();
      const refreshCoins: CoinPublicKey[] = [];
      for (const coin of coins) {
        if (coin.status !== CoinStatus.Fresh) {
          continue;
        }
        if (coin.suspended) {
          continue;
        }
        const denom = await tx.denominations.get([
          exchangeBaseUrl,
          coin.denomPubHash,
        ]);
        if (!denom) {
          logger.warn("denomination not in database");
          continue;
        }
        const executeThreshold = getAutoRefreshExecuteThreshold(denom);
        if (AbsoluteTime.isExpired(executeThreshold)) {
          refreshCoins.push(coin);
        } else {
          const checkThreshold = getAutoRefreshCheckThreshold(denom);
          minCheckThreshold = AbsoluteTime.min(
            minCheckThreshold,
            checkThreshold,
          );
        }
      }
      if (refreshCoins.length > 0) {
        const res = await createRefreshGroup(
          ws,
          tx,
          refreshCoins,
          RefreshReason.Scheduled,
        );
        logger.info(
          `created refresh group for auto-refresh (${res.refreshGroupId})`,
        );
      }
      logger.info(
        `current wallet time: ${AbsoluteTime.toIsoString(AbsoluteTime.now())}`,
      );
      logger.info(
        `next refresh check at ${AbsoluteTime.toIsoString(minCheckThreshold)}`,
      );
      exchange.nextRefreshCheck = AbsoluteTime.toTimestamp(minCheckThreshold);
      await tx.exchanges.put(exchange);
    });
}
