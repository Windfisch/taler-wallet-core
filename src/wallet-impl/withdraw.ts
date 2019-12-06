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
import {
  DenominationRecord,
  Stores,
  DenominationStatus,
  CoinStatus,
  CoinRecord,
  PlanchetRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
} from "../dbTypes";
import * as Amounts from "../util/amounts";
import {
  getTimestampNow,
  AcceptWithdrawalResponse,
  DownloadedWithdrawInfo,
  ReserveCreationInfo,
  WithdrawDetails,
  OperationError,
  NotificationType,
} from "../walletTypes";
import { WithdrawOperationStatusResponse } from "../talerTypes";
import { InternalWalletState } from "./state";
import { parseWithdrawUri } from "../util/taleruri";
import { Logger } from "../util/logging";
import {
  oneShotGet,
  oneShotPut,
  oneShotIterIndex,
  oneShotGetIndexed,
  runWithWriteTransaction,
} from "../util/query";
import {
  updateExchangeFromUrl,
  getExchangePaytoUri,
  getExchangeTrust,
} from "./exchanges";
import { createReserve, processReserveBankStatus } from "./reserves";
import { WALLET_PROTOCOL_VERSION } from "../wallet";

import * as LibtoolVersion from "../util/libtoolVersion";
import { guardOperationException } from "./errors";

const logger = new Logger("withdraw.ts");

function isWithdrawableDenom(d: DenominationRecord) {
  const now = getTimestampNow();
  const started = now.t_ms >= d.stampStart.t_ms;
  const stillOkay = d.stampExpireWithdraw.t_ms + 60 * 1000 > now.t_ms;
  return started && stillOkay;
}

/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
export function getWithdrawDenomList(
  amountAvailable: AmountJson,
  denoms: DenominationRecord[],
): DenominationRecord[] {
  let remaining = Amounts.copy(amountAvailable);
  const ds: DenominationRecord[] = [];

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  // This is an arbitrary number of coins
  // we can withdraw in one go.  It's not clear if this limit
  // is useful ...
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (const d of denoms) {
      const cost = Amounts.add(d.value, d.feeWithdraw).amount;
      if (Amounts.cmp(remaining, cost) < 0) {
        continue;
      }
      found = true;
      remaining = Amounts.sub(remaining, cost).amount;
      ds.push(d);
      break;
    }
    if (!found) {
      break;
    }
  }
  return ds;
}

/**
 * Get information about a withdrawal from
 * a taler://withdraw URI.
 */
export async function getWithdrawalInfo(
  ws: InternalWalletState,
  talerWithdrawUri: string,
): Promise<DownloadedWithdrawInfo> {
  const uriResult = parseWithdrawUri(talerWithdrawUri);
  if (!uriResult) {
    throw Error("can't parse URL");
  }
  const resp = await ws.http.get(uriResult.statusUrl);
  console.log("resp:", resp.responseJson);
  const status = WithdrawOperationStatusResponse.checked(resp.responseJson);
  return {
    amount: Amounts.parseOrThrow(status.amount),
    confirmTransferUrl: status.confirm_transfer_url,
    extractedStatusUrl: uriResult.statusUrl,
    selectionDone: status.selection_done,
    senderWire: status.sender_wire,
    suggestedExchange: status.suggested_exchange,
    transferDone: status.transfer_done,
    wireTypes: status.wire_types,
  };
}

export async function acceptWithdrawal(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  selectedExchange: string,
): Promise<AcceptWithdrawalResponse> {
  const withdrawInfo = await getWithdrawalInfo(ws, talerWithdrawUri);
  const exchangeWire = await getExchangePaytoUri(
    ws,
    selectedExchange,
    withdrawInfo.wireTypes,
  );
  const reserve = await createReserve(ws, {
    amount: withdrawInfo.amount,
    bankWithdrawStatusUrl: withdrawInfo.extractedStatusUrl,
    exchange: selectedExchange,
    senderWire: withdrawInfo.senderWire,
    exchangeWire: exchangeWire,
  });
  // We do this here, as the reserve should be registered before we return,
  // so that we can redirect the user to the bank's status page.
  await processReserveBankStatus(ws, reserve.reservePub);
  console.log("acceptWithdrawal: returning");
  return {
    reservePub: reserve.reservePub,
    confirmTransferUrl: withdrawInfo.confirmTransferUrl,
  };
}

async function getPossibleDenoms(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<DenominationRecord[]> {
  return await oneShotIterIndex(
    ws.db,
    Stores.denominations.exchangeBaseUrlIndex,
    exchangeBaseUrl,
  ).filter(d => {
    return (
      d.status === DenominationStatus.Unverified ||
      d.status === DenominationStatus.VerifiedGood
    );
  });
}

/**
 * Given a planchet, withdraw a coin from the exchange.
 */
async function processPlanchet(
  ws: InternalWalletState,
  withdrawalSessionId: string,
  coinIdx: number,
): Promise<void> {
  const withdrawalSession = await oneShotGet(
    ws.db,
    Stores.withdrawalSession,
    withdrawalSessionId,
  );
  if (!withdrawalSession) {
    return;
  }
  if (withdrawalSession.withdrawn[coinIdx]) {
    return;
  }
  if (withdrawalSession.source.type === "reserve") {
  }
  const planchet = withdrawalSession.planchets[coinIdx];
  if (!planchet) {
    console.log("processPlanchet: planchet not found");
    return;
  }
  const exchange = await oneShotGet(
    ws.db,
    Stores.exchanges,
    withdrawalSession.exchangeBaseUrl,
  );
  if (!exchange) {
    console.error("db inconsistent: exchange for planchet not found");
    return;
  }

  const denom = await oneShotGet(ws.db, Stores.denominations, [
    withdrawalSession.exchangeBaseUrl,
    planchet.denomPub,
  ]);

  if (!denom) {
    console.error("db inconsistent: denom for planchet not found");
    return;
  }

  const wd: any = {};
  wd.denom_pub_hash = planchet.denomPubHash;
  wd.reserve_pub = planchet.reservePub;
  wd.reserve_sig = planchet.withdrawSig;
  wd.coin_ev = planchet.coinEv;
  const reqUrl = new URL("reserve/withdraw", exchange.baseUrl).href;
  const resp = await ws.http.postJson(reqUrl, wd);

  const r = resp.responseJson;

  const denomSig = await ws.cryptoApi.rsaUnblind(
    r.ev_sig,
    planchet.blindingKey,
    planchet.denomPub,
  );


  const isValid = await ws.cryptoApi.rsaVerify(planchet.coinPub, denomSig, planchet.denomPub);
  if (!isValid) {
    throw Error("invalid RSA signature by the exchange");
  }

  const coin: CoinRecord = {
    blindingKey: planchet.blindingKey,
    coinPriv: planchet.coinPriv,
    coinPub: planchet.coinPub,
    currentAmount: planchet.coinValue,
    denomPub: planchet.denomPub,
    denomPubHash: planchet.denomPubHash,
    denomSig,
    exchangeBaseUrl: withdrawalSession.exchangeBaseUrl,
    reservePub: planchet.reservePub,
    status: CoinStatus.Fresh,
    coinIndex: coinIdx,
    withdrawSessionId: withdrawalSessionId,
  };

  let withdrawSessionFinished = false;
  let reserveDepleted = false;

  const success = await runWithWriteTransaction(
    ws.db,
    [Stores.coins, Stores.withdrawalSession, Stores.reserves],
    async tx => {
      const ws = await tx.get(Stores.withdrawalSession, withdrawalSessionId);
      if (!ws) {
        return false;
      }
      if (ws.withdrawn[coinIdx]) {
        // Already withdrawn
        return false;
      }
      ws.withdrawn[coinIdx] = true;
      ws.lastCoinErrors[coinIdx] = undefined;
      let numDone = 0;
      for (let i = 0; i < ws.withdrawn.length; i++) {
        if (ws.withdrawn[i]) {
          numDone++;
        }
      }
      if (numDone === ws.denoms.length) {
        ws.finishTimestamp = getTimestampNow();
        ws.lastError = undefined;
        ws.retryInfo = initRetryInfo(false);
        withdrawSessionFinished = true;
      }
      await tx.put(Stores.withdrawalSession, ws);
      if (!planchet.isFromTip) {
        const r = await tx.get(Stores.reserves, planchet.reservePub);
        if (r) {
          r.withdrawCompletedAmount = Amounts.add(
            r.withdrawCompletedAmount,
            Amounts.add(denom.value, denom.feeWithdraw).amount,
          ).amount;
          if (Amounts.cmp(r.withdrawCompletedAmount, r.withdrawAllocatedAmount) == 0) {
            reserveDepleted = true;
          }
          await tx.put(Stores.reserves, r);
        }
      }
      await tx.add(Stores.coins, coin);
      return true;
    },
  );

  if (success) {
    ws.notify( {
      type: NotificationType.CoinWithdrawn,
    } );
  }

  if (withdrawSessionFinished) {
    ws.notify({
      type: NotificationType.WithdrawSessionFinished,
      withdrawSessionId: withdrawalSessionId,
    });
  }

  if (reserveDepleted && withdrawalSession.source.type === "reserve") {
    ws.notify({
      type: NotificationType.ReserveDepleted,
      reservePub: withdrawalSession.source.reservePub,
    });
  }
}

/**
 * Get a list of denominations to withdraw from the given exchange for the
 * given amount, making sure that all denominations' signatures are verified.
 *
 * Writes to the DB in order to record the result from verifying
 * denominations.
 */
export async function getVerifiedWithdrawDenomList(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  amount: AmountJson,
): Promise<DenominationRecord[]> {
  const exchange = await oneShotGet(ws.db, Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    console.log("exchange not found");
    throw Error(`exchange ${exchangeBaseUrl} not found`);
  }
  const exchangeDetails = exchange.details;
  if (!exchangeDetails) {
    console.log("exchange details not available");
    throw Error(`exchange ${exchangeBaseUrl} details not available`);
  }

  console.log("getting possible denoms");

  const possibleDenoms = await getPossibleDenoms(ws, exchange.baseUrl);

  console.log("got possible denoms");

  let allValid = false;

  let selectedDenoms: DenominationRecord[];

  do {
    allValid = true;
    const nextPossibleDenoms = [];
    selectedDenoms = getWithdrawDenomList(amount, possibleDenoms);
    console.log("got withdraw denom list");
    for (const denom of selectedDenoms || []) {
      if (denom.status === DenominationStatus.Unverified) {
        console.log(
          "checking validity",
          denom,
          exchangeDetails.masterPublicKey,
        );
        const valid = await ws.cryptoApi.isValidDenom(
          denom,
          exchangeDetails.masterPublicKey,
        );
        console.log("done checking validity");
        if (!valid) {
          denom.status = DenominationStatus.VerifiedBad;
          allValid = false;
        } else {
          denom.status = DenominationStatus.VerifiedGood;
          nextPossibleDenoms.push(denom);
        }
        await oneShotPut(ws.db, Stores.denominations, denom);
      } else {
        nextPossibleDenoms.push(denom);
      }
    }
  } while (selectedDenoms.length > 0 && !allValid);

  console.log("returning denoms");

  return selectedDenoms;
}

async function makePlanchet(
  ws: InternalWalletState,
  withdrawalSessionId: string,
  coinIndex: number,
): Promise<void> {
  const withdrawalSession = await oneShotGet(
    ws.db,
    Stores.withdrawalSession,
    withdrawalSessionId,
  );
  if (!withdrawalSession) {
    return;
  }
  const src = withdrawalSession.source;
  if (src.type !== "reserve") {
    throw Error("invalid state");
  }
  const reserve = await oneShotGet(ws.db, Stores.reserves, src.reservePub);
  if (!reserve) {
    return;
  }
  const denom = await oneShotGet(ws.db, Stores.denominations, [
    withdrawalSession.exchangeBaseUrl,
    withdrawalSession.denoms[coinIndex],
  ]);
  if (!denom) {
    return;
  }
  const r = await ws.cryptoApi.createPlanchet({
    denomPub: denom.denomPub,
    feeWithdraw: denom.feeWithdraw,
    reservePriv: reserve.reservePriv,
    reservePub: reserve.reservePub,
    value: denom.value,
  });
  const newPlanchet: PlanchetRecord = {
    blindingKey: r.blindingKey,
    coinEv: r.coinEv,
    coinPriv: r.coinPriv,
    coinPub: r.coinPub,
    coinValue: r.coinValue,
    denomPub: r.denomPub,
    denomPubHash: r.denomPubHash,
    isFromTip: false,
    reservePub: r.reservePub,
    withdrawSig: r.withdrawSig,
  };
  await runWithWriteTransaction(ws.db, [Stores.withdrawalSession], async tx => {
    const myWs = await tx.get(Stores.withdrawalSession, withdrawalSessionId);
    if (!myWs) {
      return;
    }
    if (myWs.planchets[coinIndex]) {
      return;
    }
    myWs.planchets[coinIndex] = newPlanchet;
    await tx.put(Stores.withdrawalSession, myWs);
  });
}

async function processWithdrawCoin(
  ws: InternalWalletState,
  withdrawalSessionId: string,
  coinIndex: number,
) {
  logger.trace("starting withdraw for coin", coinIndex);
  const withdrawalSession = await oneShotGet(
    ws.db,
    Stores.withdrawalSession,
    withdrawalSessionId,
  );
  if (!withdrawalSession) {
    console.log("ws doesn't exist");
    return;
  }

  const coin = await oneShotGetIndexed(
    ws.db,
    Stores.coins.byWithdrawalWithIdx,
    [withdrawalSessionId, coinIndex],
  );

  if (coin) {
    console.log("coin already exists");
    return;
  }

  if (!withdrawalSession.planchets[coinIndex]) {
    const key = `${withdrawalSessionId}-${coinIndex}`;
    await ws.memoMakePlanchet.memo(key, async () => {
      logger.trace("creating planchet for coin", coinIndex);
      return makePlanchet(ws, withdrawalSessionId, coinIndex);
    });
  }
  await processPlanchet(ws, withdrawalSessionId, coinIndex);
}

async function incrementWithdrawalRetry(
  ws: InternalWalletState,
  withdrawalSessionId: string,
  err: OperationError | undefined,
): Promise<void> {
  await runWithWriteTransaction(ws.db, [Stores.withdrawalSession], async tx => {
    const wsr = await tx.get(Stores.withdrawalSession, withdrawalSessionId);
    if (!wsr) {
      return;
    }
    if (!wsr.retryInfo) {
      return;
    }
    wsr.retryInfo.retryCounter++;
    updateRetryInfoTimeout(wsr.retryInfo);
    wsr.lastError = err;
    await tx.put(Stores.withdrawalSession, wsr);
  });
  ws.notify({ type: NotificationType.WithdrawOperationError });
}

export async function processWithdrawSession(
  ws: InternalWalletState,
  withdrawalSessionId: string,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementWithdrawalRetry(ws, withdrawalSessionId, e);
  await guardOperationException(
    () => processWithdrawSessionImpl(ws, withdrawalSessionId),
    onOpErr,
  );
}

export async function processWithdrawSessionImpl(
  ws: InternalWalletState,
  withdrawalSessionId: string,
): Promise<void> {
  logger.trace("processing withdraw session", withdrawalSessionId);
  const withdrawalSession = await oneShotGet(
    ws.db,
    Stores.withdrawalSession,
    withdrawalSessionId,
  );
  if (!withdrawalSession) {
    logger.trace("withdraw session doesn't exist");
    return;
  }

  const ps = withdrawalSession.denoms.map((d, i) =>
    processWithdrawCoin(ws, withdrawalSessionId, i),
  );
  await Promise.all(ps);
  return;
}

export async function getWithdrawDetailsForAmount(
  ws: InternalWalletState,
  baseUrl: string,
  amount: AmountJson,
): Promise<ReserveCreationInfo> {
  const exchangeInfo = await updateExchangeFromUrl(ws, baseUrl);
  const exchangeDetails = exchangeInfo.details;
  if (!exchangeDetails) {
    throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
  }
  const exchangeWireInfo = exchangeInfo.wireInfo;
  if (!exchangeWireInfo) {
    throw Error(`exchange ${exchangeInfo.baseUrl} wire details not available`);
  }

  const selectedDenoms = await getVerifiedWithdrawDenomList(
    ws,
    baseUrl,
    amount,
  );
  let acc = Amounts.getZero(amount.currency);
  for (const d of selectedDenoms) {
    acc = Amounts.add(acc, d.feeWithdraw).amount;
  }
  const actualCoinCost = selectedDenoms
    .map((d: DenominationRecord) => Amounts.add(d.value, d.feeWithdraw).amount)
    .reduce((a, b) => Amounts.add(a, b).amount);

  const exchangeWireAccounts: string[] = [];
  for (let account of exchangeWireInfo.accounts) {
    exchangeWireAccounts.push(account.url);
  }

  const { isTrusted, isAudited } = await getExchangeTrust(ws, exchangeInfo);

  let earliestDepositExpiration = selectedDenoms[0].stampExpireDeposit;
  for (let i = 1; i < selectedDenoms.length; i++) {
    const expireDeposit = selectedDenoms[i].stampExpireDeposit;
    if (expireDeposit.t_ms < earliestDepositExpiration.t_ms) {
      earliestDepositExpiration = expireDeposit;
    }
  }

  const possibleDenoms = await oneShotIterIndex(
    ws.db,
    Stores.denominations.exchangeBaseUrlIndex,
    baseUrl,
  ).filter(d => d.isOffered);

  const trustedAuditorPubs = [];
  const currencyRecord = await oneShotGet(
    ws.db,
    Stores.currencies,
    amount.currency,
  );
  if (currencyRecord) {
    trustedAuditorPubs.push(...currencyRecord.auditors.map(a => a.auditorPub));
  }

  let versionMatch;
  if (exchangeDetails.protocolVersion) {
    versionMatch = LibtoolVersion.compare(
      WALLET_PROTOCOL_VERSION,
      exchangeDetails.protocolVersion,
    );

    if (
      versionMatch &&
      !versionMatch.compatible &&
      versionMatch.currentCmp === -1
    ) {
      console.warn(
        `wallet version ${WALLET_PROTOCOL_VERSION} might be outdated ` +
          `(exchange has ${exchangeDetails.protocolVersion}), checking for updates`,
      );
    }
  }

  const ret: ReserveCreationInfo = {
    earliestDepositExpiration,
    exchangeInfo,
    exchangeWireAccounts,
    exchangeVersion: exchangeDetails.protocolVersion || "unknown",
    isAudited,
    isTrusted,
    numOfferedDenoms: possibleDenoms.length,
    overhead: Amounts.sub(amount, actualCoinCost).amount,
    selectedDenoms,
    trustedAuditorPubs,
    versionMatch,
    walletVersion: WALLET_PROTOCOL_VERSION,
    wireFees: exchangeWireInfo,
    withdrawFee: acc,
  };
  return ret;
}

export async function getWithdrawDetailsForUri(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  maybeSelectedExchange?: string,
): Promise<WithdrawDetails> {
  const info = await getWithdrawalInfo(ws, talerWithdrawUri);
  let rci: ReserveCreationInfo | undefined = undefined;
  if (maybeSelectedExchange) {
    rci = await getWithdrawDetailsForAmount(
      ws,
      maybeSelectedExchange,
      info.amount,
    );
  }
  return {
    withdrawInfo: info,
    reserveCreationInfo: rci,
  };
}
