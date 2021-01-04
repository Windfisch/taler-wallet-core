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
  BackupBackupProvider,
  BackupCoin,
  BackupCoinSource,
  BackupCoinSourceType,
  BackupDenomination,
  BackupDenomSel,
  BackupExchange,
  BackupExchangeWireFee,
  BackupProposal,
  BackupProposalStatus,
  BackupPurchase,
  BackupRecoupGroup,
  BackupRefreshGroup,
  BackupRefreshOldCoin,
  BackupRefreshReason,
  BackupRefreshSession,
  BackupRefundItem,
  BackupRefundState,
  BackupReserve,
  BackupTip,
  BackupWithdrawalGroup,
  WalletBackupContentV1,
} from "../types/backupTypes";
import { TransactionHandle } from "../util/query";
import {
  AbortStatus,
  CoinSource,
  CoinSourceType,
  CoinStatus,
  ConfigRecord,
  DenominationStatus,
  DenomSelectionState,
  ExchangeUpdateStatus,
  ExchangeWireInfo,
  PayCoinSelection,
  ProposalDownload,
  ProposalStatus,
  RefreshSessionRecord,
  RefundState,
  ReserveBankInfo,
  ReserveRecordStatus,
  Stores,
  WalletContractData,
  WalletRefundItem,
} from "../types/dbTypes";
import { checkDbInvariant, checkLogicInvariant } from "../util/invariants";
import { AmountJson, Amounts, codecForAmountString } from "../util/amounts";
import {
  decodeCrock,
  eddsaGetPublic,
  EddsaKeyPair,
  encodeCrock,
  getRandomBytes,
  hash,
  rsaBlind,
  stringToBytes,
} from "../crypto/talerCrypto";
import { canonicalizeBaseUrl, canonicalJson, j2s } from "../util/helpers";
import { getTimestampNow, Timestamp } from "../util/time";
import { URL } from "../util/url";
import {
  AmountString,
  codecForContractTerms,
  ContractTerms,
} from "../types/talerTypes";
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
import { initRetryInfo } from "../util/retries";
import { RefreshReason } from "../types/walletTypes";
import { CryptoApi } from "../crypto/workers/cryptoApi";

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
    [
      Stores.config,
      Stores.exchanges,
      Stores.coins,
      Stores.denominations,
      Stores.purchases,
      Stores.proposals,
      Stores.refreshGroups,
      Stores.backupProviders,
      Stores.tips,
      Stores.recoupGroups,
      Stores.reserves,
      Stores.withdrawalGroups,
    ],
    async (tx) => {
      const bs = await getWalletBackupState(ws, tx);

      const backupExchanges: BackupExchange[] = [];
      const backupCoinsByDenom: { [dph: string]: BackupCoin[] } = {};
      const backupDenominationsByExchange: {
        [url: string]: BackupDenomination[];
      } = {};
      const backupReservesByExchange: { [url: string]: BackupReserve[] } = {};
      const backupPurchases: BackupPurchase[] = [];
      const backupProposals: BackupProposal[] = [];
      const backupRefreshGroups: BackupRefreshGroup[] = [];
      const backupBackupProviders: BackupBackupProvider[] = [];
      const backupTips: BackupTip[] = [];
      const backupRecoupGroups: BackupRecoupGroup[] = [];
      const withdrawalGroupsByReserve: {
        [reservePub: string]: BackupWithdrawalGroup[];
      } = {};

      await tx.iter(Stores.withdrawalGroups).forEachAsync(async (wg) => {
        const withdrawalGroups = (withdrawalGroupsByReserve[
          wg.reservePub
        ] ??= []);
        withdrawalGroups.push({
          raw_withdrawal_amount: Amounts.stringify(wg.rawWithdrawalAmount),
          selected_denoms: wg.denomsSel.selectedDenoms.map((x) => ({
            count: x.count,
            denom_pub_hash: x.denomPubHash,
          })),
          timestamp_start: wg.timestampStart,
          timestamp_finish: wg.timestampFinish,
          withdrawal_group_id: wg.withdrawalGroupId,
          secret_seed: wg.secretSeed,
        });
      });

      await tx.iter(Stores.reserves).forEach((reserve) => {
        const backupReserve: BackupReserve = {
          initial_selected_denoms: reserve.initialDenomSel.selectedDenoms.map(
            (x) => ({
              count: x.count,
              denom_pub_hash: x.denomPubHash,
            }),
          ),
          initial_withdrawal_group_id: reserve.initialWithdrawalGroupId,
          instructed_amount: Amounts.stringify(reserve.instructedAmount),
          reserve_priv: reserve.reservePriv,
          timestamp_created: reserve.timestampCreated,
          withdrawal_groups:
            withdrawalGroupsByReserve[reserve.reservePub] ?? [],
        };
        const backupReserves = (backupReservesByExchange[
          reserve.exchangeBaseUrl
        ] ??= []);
        backupReserves.push(backupReserve);
      });

      await tx.iter(Stores.tips).forEach((tip) => {
        backupTips.push({
          exchange_base_url: tip.exchangeBaseUrl,
          merchant_base_url: tip.merchantBaseUrl,
          merchant_tip_id: tip.merchantTipId,
          wallet_tip_id: tip.walletTipId,
          secret_seed: tip.secretSeed,
          selected_denoms: tip.denomsSel.selectedDenoms.map((x) => ({
            count: x.count,
            denom_pub_hash: x.denomPubHash,
          })),
          timestam_picked_up: tip.pickedUpTimestamp,
          timestamp_accepted: tip.acceptedTimestamp,
          timestamp_created: tip.createdTimestamp,
          timestamp_expiration: tip.tipExpiration,
          tip_amount_raw: Amounts.stringify(tip.tipAmountRaw),
        });
      });

      await tx.iter(Stores.recoupGroups).forEach((recoupGroup) => {
        backupRecoupGroups.push({
          recoup_group_id: recoupGroup.recoupGroupId,
          timestamp_started: recoupGroup.timestampStarted,
          timestamp_finished: recoupGroup.timestampFinished,
          coins: recoupGroup.coinPubs.map((x, i) => ({
            coin_pub: x,
            recoup_finished: recoupGroup.recoupFinishedPerCoin[i],
            old_amount: Amounts.stringify(recoupGroup.oldAmountPerCoin[i]),
          })),
        });
      });

      await tx.iter(Stores.backupProviders).forEach((bp) => {
        backupBackupProviders.push({
          annual_fee: Amounts.stringify(bp.annualFee),
          base_url: canonicalizeBaseUrl(bp.baseUrl),
          pay_proposal_ids: [],
          storage_limit_in_megabytes: bp.storageLimitInMegabytes,
          supported_protocol_version: bp.supportedProtocolVersion,
        });
      });

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

        const coins = (backupCoinsByDenom[coin.denomPubHash] ??= []);
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
        const backupDenoms = (backupDenominationsByExchange[
          denom.exchangeBaseUrl
        ] ??= []);
        backupDenoms.push({
          coins: backupCoinsByDenom[denom.denomPubHash] ?? [],
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

        backupExchanges.push({
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
          denominations: backupDenominationsByExchange[ex.baseUrl] ?? [],
          reserves: backupReservesByExchange[ex.baseUrl] ?? [],
        });
      });

      const purchaseProposalIdSet = new Set<string>();

      await tx.iter(Stores.purchases).forEach((purch) => {
        const refunds: BackupRefundItem[] = [];
        purchaseProposalIdSet.add(purch.proposalId);
        for (const refundKey of Object.keys(purch.refunds)) {
          const ri = purch.refunds[refundKey];
          const common = {
            coin_pub: ri.coinPub,
            execution_time: ri.executionTime,
            obtained_time: ri.obtainedTime,
            refund_amount: Amounts.stringify(ri.refundAmount),
            rtransaction_id: ri.rtransactionId,
            total_refresh_cost_bound: Amounts.stringify(
              ri.totalRefreshCostBound,
            ),
          };
          switch (ri.type) {
            case RefundState.Applied:
              refunds.push({ type: BackupRefundState.Applied, ...common });
              break;
            case RefundState.Failed:
              refunds.push({ type: BackupRefundState.Failed, ...common });
              break;
            case RefundState.Pending:
              refunds.push({ type: BackupRefundState.Pending, ...common });
              break;
          }
        }

        backupPurchases.push({
          clock_created: 1,
          contract_terms_raw: purch.download.contractTermsRaw,
          auto_refund_deadline: purch.autoRefundDeadline,
          merchant_pay_sig: purch.merchantPaySig,
          pay_coins: purch.payCoinSelection.coinPubs.map((x, i) => ({
            coin_pub: x,
            contribution: Amounts.stringify(
              purch.payCoinSelection.coinContributions[i],
            ),
          })),
          proposal_id: purch.proposalId,
          refunds,
          timestamp_accept: purch.timestampAccept,
          timestamp_first_successful_pay: purch.timestampFirstSuccessfulPay,
          timestamp_last_refund_status: purch.timestampLastRefundStatus,
          abort_status:
            purch.abortStatus === AbortStatus.None
              ? undefined
              : purch.abortStatus,
          nonce_priv: purch.noncePriv,
          merchant_sig: purch.download.contractData.merchantSig,
          total_pay_cost: Amounts.stringify(purch.totalPayCost),
        });
      });

      await tx.iter(Stores.proposals).forEach((prop) => {
        if (purchaseProposalIdSet.has(prop.proposalId)) {
          return;
        }
        let propStatus: BackupProposalStatus;
        switch (prop.proposalStatus) {
          case ProposalStatus.ACCEPTED:
            return;
          case ProposalStatus.DOWNLOADING:
          case ProposalStatus.PROPOSED:
            propStatus = BackupProposalStatus.Proposed;
            break;
          case ProposalStatus.PERMANENTLY_FAILED:
            propStatus = BackupProposalStatus.PermanentlyFailed;
            break;
          case ProposalStatus.REFUSED:
            propStatus = BackupProposalStatus.Refused;
            break;
          case ProposalStatus.REPURCHASE:
            propStatus = BackupProposalStatus.Repurchase;
            break;
        }
        backupProposals.push({
          claim_token: prop.claimToken,
          nonce_priv: prop.noncePriv,
          proposal_id: prop.noncePriv,
          proposal_status: propStatus,
          repurchase_proposal_id: prop.repurchaseProposalId,
          timestamp: prop.timestamp,
          contract_terms_raw: prop.download?.contractTermsRaw,
          download_session_id: prop.downloadSessionId,
          merchant_base_url: prop.merchantBaseUrl,
          order_id: prop.orderId,
          merchant_sig: prop.download?.contractData.merchantSig,
        });
      });

      await tx.iter(Stores.refreshGroups).forEach((rg) => {
        const oldCoins: BackupRefreshOldCoin[] = [];

        for (let i = 0; i < rg.oldCoinPubs.length; i++) {
          let refreshSession: BackupRefreshSession | undefined;
          const s = rg.refreshSessionPerCoin[i];
          if (s) {
            refreshSession = {
              new_denoms: s.newDenoms.map((x) => ({
                count: x.count,
                denom_pub_hash: x.denomPubHash,
              })),
              session_secret_seed: s.sessionSecretSeed,
              noreveal_index: s.norevealIndex,
            };
          }
          oldCoins.push({
            coin_pub: rg.oldCoinPubs[i],
            estimated_output_amount: Amounts.stringify(
              rg.estimatedOutputPerCoin[i],
            ),
            finished: rg.finishedPerCoin[i],
            input_amount: Amounts.stringify(rg.inputPerCoin[i]),
            refresh_session: refreshSession,
          });
        }

        backupRefreshGroups.push({
          reason: rg.reason as any,
          refresh_group_id: rg.refreshGroupId,
          timestamp_started: rg.timestampCreated,
          timestamp_finished: rg.timestampFinished,
          old_coins: oldCoins,
        });
      });

      if (!bs.lastBackupTimestamp) {
        bs.lastBackupTimestamp = getTimestampNow();
      }

      const backupBlob: WalletBackupContentV1 = {
        schema_id: "gnu-taler-wallet-backup-content",
        schema_version: 1,
        clocks: bs.clocks,
        exchanges: backupExchanges,
        wallet_root_pub: bs.walletRootPub,
        backup_providers: backupBackupProviders,
        current_device_id: bs.deviceId,
        proposals: backupProposals,
        purchase_tombstones: [],
        purchases: backupPurchases,
        recoup_groups: backupRecoupGroups,
        refresh_groups: backupRefreshGroups,
        tips: backupTips,
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

interface CompletedCoin {
  coinPub: string;
  coinEvHash: string;
}

/**
 * Precomputed cryptographic material for a backup import.
 *
 * We separate this data from the backup blob as we want the backup
 * blob to be small, and we can't compute it during the database transaction,
 * as the async crypto worker communication would auto-close the database transaction.
 */
interface BackupCryptoPrecomputedData {
  denomPubToHash: Record<string, string>;
  coinPrivToCompletedCoin: Record<string, CompletedCoin>;
  proposalNoncePrivToPub: { [priv: string]: string };
  proposalIdToContractTermsHash: { [proposalId: string]: string };
  reservePrivToPub: Record<string, string>;
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
        }
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

function checkBackupInvariant(b: boolean, m?: string): asserts b {
  if (!b) {
    if (m) {
      throw Error(`BUG: backup invariant failed (${m})`);
    } else {
      throw Error("BUG: backup invariant failed");
    }
  }
}

/**
 * Re-compute information about the coin selection for a payment.
 */
async function recoverPayCoinSelection(
  tx: TransactionHandle<
    typeof Stores.exchanges | typeof Stores.coins | typeof Stores.denominations
  >,
  contractData: WalletContractData,
  backupPurchase: BackupPurchase,
): Promise<PayCoinSelection> {
  const coinPubs: string[] = backupPurchase.pay_coins.map((x) => x.coin_pub);
  const coinContributions: AmountJson[] = backupPurchase.pay_coins.map((x) =>
    Amounts.parseOrThrow(x.contribution),
  );

  const coveredExchanges: Set<string> = new Set();

  let totalWireFee: AmountJson = Amounts.getZero(contractData.amount.currency);
  let totalDepositFees: AmountJson = Amounts.getZero(
    contractData.amount.currency,
  );

  for (const coinPub of coinPubs) {
    const coinRecord = await tx.get(Stores.coins, coinPub);
    checkBackupInvariant(!!coinRecord);
    const denom = await tx.get(Stores.denominations, [
      coinRecord.exchangeBaseUrl,
      coinRecord.denomPubHash,
    ]);
    checkBackupInvariant(!!denom);
    totalDepositFees = Amounts.add(totalDepositFees, denom.feeDeposit).amount;

    if (!coveredExchanges.has(coinRecord.exchangeBaseUrl)) {
      const exchange = await tx.get(
        Stores.exchanges,
        coinRecord.exchangeBaseUrl,
      );
      checkBackupInvariant(!!exchange);
      let wireFee: AmountJson | undefined;
      const feesForType = exchange.wireInfo?.feesForType;
      checkBackupInvariant(!!feesForType);
      for (const fee of feesForType[contractData.wireMethod] || []) {
        if (
          fee.startStamp <= contractData.timestamp &&
          fee.endStamp >= contractData.timestamp
        ) {
          wireFee = fee.wireFee;
          break;
        }
      }
      if (wireFee) {
        totalWireFee = Amounts.add(totalWireFee, wireFee).amount;
      }
    }
  }

  let customerWireFee: AmountJson;

  const amortizedWireFee = Amounts.divide(
    totalWireFee,
    contractData.wireFeeAmortization,
  );
  if (Amounts.cmp(contractData.maxWireFee, amortizedWireFee) < 0) {
    customerWireFee = amortizedWireFee;
  } else {
    customerWireFee = Amounts.getZero(contractData.amount.currency);
  }

  const customerDepositFees = Amounts.sub(
    totalDepositFees,
    contractData.maxDepositFee,
  ).amount;

  return {
    coinPubs,
    coinContributions,
    paymentAmount: contractData.amount,
    customerWireFees: customerWireFee,
    customerDepositFees,
  };
}

function getDenomSelStateFromBackup(
  tx: TransactionHandle<typeof Stores.denominations>,
  sel: BackupDenomSel,
): Promise<DenomSelectionState> {
  throw Error("not implemented");
}

export async function importBackup(
  ws: InternalWalletState,
  backupRequest: BackupRequest,
  cryptoComp: BackupCryptoPrecomputedData,
): Promise<void> {
  await provideBackupState(ws);
  return ws.db.runWithWriteTransaction(
    [
      Stores.config,
      Stores.exchanges,
      Stores.coins,
      Stores.denominations,
      Stores.purchases,
      Stores.proposals,
      Stores.refreshGroups,
      Stores.backupProviders,
      Stores.tips,
      Stores.recoupGroups,
      Stores.reserves,
      Stores.withdrawalGroups,
    ],
    async (tx) => {
      // FIXME: validate schema!
      const backupBlob = backupRequest.backupBlob as WalletBackupContentV1;

      // FIXME: validate version

      for (const backupExchange of backupBlob.exchanges) {
        const existingExchange = await tx.get(
          Stores.exchanges,
          backupExchange.base_url,
        );

        if (!existingExchange) {
          const wireInfo: ExchangeWireInfo = {
            accounts: backupExchange.accounts.map((x) => ({
              master_sig: x.master_sig,
              payto_uri: x.payto_uri,
            })),
            feesForType: {},
          };
          for (const fee of backupExchange.wire_fees) {
            const w = (wireInfo.feesForType[fee.wire_type] ??= []);
            w.push({
              closingFee: Amounts.parseOrThrow(fee.closing_fee),
              endStamp: fee.end_stamp,
              sig: fee.sig,
              startStamp: fee.start_stamp,
              wireFee: Amounts.parseOrThrow(fee.wire_fee),
            });
          }
          await tx.put(Stores.exchanges, {
            addComplete: true,
            baseUrl: backupExchange.base_url,
            builtIn: false,
            updateReason: undefined,
            permanent: true,
            retryInfo: initRetryInfo(),
            termsOfServiceAcceptedEtag: backupExchange.tos_etag_accepted,
            termsOfServiceText: undefined,
            termsOfServiceLastEtag: backupExchange.tos_etag_last,
            updateStarted: getTimestampNow(),
            updateStatus: ExchangeUpdateStatus.FetchKeys,
            wireInfo,
            details: {
              currency: backupExchange.currency,
              auditors: backupExchange.auditors.map((x) => ({
                auditor_pub: x.auditor_pub,
                auditor_url: x.auditor_url,
                denomination_keys: x.denomination_keys,
              })),
              lastUpdateTime: { t_ms: "never" },
              masterPublicKey: backupExchange.master_public_key,
              nextUpdateTime: { t_ms: "never" },
              protocolVersion: backupExchange.protocol_version,
              signingKeys: backupExchange.signing_keys.map((x) => ({
                key: x.key,
                master_sig: x.master_sig,
                stamp_end: x.stamp_end,
                stamp_expire: x.stamp_expire,
                stamp_start: x.stamp_start,
              })),
            },
          });
        }

        for (const backupDenomination of backupExchange.denominations) {
          const denomPubHash =
            cryptoComp.denomPubToHash[backupDenomination.denom_pub];
          checkLogicInvariant(!!denomPubHash);
          const existingDenom = await tx.get(Stores.denominations, [
            backupExchange.base_url,
            denomPubHash,
          ]);
          if (!existingDenom) {
            await tx.put(Stores.denominations, {
              denomPub: backupDenomination.denom_pub,
              denomPubHash: denomPubHash,
              exchangeBaseUrl: backupExchange.base_url,
              feeDeposit: Amounts.parseOrThrow(backupDenomination.fee_deposit),
              feeRefresh: Amounts.parseOrThrow(backupDenomination.fee_refresh),
              feeRefund: Amounts.parseOrThrow(backupDenomination.fee_refund),
              feeWithdraw: Amounts.parseOrThrow(
                backupDenomination.fee_withdraw,
              ),
              isOffered: backupDenomination.is_offered,
              isRevoked: backupDenomination.is_revoked,
              masterSig: backupDenomination.master_sig,
              stampExpireDeposit: backupDenomination.stamp_expire_deposit,
              stampExpireLegal: backupDenomination.stamp_expire_legal,
              stampExpireWithdraw: backupDenomination.stamp_expire_withdraw,
              stampStart: backupDenomination.stamp_start,
              status: DenominationStatus.VerifiedGood,
              value: Amounts.parseOrThrow(backupDenomination.value),
            });
          }
          for (const backupCoin of backupDenomination.coins) {
            const compCoin =
              cryptoComp.coinPrivToCompletedCoin[backupCoin.coin_priv];
            checkLogicInvariant(!!compCoin);
            const existingCoin = await tx.get(Stores.coins, compCoin.coinPub);
            if (!existingCoin) {
              let coinSource: CoinSource;
              switch (backupCoin.coin_source.type) {
                case BackupCoinSourceType.Refresh:
                  coinSource = {
                    type: CoinSourceType.Refresh,
                    oldCoinPub: backupCoin.coin_source.old_coin_pub,
                  };
                  break;
                case BackupCoinSourceType.Tip:
                  coinSource = {
                    type: CoinSourceType.Tip,
                    coinIndex: backupCoin.coin_source.coin_index,
                    walletTipId: backupCoin.coin_source.wallet_tip_id,
                  };
                  break;
                case BackupCoinSourceType.Withdraw:
                  coinSource = {
                    type: CoinSourceType.Withdraw,
                    coinIndex: backupCoin.coin_source.coin_index,
                    reservePub: backupCoin.coin_source.reserve_pub,
                    withdrawalGroupId:
                      backupCoin.coin_source.withdrawal_group_id,
                  };
                  break;
              }
              await tx.put(Stores.coins, {
                blindingKey: backupCoin.blinding_key,
                coinEvHash: compCoin.coinEvHash,
                coinPriv: backupCoin.coin_priv,
                currentAmount: Amounts.parseOrThrow(backupCoin.current_amount),
                denomSig: backupCoin.denom_sig,
                coinPub: compCoin.coinPub,
                suspended: false,
                exchangeBaseUrl: backupExchange.base_url,
                denomPub: backupDenomination.denom_pub,
                denomPubHash,
                status: backupCoin.fresh
                  ? CoinStatus.Fresh
                  : CoinStatus.Dormant,
                coinSource,
              });
            }
          }
        }

        for (const backupReserve of backupExchange.reserves) {
          const reservePub =
            cryptoComp.reservePrivToPub[backupReserve.reserve_priv];
          checkLogicInvariant(!!reservePub);
          const existingReserve = await tx.get(Stores.reserves, reservePub);
          const instructedAmount = Amounts.parseOrThrow(
            backupReserve.instructed_amount,
          );
          if (!existingReserve) {
            let bankInfo: ReserveBankInfo | undefined;
            if (backupReserve.bank_info) {
              bankInfo = {
                exchangePaytoUri: backupReserve.bank_info.exchange_payto_uri,
                statusUrl: backupReserve.bank_info.status_url,
                confirmUrl: backupReserve.bank_info.confirm_url,
              };
            }
            await tx.put(Stores.reserves, {
              currency: instructedAmount.currency,
              instructedAmount,
              exchangeBaseUrl: backupExchange.base_url,
              reservePub,
              reservePriv: backupReserve.reserve_priv,
              requestedQuery: false,
              bankInfo,
              timestampCreated: backupReserve.timestamp_created,
              timestampBankConfirmed:
                backupReserve.bank_info?.timestamp_bank_confirmed,
              timestampReserveInfoPosted:
                backupReserve.bank_info?.timestamp_reserve_info_posted,
              senderWire: backupReserve.sender_wire,
              retryInfo: initRetryInfo(false),
              lastError: undefined,
              lastSuccessfulStatusQuery: { t_ms: "never" },
              initialWithdrawalGroupId:
                backupReserve.initial_withdrawal_group_id,
              initialWithdrawalStarted:
                backupReserve.withdrawal_groups.length > 0,
              // FIXME!
              reserveStatus: ReserveRecordStatus.QUERYING_STATUS,
              initialDenomSel: await getDenomSelStateFromBackup(
                tx,
                backupReserve.initial_selected_denoms,
              ),
            });
          }
          for (const backupWg of backupReserve.withdrawal_groups) {
            const existingWg = await tx.get(
              Stores.withdrawalGroups,
              backupWg.withdrawal_group_id,
            );
            if (!existingWg) {
              await tx.put(Stores.withdrawalGroups, {
                denomsSel: await getDenomSelStateFromBackup(
                  tx,
                  backupWg.selected_denoms,
                ),
                exchangeBaseUrl: backupExchange.base_url,
                lastError: undefined,
                rawWithdrawalAmount: Amounts.parseOrThrow(
                  backupWg.raw_withdrawal_amount,
                ),
                reservePub,
                retryInfo: initRetryInfo(false),
                secretSeed: backupWg.secret_seed,
                timestampStart: backupWg.timestamp_start,
                timestampFinish: backupWg.timestamp_finish,
                withdrawalGroupId: backupWg.withdrawal_group_id,
              });
            }
          }
        }
      }

      for (const backupProposal of backupBlob.proposals) {
        const existingProposal = await tx.get(
          Stores.proposals,
          backupProposal.proposal_id,
        );
        if (!existingProposal) {
          let download: ProposalDownload | undefined;
          let proposalStatus: ProposalStatus;
          switch (backupProposal.proposal_status) {
            case BackupProposalStatus.Proposed:
              if (backupProposal.contract_terms_raw) {
                proposalStatus = ProposalStatus.PROPOSED;
              } else {
                proposalStatus = ProposalStatus.DOWNLOADING;
              }
              break;
            case BackupProposalStatus.Refused:
              proposalStatus = ProposalStatus.REFUSED;
              break;
            case BackupProposalStatus.Repurchase:
              proposalStatus = ProposalStatus.REPURCHASE;
              break;
            case BackupProposalStatus.PermanentlyFailed:
              proposalStatus = ProposalStatus.PERMANENTLY_FAILED;
              break;
          }
          if (backupProposal.contract_terms_raw) {
            checkDbInvariant(!!backupProposal.merchant_sig);
            const parsedContractTerms = codecForContractTerms().decode(
              backupProposal.contract_terms_raw,
            );
            const amount = Amounts.parseOrThrow(parsedContractTerms.amount);
            const contractTermsHash =
              cryptoComp.proposalIdToContractTermsHash[
                backupProposal.proposal_id
              ];
            let maxWireFee: AmountJson;
            if (parsedContractTerms.max_wire_fee) {
              maxWireFee = Amounts.parseOrThrow(
                parsedContractTerms.max_wire_fee,
              );
            } else {
              maxWireFee = Amounts.getZero(amount.currency);
            }
            download = {
              contractData: {
                amount,
                contractTermsHash: contractTermsHash,
                fulfillmentUrl: parsedContractTerms.fulfillment_url ?? "",
                merchantBaseUrl: parsedContractTerms.merchant_base_url,
                merchantPub: parsedContractTerms.merchant_pub,
                merchantSig: backupProposal.merchant_sig,
                orderId: parsedContractTerms.order_id,
                summary: parsedContractTerms.summary,
                autoRefund: parsedContractTerms.auto_refund,
                maxWireFee,
                payDeadline: parsedContractTerms.pay_deadline,
                refundDeadline: parsedContractTerms.refund_deadline,
                wireFeeAmortization:
                  parsedContractTerms.wire_fee_amortization || 1,
                allowedAuditors: parsedContractTerms.auditors.map((x) => ({
                  auditorBaseUrl: x.url,
                  auditorPub: x.master_pub,
                })),
                allowedExchanges: parsedContractTerms.exchanges.map((x) => ({
                  exchangeBaseUrl: x.url,
                  exchangePub: x.master_pub,
                })),
                timestamp: parsedContractTerms.timestamp,
                wireMethod: parsedContractTerms.wire_method,
                wireInfoHash: parsedContractTerms.h_wire,
                maxDepositFee: Amounts.parseOrThrow(
                  parsedContractTerms.max_fee,
                ),
                merchant: parsedContractTerms.merchant,
                products: parsedContractTerms.products,
                summaryI18n: parsedContractTerms.summary_i18n,
              },
              contractTermsRaw: backupProposal.contract_terms_raw,
            };
          }
          await tx.put(Stores.proposals, {
            claimToken: backupProposal.claim_token,
            lastError: undefined,
            merchantBaseUrl: backupProposal.merchant_base_url,
            timestamp: backupProposal.timestamp,
            orderId: backupProposal.order_id,
            noncePriv: backupProposal.nonce_priv,
            noncePub:
              cryptoComp.proposalNoncePrivToPub[backupProposal.nonce_priv],
            proposalId: backupProposal.proposal_id,
            repurchaseProposalId: backupProposal.repurchase_proposal_id,
            retryInfo: initRetryInfo(false),
            download,
            proposalStatus,
          });
        }
      }

      for (const backupPurchase of backupBlob.purchases) {
        const existingPurchase = await tx.get(
          Stores.purchases,
          backupPurchase.proposal_id,
        );
        if (!existingPurchase) {
          const refunds: { [refundKey: string]: WalletRefundItem } = {};
          for (const backupRefund of backupPurchase.refunds) {
            const key = `${backupRefund.coin_pub}-${backupRefund.rtransaction_id}`;
            const coin = await tx.get(Stores.coins, backupRefund.coin_pub);
            checkBackupInvariant(!!coin);
            const denom = await tx.get(Stores.denominations, [
              coin.exchangeBaseUrl,
              coin.denomPubHash,
            ]);
            checkBackupInvariant(!!denom);
            const common = {
              coinPub: backupRefund.coin_pub,
              executionTime: backupRefund.execution_time,
              obtainedTime: backupRefund.obtained_time,
              refundAmount: Amounts.parseOrThrow(backupRefund.refund_amount),
              refundFee: denom.feeRefund,
              rtransactionId: backupRefund.rtransaction_id,
              totalRefreshCostBound: Amounts.parseOrThrow(
                backupRefund.total_refresh_cost_bound,
              ),
            };
            switch (backupRefund.type) {
              case BackupRefundState.Applied:
                refunds[key] = {
                  type: RefundState.Applied,
                  ...common,
                };
                break;
              case BackupRefundState.Failed:
                refunds[key] = {
                  type: RefundState.Failed,
                  ...common,
                };
                break;
              case BackupRefundState.Pending:
                refunds[key] = {
                  type: RefundState.Pending,
                  ...common,
                };
                break;
            }
          }
          let abortStatus: AbortStatus;
          switch (backupPurchase.abort_status) {
            case "abort-finished":
              abortStatus = AbortStatus.AbortFinished;
              break;
            case "abort-refund":
              abortStatus = AbortStatus.AbortRefund;
              break;
            default:
              throw Error("not reachable");
          }
          const parsedContractTerms = codecForContractTerms().decode(
            backupPurchase.contract_terms_raw,
          );
          const amount = Amounts.parseOrThrow(parsedContractTerms.amount);
          const contractTermsHash =
            cryptoComp.proposalIdToContractTermsHash[
              backupPurchase.proposal_id
            ];
          let maxWireFee: AmountJson;
          if (parsedContractTerms.max_wire_fee) {
            maxWireFee = Amounts.parseOrThrow(parsedContractTerms.max_wire_fee);
          } else {
            maxWireFee = Amounts.getZero(amount.currency);
          }
          const download: ProposalDownload = {
            contractData: {
              amount,
              contractTermsHash: contractTermsHash,
              fulfillmentUrl: parsedContractTerms.fulfillment_url ?? "",
              merchantBaseUrl: parsedContractTerms.merchant_base_url,
              merchantPub: parsedContractTerms.merchant_pub,
              merchantSig: backupPurchase.merchant_sig,
              orderId: parsedContractTerms.order_id,
              summary: parsedContractTerms.summary,
              autoRefund: parsedContractTerms.auto_refund,
              maxWireFee,
              payDeadline: parsedContractTerms.pay_deadline,
              refundDeadline: parsedContractTerms.refund_deadline,
              wireFeeAmortization:
                parsedContractTerms.wire_fee_amortization || 1,
              allowedAuditors: parsedContractTerms.auditors.map((x) => ({
                auditorBaseUrl: x.url,
                auditorPub: x.master_pub,
              })),
              allowedExchanges: parsedContractTerms.exchanges.map((x) => ({
                exchangeBaseUrl: x.url,
                exchangePub: x.master_pub,
              })),
              timestamp: parsedContractTerms.timestamp,
              wireMethod: parsedContractTerms.wire_method,
              wireInfoHash: parsedContractTerms.h_wire,
              maxDepositFee: Amounts.parseOrThrow(parsedContractTerms.max_fee),
              merchant: parsedContractTerms.merchant,
              products: parsedContractTerms.products,
              summaryI18n: parsedContractTerms.summary_i18n,
            },
            contractTermsRaw: backupPurchase.contract_terms_raw,
          };
          await tx.put(Stores.purchases, {
            proposalId: backupPurchase.proposal_id,
            noncePriv: backupPurchase.nonce_priv,
            noncePub:
              cryptoComp.proposalNoncePrivToPub[backupPurchase.nonce_priv],
            lastPayError: undefined,
            autoRefundDeadline: { t_ms: "never" },
            refundStatusRetryInfo: initRetryInfo(false),
            lastRefundStatusError: undefined,
            timestampAccept: backupPurchase.timestamp_accept,
            timestampFirstSuccessfulPay:
              backupPurchase.timestamp_first_successful_pay,
            timestampLastRefundStatus:
              backupPurchase.timestamp_last_refund_status,
            merchantPaySig: backupPurchase.merchant_pay_sig,
            lastSessionId: undefined,
            abortStatus,
            // FIXME!
            payRetryInfo: initRetryInfo(false),
            download,
            paymentSubmitPending: !backupPurchase.timestamp_first_successful_pay,
            refundQueryRequested: false,
            payCoinSelection: await recoverPayCoinSelection(
              tx,
              download.contractData,
              backupPurchase,
            ),
            coinDepositPermissions: undefined,
            totalPayCost: Amounts.parseOrThrow(backupPurchase.total_pay_cost),
            refunds,
          });
        }
      }

      for (const backupRefreshGroup of backupBlob.refresh_groups) {
        const existingRg = await tx.get(
          Stores.refreshGroups,
          backupRefreshGroup.refresh_group_id,
        );
        if (!existingRg) {
          let reason: RefreshReason;
          switch (backupRefreshGroup.reason) {
            case BackupRefreshReason.AbortPay:
              reason = RefreshReason.AbortPay;
              break;
            case BackupRefreshReason.BackupRestored:
              reason = RefreshReason.BackupRestored;
              break;
            case BackupRefreshReason.Manual:
              reason = RefreshReason.Manual;
              break;
            case BackupRefreshReason.Pay:
              reason = RefreshReason.Pay;
              break;
            case BackupRefreshReason.Recoup:
              reason = RefreshReason.Recoup;
              break;
            case BackupRefreshReason.Refund:
              reason = RefreshReason.Refund;
              break;
            case BackupRefreshReason.Scheduled:
              reason = RefreshReason.Scheduled;
              break;
          }
          const refreshSessionPerCoin: (
            | RefreshSessionRecord
            | undefined
          )[] = [];
          for (const oldCoin of backupRefreshGroup.old_coins) {
            if (oldCoin.refresh_session) {
              const denomSel = await getDenomSelStateFromBackup(
                tx,
                oldCoin.refresh_session.new_denoms,
              );
              refreshSessionPerCoin.push({
                sessionSecretSeed: oldCoin.refresh_session.session_secret_seed,
                norevealIndex: oldCoin.refresh_session.noreveal_index,
                newDenoms: oldCoin.refresh_session.new_denoms.map((x) => ({
                  count: x.count,
                  denomPubHash: x.denom_pub_hash,
                })),
                amountRefreshOutput: denomSel.totalCoinValue,
              });
            } else {
              refreshSessionPerCoin.push(undefined);
            }
          }
          await tx.put(Stores.refreshGroups, {
            timestampFinished: backupRefreshGroup.timestamp_finished,
            timestampCreated: backupRefreshGroup.timestamp_started,
            refreshGroupId: backupRefreshGroup.refresh_group_id,
            reason,
            lastError: undefined,
            lastErrorPerCoin: {},
            oldCoinPubs: backupRefreshGroup.old_coins.map((x) => x.coin_pub),
            finishedPerCoin: backupRefreshGroup.old_coins.map(
              (x) => x.finished,
            ),
            inputPerCoin: backupRefreshGroup.old_coins.map((x) =>
              Amounts.parseOrThrow(x.input_amount),
            ),
            estimatedOutputPerCoin: backupRefreshGroup.old_coins.map((x) =>
              Amounts.parseOrThrow(x.estimated_output_amount),
            ),
            refreshSessionPerCoin,
            retryInfo: initRetryInfo(false),
          });
        }
      }

      for (const backupTip of backupBlob.tips) {
        const existingTip = await tx.get(Stores.tips, backupTip.wallet_tip_id);
        if (!existingTip) {
          const denomsSel = await getDenomSelStateFromBackup(
            tx,
            backupTip.selected_denoms,
          );
          await tx.put(Stores.tips, {
            acceptedTimestamp: backupTip.timestamp_accepted,
            createdTimestamp: backupTip.timestamp_created,
            denomsSel,
            exchangeBaseUrl: backupTip.exchange_base_url,
            lastError: undefined,
            merchantBaseUrl: backupTip.exchange_base_url,
            merchantTipId: backupTip.merchant_tip_id,
            pickedUpTimestamp: backupTip.timestam_picked_up,
            retryInfo: initRetryInfo(false),
            secretSeed: backupTip.secret_seed,
            tipAmountEffective: denomsSel.totalCoinValue,
            tipAmountRaw: Amounts.parseOrThrow(backupTip.tip_amount_raw),
            tipExpiration: backupTip.timestamp_expiration,
            walletTipId: backupTip.wallet_tip_id,
          });
        }
      }
    },
  );
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
