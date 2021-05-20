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

/**
 * Imports.
 */
import {
  Amounts,
  codecForExchangeKeysJson,
  codecForExchangeWireJson,
  compare,
  Denomination,
  Duration,
  durationFromSpec,
  getTimestampNow,
  isTimestampExpired,
  NotificationType,
  parsePaytoUri,
  TalerErrorCode,
  TalerErrorDetails,
} from "@gnu-taler/taler-util";
import {
  DenominationRecord,
  DenominationStatus,
  Stores,
  ExchangeRecord,
  ExchangeUpdateStatus,
  WireFee,
  ExchangeUpdateReason,
} from "../db.js";
import {
  Logger,
  URL,
  readSuccessResponseJsonOrThrow,
  getExpiryTimestamp,
  readSuccessResponseTextOrThrow,
} from "../index.js";
import { j2s, canonicalizeBaseUrl } from "@gnu-taler/taler-util";
import { checkDbInvariant } from "../util/invariants.js";
import { updateRetryInfoTimeout, initRetryInfo } from "../util/retries.js";
import {
  makeErrorDetails,
  OperationFailedAndReportedError,
  guardOperationException,
} from "./errors.js";
import { createRecoupGroup, processRecoupGroup } from "./recoup.js";
import { InternalWalletState } from "./state.js";
import {
  WALLET_CACHE_BREAKER_CLIENT_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
} from "./versions.js";

const logger = new Logger("exchanges.ts");

async function denominationRecordFromKeys(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  denomIn: Denomination,
): Promise<DenominationRecord> {
  const denomPubHash = await ws.cryptoApi.hashEncoded(denomIn.denom_pub);
  const d: DenominationRecord = {
    denomPub: denomIn.denom_pub,
    denomPubHash,
    exchangeBaseUrl,
    feeDeposit: Amounts.parseOrThrow(denomIn.fee_deposit),
    feeRefresh: Amounts.parseOrThrow(denomIn.fee_refresh),
    feeRefund: Amounts.parseOrThrow(denomIn.fee_refund),
    feeWithdraw: Amounts.parseOrThrow(denomIn.fee_withdraw),
    isOffered: true,
    isRevoked: false,
    masterSig: denomIn.master_sig,
    stampExpireDeposit: denomIn.stamp_expire_deposit,
    stampExpireLegal: denomIn.stamp_expire_legal,
    stampExpireWithdraw: denomIn.stamp_expire_withdraw,
    stampStart: denomIn.stamp_start,
    status: DenominationStatus.Unverified,
    value: Amounts.parseOrThrow(denomIn.value),
  };
  return d;
}

async function handleExchangeUpdateError(
  ws: InternalWalletState,
  baseUrl: string,
  err: TalerErrorDetails,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.exchanges], async (tx) => {
    const exchange = await tx.get(Stores.exchanges, baseUrl);
    if (!exchange) {
      return;
    }
    exchange.retryInfo.retryCounter++;
    updateRetryInfoTimeout(exchange.retryInfo);
    exchange.lastError = err;
  });
  if (err) {
    ws.notify({ type: NotificationType.ExchangeOperationError, error: err });
  }
}

function getExchangeRequestTimeout(e: ExchangeRecord): Duration {
  return { d_ms: 5000 };
}

/**
 * Fetch the exchange's /keys and update our database accordingly.
 *
 * Exceptions thrown in this method must be caught and reported
 * in the pending operations.
 */
async function updateExchangeWithKeys(
  ws: InternalWalletState,
  baseUrl: string,
): Promise<void> {
  const existingExchangeRecord = await ws.db.get(Stores.exchanges, baseUrl);

  if (existingExchangeRecord?.updateStatus != ExchangeUpdateStatus.FetchKeys) {
    return;
  }

  logger.info("updating exchange /keys info");

  const keysUrl = new URL("keys", baseUrl);
  keysUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  const resp = await ws.http.get(keysUrl.href, {
    timeout: getExchangeRequestTimeout(existingExchangeRecord),
  });
  const exchangeKeysJson = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeKeysJson(),
  );

  logger.info("received /keys response");
  logger.trace(j2s(exchangeKeysJson));

  if (exchangeKeysJson.denoms.length === 0) {
    const opErr = makeErrorDetails(
      TalerErrorCode.WALLET_EXCHANGE_DENOMINATIONS_INSUFFICIENT,
      "exchange doesn't offer any denominations",
      {
        exchangeBaseUrl: baseUrl,
      },
    );
    await handleExchangeUpdateError(ws, baseUrl, opErr);
    throw new OperationFailedAndReportedError(opErr);
  }

  const protocolVersion = exchangeKeysJson.version;

  const versionRes = compare(WALLET_EXCHANGE_PROTOCOL_VERSION, protocolVersion);
  if (versionRes?.compatible != true) {
    const opErr = makeErrorDetails(
      TalerErrorCode.WALLET_EXCHANGE_PROTOCOL_VERSION_INCOMPATIBLE,
      "exchange protocol version not compatible with wallet",
      {
        exchangeProtocolVersion: protocolVersion,
        walletProtocolVersion: WALLET_EXCHANGE_PROTOCOL_VERSION,
      },
    );
    await handleExchangeUpdateError(ws, baseUrl, opErr);
    throw new OperationFailedAndReportedError(opErr);
  }

  const currency = Amounts.parseOrThrow(exchangeKeysJson.denoms[0].value)
    .currency;

  logger.trace("processing denominations");

  const newDenominations = await Promise.all(
    exchangeKeysJson.denoms.map((d) =>
      denominationRecordFromKeys(ws, baseUrl, d),
    ),
  );

  logger.trace("done with processing denominations");

  const lastUpdateTimestamp = getTimestampNow();

  const recoupGroupId: string | undefined = undefined;

  await ws.db.runWithWriteTransaction(
    [Stores.exchanges, Stores.denominations, Stores.recoupGroups, Stores.coins],
    async (tx) => {
      const r = await tx.get(Stores.exchanges, baseUrl);
      if (!r) {
        logger.warn(`exchange ${baseUrl} no longer present`);
        return;
      }
      if (r.details) {
        // FIXME: We need to do some consistency checks!
      }
      // FIXME: validate signing keys and merge with old set
      r.details = {
        auditors: exchangeKeysJson.auditors,
        currency: currency,
        lastUpdateTime: lastUpdateTimestamp,
        masterPublicKey: exchangeKeysJson.master_public_key,
        protocolVersion: protocolVersion,
        signingKeys: exchangeKeysJson.signkeys,
        nextUpdateTime: getExpiryTimestamp(resp, {
          minDuration: durationFromSpec({ hours: 1 }),
        }),
        reserveClosingDelay: exchangeKeysJson.reserve_closing_delay,
      };
      r.updateStatus = ExchangeUpdateStatus.FetchWire;
      r.lastError = undefined;
      r.retryInfo = initRetryInfo(false);
      await tx.put(Stores.exchanges, r);

      for (const newDenom of newDenominations) {
        const oldDenom = await tx.get(Stores.denominations, [
          baseUrl,
          newDenom.denomPubHash,
        ]);
        if (oldDenom) {
          // FIXME: Do consistency check
        } else {
          await tx.put(Stores.denominations, newDenom);
        }
      }

      // Handle recoup
      const recoupDenomList = exchangeKeysJson.recoup ?? [];
      const newlyRevokedCoinPubs: string[] = [];
      logger.trace("recoup list from exchange", recoupDenomList);
      for (const recoupInfo of recoupDenomList) {
        const oldDenom = await tx.get(Stores.denominations, [
          r.baseUrl,
          recoupInfo.h_denom_pub,
        ]);
        if (!oldDenom) {
          // We never even knew about the revoked denomination, all good.
          continue;
        }
        if (oldDenom.isRevoked) {
          // We already marked the denomination as revoked,
          // this implies we revoked all coins
          logger.trace("denom already revoked");
          continue;
        }
        logger.trace("revoking denom", recoupInfo.h_denom_pub);
        oldDenom.isRevoked = true;
        await tx.put(Stores.denominations, oldDenom);
        const affectedCoins = await tx
          .iterIndexed(Stores.coins.denomPubHashIndex, recoupInfo.h_denom_pub)
          .toArray();
        for (const ac of affectedCoins) {
          newlyRevokedCoinPubs.push(ac.coinPub);
        }
      }
      if (newlyRevokedCoinPubs.length != 0) {
        logger.trace("recouping coins", newlyRevokedCoinPubs);
        await createRecoupGroup(ws, tx, newlyRevokedCoinPubs);
      }
    },
  );

  if (recoupGroupId) {
    // Asynchronously start recoup.  This doesn't need to finish
    // for the exchange update to be considered finished.
    processRecoupGroup(ws, recoupGroupId).catch((e) => {
      logger.error("error while recouping coins:", e);
    });
  }

  logger.trace("done updating exchange /keys");
}

async function updateExchangeFinalize(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  const exchange = await ws.db.get(Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    return;
  }
  if (exchange.updateStatus != ExchangeUpdateStatus.FinalizeUpdate) {
    return;
  }
  await ws.db.runWithWriteTransaction([Stores.exchanges], async (tx) => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    if (r.updateStatus != ExchangeUpdateStatus.FinalizeUpdate) {
      return;
    }
    r.addComplete = true;
    r.updateStatus = ExchangeUpdateStatus.Finished;
    // Reset time to next auto refresh check,
    // as now new denominations might be available.
    r.nextRefreshCheck = undefined;
    await tx.put(Stores.exchanges, r);
  });
}

async function updateExchangeWithTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  const exchange = await ws.db.get(Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    return;
  }
  if (exchange.updateStatus != ExchangeUpdateStatus.FetchTerms) {
    return;
  }
  const reqUrl = new URL("terms", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);
  const headers = {
    Accept: "text/plain",
  };

  const resp = await ws.http.get(reqUrl.href, {
    headers,
    timeout: getExchangeRequestTimeout(exchange),
  });
  const tosText = await readSuccessResponseTextOrThrow(resp);
  const tosEtag = resp.headers.get("etag") || undefined;

  await ws.db.runWithWriteTransaction([Stores.exchanges], async (tx) => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    if (r.updateStatus != ExchangeUpdateStatus.FetchTerms) {
      return;
    }
    r.termsOfServiceText = tosText;
    r.termsOfServiceLastEtag = tosEtag;
    r.updateStatus = ExchangeUpdateStatus.FinalizeUpdate;
    await tx.put(Stores.exchanges, r);
  });
}

export async function acceptExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  etag: string | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.exchanges], async (tx) => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    r.termsOfServiceAcceptedEtag = etag;
    await tx.put(Stores.exchanges, r);
  });
}

/**
 * Fetch wire information for an exchange and store it in the database.
 *
 * @param exchangeBaseUrl Exchange base URL, assumed to be already normalized.
 */
async function updateExchangeWithWireInfo(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<void> {
  const exchange = await ws.db.get(Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    return;
  }
  if (exchange.updateStatus != ExchangeUpdateStatus.FetchWire) {
    return;
  }
  const details = exchange.details;
  if (!details) {
    throw Error("invalid exchange state");
  }
  const reqUrl = new URL("wire", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  const resp = await ws.http.get(reqUrl.href, {
    timeout: getExchangeRequestTimeout(exchange),
  });
  const wireInfo = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeWireJson(),
  );

  for (const a of wireInfo.accounts) {
    logger.trace("validating exchange acct");
    const isValid = await ws.cryptoApi.isValidWireAccount(
      a.payto_uri,
      a.master_sig,
      details.masterPublicKey,
    );
    if (!isValid) {
      throw Error("exchange acct signature invalid");
    }
  }
  const feesForType: { [wireMethod: string]: WireFee[] } = {};
  for (const wireMethod of Object.keys(wireInfo.fees)) {
    const feeList: WireFee[] = [];
    for (const x of wireInfo.fees[wireMethod]) {
      const startStamp = x.start_date;
      const endStamp = x.end_date;
      const fee: WireFee = {
        closingFee: Amounts.parseOrThrow(x.closing_fee),
        endStamp,
        sig: x.sig,
        startStamp,
        wireFee: Amounts.parseOrThrow(x.wire_fee),
      };
      const isValid = await ws.cryptoApi.isValidWireFee(
        wireMethod,
        fee,
        details.masterPublicKey,
      );
      if (!isValid) {
        throw Error("exchange wire fee signature invalid");
      }
      feeList.push(fee);
    }
    feesForType[wireMethod] = feeList;
  }

  await ws.db.runWithWriteTransaction([Stores.exchanges], async (tx) => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    if (r.updateStatus != ExchangeUpdateStatus.FetchWire) {
      return;
    }
    r.wireInfo = {
      accounts: wireInfo.accounts,
      feesForType: feesForType,
    };
    r.updateStatus = ExchangeUpdateStatus.FetchTerms;
    r.lastError = undefined;
    r.retryInfo = initRetryInfo(false);
    await tx.put(Stores.exchanges, r);
  });
}

export async function updateExchangeFromUrl(
  ws: InternalWalletState,
  baseUrl: string,
  forceNow = false,
): Promise<ExchangeRecord> {
  const onOpErr = (e: TalerErrorDetails): Promise<void> =>
    handleExchangeUpdateError(ws, baseUrl, e);
  return await guardOperationException(
    () => updateExchangeFromUrlImpl(ws, baseUrl, forceNow),
    onOpErr,
  );
}

/**
 * Update or add exchange DB entry by fetching the /keys and /wire information.
 * Optionally link the reserve entry to the new or existing
 * exchange entry in then DB.
 */
async function updateExchangeFromUrlImpl(
  ws: InternalWalletState,
  baseUrl: string,
  forceNow = false,
): Promise<ExchangeRecord> {
  logger.trace(`updating exchange info for ${baseUrl}`);
  const now = getTimestampNow();
  baseUrl = canonicalizeBaseUrl(baseUrl);

  let r = await ws.db.get(Stores.exchanges, baseUrl);
  if (!r) {
    const newExchangeRecord: ExchangeRecord = {
      builtIn: false,
      addComplete: false,
      permanent: true,
      baseUrl: baseUrl,
      details: undefined,
      wireInfo: undefined,
      updateStatus: ExchangeUpdateStatus.FetchKeys,
      updateStarted: now,
      updateReason: ExchangeUpdateReason.Initial,
      termsOfServiceAcceptedEtag: undefined,
      termsOfServiceLastEtag: undefined,
      termsOfServiceText: undefined,
      retryInfo: initRetryInfo(false),
    };
    await ws.db.put(Stores.exchanges, newExchangeRecord);
  } else {
    await ws.db.runWithWriteTransaction([Stores.exchanges], async (t) => {
      const rec = await t.get(Stores.exchanges, baseUrl);
      if (!rec) {
        return;
      }
      if (rec.updateStatus != ExchangeUpdateStatus.FetchKeys) {
        const t = rec.details?.nextUpdateTime;
        if (!forceNow && t && !isTimestampExpired(t)) {
          return;
        }
      }
      if (rec.updateStatus != ExchangeUpdateStatus.FetchKeys && forceNow) {
        rec.updateReason = ExchangeUpdateReason.Forced;
      }
      rec.updateStarted = now;
      rec.updateStatus = ExchangeUpdateStatus.FetchKeys;
      rec.lastError = undefined;
      rec.retryInfo = initRetryInfo(false);
      t.put(Stores.exchanges, rec);
    });
  }

  await updateExchangeWithKeys(ws, baseUrl);
  await updateExchangeWithWireInfo(ws, baseUrl);
  await updateExchangeWithTermsOfService(ws, baseUrl);
  await updateExchangeFinalize(ws, baseUrl);

  const updatedExchange = await ws.db.get(Stores.exchanges, baseUrl);
  checkDbInvariant(!!updatedExchange);
  return updatedExchange;
}


export async function getExchangePaytoUri(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  supportedTargetTypes: string[],
): Promise<string> {
  // We do the update here, since the exchange might not even exist
  // yet in our database.
  const exchangeRecord = await updateExchangeFromUrl(ws, exchangeBaseUrl);
  if (!exchangeRecord) {
    throw Error(`Exchange '${exchangeBaseUrl}' not found.`);
  }
  const exchangeWireInfo = exchangeRecord.wireInfo;
  if (!exchangeWireInfo) {
    throw Error(`Exchange wire info for '${exchangeBaseUrl}' not found.`);
  }
  for (const account of exchangeWireInfo.accounts) {
    const res = parsePaytoUri(account.payto_uri);
    if (!res) {
      continue;
    }
    if (supportedTargetTypes.includes(res.targetType)) {
      return account.payto_uri;
    }
  }
  throw Error("no matching exchange account found");
}
