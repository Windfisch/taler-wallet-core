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

import { AmountJson, Amounts } from "../util/amounts";
import {
  DenominationRecord,
  Stores,
  DenominationStatus,
  CoinStatus,
  CoinRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
  CoinSourceType,
  DenominationSelectionInfo,
  PlanchetRecord,
  WithdrawalSourceType,
} from "../types/dbTypes";
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

const logger = new Logger("withdraw.ts");

function isWithdrawableDenom(d: DenominationRecord): boolean {
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
): DenominationSelectionInfo {
  let remaining = Amounts.copy(amountAvailable);

  const selectedDenoms: {
    count: number;
    denom: DenominationRecord;
  }[] = [];

  let totalCoinValue = Amounts.getZero(amountAvailable.currency);
  let totalWithdrawCost = Amounts.getZero(amountAvailable.currency);

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  for (const d of denoms) {
    console.log("considering denom", d);
    let count = 0;
    const cost = Amounts.add(d.value, d.feeWithdraw).amount;
    for (;;) {
      if (Amounts.cmp(remaining, cost) < 0) {
        break;
      }
      remaining = Amounts.sub(remaining, cost).amount;
      count++;
    }
    if (count > 0) {
      totalCoinValue = Amounts.add(
        totalCoinValue,
        Amounts.mult(d.value, count).amount,
      ).amount;
      totalWithdrawCost = Amounts.add(totalWithdrawCost, cost).amount;
      selectedDenoms.push({
        count,
        denom: d,
      });
    }

    if (Amounts.isZero(remaining)) {
      break;
    }
  }

  return {
    selectedDenoms,
    totalCoinValue,
    totalWithdrawCost,
  };
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
  const planchet = await ws.db.getIndexed(Stores.planchets.byGroupAndIndex, [
    withdrawalGroupId,
    coinIdx,
  ]);
  if (!planchet) {
    let ci = 0;
    let denomPubHash: string | undefined;
    for (let di = 0; di < withdrawalGroup.denomsSel.selectedDenoms.length; di++) {
      const d = withdrawalGroup.denomsSel.selectedDenoms[di];
      if (coinIdx >= ci && coinIdx < ci + d.count) {
        denomPubHash = d.denomPubHash;
        break;
      }
      ci += d.count;
    }
    if (!denomPubHash) {
      throw Error("invariant violated");
    }
    const denom = await ws.db.getIndexed(Stores.denominations.denomPubHashIndex, denomPubHash);
    if (!denom) {
      throw Error("invariant violated");
    }
    if (withdrawalGroup.source.type != WithdrawalSourceType.Reserve) {
      throw Error("invariant violated");
    }
    const reserve = await ws.db.get(Stores.reserves, withdrawalGroup.source.reservePub);
    if (!reserve) {
      throw Error("invariant violated");
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
      coinEvHash: r.coinEvHash,
      coinIdx,
      coinPriv: r.coinPriv,
      coinPub: r.coinPub,
      coinValue: r.coinValue,
      denomPub: r.denomPub,
      denomPubHash: r.denomPubHash,
      isFromTip: false,
      reservePub: r.reservePub,
      withdrawalDone: false,
      withdrawSig: r.withdrawSig,
      withdrawalGroupId: withdrawalGroupId,
    };
    await ws.db.runWithWriteTransaction([Stores.planchets], async (tx) => {
      const p = await tx.getIndexed(Stores.planchets.byGroupAndIndex, [
        withdrawalGroupId,
        coinIdx,
      ]);
      if (p) {
        return;
      }
      await tx.put(Stores.planchets, newPlanchet);
    });
    console.log("processPlanchet: planchet not found");
    return;
  }
  if (planchet.withdrawalDone) {
    console.log("processPlanchet: planchet already withdrawn");
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

  logger.trace(`processing planchet #${coinIdx} in withdrawal ${withdrawalGroupId}`);

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

  logger.trace(`got response for /withdraw`);

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

  logger.trace(`unblinded and verified`);

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

  const success = await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.withdrawalGroups, Stores.reserves, Stores.planchets],
    async (tx) => {
      const ws = await tx.get(Stores.withdrawalGroups, withdrawalGroupId);
      if (!ws) {
        return false;
      }
      const p = await tx.get(Stores.planchets, planchet.coinPub);
      if (!p) {
        return false;
      }
      if (p.withdrawalDone) {
        // Already withdrawn
        return false;
      }
      p.withdrawalDone = true;
      await tx.put(Stores.planchets, p);

      let numTotal = 0;

      for (const ds of ws.denomsSel.selectedDenoms) {
        numTotal += ds.count;
      }

      let numDone = 0;

      await tx.iterIndexed(Stores.planchets.byGroup, withdrawalGroupId).forEach((x) => {
        if (x.withdrawalDone) {
          numDone++;
        }
      });

      if (numDone > numTotal) {
        throw Error("invariant violated (created more planchets than expected)");
      }

      if (numDone == numTotal) {
        ws.timestampFinish = getTimestampNow();
        ws.lastError = undefined;
        ws.retryInfo = initRetryInfo(false);
        withdrawalGroupFinished = true;
      }
      await tx.put(Stores.withdrawalGroups, ws);
      await tx.add(Stores.coins, coin);
      return true;
    },
  );

  logger.trace(`withdrawal result stored in DB`);

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
): Promise<DenominationSelectionInfo> {
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

  let selectedDenoms: DenominationSelectionInfo;

  do {
    allValid = true;
    const nextPossibleDenoms = [];
    selectedDenoms = getWithdrawDenomList(amount, possibleDenoms);
    console.log("got withdraw denom list");
    if (!selectedDenoms) {
      console;
    }
    for (const denomSel of selectedDenoms.selectedDenoms) {
      const denom = denomSel.denom;
      if (denom.status === DenominationStatus.Unverified) {
        const valid = await ws.cryptoApi.isValidDenom(
          denom,
          exchangeDetails.masterPublicKey,
        );
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
  } while (selectedDenoms.selectedDenoms.length > 0 && !allValid);

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
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: OperationError): Promise<void> =>
    incrementWithdrawalRetry(ws, withdrawalGroupId, e);
  await guardOperationException(
    () => processWithdrawGroupImpl(ws, withdrawalGroupId, forceNow),
    onOpErr,
  );
}

async function resetWithdrawalGroupRetry(
  ws: InternalWalletState,
  withdrawalGroupId: string,
): Promise<void> {
  await ws.db.mutate(Stores.withdrawalGroups, withdrawalGroupId, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processInBatches(workGen: Iterator<Promise<void>>, batchSize: number): Promise<void> {
  for (;;) {
    const batch: Promise<void>[] = [];
    for (let i = 0; i < batchSize; i++) {
      const wn = workGen.next();
      if (wn.done) {
        break;
      }
      batch.push(wn.value);
    }
    if (batch.length == 0) {
      break;
    }
    logger.trace(`processing withdrawal batch of ${batch.length} elements`);
    await Promise.all(batch);
  }
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

  const numDenoms = withdrawalGroup.denomsSel.selectedDenoms.length;
  const genWork = function*(): Iterator<Promise<void>> {
    let coinIdx = 0;
    for (let i = 0; i < numDenoms; i++) {
      const count = withdrawalGroup.denomsSel.selectedDenoms[i].count;
      for (let j = 0; j < count; j++) {
        yield processPlanchet(ws, withdrawalGroupId, coinIdx);
        coinIdx++;
      }
    }
  }

  // Withdraw coins in batches.
  // The batch size is relatively large
  await processInBatches(genWork(), 50);
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
  const exchangeWireAccounts: string[] = [];
  for (const account of exchangeWireInfo.accounts) {
    exchangeWireAccounts.push(account.payto_uri);
  }

  const { isTrusted, isAudited } = await getExchangeTrust(ws, exchangeInfo);

  let earliestDepositExpiration =
    selectedDenoms.selectedDenoms[0].denom.stampExpireDeposit;
  for (let i = 1; i < selectedDenoms.selectedDenoms.length; i++) {
    const expireDeposit =
      selectedDenoms.selectedDenoms[i].denom.stampExpireDeposit;
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

  const withdrawFee = Amounts.sub(
    selectedDenoms.totalWithdrawCost,
    selectedDenoms.totalCoinValue,
  ).amount;

  const ret: ExchangeWithdrawDetails = {
    earliestDepositExpiration,
    exchangeInfo,
    exchangeWireAccounts,
    exchangeVersion: exchangeDetails.protocolVersion || "unknown",
    isAudited,
    isTrusted,
    numOfferedDenoms: possibleDenoms.length,
    overhead: Amounts.sub(amount, selectedDenoms.totalWithdrawCost).amount,
    selectedDenoms,
    trustedAuditorPubs,
    versionMatch,
    walletVersion: WALLET_EXCHANGE_PROTOCOL_VERSION,
    wireFees: exchangeWireInfo,
    withdrawFee,
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
