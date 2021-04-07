/*
 This file is part of GNU Taler
 (C) 2019-2021 Taler Systems SA

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
 * Imports.
 */
import {
  AmountJson,
  Amounts,
  parseWithdrawUri,
  Timestamp,
} from "@gnu-taler/taler-util";
import {
  DenominationRecord,
  Stores,
  DenominationStatus,
  CoinStatus,
  CoinRecord,
  CoinSourceType,
  DenominationSelectionInfo,
  PlanchetRecord,
  DenomSelectionState,
  ExchangeRecord,
  ExchangeWireInfo,
} from "../db";
import {
  BankWithdrawDetails,
  TalerErrorDetails,
  ExchangeListItem,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import {
  codecForWithdrawOperationStatusResponse,
  codecForWithdrawResponse,
  WithdrawResponse,
  codecForTalerConfigResponse,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "./state";
import { Logger } from "../util/logging";
import { updateExchangeFromUrl, getExchangeTrust } from "./exchanges";
import {
  WALLET_EXCHANGE_PROTOCOL_VERSION,
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
} from "./versions";

import * as LibtoolVersion from "@gnu-taler/taler-util";
import {
  guardOperationException,
  makeErrorDetails,
  OperationFailedError,
} from "./errors";
import { NotificationType } from "@gnu-taler/taler-util";
import {
  getTimestampNow,
  getDurationRemaining,
  timestampCmp,
  timestampSubtractDuraction,
} from "@gnu-taler/taler-util";
import { readSuccessResponseJsonOrThrow } from "../util/http";
import { URL } from "../util/url";
import { TalerErrorCode } from "@gnu-taler/taler-util";
import { updateRetryInfoTimeout, initRetryInfo } from "../util/retries";
import { compare } from "@gnu-taler/taler-util";

/**
 * Logger for this file.
 */
const logger = new Logger("withdraw.ts");

/**
 * Information about what will happen when creating a reserve.
 *
 * Sent to the wallet frontend to be rendered and shown to the user.
 */
interface ExchangeWithdrawDetails {
  /**
   * Exchange that the reserve will be created at.
   */
  exchangeInfo: ExchangeRecord;

  /**
   * Filtered wire info to send to the bank.
   */
  exchangeWireAccounts: string[];

  /**
   * Selected denominations for withdraw.
   */
  selectedDenoms: DenominationSelectionInfo;

  /**
   * Fees for withdraw.
   */
  withdrawFee: AmountJson;

  /**
   * Remaining balance that is too small to be withdrawn.
   */
  overhead: AmountJson;

  /**
   * Wire fees from the exchange.
   */
  wireFees: ExchangeWireInfo;

  /**
   * Does the wallet know about an auditor for
   * the exchange that the reserve.
   */
  isAudited: boolean;

  /**
   * Did the user already accept the current terms of service for the exchange?
   */
  termsOfServiceAccepted: boolean;

  /**
   * The exchange is trusted directly.
   */
  isTrusted: boolean;

  /**
   * The earliest deposit expiration of the selected coins.
   */
  earliestDepositExpiration: Timestamp;

  /**
   * Number of currently offered denominations.
   */
  numOfferedDenoms: number;

  /**
   * Public keys of trusted auditors for the currency we're withdrawing.
   */
  trustedAuditorPubs: string[];

  /**
   * Result of checking the wallet's version
   * against the exchange's version.
   *
   * Older exchanges don't return version information.
   */
  versionMatch: LibtoolVersion.VersionMatchResult | undefined;

  /**
   * Libtool-style version string for the exchange or "unknown"
   * for older exchanges.
   */
  exchangeVersion: string;

  /**
   * Libtool-style version string for the wallet.
   */
  walletVersion: string;
}

/**
 * Check if a denom is withdrawable based on the expiration time
 * and revocation state.
 */
export function isWithdrawableDenom(d: DenominationRecord): boolean {
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
export function selectWithdrawalDenominations(
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
      totalWithdrawCost = Amounts.add(
        totalWithdrawCost,
        Amounts.mult(cost, count).amount,
      ).amount;
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

  const configReqUrl = new URL("config", uriResult.bankIntegrationApiBaseUrl);

  const configResp = await ws.http.get(configReqUrl.href);
  const config = await readSuccessResponseJsonOrThrow(
    configResp,
    codecForTalerConfigResponse(),
  );

  const versionRes = compare(
    WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
    config.version,
  );
  if (versionRes?.compatible != true) {
    const opErr = makeErrorDetails(
      TalerErrorCode.WALLET_BANK_INTEGRATION_PROTOCOL_VERSION_INCOMPATIBLE,
      "bank integration protocol version not compatible with wallet",
      {
        exchangeProtocolVersion: config.version,
        walletProtocolVersion: WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
      },
    );
    throw new OperationFailedError(opErr);
  }

  const reqUrl = new URL(
    `withdrawal-operation/${uriResult.withdrawalOperationId}`,
    uriResult.bankIntegrationApiBaseUrl,
  );
  const resp = await ws.http.get(reqUrl.href);
  const status = await readSuccessResponseJsonOrThrow(
    resp,
    codecForWithdrawOperationStatusResponse(),
  );

  return {
    amount: Amounts.parseOrThrow(status.amount),
    confirmTransferUrl: status.confirm_transfer_url,
    extractedStatusUrl: reqUrl.href,
    selectionDone: status.selection_done,
    senderWire: status.sender_wire,
    suggestedExchange: status.suggested_exchange,
    transferDone: status.transfer_done,
    wireTypes: status.wire_types,
  };
}

/**
 * Return denominations that can potentially used for a withdrawal.
 */
export async function getCandidateWithdrawalDenoms(
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
 * Generate a planchet for a coin index in a withdrawal group.
 * Does not actually withdraw the coin yet.
 *
 * Split up so that we can parallelize the crypto, but serialize
 * the exchange requests per reserve.
 */
async function processPlanchetGenerate(
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
  let planchet = await ws.db.getIndexed(Stores.planchets.byGroupAndIndex, [
    withdrawalGroupId,
    coinIdx,
  ]);
  if (!planchet) {
    let ci = 0;
    let denomPubHash: string | undefined;
    for (
      let di = 0;
      di < withdrawalGroup.denomsSel.selectedDenoms.length;
      di++
    ) {
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
    const denom = await ws.db.get(Stores.denominations, [
      withdrawalGroup.exchangeBaseUrl,
      denomPubHash,
    ]);
    if (!denom) {
      throw Error("invariant violated");
    }
    const reserve = await ws.db.get(
      Stores.reserves,
      withdrawalGroup.reservePub,
    );
    if (!reserve) {
      throw Error("invariant violated");
    }
    const r = await ws.cryptoApi.createPlanchet({
      denomPub: denom.denomPub,
      feeWithdraw: denom.feeWithdraw,
      reservePriv: reserve.reservePriv,
      reservePub: reserve.reservePub,
      value: denom.value,
      coinIndex: coinIdx,
      secretSeed: withdrawalGroup.secretSeed,
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
      lastError: undefined,
    };
    await ws.db.runWithWriteTransaction([Stores.planchets], async (tx) => {
      const p = await tx.getIndexed(Stores.planchets.byGroupAndIndex, [
        withdrawalGroupId,
        coinIdx,
      ]);
      if (p) {
        planchet = p;
        return;
      }
      await tx.put(Stores.planchets, newPlanchet);
      planchet = newPlanchet;
    });
  }
}

/**
 * Send the withdrawal request for a generated planchet to the exchange.
 *
 * The verification of the response is done asynchronously to enable parallelism.
 */
async function processPlanchetExchangeRequest(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  coinIdx: number,
): Promise<WithdrawResponse | undefined> {
  const withdrawalGroup = await ws.db.get(
    Stores.withdrawalGroups,
    withdrawalGroupId,
  );
  if (!withdrawalGroup) {
    return;
  }
  let planchet = await ws.db.getIndexed(Stores.planchets.byGroupAndIndex, [
    withdrawalGroupId,
    coinIdx,
  ]);
  if (!planchet) {
    return;
  }
  if (planchet.withdrawalDone) {
    logger.warn("processPlanchet: planchet already withdrawn");
    return;
  }
  const exchange = await ws.db.get(
    Stores.exchanges,
    withdrawalGroup.exchangeBaseUrl,
  );
  if (!exchange) {
    logger.error("db inconsistent: exchange for planchet not found");
    return;
  }

  const denom = await ws.db.get(Stores.denominations, [
    withdrawalGroup.exchangeBaseUrl,
    planchet.denomPubHash,
  ]);

  if (!denom) {
    console.error("db inconsistent: denom for planchet not found");
    return;
  }

  logger.trace(
    `processing planchet #${coinIdx} in withdrawal ${withdrawalGroupId}`,
  );

  const wd: any = {};
  wd.denom_pub_hash = planchet.denomPubHash;
  wd.reserve_pub = planchet.reservePub;
  wd.reserve_sig = planchet.withdrawSig;
  wd.coin_ev = planchet.coinEv;
  const reqUrl = new URL(
    `reserves/${planchet.reservePub}/withdraw`,
    exchange.baseUrl,
  ).href;

  try {
    const resp = await ws.http.postJson(reqUrl, wd);
    const r = await readSuccessResponseJsonOrThrow(
      resp,
      codecForWithdrawResponse(),
    );
    return r;
  } catch (e) {
    logger.trace("withdrawal request failed", e);
    logger.trace(e);
    if (!(e instanceof OperationFailedError)) {
      throw e;
    }
    const errDetails = e.operationError;
    await ws.db.runWithWriteTransaction([Stores.planchets], async (tx) => {
      let planchet = await tx.getIndexed(Stores.planchets.byGroupAndIndex, [
        withdrawalGroupId,
        coinIdx,
      ]);
      if (!planchet) {
        return;
      }
      planchet.lastError = errDetails;
      await tx.put(Stores.planchets, planchet);
    });
    return;
  }
}

async function processPlanchetVerifyAndStoreCoin(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  coinIdx: number,
  resp: WithdrawResponse,
): Promise<void> {
  const withdrawalGroup = await ws.db.get(
    Stores.withdrawalGroups,
    withdrawalGroupId,
  );
  if (!withdrawalGroup) {
    return;
  }
  let planchet = await ws.db.getIndexed(Stores.planchets.byGroupAndIndex, [
    withdrawalGroupId,
    coinIdx,
  ]);
  if (!planchet) {
    return;
  }
  if (planchet.withdrawalDone) {
    logger.warn("processPlanchet: planchet already withdrawn");
    return;
  }

  const denomSig = await ws.cryptoApi.rsaUnblind(
    resp.ev_sig,
    planchet.blindingKey,
    planchet.denomPub,
  );

  const isValid = await ws.cryptoApi.rsaVerify(
    planchet.coinPub,
    denomSig,
    planchet.denomPub,
  );

  if (!isValid) {
    await ws.db.runWithWriteTransaction([Stores.planchets], async (tx) => {
      let planchet = await tx.getIndexed(Stores.planchets.byGroupAndIndex, [
        withdrawalGroupId,
        coinIdx,
      ]);
      if (!planchet) {
        return;
      }
      planchet.lastError = makeErrorDetails(
        TalerErrorCode.WALLET_EXCHANGE_COIN_SIGNATURE_INVALID,
        "invalid signature from the exchange after unblinding",
        {},
      );
      await tx.put(Stores.planchets, planchet);
    });
    return;
  }

  const coin: CoinRecord = {
    blindingKey: planchet.blindingKey,
    coinPriv: planchet.coinPriv,
    coinPub: planchet.coinPub,
    currentAmount: planchet.coinValue,
    denomPub: planchet.denomPub,
    denomPubHash: planchet.denomPubHash,
    denomSig,
    coinEvHash: planchet.coinEvHash,
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

  const planchetCoinPub = planchet.coinPub;

  const firstSuccess = await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.withdrawalGroups, Stores.reserves, Stores.planchets],
    async (tx) => {
      const ws = await tx.get(Stores.withdrawalGroups, withdrawalGroupId);
      if (!ws) {
        return false;
      }
      const p = await tx.get(Stores.planchets, planchetCoinPub);
      if (!p || p.withdrawalDone) {
        return false;
      }
      p.withdrawalDone = true;
      await tx.put(Stores.planchets, p);
      await tx.add(Stores.coins, coin);
      return true;
    },
  );

  if (firstSuccess) {
    ws.notify({
      type: NotificationType.CoinWithdrawn,
    });
  }
}

export function denomSelectionInfoToState(
  dsi: DenominationSelectionInfo,
): DenomSelectionState {
  return {
    selectedDenoms: dsi.selectedDenoms.map((x) => {
      return {
        count: x.count,
        denomPubHash: x.denom.denomPubHash,
      };
    }),
    totalCoinValue: dsi.totalCoinValue,
    totalWithdrawCost: dsi.totalWithdrawCost,
  };
}

/**
 * Make sure that denominations that currently can be used for withdrawal
 * are validated, and the result of validation is stored in the database.
 */
export async function updateWithdrawalDenoms(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  const exchange = await ws.db.get(Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    logger.error("exchange not found");
    throw Error(`exchange ${exchangeBaseUrl} not found`);
  }
  const exchangeDetails = exchange.details;
  if (!exchangeDetails) {
    logger.error("exchange details not available");
    throw Error(`exchange ${exchangeBaseUrl} details not available`);
  }
  // First do a pass where the validity of candidate denominations
  // is checked and the result is stored in the database.
  const denominations = await getCandidateWithdrawalDenoms(ws, exchangeBaseUrl);
  for (const denom of denominations) {
    if (denom.status === DenominationStatus.Unverified) {
      const valid = await ws.cryptoApi.isValidDenom(
        denom,
        exchangeDetails.masterPublicKey,
      );
      if (!valid) {
        logger.warn(
          `Signature check for denomination h=${denom.denomPubHash} failed`,
        );
        denom.status = DenominationStatus.VerifiedBad;
      } else {
        denom.status = DenominationStatus.VerifiedGood;
      }
      await ws.db.put(Stores.denominations, denom);
    }
  }
  // FIXME:  This debug info should either be made conditional on some flag
  // or put into some wallet-core API.
  const nextDenominations = await getCandidateWithdrawalDenoms(
    ws,
    exchangeBaseUrl,
  );
  logger.trace(
    `updated withdrawable denominations for "${exchangeBaseUrl}, n=${nextDenominations.length}"`,
  );
  const now = getTimestampNow();
  for (const denom of nextDenominations) {
    const startDelay = getDurationRemaining(denom.stampStart, now);
    const lastPossibleWithdraw = timestampSubtractDuraction(
      denom.stampExpireWithdraw,
      { d_ms: 50 * 1000 },
    );
    const remaining = getDurationRemaining(lastPossibleWithdraw, now);
    logger.trace(
      `Denom ${denom.denomPubHash} ${denom.status} revoked ${
        denom.isRevoked
      } offered ${denom.isOffered} remaining ${
        (remaining.d_ms as number) / 1000
      }sec withdrawDelay ${(startDelay.d_ms as number) / 1000}sec`,
    );
  }
}

async function incrementWithdrawalRetry(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  err: TalerErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.withdrawalGroups], async (tx) => {
    const wsr = await tx.get(Stores.withdrawalGroups, withdrawalGroupId);
    if (!wsr) {
      return;
    }
    wsr.retryInfo.retryCounter++;
    updateRetryInfoTimeout(wsr.retryInfo);
    wsr.lastError = err;
    await tx.put(Stores.withdrawalGroups, wsr);
  });
  if (err) {
    ws.notify({ type: NotificationType.WithdrawOperationError, error: err });
  }
}

export async function processWithdrawGroup(
  ws: InternalWalletState,
  withdrawalGroupId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: TalerErrorDetails): Promise<void> =>
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

  await updateExchangeFromUrl(ws, withdrawalGroup.exchangeBaseUrl);

  const numTotalCoins = withdrawalGroup.denomsSel.selectedDenoms
    .map((x) => x.count)
    .reduce((a, b) => a + b);

  let work: Promise<void>[] = [];

  for (let i = 0; i < numTotalCoins; i++) {
    work.push(processPlanchetGenerate(ws, withdrawalGroupId, i));
  }

  // Generate coins concurrently (parallelism only happens in the crypto API workers)
  await Promise.all(work);

  work = [];

  for (let coinIdx = 0; coinIdx < numTotalCoins; coinIdx++) {
    const resp = await processPlanchetExchangeRequest(
      ws,
      withdrawalGroupId,
      coinIdx,
    );
    if (!resp) {
      continue;
    }
    work.push(
      processPlanchetVerifyAndStoreCoin(ws, withdrawalGroupId, coinIdx, resp),
    );
  }

  await Promise.all(work);

  let numFinished = 0;
  let finishedForFirstTime = false;
  let errorsPerCoin: Record<number, TalerErrorDetails> = {};

  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.withdrawalGroups, Stores.reserves, Stores.planchets],
    async (tx) => {
      const wg = await tx.get(Stores.withdrawalGroups, withdrawalGroupId);
      if (!wg) {
        return;
      }

      await tx
        .iterIndexed(Stores.planchets.byGroup, withdrawalGroupId)
        .forEach((x) => {
          if (x.withdrawalDone) {
            numFinished++;
          }
          if (x.lastError) {
            errorsPerCoin[x.coinIdx] = x.lastError;
          }
        });
      logger.trace(`now withdrawn ${numFinished} of ${numTotalCoins} coins`);
      if (wg.timestampFinish === undefined && numFinished === numTotalCoins) {
        finishedForFirstTime = true;
        wg.timestampFinish = getTimestampNow();
        wg.lastError = undefined;
        wg.retryInfo = initRetryInfo(false);
      }

      await tx.put(Stores.withdrawalGroups, wg);
    },
  );

  if (numFinished != numTotalCoins) {
    throw OperationFailedError.fromCode(
      TalerErrorCode.WALLET_WITHDRAWAL_GROUP_INCOMPLETE,
      `withdrawal did not finish (${numFinished} / ${numTotalCoins} coins withdrawn)`,
      {
        errorsPerCoin,
      },
    );
  }

  if (finishedForFirstTime) {
    ws.notify({
      type: NotificationType.WithdrawGroupFinished,
      reservePub: withdrawalGroup.reservePub,
    });
  }
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

  await updateWithdrawalDenoms(ws, baseUrl);
  const denoms = await getCandidateWithdrawalDenoms(ws, baseUrl);
  const selectedDenoms = selectWithdrawalDenominations(amount, denoms);
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

  if (exchangeInfo.termsOfServiceLastEtag) {
    if (
      exchangeInfo.termsOfServiceAcceptedEtag ===
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

export async function getWithdrawalDetailsForUri(
  ws: InternalWalletState,
  talerWithdrawUri: string,
): Promise<WithdrawUriInfoResponse> {
  logger.trace(`getting withdrawal details for URI ${talerWithdrawUri}`);
  const info = await getBankWithdrawalInfo(ws, talerWithdrawUri);
  logger.trace(`got bank info`);
  if (info.suggestedExchange) {
    // FIXME: right now the exchange gets permanently added,
    // we might want to only temporarily add it.
    try {
      await updateExchangeFromUrl(ws, info.suggestedExchange);
    } catch (e) {
      // We still continued if it failed, as other exchanges might be available.
      // We don't want to fail if the bank-suggested exchange is broken/offline.
      logger.trace(
        `querying bank-suggested exchange (${info.suggestedExchange}) failed`,
      );
    }
  }

  const exchangesRes: (ExchangeListItem | undefined)[] = await ws.db
    .iter(Stores.exchanges)
    .map((x) => {
      const details = x.details;
      if (!details) {
        return undefined;
      }
      if (!x.addComplete) {
        return undefined;
      }
      if (!x.wireInfo) {
        return undefined;
      }
      if (details.currency !== info.amount.currency) {
        return undefined;
      }
      return {
        exchangeBaseUrl: x.baseUrl,
        currency: details.currency,
        paytoUris: x.wireInfo.accounts.map((x) => x.payto_uri),
      };
    });
  const exchanges = exchangesRes.filter((x) => !!x) as ExchangeListItem[];

  return {
    amount: Amounts.stringify(info.amount),
    defaultExchangeBaseUrl: info.suggestedExchange,
    possibleExchanges: exchanges,
  };
}
