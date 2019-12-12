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

import { InternalWalletState } from "./state";
import { WALLET_CACHE_BREAKER_CLIENT_VERSION } from "../wallet";
import { KeysJson, Denomination, ExchangeWireJson } from "../types/talerTypes";
import { getTimestampNow, OperationError } from "../types/walletTypes";
import {
  ExchangeRecord,
  ExchangeUpdateStatus,
  Stores,
  DenominationRecord,
  DenominationStatus,
  WireFee,
} from "../types/dbTypes";
import {
  canonicalizeBaseUrl,
  extractTalerStamp,
  extractTalerStampOrThrow,
} from "../util/helpers";
import {
  oneShotGet,
  oneShotPut,
  runWithWriteTransaction,
  oneShotMutate,
} from "../util/query";
import * as Amounts from "../util/amounts";
import { parsePaytoUri } from "../util/payto";
import {
  OperationFailedAndReportedError,
  guardOperationException,
} from "./errors";

async function denominationRecordFromKeys(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  denomIn: Denomination,
): Promise<DenominationRecord> {
  const denomPubHash = await ws.cryptoApi.hashDenomPub(denomIn.denom_pub);
  const d: DenominationRecord = {
    denomPub: denomIn.denom_pub,
    denomPubHash,
    exchangeBaseUrl,
    feeDeposit: Amounts.parseOrThrow(denomIn.fee_deposit),
    feeRefresh: Amounts.parseOrThrow(denomIn.fee_refresh),
    feeRefund: Amounts.parseOrThrow(denomIn.fee_refund),
    feeWithdraw: Amounts.parseOrThrow(denomIn.fee_withdraw),
    isOffered: true,
    masterSig: denomIn.master_sig,
    stampExpireDeposit: extractTalerStampOrThrow(denomIn.stamp_expire_deposit),
    stampExpireLegal: extractTalerStampOrThrow(denomIn.stamp_expire_legal),
    stampExpireWithdraw: extractTalerStampOrThrow(
      denomIn.stamp_expire_withdraw,
    ),
    stampStart: extractTalerStampOrThrow(denomIn.stamp_start),
    status: DenominationStatus.Unverified,
    value: Amounts.parseOrThrow(denomIn.value),
  };
  return d;
}

async function setExchangeError(
  ws: InternalWalletState,
  baseUrl: string,
  err: OperationError,
): Promise<void> {
  const mut = (exchange: ExchangeRecord) => {
    exchange.lastError = err;
    return exchange;
  };
  await oneShotMutate(ws.db, Stores.exchanges, baseUrl, mut);
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
  const existingExchangeRecord = await oneShotGet(
    ws.db,
    Stores.exchanges,
    baseUrl,
  );

  if (existingExchangeRecord?.updateStatus != ExchangeUpdateStatus.FETCH_KEYS) {
    return;
  }
  const keysUrl = new URL("keys", baseUrl);
  keysUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  let keysResp;
  try {
    const r = await ws.http.get(keysUrl.href);
    if (r.status !== 200) {
      throw Error(`unexpected status for keys: ${r.status}`);
    }
    keysResp = await r.json();
  } catch (e) {
    const m = `Fetching keys failed: ${e.message}`;
    await setExchangeError(ws, baseUrl, {
      type: "network",
      details: {
        requestUrl: e.config?.url,
      },
      message: m,
    });
    throw new OperationFailedAndReportedError(m);
  }
  let exchangeKeysJson: KeysJson;
  try {
    exchangeKeysJson = KeysJson.checked(keysResp);
  } catch (e) {
    const m = `Parsing /keys response failed: ${e.message}`;
    await setExchangeError(ws, baseUrl, {
      type: "protocol-violation",
      details: {},
      message: m,
    });
    throw new OperationFailedAndReportedError(m);
  }

  const lastUpdateTimestamp = extractTalerStamp(
    exchangeKeysJson.list_issue_date,
  );
  if (!lastUpdateTimestamp) {
    const m = `Parsing /keys response failed: invalid list_issue_date.`;
    await setExchangeError(ws, baseUrl, {
      type: "protocol-violation",
      details: {},
      message: m,
    });
    throw new OperationFailedAndReportedError(m);
  }

  if (exchangeKeysJson.denoms.length === 0) {
    const m = "exchange doesn't offer any denominations";
    await setExchangeError(ws, baseUrl, {
      type: "protocol-violation",
      details: {},
      message: m,
    });
    throw new OperationFailedAndReportedError(m);
  }

  const protocolVersion = exchangeKeysJson.version;
  if (!protocolVersion) {
    const m = "outdate exchange, no version in /keys response";
    await setExchangeError(ws, baseUrl, {
      type: "protocol-violation",
      details: {},
      message: m,
    });
    throw new OperationFailedAndReportedError(m);
  }

  const currency = Amounts.parseOrThrow(exchangeKeysJson.denoms[0].value)
    .currency;

  const newDenominations = await Promise.all(
    exchangeKeysJson.denoms.map(d =>
      denominationRecordFromKeys(ws, baseUrl, d),
    ),
  );

  await runWithWriteTransaction(
    ws.db,
    [Stores.exchanges, Stores.denominations],
    async tx => {
      const r = await tx.get(Stores.exchanges, baseUrl);
      if (!r) {
        console.warn(`exchange ${baseUrl} no longer present`);
        return;
      }
      if (r.details) {
        // FIXME: We need to do some consistency checks!
      }
      r.details = {
        auditors: exchangeKeysJson.auditors,
        currency: currency,
        lastUpdateTime: lastUpdateTimestamp,
        masterPublicKey: exchangeKeysJson.master_public_key,
        protocolVersion: protocolVersion,
      };
      r.updateStatus = ExchangeUpdateStatus.FETCH_WIRE;
      r.lastError = undefined;
      await tx.put(Stores.exchanges, r);

      for (const newDenom of newDenominations) {
        const oldDenom = await tx.get(Stores.denominations, [
          baseUrl,
          newDenom.denomPub,
        ]);
        if (oldDenom) {
          // FIXME: Do consistency check
        } else {
          await tx.put(Stores.denominations, newDenom);
        }
      }
    },
  );
}

async function updateExchangeWithTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
) {
  const exchange = await oneShotGet(ws.db, Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    return;
  }
  if (exchange.updateStatus != ExchangeUpdateStatus.FETCH_TERMS) {
    return;
  }
  const reqUrl = new URL("terms", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);
  const headers = {
    Accept: "text/plain",
  };

  const resp = await ws.http.get(reqUrl.href, { headers });
  if (resp.status !== 200) {
    throw Error(`/terms response has unexpected status code (${resp.status})`);
  }

  const tosText = await resp.text();
  const tosEtag = resp.headers.get("etag") || undefined;

  await runWithWriteTransaction(ws.db, [Stores.exchanges], async tx => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    if (r.updateStatus != ExchangeUpdateStatus.FETCH_TERMS) {
      return;
    }
    r.termsOfServiceText = tosText;
    r.termsOfServiceLastEtag = tosEtag;
    r.updateStatus = ExchangeUpdateStatus.FINISHED;
    await tx.put(Stores.exchanges, r);
  });
}

export async function acceptExchangeTermsOfService(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  etag: string | undefined,
) {
  await runWithWriteTransaction(ws.db, [Stores.exchanges], async tx => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    r.termsOfServiceAcceptedEtag = etag;
    r.termsOfServiceAcceptedTimestamp = getTimestampNow();
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
) {
  const exchange = await oneShotGet(ws.db, Stores.exchanges, exchangeBaseUrl);
  if (!exchange) {
    return;
  }
  if (exchange.updateStatus != ExchangeUpdateStatus.FETCH_WIRE) {
    return;
  }
  const details = exchange.details;
  if (!details) {
    throw Error("invalid exchange state");
  }
  const reqUrl = new URL("wire", exchangeBaseUrl);
  reqUrl.searchParams.set("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);

  const resp = await ws.http.get(reqUrl.href);
  if (resp.status !== 200) {
    throw Error(`/wire response has unexpected status code (${resp.status})`);
  }
  const wiJson = await resp.json();
  if (!wiJson) {
    throw Error("/wire response malformed");
  }
  const wireInfo = ExchangeWireJson.checked(wiJson);
  for (const a of wireInfo.accounts) {
    console.log("validating exchange acct");
    const isValid = await ws.cryptoApi.isValidWireAccount(
      a.url,
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
      const startStamp = extractTalerStamp(x.start_date);
      if (!startStamp) {
        throw Error("wrong date format");
      }
      const endStamp = extractTalerStamp(x.end_date);
      if (!endStamp) {
        throw Error("wrong date format");
      }
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

  await runWithWriteTransaction(ws.db, [Stores.exchanges], async tx => {
    const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
    if (!r) {
      return;
    }
    if (r.updateStatus != ExchangeUpdateStatus.FETCH_WIRE) {
      return;
    }
    r.wireInfo = {
      accounts: wireInfo.accounts,
      feesForType: feesForType,
    };
    r.updateStatus = ExchangeUpdateStatus.FETCH_TERMS;
    r.lastError = undefined;
    await tx.put(Stores.exchanges, r);
  });
}

export async function updateExchangeFromUrl(
  ws: InternalWalletState,
  baseUrl: string,
  forceNow: boolean = false,
): Promise<ExchangeRecord> {
  const onOpErr = (e: OperationError) => setExchangeError(ws, baseUrl, e);
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
  forceNow: boolean = false,
): Promise<ExchangeRecord> {
  const now = getTimestampNow();
  baseUrl = canonicalizeBaseUrl(baseUrl);

  const r = await oneShotGet(ws.db, Stores.exchanges, baseUrl);
  if (!r) {
    const newExchangeRecord: ExchangeRecord = {
      baseUrl: baseUrl,
      details: undefined,
      wireInfo: undefined,
      updateStatus: ExchangeUpdateStatus.FETCH_KEYS,
      updateStarted: now,
      updateReason: "initial",
      timestampAdded: getTimestampNow(),
      termsOfServiceAcceptedEtag: undefined,
      termsOfServiceAcceptedTimestamp: undefined,
      termsOfServiceLastEtag: undefined,
      termsOfServiceText: undefined,
    };
    await oneShotPut(ws.db, Stores.exchanges, newExchangeRecord);
  } else {
    await runWithWriteTransaction(ws.db, [Stores.exchanges], async t => {
      const rec = await t.get(Stores.exchanges, baseUrl);
      if (!rec) {
        return;
      }
      if (rec.updateStatus != ExchangeUpdateStatus.FETCH_KEYS && !forceNow) {
        return;
      }
      if (rec.updateStatus != ExchangeUpdateStatus.FETCH_KEYS && forceNow) {
        rec.updateReason = "forced";
      }
      rec.updateStarted = now;
      rec.updateStatus = ExchangeUpdateStatus.FETCH_KEYS;
      rec.lastError = undefined;
      t.put(Stores.exchanges, rec);
    });
  }

  await updateExchangeWithKeys(ws, baseUrl);
  await updateExchangeWithWireInfo(ws, baseUrl);
  await updateExchangeWithTermsOfService(ws, baseUrl);

  const updatedExchange = await oneShotGet(ws.db, Stores.exchanges, baseUrl);

  if (!updatedExchange) {
    // This should practically never happen
    throw Error("exchange not found");
  }
  return updatedExchange;
}

/**
 * Check if and how an exchange is trusted and/or audited.
 */
export async function getExchangeTrust(
  ws: InternalWalletState,
  exchangeInfo: ExchangeRecord,
): Promise<{ isTrusted: boolean; isAudited: boolean }> {
  let isTrusted = false;
  let isAudited = false;
  const exchangeDetails = exchangeInfo.details;
  if (!exchangeDetails) {
    throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
  }
  const currencyRecord = await oneShotGet(
    ws.db,
    Stores.currencies,
    exchangeDetails.currency,
  );
  if (currencyRecord) {
    for (const trustedExchange of currencyRecord.exchanges) {
      if (trustedExchange.exchangePub === exchangeDetails.masterPublicKey) {
        isTrusted = true;
        break;
      }
    }
    for (const trustedAuditor of currencyRecord.auditors) {
      for (const exchangeAuditor of exchangeDetails.auditors) {
        if (trustedAuditor.auditorPub === exchangeAuditor.auditor_pub) {
          isAudited = true;
          break;
        }
      }
    }
  }
  return { isTrusted, isAudited };
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
  for (let account of exchangeWireInfo.accounts) {
    const res = parsePaytoUri(account.url);
    if (!res) {
      continue;
    }
    if (supportedTargetTypes.includes(res.targetType)) {
      return account.url;
    }
  }
  throw Error("no matching exchange account found");
}
