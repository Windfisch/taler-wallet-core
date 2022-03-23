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
  ExchangeAuditor,
  canonicalizeBaseUrl,
  codecForExchangeKeysJson,
  codecForExchangeWireJson,
  ExchangeDenomination,
  Duration,
  durationFromSpec,
  ExchangeSignKeyJson,
  ExchangeWireJson,
  Logger,
  NotificationType,
  parsePaytoUri,
  Recoup,
  TalerErrorCode,
  URL,
  TalerErrorDetail,
  AbsoluteTime,
  hashDenomPub,
  LibtoolVersion,
  codecForAny,
  DenominationPubKey,
  DenomKeyType,
  ExchangeKeysJson,
  TalerProtocolTimestamp,
  TalerProtocolDuration,
} from "@gnu-taler/taler-util";
import { decodeCrock, encodeCrock, hash } from "@gnu-taler/taler-util";
import { CryptoApi } from "../crypto/workers/cryptoApi.js";
import {
  DenominationRecord,
  DenominationVerificationStatus,
  ExchangeDetailsRecord,
  ExchangeRecord,
  WalletStoresV1,
  WireFee,
  WireInfo,
} from "../db.js";
import {
  getExpiry,
  HttpRequestLibrary,
  readSuccessResponseJsonOrThrow,
  readSuccessResponseTextOrThrow,
} from "../util/http.js";
import { DbAccess, GetReadOnlyAccess } from "../util/query.js";
import { initRetryInfo, updateRetryInfoTimeout } from "../util/retries.js";
import { TalerError } from "../errors.js";
import { InternalWalletState, TrustInfo } from "../internal-wallet-state.js";
import {
  WALLET_CACHE_BREAKER_CLIENT_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
} from "../versions.js";
import { guardOperationException } from "./common.js";

const logger = new Logger("exchanges.ts");

function denominationRecordFromKeys(
  exchangeBaseUrl: string,
  exchangeMasterPub: string,
  listIssueDate: TalerProtocolTimestamp,
  denomIn: ExchangeDenomination,
): DenominationRecord {
  let denomPub: DenominationPubKey;
  denomPub = denomIn.denom_pub;
  const denomPubHash = encodeCrock(hashDenomPub(denomPub));
  const d: DenominationRecord = {
    denomPub,
    denomPubHash,
    exchangeBaseUrl,
    exchangeMasterPub,
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
    verificationStatus: DenominationVerificationStatus.Unverified,
    value: Amounts.parseOrThrow(denomIn.value),
    listIssueDate,
  };
  return d;
}

async function handleExchangeUpdateError(
  ws: InternalWalletState,
  baseUrl: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({ exchanges: x.exchanges }))
    .runReadWrite(async (tx) => {
      const exchange = await tx.exchanges.get(baseUrl);
      if (!exchange) {
        return;
      }
      exchange.retryInfo.retryCounter++;
      updateRetryInfoTimeout(exchange.retryInfo);
      exchange.lastError = err;
      await tx.exchanges.put(exchange);
    });
  if (err) {
    ws.notify({ type: NotificationType.ExchangeOperationError, error: err });
  }
}

export function getExchangeRequestTimeout(): Duration {
  return Duration.fromSpec({
    seconds: 5,
  });
}

export interface ExchangeTosDownloadResult {
  tosText: string;
  tosEtag: string;
  tosContentType: string;
}

export async function downloadExchangeWithTermsOfService(
  exchangeBaseUrl: string,
  http: HttpRequestLibrary,
  timeout: Duration,
  contentType: string,
): Promise<ExchangeTosDownloadResult> {
  const reqUrl = new URL("terms", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);
  const headers = {
    Accept: contentType,
  };

  const resp = await http.get(reqUrl.href, {
    headers,
    timeout,
  });
  const tosText = await readSuccessResponseTextOrThrow(resp);
  const tosEtag = resp.headers.get("etag") || "unknown";
  const tosContentType = resp.headers.get("content-type") || "text/plain";

  return { tosText, tosEtag, tosContentType };
}

/**
 * Get exchange details from the database.
 */
export async function getExchangeDetails(
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  exchangeBaseUrl: string,
): Promise<ExchangeDetailsRecord | undefined> {
  const r = await tx.exchanges.get(exchangeBaseUrl);
  if (!r) {
    return;
  }
  const dp = r.detailsPointer;
  if (!dp) {
    return;
  }
  const { currency, masterPublicKey } = dp;
  return await tx.exchangeDetails.get([r.baseUrl, currency, masterPublicKey]);
}

getExchangeDetails.makeContext = (db: DbAccess<typeof WalletStoresV1>) =>
  db.mktx((x) => ({
    exchanges: x.exchanges,
    exchangeDetails: x.exchangeDetails,
  }));

export async function updateExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  tos: ExchangeTosDownloadResult,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadWrite(async (tx) => {
      const d = await getExchangeDetails(tx, exchangeBaseUrl);
      if (d) {
        d.termsOfServiceText = tos.tosText;
        d.termsOfServiceContentType = tos.tosContentType;
        d.termsOfServiceLastEtag = tos.tosEtag;
        await tx.exchangeDetails.put(d);
      }
    });
}

export async function acceptExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  etag: string | undefined,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadWrite(async (tx) => {
      const d = await getExchangeDetails(tx, exchangeBaseUrl);
      if (d) {
        d.termsOfServiceAcceptedEtag = etag;
        await tx.exchangeDetails.put(d);
      }
    });
}

async function validateWireInfo(
  ws: InternalWalletState,
  versionCurrent: number,
  wireInfo: ExchangeWireJson,
  masterPublicKey: string,
): Promise<WireInfo> {
  for (const a of wireInfo.accounts) {
    logger.trace("validating exchange acct");
    let isValid = false;
    if (ws.insecureTrustExchange) {
      isValid = true;
    } else {
      isValid = await ws.cryptoApi.isValidWireAccount(
        versionCurrent,
        a.payto_uri,
        a.master_sig,
        masterPublicKey,
      );
    }
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
        wadFee: Amounts.parseOrThrow(x.wad_fee),
      };
      let isValid = false;
      if (ws.insecureTrustExchange) {
        isValid = true;
      } else {
        isValid = await ws.cryptoApi.isValidWireFee(
          wireMethod,
          fee,
          masterPublicKey,
        );
      }
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

export interface ExchangeInfo {
  wire: ExchangeWireJson;
  keys: ExchangeKeysDownloadResult;
}

export async function downloadExchangeInfo(
  exchangeBaseUrl: string,
  http: HttpRequestLibrary,
): Promise<ExchangeInfo> {
  const wireInfo = await downloadExchangeWireInfo(
    exchangeBaseUrl,
    http,
    Duration.getForever(),
  );
  const keysInfo = await downloadExchangeKeysInfo(
    exchangeBaseUrl,
    http,
    Duration.getForever(),
  );
  return {
    keys: keysInfo,
    wire: wireInfo,
  };
}

/**
 * Fetch wire information for an exchange.
 *
 * @param exchangeBaseUrl Exchange base URL, assumed to be already normalized.
 */
async function downloadExchangeWireInfo(
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
  acceptedFormat?: string[],
  forceNow = false,
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord;
}> {
  const onOpErr = (e: TalerErrorDetail): Promise<void> =>
    handleExchangeUpdateError(ws, baseUrl, e);
  return await guardOperationException(
    () => updateExchangeFromUrlImpl(ws, baseUrl, acceptedFormat, forceNow),
    onOpErr,
  );
}

async function provideExchangeRecord(
  ws: InternalWalletState,
  baseUrl: string,
  now: AbsoluteTime,
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord | undefined;
}> {
  return await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadWrite(async (tx) => {
      let exchange = await tx.exchanges.get(baseUrl);
      if (!exchange) {
        const r: ExchangeRecord = {
          permanent: true,
          baseUrl: baseUrl,
          retryInfo: initRetryInfo(),
          detailsPointer: undefined,
          lastUpdate: undefined,
          nextUpdate: AbsoluteTime.toTimestamp(now),
          nextRefreshCheck: AbsoluteTime.toTimestamp(now),
        };
        await tx.exchanges.put(r);
        exchange = r;
      }
      const exchangeDetails = await getExchangeDetails(tx, baseUrl);
      return { exchange, exchangeDetails };
    });
}

interface ExchangeKeysDownloadResult {
  masterPublicKey: string;
  currency: string;
  auditors: ExchangeAuditor[];
  currentDenominations: DenominationRecord[];
  protocolVersion: string;
  signingKeys: ExchangeSignKeyJson[];
  reserveClosingDelay: TalerProtocolDuration;
  expiry: TalerProtocolTimestamp;
  recoup: Recoup[];
  listIssueDate: TalerProtocolTimestamp;
}

/**
 * Download and validate an exchange's /keys data.
 */
async function downloadExchangeKeysInfo(
  baseUrl: string,
  http: HttpRequestLibrary,
  timeout: Duration,
): Promise<ExchangeKeysDownloadResult> {
  const keysUrl = new URL("keys", baseUrl);
  keysUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  const resp = await http.get(keysUrl.href, {
    timeout,
  });
  const exchangeKeysJsonUnchecked = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeKeysJson(),
  );

  logger.info("received /keys response");

  if (exchangeKeysJsonUnchecked.denoms.length === 0) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_EXCHANGE_DENOMINATIONS_INSUFFICIENT,
      {
        exchangeBaseUrl: baseUrl,
      },
      "exchange doesn't offer any denominations",
    );
  }

  const protocolVersion = exchangeKeysJsonUnchecked.version;

  const versionRes = LibtoolVersion.compare(
    WALLET_EXCHANGE_PROTOCOL_VERSION,
    protocolVersion,
  );
  if (versionRes?.compatible != true) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_EXCHANGE_PROTOCOL_VERSION_INCOMPATIBLE,
      {
        exchangeProtocolVersion: protocolVersion,
        walletProtocolVersion: WALLET_EXCHANGE_PROTOCOL_VERSION,
      },
      "exchange protocol version not compatible with wallet",
    );
  }

  const currency = Amounts.parseOrThrow(
    exchangeKeysJsonUnchecked.denoms[0].value,
  ).currency.toUpperCase();

  return {
    masterPublicKey: exchangeKeysJsonUnchecked.master_public_key,
    currency,
    auditors: exchangeKeysJsonUnchecked.auditors,
    currentDenominations: exchangeKeysJsonUnchecked.denoms.map((d) =>
      denominationRecordFromKeys(
        baseUrl,
        exchangeKeysJsonUnchecked.master_public_key,
        exchangeKeysJsonUnchecked.list_issue_date,
        d,
      ),
    ),
    protocolVersion: exchangeKeysJsonUnchecked.version,
    signingKeys: exchangeKeysJsonUnchecked.signkeys,
    reserveClosingDelay: exchangeKeysJsonUnchecked.reserve_closing_delay,
    expiry: AbsoluteTime.toTimestamp(
      getExpiry(resp, {
        minDuration: durationFromSpec({ hours: 1 }),
      }),
    ),
    recoup: exchangeKeysJsonUnchecked.recoup ?? [],
    listIssueDate: exchangeKeysJsonUnchecked.list_issue_date,
  };
}

export async function downloadTosFromAcceptedFormat(
  ws: InternalWalletState,
  baseUrl: string,
  timeout: Duration,
  acceptedFormat?: string[],
): Promise<ExchangeTosDownloadResult> {
  let tosFound: ExchangeTosDownloadResult | undefined;
  //Remove this when exchange supports multiple content-type in accept header
  if (acceptedFormat)
    for (const format of acceptedFormat) {
      const resp = await downloadExchangeWithTermsOfService(
        baseUrl,
        ws.http,
        timeout,
        format,
      );
      if (resp.tosContentType === format) {
        tosFound = resp;
        break;
      }
    }
  if (tosFound !== undefined) return tosFound;
  // If none of the specified format was found try text/plain
  return await downloadExchangeWithTermsOfService(
    baseUrl,
    ws.http,
    timeout,
    "text/plain",
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
  acceptedFormat?: string[],
  forceNow = false,
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord;
}> {
  logger.info(`updating exchange info for ${baseUrl}, forced: ${forceNow}`);
  const now = AbsoluteTime.now();
  baseUrl = canonicalizeBaseUrl(baseUrl);

  const { exchange, exchangeDetails } = await provideExchangeRecord(
    ws,
    baseUrl,
    now,
  );

  if (
    !forceNow &&
    exchangeDetails !== undefined &&
    !AbsoluteTime.isExpired(AbsoluteTime.fromTimestamp(exchange.nextUpdate))
  ) {
    logger.info("using existing exchange info");
    return { exchange, exchangeDetails };
  }

  logger.info("updating exchange /keys info");

  const timeout = getExchangeRequestTimeout();

  const keysInfo = await downloadExchangeKeysInfo(baseUrl, ws.http, timeout);

  logger.info("updating exchange /wire info");
  const wireInfoDownload = await downloadExchangeWireInfo(
    baseUrl,
    ws.http,
    timeout,
  );

  logger.info("validating exchange /wire info");

  const version = LibtoolVersion.parseVersion(keysInfo.protocolVersion);
  if (!version) {
    // Should have been validated earlier.
    throw Error("unexpected invalid version");
  }

  const wireInfo = await validateWireInfo(
    ws,
    version.current,
    wireInfoDownload,
    keysInfo.masterPublicKey,
  );

  logger.info("finished validating exchange /wire info");

  const tosDownload = await downloadTosFromAcceptedFormat(
    ws,
    baseUrl,
    timeout,
    acceptedFormat,
  );
  const tosHasBeenAccepted =
    exchangeDetails?.termsOfServiceAcceptedEtag === tosDownload.tosEtag;

  let recoupGroupId: string | undefined;

  logger.trace("updating exchange info in database");

  const updated = await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      denominations: x.denominations,
      coins: x.coins,
      refreshGroups: x.refreshGroups,
      recoupGroups: x.recoupGroups,
    }))
    .runReadWrite(async (tx) => {
      const r = await tx.exchanges.get(baseUrl);
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
        masterPublicKey: keysInfo.masterPublicKey,
        protocolVersion: keysInfo.protocolVersion,
        signingKeys: keysInfo.signingKeys,
        reserveClosingDelay: keysInfo.reserveClosingDelay,
        exchangeBaseUrl: r.baseUrl,
        wireInfo,
        termsOfServiceText: tosDownload.tosText,
        termsOfServiceAcceptedEtag: tosHasBeenAccepted
          ? tosDownload.tosEtag
          : undefined,
        termsOfServiceContentType: tosDownload.tosContentType,
        termsOfServiceLastEtag: tosDownload.tosEtag,
        termsOfServiceAcceptedTimestamp: TalerProtocolTimestamp.now(),
      };
      // FIXME: only update if pointer got updated
      r.lastError = undefined;
      r.retryInfo = initRetryInfo();
      r.lastUpdate = TalerProtocolTimestamp.now();
      r.nextUpdate = keysInfo.expiry;
      // New denominations might be available.
      r.nextRefreshCheck = TalerProtocolTimestamp.now();
      r.detailsPointer = {
        currency: details.currency,
        masterPublicKey: details.masterPublicKey,
        // FIXME: only change if pointer really changed
        updateClock: TalerProtocolTimestamp.now(),
        protocolVersionRange: keysInfo.protocolVersion,
      };
      await tx.exchanges.put(r);
      await tx.exchangeDetails.put(details);

      logger.info("updating denominations in database");
      const currentDenomSet = new Set<string>(
        keysInfo.currentDenominations.map((x) => x.denomPubHash),
      );
      for (const currentDenom of keysInfo.currentDenominations) {
        const oldDenom = await tx.denominations.get([
          baseUrl,
          currentDenom.denomPubHash,
        ]);
        if (oldDenom) {
          // FIXME: Do consistency check, report to auditor if necessary.
        } else {
          await tx.denominations.put(currentDenom);
        }
      }

      // Update list issue date for all denominations,
      // and mark non-offered denominations as such.
      await tx.denominations.indexes.byExchangeBaseUrl
        .iter(r.baseUrl)
        .forEachAsync(async (x) => {
          if (!currentDenomSet.has(x.denomPubHash)) {
            // FIXME: Here, an auditor report should be created, unless
            // the denomination is really legally expired.
            if (x.isOffered) {
              x.isOffered = false;
              logger.info(
                `setting denomination ${x.denomPubHash} to offered=false`,
              );
            }
          } else {
            x.listIssueDate = keysInfo.listIssueDate;
            if (!x.isOffered) {
              x.isOffered = true;
              logger.info(
                `setting denomination ${x.denomPubHash} to offered=true`,
              );
            }
          }
          await tx.denominations.put(x);
        });

      logger.trace("done updating denominations in database");

      // Handle recoup
      const recoupDenomList = keysInfo.recoup;
      const newlyRevokedCoinPubs: string[] = [];
      logger.trace("recoup list from exchange", recoupDenomList);
      for (const recoupInfo of recoupDenomList) {
        const oldDenom = await tx.denominations.get([
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
        logger.info("revoking denom", recoupInfo.h_denom_pub);
        oldDenom.isRevoked = true;
        await tx.denominations.put(oldDenom);
        const affectedCoins = await tx.coins.indexes.byDenomPubHash
          .iter(recoupInfo.h_denom_pub)
          .toArray();
        for (const ac of affectedCoins) {
          newlyRevokedCoinPubs.push(ac.coinPub);
        }
      }
      if (newlyRevokedCoinPubs.length != 0) {
        logger.info("recouping coins", newlyRevokedCoinPubs);
        recoupGroupId = await ws.recoupOps.createRecoupGroup(
          ws,
          tx,
          newlyRevokedCoinPubs,
        );
      }
      return {
        exchange: r,
        exchangeDetails: details,
      };
    });

  if (recoupGroupId) {
    // Asynchronously start recoup.  This doesn't need to finish
    // for the exchange update to be considered finished.
    ws.recoupOps.processRecoupGroup(ws, recoupGroupId).catch((e) => {
      logger.error("error while recouping coins:", e);
    });
  }

  if (!updated) {
    throw Error("something went wrong with updating the exchange");
  }

  logger.trace("done updating exchange info in database");

  ws.notify({
    type: NotificationType.ExchangeAdded,
  });
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
  const details = await getExchangeDetails
    .makeContext(ws.db)
    .runReadOnly(async (tx) => {
      return getExchangeDetails(tx, exchangeBaseUrl);
    });
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

/**
 * Check if and how an exchange is trusted and/or audited.
 */
export async function getExchangeTrust(
  ws: InternalWalletState,
  exchangeInfo: ExchangeRecord,
): Promise<TrustInfo> {
  let isTrusted = false;
  let isAudited = false;

  return await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      exchangesTrustStore: x.exchangeTrust,
      auditorTrust: x.auditorTrust,
    }))
    .runReadOnly(async (tx) => {
      const exchangeDetails = await getExchangeDetails(
        tx,
        exchangeInfo.baseUrl,
      );

      if (!exchangeDetails) {
        throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
      }
      const exchangeTrustRecord =
        await tx.exchangesTrustStore.indexes.byExchangeMasterPub.get(
          exchangeDetails.masterPublicKey,
        );
      if (
        exchangeTrustRecord &&
        exchangeTrustRecord.uids.length > 0 &&
        exchangeTrustRecord.currency === exchangeDetails.currency
      ) {
        isTrusted = true;
      }

      for (const auditor of exchangeDetails.auditors) {
        const auditorTrustRecord =
          await tx.auditorTrust.indexes.byAuditorPub.get(auditor.auditor_pub);
        if (auditorTrustRecord && auditorTrustRecord.uids.length > 0) {
          isAudited = true;
          break;
        }
      }

      return { isTrusted, isAudited };
    });
}
