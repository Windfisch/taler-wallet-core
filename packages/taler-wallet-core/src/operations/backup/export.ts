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
import {
  AbsoluteTime,
  Amounts,
  BackupBackupProvider,
  BackupBackupProviderTerms,
  BackupCoin,
  BackupCoinSource,
  BackupCoinSourceType,
  BackupDenomination,
  BackupExchange,
  BackupExchangeDetails,
  BackupExchangeWireFee,
  BackupOperationStatus,
  BackupPayInfo,
  BackupProposalStatus,
  BackupPurchase,
  BackupRecoupGroup,
  BackupRefreshGroup,
  BackupRefreshOldCoin,
  BackupRefreshSession,
  BackupRefundItem,
  BackupRefundState,
  BackupTip,
  BackupWgInfo,
  BackupWgType,
  BackupWithdrawalGroup,
  BACKUP_VERSION_MAJOR,
  BACKUP_VERSION_MINOR,
  canonicalizeBaseUrl,
  canonicalJson,
  encodeCrock,
  getRandomBytes,
  hash,
  Logger,
  stringToBytes,
  WalletBackupContentV1,
} from "@gnu-taler/taler-util";
import {
  CoinSourceType,
  CoinStatus,
  DenominationRecord,
  ProposalStatus,
  RefreshCoinStatus,
  RefundState,
  WALLET_BACKUP_STATE_KEY,
  WithdrawalGroupStatus,
  WithdrawalRecordType,
} from "../../db.js";
import { InternalWalletState } from "../../internal-wallet-state.js";
import { assertUnreachable } from "../../util/assertUnreachable.js";
import { getWalletBackupState, provideBackupState } from "./state.js";

const logger = new Logger("backup/export.ts");

export async function exportBackup(
  ws: InternalWalletState,
): Promise<WalletBackupContentV1> {
  await provideBackupState(ws);
  return ws.db
    .mktx((x) => [
      x.config,
      x.exchanges,
      x.exchangeDetails,
      x.coins,
      x.denominations,
      x.purchases,
      x.refreshGroups,
      x.backupProviders,
      x.tips,
      x.recoupGroups,
      x.withdrawalGroups,
    ])
    .runReadWrite(async (tx) => {
      const bs = await getWalletBackupState(ws, tx);

      const backupExchangeDetails: BackupExchangeDetails[] = [];
      const backupExchanges: BackupExchange[] = [];
      const backupCoinsByDenom: { [dph: string]: BackupCoin[] } = {};
      const backupDenominationsByExchange: {
        [url: string]: BackupDenomination[];
      } = {};
      const backupPurchases: BackupPurchase[] = [];
      const backupRefreshGroups: BackupRefreshGroup[] = [];
      const backupBackupProviders: BackupBackupProvider[] = [];
      const backupTips: BackupTip[] = [];
      const backupRecoupGroups: BackupRecoupGroup[] = [];
      const backupWithdrawalGroups: BackupWithdrawalGroup[] = [];

      await tx.withdrawalGroups.iter().forEachAsync(async (wg) => {
        let info: BackupWgInfo;
        switch (wg.wgInfo.withdrawalType) {
          case WithdrawalRecordType.BankIntegrated:
            info = {
              type: BackupWgType.BankIntegrated,
              exchange_payto_uri: wg.wgInfo.bankInfo.exchangePaytoUri,
              taler_withdraw_uri: wg.wgInfo.bankInfo.talerWithdrawUri,
              confirm_url: wg.wgInfo.bankInfo.confirmUrl,
              timestamp_bank_confirmed:
                wg.wgInfo.bankInfo.timestampBankConfirmed,
              timestamp_reserve_info_posted:
                wg.wgInfo.bankInfo.timestampReserveInfoPosted,
            };
            break;
          case WithdrawalRecordType.BankManual:
            info = {
              type: BackupWgType.BankManual,
            };
            break;
          case WithdrawalRecordType.PeerPullCredit:
            info = {
              type: BackupWgType.PeerPullCredit,
              contract_priv: wg.wgInfo.contractPriv,
              contract_terms: wg.wgInfo.contractTerms,
            };
            break;
          case WithdrawalRecordType.PeerPushCredit:
            info = {
              type: BackupWgType.PeerPushCredit,
              contract_terms: wg.wgInfo.contractTerms,
            };
            break;
          case WithdrawalRecordType.Recoup:
            info = {
              type: BackupWgType.Recoup,
            };
            break;
          default:
            assertUnreachable(wg.wgInfo);
        }
        backupWithdrawalGroups.push({
          raw_withdrawal_amount: Amounts.stringify(wg.rawWithdrawalAmount),
          info,
          timestamp_created: wg.timestampStart,
          timestamp_finish: wg.timestampFinish,
          withdrawal_group_id: wg.withdrawalGroupId,
          secret_seed: wg.secretSeed,
          exchange_base_url: wg.exchangeBaseUrl,
          instructed_amount: Amounts.stringify(wg.instructedAmount),
          reserve_priv: wg.reservePriv,
          restrict_age: wg.restrictAge,
          // FIXME: proper status conversion!
          operation_status:
            wg.status == WithdrawalGroupStatus.Finished
              ? BackupOperationStatus.Finished
              : BackupOperationStatus.Pending,
          selected_denoms_uid: wg.denomSelUid,
          selected_denoms: wg.denomsSel.selectedDenoms.map((x) => ({
            count: x.count,
            denom_pub_hash: x.denomPubHash,
          })),
        });
      });

      await tx.tips.iter().forEach((tip) => {
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
          timestamp_finished: tip.pickedUpTimestamp,
          timestamp_accepted: tip.acceptedTimestamp,
          timestamp_created: tip.createdTimestamp,
          timestamp_expiration: tip.tipExpiration,
          tip_amount_raw: Amounts.stringify(tip.tipAmountRaw),
          selected_denoms_uid: tip.denomSelUid,
        });
      });

      await tx.recoupGroups.iter().forEach((recoupGroup) => {
        backupRecoupGroups.push({
          recoup_group_id: recoupGroup.recoupGroupId,
          timestamp_created: recoupGroup.timestampStarted,
          timestamp_finish: recoupGroup.timestampFinished,
          coins: recoupGroup.coinPubs.map((x, i) => ({
            coin_pub: x,
            recoup_finished: recoupGroup.recoupFinishedPerCoin[i],
            old_amount: Amounts.stringify(recoupGroup.oldAmountPerCoin[i]),
          })),
        });
      });

      await tx.backupProviders.iter().forEach((bp) => {
        let terms: BackupBackupProviderTerms | undefined;
        if (bp.terms) {
          terms = {
            annual_fee: Amounts.stringify(bp.terms.annualFee),
            storage_limit_in_megabytes: bp.terms.storageLimitInMegabytes,
            supported_protocol_version: bp.terms.supportedProtocolVersion,
          };
        }
        backupBackupProviders.push({
          terms,
          base_url: canonicalizeBaseUrl(bp.baseUrl),
          pay_proposal_ids: bp.paymentProposalIds,
          uids: bp.uids,
        });
      });

      await tx.coins.iter().forEach((coin) => {
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

      await tx.denominations.iter().forEach((denom) => {
        const backupDenoms = (backupDenominationsByExchange[
          denom.exchangeBaseUrl
        ] ??= []);
        backupDenoms.push({
          coins: backupCoinsByDenom[denom.denomPubHash] ?? [],
          denom_pub: denom.denomPub,
          fee_deposit: Amounts.stringify(denom.fees.feeDeposit),
          fee_refresh: Amounts.stringify(denom.fees.feeRefresh),
          fee_refund: Amounts.stringify(denom.fees.feeRefund),
          fee_withdraw: Amounts.stringify(denom.fees.feeWithdraw),
          is_offered: denom.isOffered,
          is_revoked: denom.isRevoked,
          master_sig: denom.masterSig,
          stamp_expire_deposit: denom.stampExpireDeposit,
          stamp_expire_legal: denom.stampExpireLegal,
          stamp_expire_withdraw: denom.stampExpireWithdraw,
          stamp_start: denom.stampStart,
          value: Amounts.stringify(DenominationRecord.getValue(denom)),
          list_issue_date: denom.listIssueDate,
        });
      });

      await tx.exchanges.iter().forEachAsync(async (ex) => {
        const dp = ex.detailsPointer;
        if (!dp) {
          return;
        }
        backupExchanges.push({
          base_url: ex.baseUrl,
          currency: dp.currency,
          master_public_key: dp.masterPublicKey,
          update_clock: dp.updateClock,
          protocol_version_range: dp.protocolVersionRange,
        });
      });

      await tx.exchangeDetails.iter().forEachAsync(async (ex) => {
        // Only back up permanently added exchanges.

        const wi = ex.wireInfo;
        const wireFees: BackupExchangeWireFee[] = [];

        Object.keys(wi.feesForType).forEach((x) => {
          for (const f of wi.feesForType[x]) {
            wireFees.push({
              wire_type: x,
              closing_fee: Amounts.stringify(f.closingFee),
              wad_fee: Amounts.stringify(f.wadFee),
              end_stamp: f.endStamp,
              sig: f.sig,
              start_stamp: f.startStamp,
              wire_fee: Amounts.stringify(f.wireFee),
            });
          }
        });

        backupExchangeDetails.push({
          base_url: ex.exchangeBaseUrl,
          reserve_closing_delay: ex.reserveClosingDelay,
          accounts: ex.wireInfo.accounts.map((x) => ({
            payto_uri: x.payto_uri,
            master_sig: x.master_sig,
          })),
          auditors: ex.auditors.map((x) => ({
            auditor_pub: x.auditor_pub,
            auditor_url: x.auditor_url,
            denomination_keys: x.denomination_keys,
          })),
          master_public_key: ex.masterPublicKey,
          currency: ex.currency,
          protocol_version: ex.protocolVersion,
          wire_fees: wireFees,
          signing_keys: ex.signingKeys.map((x) => ({
            key: x.key,
            master_sig: x.master_sig,
            stamp_end: x.stamp_end,
            stamp_expire: x.stamp_expire,
            stamp_start: x.stamp_start,
          })),
          tos_accepted_etag: ex.termsOfServiceAcceptedEtag,
          tos_accepted_timestamp: ex.termsOfServiceAcceptedTimestamp,
          denominations:
            backupDenominationsByExchange[ex.exchangeBaseUrl] ?? [],
        });
      });

      const purchaseProposalIdSet = new Set<string>();

      await tx.purchases.iter().forEach((purch) => {
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

        let propStatus: BackupProposalStatus;
        switch (purch.status) {
          case ProposalStatus.Paid:
            propStatus = BackupProposalStatus.Paid;
            return;
          case ProposalStatus.DownloadingProposal:
          case ProposalStatus.Proposed:
            propStatus = BackupProposalStatus.Proposed;
            break;
          case ProposalStatus.ProposalDownloadFailed:
            propStatus = BackupProposalStatus.PermanentlyFailed;
            break;
          case ProposalStatus.ProposalRefused:
            propStatus = BackupProposalStatus.Refused;
            break;
          case ProposalStatus.RepurchaseDetected:
            propStatus = BackupProposalStatus.Repurchase;
            break;
          default:
            throw Error();
        }

        const payInfo = purch.payInfo;
        let backupPayInfo: BackupPayInfo | undefined = undefined;
        if (payInfo) {
          backupPayInfo = {
            pay_coins: payInfo.payCoinSelection.coinPubs.map((x, i) => ({
              coin_pub: x,
              contribution: Amounts.stringify(
                payInfo.payCoinSelection.coinContributions[i],
              ),
            })),
            total_pay_cost: Amounts.stringify(payInfo.totalPayCost),
            pay_coins_uid: payInfo.payCoinSelectionUid,
          };
        }

        backupPurchases.push({
          contract_terms_raw: purch.download?.contractTermsRaw,
          auto_refund_deadline: purch.autoRefundDeadline,
          merchant_pay_sig: purch.merchantPaySig,
          pay_info: backupPayInfo,
          proposal_id: purch.proposalId,
          refunds,
          timestamp_accepted: purch.timestampAccept,
          timestamp_first_successful_pay: purch.timestampFirstSuccessfulPay,
          nonce_priv: purch.noncePriv,
          merchant_sig: purch.download?.contractData.merchantSig,
          claim_token: purch.claimToken,
          merchant_base_url: purch.merchantBaseUrl,
          order_id: purch.orderId,
          proposal_status: propStatus,
          repurchase_proposal_id: purch.repurchaseProposalId,
          download_session_id: purch.downloadSessionId,
          timestamp_proposed: purch.timestamp,
        });
      });

      await tx.refreshGroups.iter().forEach((rg) => {
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
            finished: rg.statusPerCoin[i] === RefreshCoinStatus.Finished,
            input_amount: Amounts.stringify(rg.inputPerCoin[i]),
            refresh_session: refreshSession,
          });
        }

        backupRefreshGroups.push({
          reason: rg.reason as any,
          refresh_group_id: rg.refreshGroupId,
          timestamp_created: rg.timestampCreated,
          timestamp_finish: rg.timestampFinished,
          old_coins: oldCoins,
        });
      });

      const ts = AbsoluteTime.toTimestamp(AbsoluteTime.now());

      if (!bs.lastBackupTimestamp) {
        bs.lastBackupTimestamp = ts;
      }

      const backupBlob: WalletBackupContentV1 = {
        schema_id: "gnu-taler-wallet-backup-content",
        schema_version: BACKUP_VERSION_MAJOR,
        minor_version: BACKUP_VERSION_MINOR,
        exchanges: backupExchanges,
        exchange_details: backupExchangeDetails,
        wallet_root_pub: bs.walletRootPub,
        backup_providers: backupBackupProviders,
        current_device_id: bs.deviceId,
        purchases: backupPurchases,
        recoup_groups: backupRecoupGroups,
        refresh_groups: backupRefreshGroups,
        tips: backupTips,
        timestamp: bs.lastBackupTimestamp,
        trusted_auditors: {},
        trusted_exchanges: {},
        intern_table: {},
        error_reports: [],
        tombstones: [],
        // FIXME!
        withdrawal_groups: backupWithdrawalGroups,
      };

      // If the backup changed, we change our nonce and timestamp.

      let h = encodeCrock(hash(stringToBytes(canonicalJson(backupBlob))));
      if (h !== bs.lastBackupPlainHash) {
        logger.trace(
          `plain backup hash changed (from ${bs.lastBackupPlainHash}to ${h})`,
        );
        bs.lastBackupTimestamp = ts;
        backupBlob.timestamp = ts;
        bs.lastBackupPlainHash = encodeCrock(
          hash(stringToBytes(canonicalJson(backupBlob))),
        );
        bs.lastBackupNonce = encodeCrock(getRandomBytes(32));
        logger.trace(
          `setting timestamp to ${AbsoluteTime.toIsoString(
            AbsoluteTime.fromTimestamp(ts),
          )} and nonce to ${bs.lastBackupNonce}`,
        );
        await tx.config.put({
          key: WALLET_BACKUP_STATE_KEY,
          value: bs,
        });
      } else {
        logger.trace("backup hash did not change");
      }

      return backupBlob;
    });
}
