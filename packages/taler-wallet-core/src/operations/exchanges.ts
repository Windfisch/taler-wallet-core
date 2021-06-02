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
  Auditor,
  codecForExchangeKeysJson,
  codecForExchangeWireJson,
  compare,
  Denomination,
  Duration,
  durationFromSpec,
  ExchangeSignKeyJson,
  ExchangeWireJson,
  getTimestampNow,
  isTimestampExpired,
  NotificationType,
  parsePaytoUri,
  Recoup,
  TalerErrorCode,
  TalerErrorDetails,
  Timestamp,
} from "@gnu-taler/taler-util";
import {
  DenominationRecord,
  DenominationStatus,
  Stores,
  ExchangeRecord,
  ExchangeUpdateStatus,
  WireFee,
  ExchangeUpdateReason,
  ExchangeDetailsRecord,
  WireInfo,
} from "../db.js";
import {
  Logger,
  URL,
  readSuccessResponseJsonOrThrow,
  getExpiryTimestamp,
  readSuccessResponseTextOrThrow,
  encodeCrock,
  hash,
  decodeCrock,
} from "../index.js";
import { j2s, canonicalizeBaseUrl } from "@gnu-taler/taler-util";
import { updateRetryInfoTimeout, initRetryInfo } from "../util/retries.js";
import {
  makeErrorDetails,
  guardOperationException,
  OperationFailedError,
} from "./errors.js";
import { createRecoupGroup, processRecoupGroup } from "./recoup.js";
import { InternalWalletState } from "./state.js";
import {
  WALLET_CACHE_BREAKER_CLIENT_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
} from "./versions.js";
import { HttpRequestLibrary } from "../util/http.js";
import { CryptoApi } from "../crypto/workers/cryptoApi.js";
import { TransactionHandle } from "../util/query.js";

const logger = new Logger("exchanges.ts");

function denominationRecordFromKeys(
  exchangeBaseUrl: string,
  denomIn: Denomination,
): DenominationRecord {
  const denomPubHash = encodeCrock(hash(decodeCrock(denomIn.denom_pub)));
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

interface ExchangeTosDownloadResult {
  tosText: string;
  tosEtag: string;
}

async function downloadExchangeWithTermsOfService(
  exchangeBaseUrl: string,
  http: HttpRequestLibrary,
  timeout: Duration,
): Promise<ExchangeTosDownloadResult> {
  const reqUrl = new URL("terms", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);
  const headers = {
    Accept: "text/plain",
  };

  const resp = await http.get(reqUrl.href, {
    headers,
    timeout,
  });
  const tosText = await readSuccessResponseTextOrThrow(resp);
  const tosEtag = resp.headers.get("etag") || "unknown";

  return { tosText, tosEtag };
}

export async function getExchangeDetails(
  tx: TransactionHandle<
    typeof Stores.exchanges | typeof Stores.exchangeDetails
  >,
  exchangeBaseUrl: string,
): Promise<ExchangeDetailsRecord | undefined> {
  const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
  if (!r) {
    return;
  }
  const dp = r.detailsPointer;
  if (!dp) {
    return;
  }
  const { currency, masterPublicKey } = dp;
  return await tx.get(Stores.exchangeDetails, [
    r.baseUrl,
    currency,
    masterPublicKey,
  ]);
}

export async function acceptExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  etag: string | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction(
    [Stores.exchanges, Stores.exchangeDetails],
    async (tx) => {
      const d = await getExchangeDetails(tx, exchangeBaseUrl);
      if (d) {
        d.termsOfServiceAcceptedEtag = etag;
        await tx.put(Stores.exchangeDetails, d);
      }
    },
  );
}

async function validateWireInfo(
  wireInfo: ExchangeWireJson,
  masterPublicKey: string,
  cryptoApi: CryptoApi,
): Promise<WireInfo> {
  for (const a of wireInfo.accounts) {
    logger.trace("validating exchange acct");
    const isValid = await cryptoApi.isValidWireAccount(
      a.payto_uri,
      a.master_sig,
      masterPublicKey,
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
      const isValid = await cryptoApi.isValidWireFee(
        wireMethod,
        fee,
        masterPublicKey,
      );
      if (!isValid) {
        throw Error("exchange wire fee signature invalid");
      }
      feeList.push(fee);
    }
    feesForType[wireMethod] = feeList;
  }

  return {
    accounts: wireInfo.accounts,
    feesForType,
  };
}

/**
 * Fetch wire information for an exchange.
 *
 * @param exchangeBaseUrl Exchange base URL, assumed to be already normalized.
 */
async function downloadExchangeWithWireInfo(
  exchangeBaseUrl: string,
  http: HttpRequestLibrary,
  timeout: Duration,
): Promise<ExchangeWireJson> {
  const reqUrl = new URL("wire", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  const resp = await http.get(reqUrl.href, {
    timeout,
  });
  const wireInfo = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeWireJson(),
  );

  return wireInfo;
}

export async function updateExchangeFromUrl(
  ws: InternalWalletState,
  baseUrl: string,
  forceNow = false,
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord;
}> {
  const onOpErr = (e: TalerErrorDetails): Promise<void> =>
    handleExchangeUpdateError(ws, baseUrl, e);
  return await guardOperationException(
    () => updateExchangeFromUrlImpl(ws, baseUrl, forceNow),
    onOpErr,
  );
}

async function provideExchangeRecord(
  ws: InternalWalletState,
  baseUrl: string,
  now: Timestamp,
): Promise<ExchangeRecord> {
  let r = await ws.db.get(Stores.exchanges, baseUrl);
  if (!r) {
    const newExchangeRecord: ExchangeRecord = {
      permanent: true,
      baseUrl: baseUrl,
      updateStatus: ExchangeUpdateStatus.FetchKeys,
      updateStarted: now,
      updateReason: ExchangeUpdateReason.Initial,
      retryInfo: initRetryInfo(false),
      detailsPointer: undefined,
    };
    await ws.db.put(Stores.exchanges, newExchangeRecord);
    r = newExchangeRecord;
  }
  return r;
}

interface ExchangeKeysDownloadResult {
  masterPublicKey: string;
  currency: string;
  auditors: Auditor[];
  currentDenominations: DenominationRecord[];
  protocolVersion: string;
  signingKeys: ExchangeSignKeyJson[];
  reserveClosingDelay: Duration;
  expiry: Timestamp;
  recoup: Recoup[];
}

/**
 * Download and validate an exchange's /keys data.
 */
async function downloadKeysInfo(
  baseUrl: string,
  http: HttpRequestLibrary,
  timeout: Duration,
): Promise<ExchangeKeysDownloadResult> {
  const keysUrl = new URL("keys", baseUrl);
  keysUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  const resp = await http.get(keysUrl.href, {
    timeout,
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
    throw new OperationFailedError(opErr);
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
    throw new OperationFailedError(opErr);
  }

  const currency = Amounts.parseOrThrow(
    exchangeKeysJson.denoms[0].value,
  ).currency.toUpperCase();

  return {
    masterPublicKey: exchangeKeysJson.master_public_key,
    currency,
    auditors: exchangeKeysJson.auditors,
    currentDenominations: exchangeKeysJson.denoms.map((d) =>
      denominationRecordFromKeys(baseUrl, d),
    ),
    protocolVersion: exchangeKeysJson.version,
    signingKeys: exchangeKeysJson.signkeys,
    reserveClosingDelay: exchangeKeysJson.reserve_closing_delay,
    expiry: getExpiryTimestamp(resp, {
      minDuration: durationFromSpec({ hours: 1 }),
    }),
    recoup: exchangeKeysJson.recoup ?? [],
  };
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
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord;
}> {
  logger.trace(`updating exchange info for ${baseUrl}`);
  const now = getTimestampNow();
  baseUrl = canonicalizeBaseUrl(baseUrl);

  const r = await provideExchangeRecord(ws, baseUrl, now);

  logger.info("updating exchange /keys info");

  const timeout = getExchangeRequestTimeout(r);

  const keysInfo = await downloadKeysInfo(baseUrl, ws.http, timeout);

  const wireInfoDownload = await downloadExchangeWithWireInfo(
    baseUrl,
    ws.http,
    timeout,
  );

  const wireInfo = await validateWireInfo(
    wireInfoDownload,
    keysInfo.masterPublicKey,
    ws.cryptoApi,
  );

  const tosDownload = await downloadExchangeWithTermsOfService(
    baseUrl,
    ws.http,
    timeout,
  );

  let recoupGroupId: string | undefined = undefined;

  const updated = await ws.db.runWithWriteTransaction(
    [
      Stores.exchanges,
      Stores.exchangeDetails,
      Stores.denominations,
      Stores.recoupGroups,
      Stores.coins,
    ],
    async (tx) => {
      const r = await tx.get(Stores.exchanges, baseUrl);
      if (!r) {
        logger.warn(`exchange ${baseUrl} no longer present`);
        return;
      }
      let details = await getExchangeDetails(tx, r.baseUrl);
      if (details) {
        // FIXME: We need to do some consistency checks!
      }
      // FIXME: validate signing keys and merge with old set
      details = {
        auditors: keysInfo.auditors,
        currency: keysInfo.currency,
        lastUpdateTime: now,
        masterPublicKey: keysInfo.masterPublicKey,
        protocolVersion: keysInfo.protocolVersion,
        signingKeys: keysInfo.signingKeys,
        nextUpdateTime: keysInfo.expiry,
        reserveClosingDelay: keysInfo.reserveClosingDelay,
        exchangeBaseUrl: r.baseUrl,
        wireInfo,
        termsOfServiceText: tosDownload.tosText,
        termsOfServiceAcceptedEtag: undefined,
        termsOfServiceLastEtag: tosDownload.tosEtag,
      };
      r.updateStatus = ExchangeUpdateStatus.FetchWire;
      // FIXME: only update if pointer got updated
      r.lastError = undefined;
      r.retryInfo = initRetryInfo(false);
      // New denominations might be available.
      r.nextRefreshCheck = undefined;
      r.detailsPointer = {
        currency: details.currency,
        masterPublicKey: details.masterPublicKey,
        // FIXME: only change if pointer really changed
        updateClock: getTimestampNow(),
      };
      await tx.put(Stores.exchanges, r);
      await tx.put(Stores.exchangeDetails, details);

      for (const currentDenom of keysInfo.currentDenominations) {
        const oldDenom = await tx.get(Stores.denominations, [
          baseUrl,
          currentDenom.denomPubHash,
        ]);
        if (oldDenom) {
          // FIXME: Do consistency check
        } else {
          await tx.put(Stores.denominations, currentDenom);
        }
      }

      // Handle recoup
      const recoupDenomList = keysInfo.recoup;
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
        recoupGroupId = await createRecoupGroup(ws, tx, newlyRevokedCoinPubs);
      }
      return {
        exchange: r,
        exchangeDetails: details,
      };
    },
  );

  if (recoupGroupId) {
    // Asynchronously start recoup.  This doesn't need to finish
    // for the exchange update to be considered finished.
    processRecoupGroup(ws, recoupGroupId).catch((e) => {
      logger.error("error while recouping coins:", e);
    });
  }

  if (!updated) {
    throw Error("something went wrong with updating the exchange");
  }

  return {
    exchange: updated.exchange,
    exchangeDetails: updated.exchangeDetails,
  };
}

export async function getExchangePaytoUri(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  supportedTargetTypes: string[],
): Promise<string> {
  // We do the update here, since the exchange might not even exist
  // yet in our database.
  const details = await ws.db.runWithReadTransaction(
    [Stores.exchangeDetails, Stores.exchanges],
    async (tx) => {
      return getExchangeDetails(tx, exchangeBaseUrl);
    },
  );
  const accounts = details?.wireInfo.accounts ?? [];
  for (const account of accounts) {
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
