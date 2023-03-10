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
  AbsoluteTime,
  Amounts,
  CancellationToken,
  canonicalizeBaseUrl,
  codecForExchangeKeysJson,
  codecForExchangeWireJson,
  DenominationPubKey,
  Duration,
  durationFromSpec,
  encodeCrock,
  ExchangeAuditor,
  ExchangeDenomination,
  ExchangeGlobalFees,
  ExchangeSignKeyJson,
  ExchangeWireJson,
  GlobalFees,
  hashDenomPub,
  j2s,
  LibtoolVersion,
  Logger,
  NotificationType,
  parsePaytoUri,
  Recoup,
  TalerErrorCode,
  TalerProtocolDuration,
  TalerProtocolTimestamp,
  URL,
  WireFee,
  WireFeeMap,
  WireInfo,
} from "@gnu-taler/taler-util";
import {
  DenominationRecord,
  DenominationVerificationStatus,
  ExchangeDetailsRecord,
  ExchangeRecord,
  WalletStoresV1,
} from "../db.js";
import { TalerError } from "../errors.js";
import { InternalWalletState, TrustInfo } from "../internal-wallet-state.js";
import {
  getExpiry,
  HttpRequestLibrary,
  readSuccessResponseJsonOrThrow,
  readSuccessResponseTextOrThrow,
} from "../util/http.js";
import { checkDbInvariant } from "../util/invariants.js";
import {
  DbAccess,
  GetReadOnlyAccess,
  GetReadWriteAccess,
} from "../util/query.js";
import {
  OperationAttemptResult,
  OperationAttemptResultType,
  RetryTags,
  unwrapOperationHandlerResultOrThrow,
} from "../util/retries.js";
import { WALLET_EXCHANGE_PROTOCOL_VERSION } from "../versions.js";
import { runOperationWithErrorReporting } from "./common.js";
import { isWithdrawableDenom } from "./withdraw.js";

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
  const value = Amounts.parseOrThrow(denomIn.value);
  const d: DenominationRecord = {
    denomPub,
    denomPubHash,
    exchangeBaseUrl,
    exchangeMasterPub,
    fees: {
      feeDeposit: Amounts.stringify(denomIn.fee_deposit),
      feeRefresh: Amounts.stringify(denomIn.fee_refresh),
      feeRefund: Amounts.stringify(denomIn.fee_refund),
      feeWithdraw: Amounts.stringify(denomIn.fee_withdraw),
    },
    isOffered: true,
    isRevoked: false,
    masterSig: denomIn.master_sig,
    stampExpireDeposit: denomIn.stamp_expire_deposit,
    stampExpireLegal: denomIn.stamp_expire_legal,
    stampExpireWithdraw: denomIn.stamp_expire_withdraw,
    stampStart: denomIn.stamp_start,
    verificationStatus: DenominationVerificationStatus.Unverified,
    amountFrac: value.fraction,
    amountVal: value.value,
    currency: value.currency,
    listIssueDate,
  };
  return d;
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
  logger.info(`downloading exchange tos (type ${contentType})`);
  const reqUrl = new URL("terms", exchangeBaseUrl);
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
  return await tx.exchangeDetails.indexes.byPointer.get([
    r.baseUrl,
    currency,
    masterPublicKey,
  ]);
}

getExchangeDetails.makeContext = (db: DbAccess<typeof WalletStoresV1>) =>
  db.mktx((x) => [x.exchanges, x.exchangeDetails]);

/**
 * Update the database based on the download of the terms of service.
 */
export async function updateExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  tos: ExchangeTosDownloadResult,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.exchanges, x.exchangeTos, x.exchangeDetails])
    .runReadWrite(async (tx) => {
      const d = await getExchangeDetails(tx, exchangeBaseUrl);
      let tosRecord = await tx.exchangeTos.get([exchangeBaseUrl, tos.tosEtag]);
      if (!tosRecord) {
        tosRecord = {
          etag: tos.tosEtag,
          exchangeBaseUrl,
          termsOfServiceContentType: tos.tosContentType,
          termsOfServiceText: tos.tosText,
        };
        await tx.exchangeTos.put(tosRecord);
      }
      if (d) {
        d.tosCurrentEtag = tos.tosEtag;
        await tx.exchangeDetails.put(d);
      }
    });
}

/**
 * Mark a ToS version as accepted by the user.
 *
 * @param etag version of the ToS to accept, or current ToS version of not given
 */
export async function acceptExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  etag: string | undefined,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.exchanges, x.exchangeDetails])
    .runReadWrite(async (tx) => {
      const d = await getExchangeDetails(tx, exchangeBaseUrl);
      if (d) {
        d.tosAccepted = {
          etag: etag || d.tosCurrentEtag,
          timestamp: TalerProtocolTimestamp.now(),
        };
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
      const { valid: v } = await ws.cryptoApi.isValidWireAccount({
        masterPub: masterPublicKey,
        paytoUri: a.payto_uri,
        sig: a.master_sig,
        versionCurrent,
      });
      isValid = v;
    }
    if (!isValid) {
      throw Error("exchange acct signature invalid");
    }
  }
  const feesForType: WireFeeMap = {};
  for (const wireMethod of Object.keys(wireInfo.fees)) {
    const feeList: WireFee[] = [];
    for (const x of wireInfo.fees[wireMethod]) {
      const startStamp = x.start_date;
      const endStamp = x.end_date;
      const fee: WireFee = {
        closingFee: Amounts.stringify(x.closing_fee),
        endStamp,
        sig: x.sig,
        startStamp,
        wireFee: Amounts.stringify(x.wire_fee),
      };
      let isValid = false;
      if (ws.insecureTrustExchange) {
        isValid = true;
      } else {
        const { valid: v } = await ws.cryptoApi.isValidWireFee({
          masterPub: masterPublicKey,
          type: wireMethod,
          wf: fee,
        });
        isValid = v;
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

async function validateGlobalFees(
  ws: InternalWalletState,
  fees: GlobalFees[],
  masterPub: string,
): Promise<ExchangeGlobalFees[]> {
  const egf: ExchangeGlobalFees[] = [];
  for (const gf of fees) {
    logger.trace("validating exchange global fees");
    let isValid = false;
    if (ws.insecureTrustExchange) {
      isValid = true;
    } else {
      const { valid: v } = await ws.cryptoApi.isValidGlobalFees({
        masterPub,
        gf,
      });
      isValid = v;
    }

    if (!isValid) {
      throw Error("exchange global fees signature invalid: " + gf.master_sig);
    }
    egf.push({
      accountFee: Amounts.stringify(gf.account_fee),
      historyFee: Amounts.stringify(gf.history_fee),
      purseFee: Amounts.stringify(gf.purse_fee),
      startDate: gf.start_date,
      endDate: gf.end_date,
      signature: gf.master_sig,
      historyTimeout: gf.history_expiration,
      purseLimit: gf.purse_account_limit,
      purseTimeout: gf.purse_timeout,
    });
  }

  return egf;
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

  const resp = await http.get(reqUrl.href, {
    timeout,
  });
  const wireInfo = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeWireJson(),
  );

  return wireInfo;
}

export async function provideExchangeRecordInTx(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  baseUrl: string,
  now: AbsoluteTime,
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord | undefined;
}> {
  let exchange = await tx.exchanges.get(baseUrl);
  if (!exchange) {
    const r: ExchangeRecord = {
      permanent: true,
      baseUrl: baseUrl,
      detailsPointer: undefined,
      lastUpdate: undefined,
      nextUpdate: AbsoluteTime.toTimestamp(now),
      nextRefreshCheck: AbsoluteTime.toTimestamp(now),
      lastKeysEtag: undefined,
      lastWireEtag: undefined,
    };
    await tx.exchanges.put(r);
    exchange = r;
  }
  const exchangeDetails = await getExchangeDetails(tx, baseUrl);
  return { exchange, exchangeDetails };
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
  globalFees: GlobalFees[];
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

  const resp = await http.get(keysUrl.href, {
    timeout,
  });
  const exchangeKeysJsonUnchecked = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeKeysJson(),
  );

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
    globalFees: exchangeKeysJsonUnchecked.global_fees,
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
  if (tosFound !== undefined) {
    return tosFound;
  }
  // If none of the specified format was found try text/plain
  return await downloadExchangeWithTermsOfService(
    baseUrl,
    ws.http,
    timeout,
    "text/plain",
  );
}

export async function updateExchangeFromUrl(
  ws: InternalWalletState,
  baseUrl: string,
  options: {
    forceNow?: boolean;
    cancellationToken?: CancellationToken;
  } = {},
): Promise<{
  exchange: ExchangeRecord;
  exchangeDetails: ExchangeDetailsRecord;
}> {
  const canonUrl = canonicalizeBaseUrl(baseUrl);
  return unwrapOperationHandlerResultOrThrow(
    await runOperationWithErrorReporting(
      ws,
      RetryTags.forExchangeUpdateFromUrl(canonUrl),
      () => updateExchangeFromUrlHandler(ws, canonUrl, options),
    ),
  );
}

/**
 * Update or add exchange DB entry by fetching the /keys and /wire information.
 * Optionally link the reserve entry to the new or existing
 * exchange entry in then DB.
 */
export async function updateExchangeFromUrlHandler(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  options: {
    forceNow?: boolean;
    cancellationToken?: CancellationToken;
  } = {},
): Promise<
  OperationAttemptResult<{
    exchange: ExchangeRecord;
    exchangeDetails: ExchangeDetailsRecord;
  }>
> {
  const forceNow = options.forceNow ?? false;
  logger.info(
    `updating exchange info for ${exchangeBaseUrl}, forced: ${forceNow}`,
  );

  const now = AbsoluteTime.now();
  exchangeBaseUrl = canonicalizeBaseUrl(exchangeBaseUrl);
  let isNewExchange = true;
  const { exchange, exchangeDetails } = await ws.db
    .mktx((x) => [x.exchanges, x.exchangeDetails])
    .runReadWrite(async (tx) => {
      let oldExch = await tx.exchanges.get(exchangeBaseUrl);
      if (oldExch) {
        isNewExchange = false;
      }
      return provideExchangeRecordInTx(ws, tx, exchangeBaseUrl, now);
    });

  if (
    !forceNow &&
    exchangeDetails !== undefined &&
    !AbsoluteTime.isExpired(AbsoluteTime.fromTimestamp(exchange.nextUpdate))
  ) {
    logger.info("using existing exchange info");
    return {
      type: OperationAttemptResultType.Finished,
      result: { exchange, exchangeDetails },
    };
  }

  logger.info("updating exchange /keys info");

  const timeout = getExchangeRequestTimeout();

  const keysInfo = await downloadExchangeKeysInfo(
    exchangeBaseUrl,
    ws.http,
    timeout,
  );

  logger.info("updating exchange /wire info");
  const wireInfoDownload = await downloadExchangeWireInfo(
    exchangeBaseUrl,
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

  const globalFees = await validateGlobalFees(
    ws,
    keysInfo.globalFees,
    keysInfo.masterPublicKey,
  );

  logger.info("finished validating exchange /wire info");

  // We download the text/plain version here,
  // because that one needs to exist, and we
  // will get the current etag from the response.
  const tosDownload = await downloadTosFromAcceptedFormat(
    ws,
    exchangeBaseUrl,
    timeout,
    ["text/plain"],
  );

  let recoupGroupId: string | undefined;

  logger.trace("updating exchange info in database");

  let detailsPointerChanged = false;

  let ageMask = 0;
  for (const x of keysInfo.currentDenominations) {
    if (isWithdrawableDenom(x) && x.denomPub.age_mask != 0) {
      ageMask = x.denomPub.age_mask;
      break;
    }
  }

  const updated = await ws.db
    .mktx((x) => [
      x.exchanges,
      x.exchangeTos,
      x.exchangeDetails,
      x.exchangeSignkeys,
      x.denominations,
      x.coins,
      x.refreshGroups,
      x.recoupGroups,
    ])
    .runReadWrite(async (tx) => {
      const r = await tx.exchanges.get(exchangeBaseUrl);
      if (!r) {
        logger.warn(`exchange ${exchangeBaseUrl} no longer present`);
        return;
      }
      const existingDetails = await getExchangeDetails(tx, r.baseUrl);
      if (!existingDetails) {
        detailsPointerChanged = true;
      }
      if (existingDetails) {
        if (existingDetails.masterPublicKey !== keysInfo.masterPublicKey) {
          detailsPointerChanged = true;
        }
        if (existingDetails.currency !== keysInfo.currency) {
          detailsPointerChanged = true;
        }
        // FIXME: We need to do some consistency checks!
      }
      const existingTosAccepted = existingDetails?.tosAccepted;
      const newDetails: ExchangeDetailsRecord = {
        auditors: keysInfo.auditors,
        currency: keysInfo.currency,
        masterPublicKey: keysInfo.masterPublicKey,
        protocolVersionRange: keysInfo.protocolVersion,
        reserveClosingDelay: keysInfo.reserveClosingDelay,
        globalFees,
        exchangeBaseUrl: r.baseUrl,
        wireInfo,
        tosCurrentEtag: tosDownload.tosEtag,
        tosAccepted: existingTosAccepted,
        ageMask,
      };
      if (existingDetails?.rowId) {
        newDetails.rowId = existingDetails.rowId;
      }
      r.lastUpdate = TalerProtocolTimestamp.now();
      r.nextUpdate = keysInfo.expiry;
      // New denominations might be available.
      r.nextRefreshCheck = TalerProtocolTimestamp.now();
      if (detailsPointerChanged) {
        r.detailsPointer = {
          currency: newDetails.currency,
          masterPublicKey: newDetails.masterPublicKey,
          updateClock: TalerProtocolTimestamp.now(),
        };
      }
      await tx.exchanges.put(r);
      const drRowId = await tx.exchangeDetails.put(newDetails);
      checkDbInvariant(typeof drRowId.key === "number");

      let tosRecord = await tx.exchangeTos.get([
        exchangeBaseUrl,
        tosDownload.tosEtag,
      ]);

      if (!tosRecord || tosRecord.etag !== existingTosAccepted?.etag) {
        tosRecord = {
          etag: tosDownload.tosEtag,
          exchangeBaseUrl,
          termsOfServiceContentType: tosDownload.tosContentType,
          termsOfServiceText: tosDownload.tosText,
        };
        await tx.exchangeTos.put(tosRecord);
      }

      for (const sk of keysInfo.signingKeys) {
        // FIXME: validate signing keys before inserting them
        await tx.exchangeSignKeys.put({
          exchangeDetailsRowId: drRowId.key,
          masterSig: sk.master_sig,
          signkeyPub: sk.key,
          stampEnd: sk.stamp_end,
          stampExpire: sk.stamp_expire,
          stampStart: sk.stamp_start,
        });
      }

      logger.info("updating denominations in database");
      const currentDenomSet = new Set<string>(
        keysInfo.currentDenominations.map((x) => x.denomPubHash),
      );
      for (const currentDenom of keysInfo.currentDenominations) {
        const oldDenom = await tx.denominations.get([
          exchangeBaseUrl,
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
          exchange.baseUrl,
          newlyRevokedCoinPubs,
        );
      }

      return {
        exchange: r,
        exchangeDetails: newDetails,
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

  if (isNewExchange) {
    ws.notify({
      type: NotificationType.ExchangeAdded,
    });
  }

  return {
    type: OperationAttemptResultType.Finished,
    result: {
      exchange: updated.exchange,
      exchangeDetails: updated.exchangeDetails,
    },
  };
}

/**
 * Find a payto:// URI of the exchange that is of one
 * of the given target types.
 *
 * Throws if no matching account was found.
 */
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
  throw Error(
    `no matching account found at exchange ${exchangeBaseUrl} for wire types ${j2s(
      supportedTargetTypes,
    )}`,
  );
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
    .mktx((x) => [
      x.exchanges,
      x.exchangeDetails,
      x.exchangeTrust,
      x.auditorTrust,
    ])
    .runReadOnly(async (tx) => {
      const exchangeDetails = await getExchangeDetails(
        tx,
        exchangeInfo.baseUrl,
      );

      if (!exchangeDetails) {
        throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
      }
      const exchangeTrustRecord =
        await tx.exchangeTrust.indexes.byExchangeMasterPub.get(
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
