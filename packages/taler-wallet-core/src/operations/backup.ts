/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems SA

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
 * Implementation of wallet backups (export/import/upload) and sync
 * server management.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import { InternalWalletState } from "./state";
import {
  BackupCoin,
  BackupCoinSource,
  BackupCoinSourceType,
  BackupDenomination,
  BackupExchange,
  BackupExchangeWireFee,
  BackupReserve,
  WalletBackupContentV1,
} from "../types/backupTypes";
import { TransactionHandle } from "../util/query";
import {
  CoinSourceType,
  CoinStatus,
  ConfigRecord,
  Stores,
} from "../types/dbTypes";
import { checkDbInvariant } from "../util/invariants";
import { Amounts, codecForAmountString } from "../util/amounts";
import {
  decodeCrock,
  eddsaGetPublic,
  EddsaKeyPair,
  encodeCrock,
  getRandomBytes,
  hash,
  stringToBytes,
} from "../crypto/talerCrypto";
import { canonicalizeBaseUrl, canonicalJson, j2s } from "../util/helpers";
import { getTimestampNow, Timestamp } from "../util/time";
import { URL } from "../util/url";
import { AmountString } from "../types/talerTypes";
import {
  buildCodecForObject,
  Codec,
  codecForNumber,
  codecForString,
} from "../util/codec";
import {
  HttpResponseStatus,
  readSuccessResponseJsonOrThrow,
} from "../util/http";
import { Logger } from "../util/logging";
import { gzipSync } from "fflate";
import { kdf } from "../crypto/primitives/kdf";

interface WalletBackupConfState {
  deviceId: string;
  walletRootPub: string;
  walletRootPriv: string;
  clocks: { [device_id: string]: number };
  lastBackupHash?: string;

  /**
   * Timestamp stored in the last backup.
   */
  lastBackupTimestamp?: Timestamp;

  /**
   * Last time we tried to do a backup.
   */
  lastBackupCheckTimestamp?: Timestamp;
  lastBackupNonce?: string;
}

const WALLET_BACKUP_STATE_KEY = "walletBackupState";

const logger = new Logger("operations/backup.ts");

async function provideBackupState(
  ws: InternalWalletState,
): Promise<WalletBackupConfState> {
  const bs: ConfigRecord<WalletBackupConfState> | undefined = await ws.db.get(
    Stores.config,
    WALLET_BACKUP_STATE_KEY,
  );
  if (bs) {
    return bs.value;
  }
  // We need to generate the key outside of the transaction
  // due to how IndexedDB works.
  const k = await ws.cryptoApi.createEddsaKeypair();
  const d = getRandomBytes(5);
  // FIXME: device ID should be configured when wallet is initialized
  // and be based on hostname
  const deviceId = `wallet-core-${encodeCrock(d)}`;
  return await ws.db.runWithWriteTransaction([Stores.config], async (tx) => {
    let backupStateEntry:
      | ConfigRecord<WalletBackupConfState>
      | undefined = await tx.get(Stores.config, WALLET_BACKUP_STATE_KEY);
    if (!backupStateEntry) {
      backupStateEntry = {
        key: WALLET_BACKUP_STATE_KEY,
        value: {
          deviceId,
          clocks: { [deviceId]: 1 },
          walletRootPub: k.pub,
          walletRootPriv: k.priv,
          lastBackupHash: undefined,
        },
      };
      await tx.put(Stores.config, backupStateEntry);
    }
    return backupStateEntry.value;
  });
}

async function getWalletBackupState(
  ws: InternalWalletState,
  tx: TransactionHandle<typeof Stores.config>,
): Promise<WalletBackupConfState> {
  let bs = await tx.get(Stores.config, WALLET_BACKUP_STATE_KEY);
  checkDbInvariant(!!bs, "wallet backup state should be in DB");
  return bs.value;
}

export async function exportBackup(
  ws: InternalWalletState,
): Promise<WalletBackupContentV1> {
  await provideBackupState(ws);
  return ws.db.runWithWriteTransaction(
    [Stores.config, Stores.exchanges, Stores.coins, Stores.denominations],
    async (tx) => {
      const bs = await getWalletBackupState(ws, tx);

      const exchanges: BackupExchange[] = [];
      const coinsByDenom: { [dph: string]: BackupCoin[] } = {};
      const denominationsByExchange: {
        [url: string]: BackupDenomination[];
      } = {};
      const reservesByExchange: { [url: string]: BackupReserve[] } = {};

      await tx.iter(Stores.coins).forEach((coin) => {
        let bcs: BackupCoinSource;
        switch (coin.coinSource.type) {
          case CoinSourceType.Refresh:
            bcs = {
              type: BackupCoinSourceType.Refresh,
              old_coin_pub: coin.coinSource.oldCoinPub,
            };
            break;
          case CoinSourceType.Tip:
            bcs = {
              type: BackupCoinSourceType.Tip,
              coin_index: coin.coinSource.coinIndex,
              wallet_tip_id: coin.coinSource.walletTipId,
            };
            break;
          case CoinSourceType.Withdraw:
            bcs = {
              type: BackupCoinSourceType.Withdraw,
              coin_index: coin.coinSource.coinIndex,
              reserve_pub: coin.coinSource.reservePub,
              withdrawal_group_id: coin.coinSource.withdrawalGroupId,
            };
            break;
        }

        const coins = (coinsByDenom[coin.denomPubHash] ??= []);
        coins.push({
          blinding_key: coin.blindingKey,
          coin_priv: coin.coinPriv,
          coin_source: bcs,
          current_amount: Amounts.stringify(coin.currentAmount),
          fresh: coin.status === CoinStatus.Fresh,
          denom_sig: coin.denomSig,
        });
      });

      await tx.iter(Stores.denominations).forEach((denom) => {
        const backupDenoms = (denominationsByExchange[
          denom.exchangeBaseUrl
        ] ??= []);
        backupDenoms.push({
          coins: coinsByDenom[denom.denomPubHash] ?? [],
          denom_pub: denom.denomPub,
          fee_deposit: Amounts.stringify(denom.feeDeposit),
          fee_refresh: Amounts.stringify(denom.feeRefresh),
          fee_refund: Amounts.stringify(denom.feeRefund),
          fee_withdraw: Amounts.stringify(denom.feeWithdraw),
          is_offered: denom.isOffered,
          is_revoked: denom.isRevoked,
          master_sig: denom.masterSig,
          stamp_expire_deposit: denom.stampExpireDeposit,
          stamp_expire_legal: denom.stampExpireLegal,
          stamp_expire_withdraw: denom.stampExpireWithdraw,
          stamp_start: denom.stampStart,
          value: Amounts.stringify(denom.value),
        });
      });

      await tx.iter(Stores.exchanges).forEach((ex) => {
        // Only back up permanently added exchanges.

        if (!ex.details) {
          return;
        }
        if (!ex.wireInfo) {
          return;
        }
        if (!ex.addComplete) {
          return;
        }
        if (!ex.permanent) {
          return;
        }
        const wi = ex.wireInfo;
        const wireFees: BackupExchangeWireFee[] = [];

        Object.keys(wi.feesForType).forEach((x) => {
          for (const f of wi.feesForType[x]) {
            wireFees.push({
              wire_type: x,
              closing_fee: Amounts.stringify(f.closingFee),
              end_stamp: f.endStamp,
              sig: f.sig,
              start_stamp: f.startStamp,
              wire_fee: Amounts.stringify(f.wireFee),
            });
          }
        });

        exchanges.push({
          base_url: ex.baseUrl,
          accounts: ex.wireInfo.accounts.map((x) => ({
            payto_uri: x.payto_uri,
            master_sig: x.master_sig,
          })),
          auditors: ex.details.auditors.map((x) => ({
            auditor_pub: x.auditor_pub,
            auditor_url: x.auditor_url,
            denomination_keys: x.denomination_keys,
          })),
          master_public_key: ex.details.masterPublicKey,
          currency: ex.details.currency,
          protocol_version: ex.details.protocolVersion,
          wire_fees: wireFees,
          signing_keys: ex.details.signingKeys.map((x) => ({
            key: x.key,
            master_sig: x.master_sig,
            stamp_end: x.stamp_end,
            stamp_expire: x.stamp_expire,
            stamp_start: x.stamp_start,
          })),
          tos_etag_accepted: ex.termsOfServiceAcceptedEtag,
          tos_etag_last: ex.termsOfServiceLastEtag,
          denominations: denominationsByExchange[ex.baseUrl] ?? [],
          reserves: reservesByExchange[ex.baseUrl] ?? [],
        });
      });

      if (!bs.lastBackupTimestamp) {
        bs.lastBackupTimestamp = getTimestampNow();
      }

      const backupBlob: WalletBackupContentV1 = {
        schema_id: "gnu-taler-wallet-backup-content",
        schema_version: 1,
        clocks: bs.clocks,
        exchanges: exchanges,
        wallet_root_pub: bs.walletRootPub,
        backup_providers: [],
        current_device_id: bs.deviceId,
        proposals: [],
        purchase_tombstones: [],
        purchases: [],
        recoup_groups: [],
        refresh_groups: [],
        tips: [],
        timestamp: bs.lastBackupTimestamp,
        trusted_auditors: {},
        trusted_exchanges: {},
        intern_table: {},
      };

      // If the backup changed, we increment our clock.

      let h = encodeCrock(hash(stringToBytes(canonicalJson(backupBlob))));
      if (h != bs.lastBackupHash) {
        backupBlob.clocks[bs.deviceId] = ++bs.clocks[bs.deviceId];
        bs.lastBackupHash = encodeCrock(
          hash(stringToBytes(canonicalJson(backupBlob))),
        );
        bs.lastBackupNonce = encodeCrock(getRandomBytes(32));
        await tx.put(Stores.config, {
          key: WALLET_BACKUP_STATE_KEY,
          value: bs,
        });
      }

      return backupBlob;
    },
  );
}

export interface BackupRequest {
  backupBlob: any;
}

export async function encryptBackup(
  config: WalletBackupConfState,
  blob: WalletBackupContentV1,
): Promise<Uint8Array> {
  throw Error("not implemented");
}

export function importBackup(
  ws: InternalWalletState,
  backupRequest: BackupRequest,
): Promise<void> {
  throw Error("not implemented");
}

function deriveAccountKeyPair(
  bc: WalletBackupConfState,
  providerUrl: string,
): EddsaKeyPair {
  const privateKey = kdf(
    32,
    decodeCrock(bc.walletRootPriv),
    stringToBytes("taler-sync-account-key-salt"),
    stringToBytes(providerUrl),
  );

  return {
    eddsaPriv: privateKey,
    eddsaPub: eddsaGetPublic(privateKey),
  };
}

/**
 * Do one backup cycle that consists of:
 * 1. Exporting a backup and try to upload it.
 *    Stop if this step succeeds.
 * 2. Download, verify and import backups from connected sync accounts.
 * 3. Upload the updated backup blob.
 */
export async function runBackupCycle(ws: InternalWalletState): Promise<void> {
  const providers = await ws.db.iter(Stores.backupProviders).toArray();
  const backupConfig = await provideBackupState(ws);

  logger.trace("got backup providers", providers);
  const backupJsonContent = canonicalJson(await exportBackup(ws));
  logger.trace("backup JSON size", backupJsonContent.length);
  const compressedContent = gzipSync(stringToBytes(backupJsonContent));
  logger.trace("backup compressed JSON size", compressedContent.length);

  const h = hash(compressedContent);

  for (const provider of providers) {
    const accountKeyPair = deriveAccountKeyPair(backupConfig, provider.baseUrl);
    logger.trace(`trying to upload backup to ${provider.baseUrl}`);

    const syncSig = await ws.cryptoApi.makeSyncSignature({
      newHash: encodeCrock(h),
      oldHash: provider.lastBackupHash,
      accountPriv: encodeCrock(accountKeyPair.eddsaPriv),
    });

    logger.trace(`sync signature is ${syncSig}`);

    const accountBackupUrl = new URL(
      `/backups/${encodeCrock(accountKeyPair.eddsaPub)}`,
      provider.baseUrl,
    );

    const resp = await ws.http.fetch(accountBackupUrl.href, {
      method: "POST",
      body: compressedContent,
      headers: {
        "content-type": "application/octet-stream",
        "sync-signature": syncSig,
        "if-none-match": encodeCrock(h),
      },
    });

    logger.trace(`response status: ${resp.status}`);

    if (resp.status === HttpResponseStatus.PaymentRequired) {
      logger.trace("payment required for backup");
      logger.trace(`headers: ${j2s(resp.headers)}`);
      return;
    }

    if (resp.status === HttpResponseStatus.Ok) {
      return;
    }

    logger.trace(`response body: ${j2s(await resp.json())}`);
  }
}

interface SyncTermsOfServiceResponse {
  // maximum backup size supported
  storage_limit_in_megabytes: number;

  // Fee for an account, per year.
  annual_fee: AmountString;

  // protocol version supported by the server,
  // for now always "0.0".
  version: string;
}

const codecForSyncTermsOfServiceResponse = (): Codec<
  SyncTermsOfServiceResponse
> =>
  buildCodecForObject<SyncTermsOfServiceResponse>()
    .property("storage_limit_in_megabytes", codecForNumber())
    .property("annual_fee", codecForAmountString())
    .property("version", codecForString())
    .build("SyncTermsOfServiceResponse");

export interface AddBackupProviderRequest {
  backupProviderBaseUrl: string;
}

export const codecForAddBackupProviderRequest = (): Codec<
  AddBackupProviderRequest
> =>
  buildCodecForObject<AddBackupProviderRequest>()
    .property("backupProviderBaseUrl", codecForString())
    .build("AddBackupProviderRequest");

export async function addBackupProvider(
  ws: InternalWalletState,
  req: AddBackupProviderRequest,
): Promise<void> {
  await provideBackupState(ws);
  const canonUrl = canonicalizeBaseUrl(req.backupProviderBaseUrl);
  const oldProv = await ws.db.get(Stores.backupProviders, canonUrl);
  if (oldProv) {
    return;
  }
  const termsUrl = new URL("terms", canonUrl);
  const resp = await ws.http.get(termsUrl.href);
  const terms = await readSuccessResponseJsonOrThrow(
    resp,
    codecForSyncTermsOfServiceResponse(),
  );
  await ws.db.put(Stores.backupProviders, {
    active: true,
    annualFee: terms.annual_fee,
    baseUrl: canonUrl,
    storageLimitInMegabytes: terms.storage_limit_in_megabytes,
    supportedProtocolVersion: terms.version,
  });
}

export async function removeBackupProvider(
  syncProviderBaseUrl: string,
): Promise<void> {}

export async function restoreFromRecoverySecret(): Promise<void> {}

/**
 * Information about one provider.
 *
 * We don't store the account key here,
 * as that's derived from the wallet root key.
 */
export interface ProviderInfo {
  syncProviderBaseUrl: string;
  lastRemoteClock: number;
  lastBackup?: Timestamp;
}

export interface BackupInfo {
  walletRootPub: string;
  deviceId: string;
  lastLocalClock: number;
  providers: ProviderInfo[];
}

/**
 * Get information about the current state of wallet backups.
 */
export function getBackupInfo(ws: InternalWalletState): Promise<BackupInfo> {
  throw Error("not implemented");
}
