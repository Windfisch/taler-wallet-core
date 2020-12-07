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
  BackupExchangeData,
  BackupExchangeWireFee,
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
import { Timestamp } from "../util/time";
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
import { sign_keyPair_fromSeed } from "../crypto/primitives/nacl-fast";
import { kdf } from "../crypto/primitives/kdf";

interface WalletBackupConfState {
  walletRootPub: string;
  walletRootPriv: string;
  clock: number;
  lastBackupHash?: string;
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
  return await ws.db.runWithWriteTransaction([Stores.config], async (tx) => {
    let backupStateEntry:
      | ConfigRecord<WalletBackupConfState>
      | undefined = await tx.get(Stores.config, WALLET_BACKUP_STATE_KEY);
    if (!backupStateEntry) {
      backupStateEntry = {
        key: WALLET_BACKUP_STATE_KEY,
        value: {
          walletRootPub: k.pub,
          walletRootPriv: k.priv,
          clock: 0,
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

      const exchanges: BackupExchangeData[] = [];
      const coins: BackupCoin[] = [];
      const denominations: BackupDenomination[] = [];

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
              wireType: x,
              closingFee: Amounts.stringify(f.closingFee),
              endStamp: f.endStamp,
              sig: f.sig,
              startStamp: f.startStamp,
              wireFee: Amounts.stringify(f.wireFee),
            });
          }
        });

        exchanges.push({
          baseUrl: ex.baseUrl,
          accounts: ex.wireInfo.accounts.map((x) => ({
            paytoUri: x.payto_uri,
          })),
          auditors: ex.details.auditors.map((x) => ({
            auditorPub: x.auditor_pub,
            auditorUrl: x.auditor_url,
            denominationKeys: x.denomination_keys,
          })),
          masterPublicKey: ex.details.masterPublicKey,
          currency: ex.details.currency,
          protocolVersion: ex.details.protocolVersion,
          wireFees,
          signingKeys: ex.details.signingKeys.map((x) => ({
            key: x.key,
            masterSig: x.master_sig,
            stampEnd: x.stamp_end,
            stampExpire: x.stamp_expire,
            stampStart: x.stamp_start,
          })),
          termsOfServiceAcceptedEtag: ex.termsOfServiceAcceptedEtag,
          termsOfServiceLastEtag: ex.termsOfServiceLastEtag,
        });
      });

      await tx.iter(Stores.denominations).forEach((denom) => {
        denominations.push({
          denomPub: denom.denomPub,
          denomPubHash: denom.denomPubHash,
          exchangeBaseUrl: canonicalizeBaseUrl(denom.exchangeBaseUrl),
          feeDeposit: Amounts.stringify(denom.feeDeposit),
          feeRefresh: Amounts.stringify(denom.feeRefresh),
          feeRefund: Amounts.stringify(denom.feeRefund),
          feeWithdraw: Amounts.stringify(denom.feeWithdraw),
          isOffered: denom.isOffered,
          isRevoked: denom.isRevoked,
          masterSig: denom.masterSig,
          stampExpireDeposit: denom.stampExpireDeposit,
          stampExpireLegal: denom.stampExpireLegal,
          stampExpireWithdraw: denom.stampExpireWithdraw,
          stampStart: denom.stampStart,
          value: Amounts.stringify(denom.value),
        });
      });

      await tx.iter(Stores.coins).forEach((coin) => {
        let bcs: BackupCoinSource;
        switch (coin.coinSource.type) {
          case CoinSourceType.Refresh:
            bcs = {
              type: BackupCoinSourceType.Refresh,
              oldCoinPub: coin.coinSource.oldCoinPub,
            };
            break;
          case CoinSourceType.Tip:
            bcs = {
              type: BackupCoinSourceType.Tip,
              coinIndex: coin.coinSource.coinIndex,
              walletTipId: coin.coinSource.walletTipId,
            };
            break;
          case CoinSourceType.Withdraw:
            bcs = {
              type: BackupCoinSourceType.Withdraw,
              coinIndex: coin.coinSource.coinIndex,
              reservePub: coin.coinSource.reservePub,
              withdrawalGroupId: coin.coinSource.withdrawalGroupId,
            };
            break;
        }

        coins.push({
          exchangeBaseUrl: coin.exchangeBaseUrl,
          blindingKey: coin.blindingKey,
          coinPriv: coin.coinPriv,
          coinPub: coin.coinPub,
          coinSource: bcs,
          currentAmount: Amounts.stringify(coin.currentAmount),
          fresh: coin.status === CoinStatus.Fresh,
        });
      });

      const backupBlob: WalletBackupContentV1 = {
        schemaId: "gnu-taler-wallet-backup",
        schemaVersion: 1,
        clock: bs.clock,
        coins: coins,
        exchanges: exchanges,
        planchets: [],
        refreshSessions: [],
        reserves: [],
        denominations: [],
        walletRootPub: bs.walletRootPub,
      };

      // If the backup changed, we increment our clock.

      let h = encodeCrock(hash(stringToBytes(canonicalJson(backupBlob))));
      if (h != bs.lastBackupHash) {
        backupBlob.clock = ++bs.clock;
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
      logger.trace(`headers: ${j2s(resp.headers)}`)
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
