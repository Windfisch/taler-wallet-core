/*
 This file is part of GNU Taler
 (C) 2019-2029 Taler Systems SA

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
  CoinSourceType,
} from "../types/dbTypes";
import * as Amounts from "../util/amounts";
import {
  BankWithdrawDetails,
  ExchangeWithdrawDetails,
  WithdrawDetails,
  OperationError,
} from "../types/walletTypes";
import {
  codecForWithdrawOperationStatusResponse,
  codecForWithdrawResponse,
} from "../types/talerTypes";
import { InternalWalletState } from "./state";
import { parseWithdrawUri } from "../util/taleruri";
import { Logger } from "../util/logging";
import { updateExchangeFromUrl, getExchangeTrust } from "./exchanges";
import { WALLET_EXCHANGE_PROTOCOL_VERSION } from "./versions";

import * as LibtoolVersion from "../util/libtoolVersion";
import { guardOperationException, scrutinizeTalerJsonResponse } from "./errors";
import { NotificationType } from "../types/notifications";
import {
  getTimestampNow,
  getDurationRemaining,
  timestampCmp,
  timestampSubtractDuraction,
} from "../util/time";
import {
  summarizeReserveHistory,
  ReserveHistorySummary,
} from "../util/reserveHistoryUtil";

const logger = new Logger("withdraw.ts");

function isWithdrawableDenom(d: DenominationRecord) {
  const now = getTimestampNow();
  const started = timestampCmp(now, d.stampStart) >= 0;
  const lastPossibleWithdraw = timestampSubtractDuraction(
    d.stampExpireWithdraw,
    { d_ms: 50 * 1000 },
  );
  const remaining = getDurationRemaining(lastPossibleWithdraw, now);
  const stillOkay = remaining.d_ms !== 0;
  return started && stillOkay && !d.isRevoked;
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
 * a taler://withdraw URI by asking the bank.
 */
export async function getBankWithdrawalInfo(
  ws: InternalWalletState,
  talerWithdrawUri: string,
): Promise<BankWithdrawDetails> {
  const uriResult = parseWithdrawUri(talerWithdrawUri);
  if (!uriResult) {
    throw Error(`can't parse URL ${talerWithdrawUri}`);
  }
  const resp = await ws.http.get(uriResult.statusUrl);
  if (resp.status !== 200) {
    throw Error(
      `unexpected status (${resp.status}) from bank for ${uriResult.statusUrl}`,
    );
  }
  const respJson = await resp.json();
  console.log("resp:", respJson);

  const status = codecForWithdrawOperationStatusResponse().decode(respJson);
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

async function getPossibleDenoms(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<DenominationRecord[]> {
  return await ws.db
    .iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchangeBaseUrl)
    .filter((d) => {
      return (
        (d.status === DenominationStatus.Unverified ||
          d.status === DenominationStatus.VerifiedGood) &&
        !d.isRevoked
      );
    });
}

/**
 * Given a planchet, withdraw a coin from the exchange.
 */
async function processPlanchet(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  coinIdx: number,
): Promise<void> {
  const withdrawalGroup = await ws.db.get(
    Stores.withdrawalGroups,
    withdrawalGroupId,
  );
  if (!withdrawalGroup) {
    return;
  }
  if (withdrawalGroup.withdrawn[coinIdx]) {
    return;
  }
  if (withdrawalGroup.source.type === "reserve") {
  }
  const planchet = withdrawalGroup.planchets[coinIdx];
  if (!planchet) {
    console.log("processPlanchet: planchet not found");
    return;
  }
  const exchange = await ws.db.get(
    Stores.exchanges,
    withdrawalGroup.exchangeBaseUrl,
  );
  if (!exchange) {
    console.error("db inconsistent: exchange for planchet not found");
    return;
  }

  const denom = await ws.db.get(Stores.denominations, [
    withdrawalGroup.exchangeBaseUrl,
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
  const reqUrl = new URL(
    `reserves/${planchet.reservePub}/withdraw`,
    exchange.baseUrl,
  ).href;
  const resp = await ws.http.postJson(reqUrl, wd);
  const r = await scrutinizeTalerJsonResponse(resp, codecForWithdrawResponse());

  const denomSig = await ws.cryptoApi.rsaUnblind(
    r.ev_sig,
    planchet.blindingKey,
    planchet.denomPub,
  );

  const isValid = await ws.cryptoApi.rsaVerify(
    planchet.coinPub,
    denomSig,
    planchet.denomPub,
  );
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
    exchangeBaseUrl: withdrawalGroup.exchangeBaseUrl,
    status: CoinStatus.Fresh,
    coinSource: {
      type: CoinSourceType.Withdraw,
      coinIndex: coinIdx,
      reservePub: planchet.reservePub,
      withdrawalGroupId: withdrawalGroupId,
    },
    suspended: false,
  };

  let withdrawalGroupFinished = false;
  let summary: ReserveHistorySummary | undefined = undefined;

  const success = await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.withdrawalGroups, Stores.reserves],
    async (tx) => {
      const ws = await tx.get(Stores.withdrawalGroups, withdrawalGroupId);
      if (!ws) {
        return false;
      }
      if (ws.withdrawn[coinIdx]) {
        // Already withdrawn
        return false;
      }
      ws.withdrawn[coinIdx] = true;
      delete ws.lastErrorPerCoin[coinIdx];
      let numDone = 0;
      for (let i = 0; i < ws.withdrawn.length; i++) {
        if (ws.withdrawn[i]) {
          numDone++;
        }
      }
      if (numDone === ws.denoms.length) {
        ws.timestampFinish = getTimestampNow();
        ws.lastError = undefined;
        ws.retryInfo = initRetryInfo(false);
        withdrawalGroupFinished = true;
      }
      await tx.put(Stores.withdrawalGroups, ws);
      if (!planchet.isFromTip) {
        const r = await tx.get(Stores.reserves, planchet.reservePub);
        if (r) {
          summary = summarizeReserveHistory(r.reserveTransactions, r.currency);
        }
      }
      await tx.add(Stores.coins, coin);
      return true;
    },
  );

  if (success) {
    ws.notify({
      type: NotificationType.CoinWithdrawn,
    });
  }

  if (withdrawalGroupFinished) {
    ws.notify({
      type: NotificationType.WithdrawGroupFinished,
      withdrawalSource: withdrawalGroup.source,
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
  const exchange = await ws.db.get(Stores.exchanges, exchangeBaseUrl);
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
        await ws.db.put(Stores.denominations, denom);
      } else {
        nextPossibleDenoms.push(denom);
      }
    }
  } while (selectedDenoms.length > 0 && !allValid);

  console.log("returning denoms");

  return selectedDenoms;
}

async function incrementWithdrawalRetry(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  err: OperationError | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.withdrawalGroups], async (tx) => {
    const wsr = await tx.get(Stores.withdrawalGroups, withdrawalGroupId);
    if (!wsr) {
      return;
    }
    if (!wsr.retryInfo) {
      return;
    }
    wsr.retryInfo.retryCounter++;
    updateRetryInfoTimeout(wsr.retryInfo);
    wsr.lastError = err;
    await tx.put(Stores.withdrawalGroups, wsr);
  });
  ws.notify({ type: NotificationType.WithdrawOperationError });
}

export async function processWithdrawGroup(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementWithdrawalRetry(ws, withdrawalGroupId, e);
  await guardOperationException(
    () => processWithdrawGroupImpl(ws, withdrawalGroupId, forceNow),
    onOpErr,
  );
}

async function resetWithdrawalGroupRetry(
  ws: InternalWalletState,
  withdrawalGroupId: string,
) {
  await ws.db.mutate(Stores.withdrawalGroups, withdrawalGroupId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processWithdrawGroupImpl(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  forceNow: boolean,
): Promise<void> {
  logger.trace("processing withdraw group", withdrawalGroupId);
  if (forceNow) {
    await resetWithdrawalGroupRetry(ws, withdrawalGroupId);
  }
  const withdrawalGroup = await ws.db.get(
    Stores.withdrawalGroups,
    withdrawalGroupId,
  );
  if (!withdrawalGroup) {
    logger.trace("withdraw session doesn't exist");
    return;
  }

  const ps = withdrawalGroup.denoms.map((d, i) =>
    processPlanchet(ws, withdrawalGroupId, i),
  );
  await Promise.all(ps);
  return;
}

export async function getExchangeWithdrawalInfo(
  ws: InternalWalletState,
  baseUrl: string,
  amount: AmountJson,
): Promise<ExchangeWithdrawDetails> {
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
    exchangeWireAccounts.push(account.payto_uri);
  }

  const { isTrusted, isAudited } = await getExchangeTrust(ws, exchangeInfo);

  let earliestDepositExpiration = selectedDenoms[0].stampExpireDeposit;
  for (let i = 1; i < selectedDenoms.length; i++) {
    const expireDeposit = selectedDenoms[i].stampExpireDeposit;
    if (expireDeposit.t_ms < earliestDepositExpiration.t_ms) {
      earliestDepositExpiration = expireDeposit;
    }
  }

  const possibleDenoms = await ws.db
    .iterIndex(Stores.denominations.exchangeBaseUrlIndex, baseUrl)
    .filter((d) => d.isOffered);

  const trustedAuditorPubs = [];
  const currencyRecord = await ws.db.get(Stores.currencies, amount.currency);
  if (currencyRecord) {
    trustedAuditorPubs.push(
      ...currencyRecord.auditors.map((a) => a.auditorPub),
    );
  }

  let versionMatch;
  if (exchangeDetails.protocolVersion) {
    versionMatch = LibtoolVersion.compare(
      WALLET_EXCHANGE_PROTOCOL_VERSION,
      exchangeDetails.protocolVersion,
    );

    if (
      versionMatch &&
      !versionMatch.compatible &&
      versionMatch.currentCmp === -1
    ) {
      console.warn(
        `wallet's support for exchange protocol version ${WALLET_EXCHANGE_PROTOCOL_VERSION} might be outdated ` +
          `(exchange has ${exchangeDetails.protocolVersion}), checking for updates`,
      );
    }
  }

  let tosAccepted = false;

  if (exchangeInfo.termsOfServiceAcceptedTimestamp) {
    if (
      exchangeInfo.termsOfServiceAcceptedEtag ==
      exchangeInfo.termsOfServiceLastEtag
    ) {
      tosAccepted = true;
    }
  }

  const ret: ExchangeWithdrawDetails = {
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
    walletVersion: WALLET_EXCHANGE_PROTOCOL_VERSION,
    wireFees: exchangeWireInfo,
    withdrawFee: acc,
    termsOfServiceAccepted: tosAccepted,
  };
  return ret;
}

export async function getWithdrawDetailsForUri(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  maybeSelectedExchange?: string,
): Promise<WithdrawDetails> {
  const info = await getBankWithdrawalInfo(ws, talerWithdrawUri);
  let rci: ExchangeWithdrawDetails | undefined = undefined;
  if (maybeSelectedExchange) {
    rci = await getExchangeWithdrawalInfo(
      ws,
      maybeSelectedExchange,
      info.amount,
    );
  }
  return {
    bankWithdrawDetails: info,
    exchangeWithdrawDetails: rci,
  };
}
