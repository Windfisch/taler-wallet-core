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
import { InternalWalletState } from "../state";
import { WalletBackupContentV1 } from "../../types/backupTypes";
import { TransactionHandle } from "../../util/query";
import {
  BackupProviderRecord,
  ConfigRecord,
  Stores,
} from "../../types/dbTypes";
import { checkDbInvariant, checkLogicInvariant } from "../../util/invariants";
import { codecForAmountString } from "../../util/amounts";
import {
  bytesToString,
  decodeCrock,
  eddsaGetPublic,
  EddsaKeyPair,
  encodeCrock,
  hash,
  rsaBlind,
  stringToBytes,
} from "../../crypto/talerCrypto";
import { canonicalizeBaseUrl, canonicalJson, j2s } from "../../util/helpers";
import {
  durationAdd,
  durationFromSpec,
  getTimestampNow,
  Timestamp,
  timestampAddDuration,
} from "../../util/time";
import { URL } from "../../util/url";
import { AmountString } from "../../types/talerTypes";
import {
  buildCodecForObject,
  Codec,
  codecForBoolean,
  codecForNumber,
  codecForString,
  codecOptional,
} from "../../util/codec";
import {
  HttpResponseStatus,
  readSuccessResponseJsonOrThrow,
  readTalerErrorResponse,
} from "../../util/http";
import { Logger } from "../../util/logging";
import { gunzipSync, gzipSync } from "fflate";
import { kdf } from "../../crypto/primitives/kdf";
import { initRetryInfo } from "../../util/retries";
import {
  ConfirmPayResultType,
  PreparePayResultType,
  RecoveryLoadRequest,
  RecoveryMergeStrategy,
  TalerErrorDetails,
} from "../../types/walletTypes";
import { CryptoApi } from "../../crypto/workers/cryptoApi";
import { secretbox, secretbox_open } from "../../crypto/primitives/nacl-fast";
import { checkPaymentByProposalId, confirmPay, preparePayForUri } from "../pay";
import { exportBackup } from "./export";
import { BackupCryptoPrecomputedData, importBackup } from "./import";
import {
  provideBackupState,
  WALLET_BACKUP_STATE_KEY,
  getWalletBackupState,
  WalletBackupConfState,
} from "./state";
import { PaymentStatus } from "../../types/transactionsTypes";

const logger = new Logger("operations/backup.ts");

function concatArrays(xs: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const x of xs) {
    len += x.byteLength;
  }
  const out = new Uint8Array(len);
  let offset = 0;
  for (const x of xs) {
    out.set(x, offset);
    offset += x.length;
  }
  return out;
}

const magic = "TLRWBK01";

/**
 * Encrypt the backup.
 *
 * Blob format:
 * Magic "TLRWBK01" (8 bytes)
 * Nonce (24 bytes)
 * Compressed JSON blob (rest)
 */
export async function encryptBackup(
  config: WalletBackupConfState,
  blob: WalletBackupContentV1,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  chunks.push(stringToBytes(magic));
  const nonceStr = config.lastBackupNonce;
  checkLogicInvariant(!!nonceStr);
  const nonce = decodeCrock(nonceStr).slice(0, 24);
  chunks.push(nonce);
  const backupJsonContent = canonicalJson(blob);
  logger.trace("backup JSON size", backupJsonContent.length);
  const compressedContent = gzipSync(stringToBytes(backupJsonContent));
  const secret = deriveBlobSecret(config);
  const encrypted = secretbox(compressedContent, nonce.slice(0, 24), secret);
  chunks.push(encrypted);
  return concatArrays(chunks);
}

/**
 * Compute cryptographic values for a backup blob.
 *
 * FIXME: Take data that we already know from the DB.
 * FIXME: Move computations into crypto worker.
 */
async function computeBackupCryptoData(
  cryptoApi: CryptoApi,
  backupContent: WalletBackupContentV1,
): Promise<BackupCryptoPrecomputedData> {
  const cryptoData: BackupCryptoPrecomputedData = {
    coinPrivToCompletedCoin: {},
    denomPubToHash: {},
    proposalIdToContractTermsHash: {},
    proposalNoncePrivToPub: {},
    reservePrivToPub: {},
  };
  for (const backupExchange of backupContent.exchanges) {
    for (const backupDenom of backupExchange.denominations) {
      for (const backupCoin of backupDenom.coins) {
        const coinPub = encodeCrock(
          eddsaGetPublic(decodeCrock(backupCoin.coin_priv)),
        );
        const blindedCoin = rsaBlind(
          hash(decodeCrock(backupCoin.coin_priv)),
          decodeCrock(backupCoin.blinding_key),
          decodeCrock(backupDenom.denom_pub),
        );
        cryptoData.coinPrivToCompletedCoin[backupCoin.coin_priv] = {
          coinEvHash: encodeCrock(hash(blindedCoin)),
          coinPub,
        };
      }
      cryptoData.denomPubToHash[backupDenom.denom_pub] = encodeCrock(
        hash(decodeCrock(backupDenom.denom_pub)),
      );
    }
    for (const backupReserve of backupExchange.reserves) {
      cryptoData.reservePrivToPub[backupReserve.reserve_priv] = encodeCrock(
        eddsaGetPublic(decodeCrock(backupReserve.reserve_priv)),
      );
    }
  }
  for (const prop of backupContent.proposals) {
    const contractTermsHash = await cryptoApi.hashString(
      canonicalJson(prop.contract_terms_raw),
    );
    const noncePub = encodeCrock(eddsaGetPublic(decodeCrock(prop.nonce_priv)));
    cryptoData.proposalNoncePrivToPub[prop.nonce_priv] = noncePub;
    cryptoData.proposalIdToContractTermsHash[
      prop.proposal_id
    ] = contractTermsHash;
  }
  for (const purch of backupContent.purchases) {
    const contractTermsHash = await cryptoApi.hashString(
      canonicalJson(purch.contract_terms_raw),
    );
    const noncePub = encodeCrock(eddsaGetPublic(decodeCrock(purch.nonce_priv)));
    cryptoData.proposalNoncePrivToPub[purch.nonce_priv] = noncePub;
    cryptoData.proposalIdToContractTermsHash[
      purch.proposal_id
    ] = contractTermsHash;
  }
  return cryptoData;
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

function deriveBlobSecret(bc: WalletBackupConfState): Uint8Array {
  return kdf(
    32,
    decodeCrock(bc.walletRootPriv),
    stringToBytes("taler-sync-blob-secret-salt"),
    stringToBytes("taler-sync-blob-secret-info"),
  );
}

interface BackupForProviderArgs {
  backupConfig: WalletBackupConfState;
  provider: BackupProviderRecord;
  currentBackupHash: ArrayBuffer;
  encBackup: ArrayBuffer;
  backupJson: WalletBackupContentV1;

  /**
   * Should we attempt one more upload after trying
   * to pay?
   */
  retryAfterPayment: boolean;
}

async function runBackupCycleForProvider(
  ws: InternalWalletState,
  args: BackupForProviderArgs,
): Promise<void> {
  const {
    backupConfig,
    provider,
    currentBackupHash,
    encBackup,
    backupJson,
  } = args;
  const accountKeyPair = deriveAccountKeyPair(backupConfig, provider.baseUrl);
  logger.trace(`trying to upload backup to ${provider.baseUrl}`);

  const syncSig = await ws.cryptoApi.makeSyncSignature({
    newHash: encodeCrock(currentBackupHash),
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
    body: encBackup,
    headers: {
      "content-type": "application/octet-stream",
      "sync-signature": syncSig,
      "if-none-match": encodeCrock(currentBackupHash),
      ...(provider.lastBackupHash
        ? {
            "if-match": provider.lastBackupHash,
          }
        : {}),
    },
  });

  logger.trace(`sync response status: ${resp.status}`);

  if (resp.status === HttpResponseStatus.PaymentRequired) {
    logger.trace("payment required for backup");
    logger.trace(`headers: ${j2s(resp.headers)}`);
    const talerUri = resp.headers.get("taler");
    if (!talerUri) {
      throw Error("no taler URI available to pay provider");
    }
    const res = await preparePayForUri(ws, talerUri);
    let proposalId = res.proposalId;
    let doPay: boolean = false;
    switch (res.status) {
      case PreparePayResultType.InsufficientBalance:
        // FIXME: record in provider state!
        logger.warn("insufficient balance to pay for backup provider");
        proposalId = res.proposalId;
        break;
      case PreparePayResultType.PaymentPossible:
        doPay = true;
        break;
      case PreparePayResultType.AlreadyConfirmed:
        break;
    }

    // FIXME: check if the provider is overcharging us!

    await ws.db.runWithWriteTransaction(
      [Stores.backupProviders],
      async (tx) => {
        const provRec = await tx.get(Stores.backupProviders, provider.baseUrl);
        checkDbInvariant(!!provRec);
        const ids = new Set(provRec.paymentProposalIds);
        ids.add(proposalId);
        provRec.paymentProposalIds = Array.from(ids).sort();
        provRec.currentPaymentProposalId = proposalId;
        await tx.put(Stores.backupProviders, provRec);
      },
    );

    if (doPay) {
      const confirmRes = await confirmPay(ws, proposalId);
      switch (confirmRes.type) {
        case ConfirmPayResultType.Pending:
          logger.warn("payment not yet finished yet");
          break;
      }
    }

    if (args.retryAfterPayment) {
      await runBackupCycleForProvider(ws, {
        ...args,
        retryAfterPayment: false,
      });
    }
    return;
  }

  if (resp.status === HttpResponseStatus.NoContent) {
    await ws.db.runWithWriteTransaction(
      [Stores.backupProviders],
      async (tx) => {
        const prov = await tx.get(Stores.backupProviders, provider.baseUrl);
        if (!prov) {
          return;
        }
        prov.lastBackupHash = encodeCrock(currentBackupHash);
        prov.lastBackupTimestamp = getTimestampNow();
        prov.lastBackupClock = backupJson.clocks[backupJson.current_device_id];
        prov.lastError = undefined;
        await tx.put(Stores.backupProviders, prov);
      },
    );
    return;
  }

  if (resp.status === HttpResponseStatus.Conflict) {
    logger.info("conflicting backup found");
    const backupEnc = new Uint8Array(await resp.bytes());
    const backupConfig = await provideBackupState(ws);
    const blob = await decryptBackup(backupConfig, backupEnc);
    const cryptoData = await computeBackupCryptoData(ws.cryptoApi, blob);
    await importBackup(ws, blob, cryptoData);
    await ws.db.runWithWriteTransaction(
      [Stores.backupProviders],
      async (tx) => {
        const prov = await tx.get(Stores.backupProviders, provider.baseUrl);
        if (!prov) {
          return;
        }
        prov.lastBackupHash = encodeCrock(hash(backupEnc));
        prov.lastBackupClock = blob.clocks[blob.current_device_id];
        prov.lastBackupTimestamp = getTimestampNow();
        prov.lastError = undefined;
        await tx.put(Stores.backupProviders, prov);
      },
    );
    logger.info("processed existing backup");
    return;
  }

  // Some other response that we did not expect!

  logger.error("parsing error response");

  const err = await readTalerErrorResponse(resp);
  logger.error(`got error response from backup provider: ${j2s(err)}`);
  await ws.db.runWithWriteTransaction([Stores.backupProviders], async (tx) => {
    const prov = await tx.get(Stores.backupProviders, provider.baseUrl);
    if (!prov) {
      return;
    }
    prov.lastError = err;
    await tx.put(Stores.backupProviders, prov);
  });
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
  logger.trace("got backup providers", providers);
  const backupJson = await exportBackup(ws);
  const backupConfig = await provideBackupState(ws);
  const encBackup = await encryptBackup(backupConfig, backupJson);

  const currentBackupHash = hash(encBackup);

  for (const provider of providers) {
    await runBackupCycleForProvider(ws, {
      provider,
      backupJson,
      backupConfig,
      encBackup,
      currentBackupHash,
      retryAfterPayment: true,
    });
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

const codecForSyncTermsOfServiceResponse = (): Codec<SyncTermsOfServiceResponse> =>
  buildCodecForObject<SyncTermsOfServiceResponse>()
    .property("storage_limit_in_megabytes", codecForNumber())
    .property("annual_fee", codecForAmountString())
    .property("version", codecForString())
    .build("SyncTermsOfServiceResponse");

export interface AddBackupProviderRequest {
  backupProviderBaseUrl: string;
  /**
   * Activate the provider.  Should only be done after
   * the user has reviewed the provider.
   */
  activate?: boolean;
}

export const codecForAddBackupProviderRequest = (): Codec<AddBackupProviderRequest> =>
  buildCodecForObject<AddBackupProviderRequest>()
    .property("backupProviderBaseUrl", codecForString())
    .property("activate", codecOptional(codecForBoolean()))
    .build("AddBackupProviderRequest");

export async function addBackupProvider(
  ws: InternalWalletState,
  req: AddBackupProviderRequest,
): Promise<void> {
  logger.info(`adding backup provider ${j2s(req)}`);
  await provideBackupState(ws);
  const canonUrl = canonicalizeBaseUrl(req.backupProviderBaseUrl);
  const oldProv = await ws.db.get(Stores.backupProviders, canonUrl);
  if (oldProv) {
    logger.info("old backup provider found");
    if (req.activate) {
      oldProv.active = true;
      logger.info("setting existing backup provider to active");
      await ws.db.put(Stores.backupProviders, oldProv);
    }
    return;
  }
  const termsUrl = new URL("terms", canonUrl);
  const resp = await ws.http.get(termsUrl.href);
  const terms = await readSuccessResponseJsonOrThrow(
    resp,
    codecForSyncTermsOfServiceResponse(),
  );
  await ws.db.put(Stores.backupProviders, {
    active: !!req.activate,
    terms: {
      annualFee: terms.annual_fee,
      storageLimitInMegabytes: terms.storage_limit_in_megabytes,
      supportedProtocolVersion: terms.version,
    },
    paymentProposalIds: [],
    baseUrl: canonUrl,
    lastError: undefined,
    retryInfo: initRetryInfo(false),
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
  active: boolean;
  syncProviderBaseUrl: string;
  lastError?: TalerErrorDetails;
  lastRemoteClock?: number;
  lastBackupTimestamp?: Timestamp;
  paymentProposalIds: string[];
  paymentStatus: ProviderPaymentStatus;
}

export type ProviderPaymentStatus =
  | ProviderPaymentPaid
  | ProviderPaymentInsufficientBalance
  | ProviderPaymentUnpaid
  | ProviderPaymentPending;

export interface BackupInfo {
  walletRootPub: string;
  deviceId: string;
  lastLocalClock: number;
  providers: ProviderInfo[];
}

export async function importBackupPlain(
  ws: InternalWalletState,
  blob: any,
): Promise<void> {
  // FIXME: parse
  const backup: WalletBackupContentV1 = blob;

  const cryptoData = await computeBackupCryptoData(ws.cryptoApi, backup);

  await importBackup(ws, blob, cryptoData);
}

export enum ProviderPaymentType {
  Unpaid = "unpaid",
  Pending = "pending",
  InsufficientBalance = "insufficient-balance",
  Paid = "paid",
}

export interface ProviderPaymentUnpaid {
  type: ProviderPaymentType.Unpaid;
}

export interface ProviderPaymentInsufficientBalance {
  type: ProviderPaymentType.InsufficientBalance;
}

export interface ProviderPaymentPending {
  type: ProviderPaymentType.Pending;
}

export interface ProviderPaymentPaid {
  type: ProviderPaymentType.Paid;
  paidUntil: Timestamp;
}

async function getProviderPaymentInfo(
  ws: InternalWalletState,
  provider: BackupProviderRecord,
): Promise<ProviderPaymentStatus> {
  if (!provider.currentPaymentProposalId) {
    return {
      type: ProviderPaymentType.Unpaid,
    };
  }
  const status = await checkPaymentByProposalId(
    ws,
    provider.currentPaymentProposalId,
  );
  if (status.status === PreparePayResultType.InsufficientBalance) {
    return {
      type: ProviderPaymentType.InsufficientBalance,
    };
  }
  if (status.status === PreparePayResultType.PaymentPossible) {
    return {
      type: ProviderPaymentType.Pending,
    };
  }
  if (status.status === PreparePayResultType.AlreadyConfirmed) {
    if (status.paid) {
      return {
        type: ProviderPaymentType.Paid,
        paidUntil: timestampAddDuration(
          status.contractTerms.timestamp,
          durationFromSpec({ years: 1 }),
        ),
      };
    } else {
      return {
        type: ProviderPaymentType.Pending,
      };
    }
  }
  throw Error("not reached");
}

/**
 * Get information about the current state of wallet backups.
 */
export async function getBackupInfo(
  ws: InternalWalletState,
): Promise<BackupInfo> {
  const backupConfig = await provideBackupState(ws);
  const providerRecords = await ws.db.iter(Stores.backupProviders).toArray();
  const providers: ProviderInfo[] = [];
  for (const x of providerRecords) {
    providers.push({
      active: x.active,
      lastRemoteClock: x.lastBackupClock,
      syncProviderBaseUrl: x.baseUrl,
      lastBackupTimestamp: x.lastBackupTimestamp,
      paymentProposalIds: x.paymentProposalIds,
      lastError: x.lastError,
      paymentStatus: await getProviderPaymentInfo(ws, x),
    });
  }
  return {
    deviceId: backupConfig.deviceId,
    lastLocalClock: backupConfig.clocks[backupConfig.deviceId],
    walletRootPub: backupConfig.walletRootPub,
    providers,
  };
}

export interface BackupRecovery {
  walletRootPriv: string;
  providers: {
    url: string;
  }[];
}

/**
 * Get information about the current state of wallet backups.
 */
export async function getBackupRecovery(
  ws: InternalWalletState,
): Promise<BackupRecovery> {
  const bs = await provideBackupState(ws);
  const providers = await ws.db.iter(Stores.backupProviders).toArray();
  return {
    providers: providers
      .filter((x) => x.active)
      .map((x) => {
        return {
          url: x.baseUrl,
        };
      }),
    walletRootPriv: bs.walletRootPriv,
  };
}

async function backupRecoveryTheirs(
  ws: InternalWalletState,
  br: BackupRecovery,
) {
  await ws.db.runWithWriteTransaction(
    [Stores.config, Stores.backupProviders],
    async (tx) => {
      let backupStateEntry:
        | ConfigRecord<WalletBackupConfState>
        | undefined = await tx.get(Stores.config, WALLET_BACKUP_STATE_KEY);
      checkDbInvariant(!!backupStateEntry);
      backupStateEntry.value.lastBackupNonce = undefined;
      backupStateEntry.value.lastBackupTimestamp = undefined;
      backupStateEntry.value.lastBackupCheckTimestamp = undefined;
      backupStateEntry.value.lastBackupPlainHash = undefined;
      backupStateEntry.value.walletRootPriv = br.walletRootPriv;
      backupStateEntry.value.walletRootPub = encodeCrock(
        eddsaGetPublic(decodeCrock(br.walletRootPriv)),
      );
      await tx.put(Stores.config, backupStateEntry);
      for (const prov of br.providers) {
        const existingProv = await tx.get(Stores.backupProviders, prov.url);
        if (!existingProv) {
          await tx.put(Stores.backupProviders, {
            active: true,
            baseUrl: prov.url,
            paymentProposalIds: [],
            retryInfo: initRetryInfo(false),
            lastError: undefined,
          });
        }
      }
      const providers = await tx.iter(Stores.backupProviders).toArray();
      for (const prov of providers) {
        prov.lastBackupTimestamp = undefined;
        prov.lastBackupHash = undefined;
        prov.lastBackupClock = undefined;
        await tx.put(Stores.backupProviders, prov);
      }
    },
  );
}

async function backupRecoveryOurs(ws: InternalWalletState, br: BackupRecovery) {
  throw Error("not implemented");
}

export async function loadBackupRecovery(
  ws: InternalWalletState,
  br: RecoveryLoadRequest,
): Promise<void> {
  const bs = await provideBackupState(ws);
  const providers = await ws.db.iter(Stores.backupProviders).toArray();
  let strategy = br.strategy;
  if (
    br.recovery.walletRootPriv != bs.walletRootPriv &&
    providers.length > 0 &&
    !strategy
  ) {
    throw Error(
      "recovery load strategy must be specified for wallet with existing providers",
    );
  } else if (!strategy) {
    // Default to using the new key if we don't have providers yet.
    strategy = RecoveryMergeStrategy.Theirs;
  }
  if (strategy === RecoveryMergeStrategy.Theirs) {
    return backupRecoveryTheirs(ws, br.recovery);
  } else {
    return backupRecoveryOurs(ws, br.recovery);
  }
}

export async function exportBackupEncrypted(
  ws: InternalWalletState,
): Promise<Uint8Array> {
  await provideBackupState(ws);
  const blob = await exportBackup(ws);
  const bs = await ws.db.runWithWriteTransaction(
    [Stores.config],
    async (tx) => {
      return await getWalletBackupState(ws, tx);
    },
  );
  return encryptBackup(bs, blob);
}

export async function decryptBackup(
  backupConfig: WalletBackupConfState,
  data: Uint8Array,
): Promise<WalletBackupContentV1> {
  const rMagic = bytesToString(data.slice(0, 8));
  if (rMagic != magic) {
    throw Error("invalid backup file (magic tag mismatch)");
  }

  const nonce = data.slice(8, 8 + 24);
  const box = data.slice(8 + 24);
  const secret = deriveBlobSecret(backupConfig);
  const dataCompressed = secretbox_open(box, nonce, secret);
  if (!dataCompressed) {
    throw Error("decryption failed");
  }
  return JSON.parse(bytesToString(gunzipSync(dataCompressed)));
}

export async function importBackupEncrypted(
  ws: InternalWalletState,
  data: Uint8Array,
): Promise<void> {
  const backupConfig = await provideBackupState(ws);
  const blob = await decryptBackup(backupConfig, data);
  const cryptoData = await computeBackupCryptoData(ws.cryptoApi, blob);
  await importBackup(ws, blob, cryptoData);
}
