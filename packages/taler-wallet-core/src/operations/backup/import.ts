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

import {
  AgeRestriction,
  AmountJson,
  Amounts,
  BackupCoin,
  BackupCoinSourceType,
  BackupDenomSel,
  BackupPayInfo,
  BackupProposalStatus,
  BackupRefreshReason,
  BackupRefundState,
  BackupWgType,
  codecForContractTerms,
  DenomKeyType,
  DenomSelectionState,
  j2s,
  Logger,
  PayCoinSelection,
  RefreshReason,
  TalerProtocolTimestamp,
  WalletBackupContentV1,
  WireInfo,
} from "@gnu-taler/taler-util";
import {
  CoinRecord,
  CoinSource,
  CoinSourceType,
  CoinStatus,
  DenominationRecord,
  DenominationVerificationStatus,
  OperationStatus,
  ProposalDownload,
  PurchaseStatus,
  PurchasePayInfo,
  RefreshCoinStatus,
  RefreshSessionRecord,
  RefundState,
  WalletContractData,
  WalletRefundItem,
  WalletStoresV1,
  WgInfo,
  WithdrawalGroupStatus,
  WithdrawalRecordType,
  RefreshOperationStatus,
} from "../../db.js";
import { InternalWalletState } from "../../internal-wallet-state.js";
import { assertUnreachable } from "../../util/assertUnreachable.js";
import { checkLogicInvariant } from "../../util/invariants.js";
import { GetReadOnlyAccess, GetReadWriteAccess } from "../../util/query.js";
import { makeCoinAvailable, makeEventId, TombstoneTag } from "../common.js";
import { getExchangeDetails } from "../exchanges.js";
import { extractContractData } from "../pay-merchant.js";
import { provideBackupState } from "./state.js";

const logger = new Logger("operations/backup/import.ts");

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
  tx: GetReadWriteAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
    coins: typeof WalletStoresV1.coins;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  contractData: WalletContractData,
  payInfo: BackupPayInfo,
): Promise<PayCoinSelection> {
  const coinPubs: string[] = payInfo.pay_coins.map((x) => x.coin_pub);
  const coinContributions: AmountJson[] = payInfo.pay_coins.map((x) =>
    Amounts.parseOrThrow(x.contribution),
  );

  const coveredExchanges: Set<string> = new Set();

  let totalWireFee: AmountJson = Amounts.getZero(contractData.amount.currency);
  let totalDepositFees: AmountJson = Amounts.getZero(
    contractData.amount.currency,
  );

  for (const coinPub of coinPubs) {
    const coinRecord = await tx.coins.get(coinPub);
    checkBackupInvariant(!!coinRecord);
    const denom = await tx.denominations.get([
      coinRecord.exchangeBaseUrl,
      coinRecord.denomPubHash,
    ]);
    checkBackupInvariant(!!denom);
    totalDepositFees = Amounts.add(
      totalDepositFees,
      denom.fees.feeDeposit,
    ).amount;

    if (!coveredExchanges.has(coinRecord.exchangeBaseUrl)) {
      const exchangeDetails = await getExchangeDetails(
        tx,
        coinRecord.exchangeBaseUrl,
      );
      checkBackupInvariant(!!exchangeDetails);
      let wireFee: AmountJson | undefined;
      const feesForType = exchangeDetails.wireInfo.feesForType;
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
      coveredExchanges.add(coinRecord.exchangeBaseUrl);
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

async function getDenomSelStateFromBackup(
  tx: GetReadOnlyAccess<{ denominations: typeof WalletStoresV1.denominations }>,
  exchangeBaseUrl: string,
  sel: BackupDenomSel,
): Promise<DenomSelectionState> {
  const d0 = await tx.denominations.get([
    exchangeBaseUrl,
    sel[0].denom_pub_hash,
  ]);
  checkBackupInvariant(!!d0);
  const selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[] = [];
  let totalCoinValue = Amounts.getZero(d0.currency);
  let totalWithdrawCost = Amounts.getZero(d0.currency);
  for (const s of sel) {
    const d = await tx.denominations.get([exchangeBaseUrl, s.denom_pub_hash]);
    checkBackupInvariant(!!d);
    totalCoinValue = Amounts.add(
      totalCoinValue,
      DenominationRecord.getValue(d),
    ).amount;
    totalWithdrawCost = Amounts.add(
      totalWithdrawCost,
      DenominationRecord.getValue(d),
      d.fees.feeWithdraw,
    ).amount;
  }
  return {
    selectedDenoms,
    totalCoinValue,
    totalWithdrawCost,
  };
}

export interface CompletedCoin {
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
export interface BackupCryptoPrecomputedData {
  rsaDenomPubToHash: Record<string, string>;
  coinPrivToCompletedCoin: Record<string, CompletedCoin>;
  proposalNoncePrivToPub: { [priv: string]: string };
  proposalIdToContractTermsHash: { [proposalId: string]: string };
  reservePrivToPub: Record<string, string>;
}

export async function importCoin(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    coinAvailability: typeof WalletStoresV1.coinAvailability;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  cryptoComp: BackupCryptoPrecomputedData,
  args: {
    backupCoin: BackupCoin;
    exchangeBaseUrl: string;
    denomPubHash: string;
  },
): Promise<void> {
  const { backupCoin, exchangeBaseUrl, denomPubHash } = args;
  const compCoin = cryptoComp.coinPrivToCompletedCoin[backupCoin.coin_priv];
  checkLogicInvariant(!!compCoin);
  const existingCoin = await tx.coins.get(compCoin.coinPub);
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
          withdrawalGroupId: backupCoin.coin_source.withdrawal_group_id,
        };
        break;
    }
    const coinRecord: CoinRecord = {
      blindingKey: backupCoin.blinding_key,
      coinEvHash: compCoin.coinEvHash,
      coinPriv: backupCoin.coin_priv,
      currentAmount: Amounts.parseOrThrow(backupCoin.current_amount),
      denomSig: backupCoin.denom_sig,
      coinPub: compCoin.coinPub,
      exchangeBaseUrl,
      denomPubHash,
      status: backupCoin.fresh ? CoinStatus.Fresh : CoinStatus.Dormant,
      coinSource,
      // FIXME!
      maxAge: AgeRestriction.AGE_UNRESTRICTED,
      // FIXME!
      ageCommitmentProof: undefined,
      // FIXME!
      allocation: undefined,
    };
    if (coinRecord.status === CoinStatus.Fresh) {
      await makeCoinAvailable(ws, tx, coinRecord);
    } else {
      await tx.coins.put(coinRecord);
    }
  }
}

export async function importBackup(
  ws: InternalWalletState,
  backupBlobArg: any,
  cryptoComp: BackupCryptoPrecomputedData,
): Promise<void> {
  await provideBackupState(ws);

  logger.info(`importing backup ${j2s(backupBlobArg)}`);

  return ws.db
    .mktx((x) => [
      x.config,
      x.exchangeDetails,
      x.exchanges,
      x.coins,
      x.coinAvailability,
      x.denominations,
      x.purchases,
      x.refreshGroups,
      x.backupProviders,
      x.tips,
      x.recoupGroups,
      x.withdrawalGroups,
      x.tombstones,
      x.depositGroups,
    ])
    .runReadWrite(async (tx) => {
      // FIXME: validate schema!
      const backupBlob = backupBlobArg as WalletBackupContentV1;

      // FIXME: validate version

      for (const tombstone of backupBlob.tombstones) {
        await tx.tombstones.put({
          id: tombstone,
        });
      }

      const tombstoneSet = new Set(
        (await tx.tombstones.iter().toArray()).map((x) => x.id),
      );

      // FIXME:  Validate that the "details pointer" is correct

      for (const backupExchange of backupBlob.exchanges) {
        const existingExchange = await tx.exchanges.get(
          backupExchange.base_url,
        );
        if (existingExchange) {
          continue;
        }
        await tx.exchanges.put({
          baseUrl: backupExchange.base_url,
          detailsPointer: {
            currency: backupExchange.currency,
            masterPublicKey: backupExchange.master_public_key,
            updateClock: backupExchange.update_clock,
            protocolVersionRange: backupExchange.protocol_version_range,
          },
          permanent: true,
          lastUpdate: undefined,
          nextUpdate: TalerProtocolTimestamp.now(),
          nextRefreshCheck: TalerProtocolTimestamp.now(),
          lastKeysEtag: undefined,
          lastWireEtag: undefined,
        });
      }

      for (const backupExchangeDetails of backupBlob.exchange_details) {
        const existingExchangeDetails = await tx.exchangeDetails.get([
          backupExchangeDetails.base_url,
          backupExchangeDetails.currency,
          backupExchangeDetails.master_public_key,
        ]);

        if (!existingExchangeDetails) {
          const wireInfo: WireInfo = {
            accounts: backupExchangeDetails.accounts.map((x) => ({
              master_sig: x.master_sig,
              payto_uri: x.payto_uri,
            })),
            feesForType: {},
          };
          for (const fee of backupExchangeDetails.wire_fees) {
            const w = (wireInfo.feesForType[fee.wire_type] ??= []);
            w.push({
              closingFee: Amounts.parseOrThrow(fee.closing_fee),
              endStamp: fee.end_stamp,
              sig: fee.sig,
              startStamp: fee.start_stamp,
              wireFee: Amounts.parseOrThrow(fee.wire_fee),
              wadFee: Amounts.parseOrThrow(fee.wad_fee),
            });
          }
          await tx.exchangeDetails.put({
            exchangeBaseUrl: backupExchangeDetails.base_url,
            termsOfServiceAcceptedEtag: backupExchangeDetails.tos_accepted_etag,
            termsOfServiceText: undefined,
            termsOfServiceLastEtag: undefined,
            termsOfServiceContentType: undefined,
            termsOfServiceAcceptedTimestamp:
              backupExchangeDetails.tos_accepted_timestamp,
            wireInfo,
            currency: backupExchangeDetails.currency,
            auditors: backupExchangeDetails.auditors.map((x) => ({
              auditor_pub: x.auditor_pub,
              auditor_url: x.auditor_url,
              denomination_keys: x.denomination_keys,
            })),
            masterPublicKey: backupExchangeDetails.master_public_key,
            protocolVersionRange: backupExchangeDetails.protocol_version,
            reserveClosingDelay: backupExchangeDetails.reserve_closing_delay,
            globalFees: backupExchangeDetails.global_fees.map((x) => ({
              accountFee: Amounts.parseOrThrow(x.accountFee),
              historyFee: Amounts.parseOrThrow(x.historyFee),
              kycFee: Amounts.parseOrThrow(x.kycFee),
              purseFee: Amounts.parseOrThrow(x.purseFee),
              kycTimeout: x.kycTimeout,
              endDate: x.endDate,
              historyTimeout: x.historyTimeout,
              signature: x.signature,
              purseLimit: x.purseLimit,
              purseTimeout: x.purseTimeout,
              startDate: x.startDate,
            })),

            signingKeys: backupExchangeDetails.signing_keys.map((x) => ({
              key: x.key,
              master_sig: x.master_sig,
              stamp_end: x.stamp_end,
              stamp_expire: x.stamp_expire,
              stamp_start: x.stamp_start,
            })),
          });
        }

        for (const backupDenomination of backupExchangeDetails.denominations) {
          if (backupDenomination.denom_pub.cipher !== DenomKeyType.Rsa) {
            throw Error("unsupported cipher");
          }
          const denomPubHash =
            cryptoComp.rsaDenomPubToHash[
              backupDenomination.denom_pub.rsa_public_key
            ];
          checkLogicInvariant(!!denomPubHash);
          const existingDenom = await tx.denominations.get([
            backupExchangeDetails.base_url,
            denomPubHash,
          ]);
          if (!existingDenom) {
            const value = Amounts.parseOrThrow(backupDenomination.value);

            await tx.denominations.put({
              denomPub: backupDenomination.denom_pub,
              denomPubHash: denomPubHash,
              exchangeBaseUrl: backupExchangeDetails.base_url,
              exchangeMasterPub: backupExchangeDetails.master_public_key,
              fees: {
                feeDeposit: Amounts.parseOrThrow(
                  backupDenomination.fee_deposit,
                ),
                feeRefresh: Amounts.parseOrThrow(
                  backupDenomination.fee_refresh,
                ),
                feeRefund: Amounts.parseOrThrow(backupDenomination.fee_refund),
                feeWithdraw: Amounts.parseOrThrow(
                  backupDenomination.fee_withdraw,
                ),
              },
              isOffered: backupDenomination.is_offered,
              isRevoked: backupDenomination.is_revoked,
              masterSig: backupDenomination.master_sig,
              stampExpireDeposit: backupDenomination.stamp_expire_deposit,
              stampExpireLegal: backupDenomination.stamp_expire_legal,
              stampExpireWithdraw: backupDenomination.stamp_expire_withdraw,
              stampStart: backupDenomination.stamp_start,
              verificationStatus: DenominationVerificationStatus.VerifiedGood,
              currency: value.currency,
              amountFrac: value.fraction,
              amountVal: value.value,
              listIssueDate: backupDenomination.list_issue_date,
            });
          }
          for (const backupCoin of backupDenomination.coins) {
            await importCoin(ws, tx, cryptoComp, {
              backupCoin,
              denomPubHash,
              exchangeBaseUrl: backupExchangeDetails.base_url,
            });
          }
        }

        for (const backupWg of backupBlob.withdrawal_groups) {
          const reservePub = cryptoComp.reservePrivToPub[backupWg.reserve_priv];
          checkLogicInvariant(!!reservePub);
          const ts = makeEventId(TombstoneTag.DeleteReserve, reservePub);
          if (tombstoneSet.has(ts)) {
            continue;
          }
          const existingWg = await tx.withdrawalGroups.get(
            backupWg.withdrawal_group_id,
          );
          if (existingWg) {
            continue;
          }
          let wgInfo: WgInfo;
          switch (backupWg.info.type) {
            case BackupWgType.BankIntegrated:
              wgInfo = {
                withdrawalType: WithdrawalRecordType.BankIntegrated,
                bankInfo: {
                  exchangePaytoUri: backupWg.info.exchange_payto_uri,
                  talerWithdrawUri: backupWg.info.taler_withdraw_uri,
                  confirmUrl: backupWg.info.confirm_url,
                  timestampBankConfirmed:
                    backupWg.info.timestamp_bank_confirmed,
                  timestampReserveInfoPosted:
                    backupWg.info.timestamp_reserve_info_posted,
                },
              };
              break;
            case BackupWgType.BankManual:
              wgInfo = {
                withdrawalType: WithdrawalRecordType.BankManual,
              };
              break;
            case BackupWgType.PeerPullCredit:
              wgInfo = {
                withdrawalType: WithdrawalRecordType.PeerPullCredit,
                contractTerms: backupWg.info.contract_terms,
                contractPriv: backupWg.info.contract_priv,
              };
              break;
            case BackupWgType.PeerPushCredit:
              wgInfo = {
                withdrawalType: WithdrawalRecordType.PeerPushCredit,
                contractTerms: backupWg.info.contract_terms,
              };
              break;
            case BackupWgType.Recoup:
              wgInfo = {
                withdrawalType: WithdrawalRecordType.Recoup,
              };
              break;
            default:
              assertUnreachable(backupWg.info);
          }
          await tx.withdrawalGroups.put({
            withdrawalGroupId: backupWg.withdrawal_group_id,
            exchangeBaseUrl: backupWg.exchange_base_url,
            instructedAmount: Amounts.parseOrThrow(backupWg.instructed_amount),
            secretSeed: backupWg.secret_seed,
            denomsSel: await getDenomSelStateFromBackup(
              tx,
              backupWg.exchange_base_url,
              backupWg.selected_denoms,
            ),
            denomSelUid: backupWg.selected_denoms_uid,
            rawWithdrawalAmount: Amounts.parseOrThrow(
              backupWg.raw_withdrawal_amount,
            ),
            reservePriv: backupWg.reserve_priv,
            reservePub,
            status: backupWg.timestamp_finish
              ? WithdrawalGroupStatus.Finished
              : WithdrawalGroupStatus.QueryingStatus, // FIXME!
            timestampStart: backupWg.timestamp_created,
            wgInfo,
            restrictAge: backupWg.restrict_age,
            senderWire: undefined, // FIXME!
            timestampFinish: backupWg.timestamp_finish,
          });
        }
      }

      for (const backupPurchase of backupBlob.purchases) {
        const ts = makeEventId(
          TombstoneTag.DeletePayment,
          backupPurchase.proposal_id,
        );
        if (tombstoneSet.has(ts)) {
          continue;
        }
        const existingPurchase = await tx.purchases.get(
          backupPurchase.proposal_id,
        );
        let proposalStatus: PurchaseStatus;
        switch (backupPurchase.proposal_status) {
          case BackupProposalStatus.Paid:
            proposalStatus = PurchaseStatus.Paid;
            break;
          default:
            throw Error();
        }
        if (!existingPurchase) {
          const refunds: { [refundKey: string]: WalletRefundItem } = {};
          for (const backupRefund of backupPurchase.refunds) {
            const key = `${backupRefund.coin_pub}-${backupRefund.rtransaction_id}`;
            const coin = await tx.coins.get(backupRefund.coin_pub);
            checkBackupInvariant(!!coin);
            const denom = await tx.denominations.get([
              coin.exchangeBaseUrl,
              coin.denomPubHash,
            ]);
            checkBackupInvariant(!!denom);
            const common = {
              coinPub: backupRefund.coin_pub,
              executionTime: backupRefund.execution_time,
              obtainedTime: backupRefund.obtained_time,
              refundAmount: Amounts.parseOrThrow(backupRefund.refund_amount),
              refundFee: denom.fees.feeRefund,
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
            contractTermsHash,
            contractTermsMerchantSig: backupPurchase.merchant_sig!,
            currency: amount.currency,
            fulfillmentUrl: backupPurchase.contract_terms_raw.fulfillment_url,
          };

          const contractData = extractContractData(
            backupPurchase.contract_terms_raw,
            contractTermsHash,
            download.contractTermsMerchantSig,
          );

          let payInfo: PurchasePayInfo | undefined = undefined;
          if (backupPurchase.pay_info) {
            payInfo = {
              coinDepositPermissions: undefined,
              payCoinSelection: await recoverPayCoinSelection(
                tx,
                contractData,
                backupPurchase.pay_info,
              ),
              payCoinSelectionUid: backupPurchase.pay_info.pay_coins_uid,
              totalPayCost: Amounts.parseOrThrow(
                backupPurchase.pay_info.total_pay_cost,
              ),
            };
          }

          await tx.purchases.put({
            proposalId: backupPurchase.proposal_id,
            noncePriv: backupPurchase.nonce_priv,
            noncePub:
              cryptoComp.proposalNoncePrivToPub[backupPurchase.nonce_priv],
            autoRefundDeadline: TalerProtocolTimestamp.never(),
            timestampAccept: backupPurchase.timestamp_accepted,
            timestampFirstSuccessfulPay:
              backupPurchase.timestamp_first_successful_pay,
            timestampLastRefundStatus: undefined,
            merchantPaySig: backupPurchase.merchant_pay_sig,
            lastSessionId: undefined,
            download,
            refunds,
            claimToken: backupPurchase.claim_token,
            downloadSessionId: backupPurchase.download_session_id,
            merchantBaseUrl: backupPurchase.merchant_base_url,
            orderId: backupPurchase.order_id,
            payInfo,
            refundAmountAwaiting: undefined,
            repurchaseProposalId: backupPurchase.repurchase_proposal_id,
            purchaseStatus: proposalStatus,
            timestamp: backupPurchase.timestamp_proposed,
          });
        }
      }

      for (const backupRefreshGroup of backupBlob.refresh_groups) {
        const ts = makeEventId(
          TombstoneTag.DeleteRefreshGroup,
          backupRefreshGroup.refresh_group_id,
        );
        if (tombstoneSet.has(ts)) {
          continue;
        }
        const existingRg = await tx.refreshGroups.get(
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
              reason = RefreshReason.PayMerchant;
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
          const refreshSessionPerCoin: (RefreshSessionRecord | undefined)[] =
            [];
          for (const oldCoin of backupRefreshGroup.old_coins) {
            const c = await tx.coins.get(oldCoin.coin_pub);
            checkBackupInvariant(!!c);
            if (oldCoin.refresh_session) {
              const denomSel = await getDenomSelStateFromBackup(
                tx,
                c.exchangeBaseUrl,
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
          await tx.refreshGroups.put({
            timestampFinished: backupRefreshGroup.timestamp_finish,
            timestampCreated: backupRefreshGroup.timestamp_created,
            refreshGroupId: backupRefreshGroup.refresh_group_id,
            reason,
            lastErrorPerCoin: {},
            oldCoinPubs: backupRefreshGroup.old_coins.map((x) => x.coin_pub),
            statusPerCoin: backupRefreshGroup.old_coins.map((x) =>
              x.finished
                ? RefreshCoinStatus.Finished
                : RefreshCoinStatus.Pending,
            ),
            operationStatus: backupRefreshGroup.timestamp_finish
              ? RefreshOperationStatus.Finished
              : RefreshOperationStatus.Pending,
            inputPerCoin: backupRefreshGroup.old_coins.map((x) =>
              Amounts.parseOrThrow(x.input_amount),
            ),
            estimatedOutputPerCoin: backupRefreshGroup.old_coins.map((x) =>
              Amounts.parseOrThrow(x.estimated_output_amount),
            ),
            refreshSessionPerCoin,
          });
        }
      }

      for (const backupTip of backupBlob.tips) {
        const ts = makeEventId(TombstoneTag.DeleteTip, backupTip.wallet_tip_id);
        if (tombstoneSet.has(ts)) {
          continue;
        }
        const existingTip = await tx.tips.get(backupTip.wallet_tip_id);
        if (!existingTip) {
          const denomsSel = await getDenomSelStateFromBackup(
            tx,
            backupTip.exchange_base_url,
            backupTip.selected_denoms,
          );
          await tx.tips.put({
            acceptedTimestamp: backupTip.timestamp_accepted,
            createdTimestamp: backupTip.timestamp_created,
            denomsSel,
            exchangeBaseUrl: backupTip.exchange_base_url,
            merchantBaseUrl: backupTip.exchange_base_url,
            merchantTipId: backupTip.merchant_tip_id,
            pickedUpTimestamp: backupTip.timestamp_finished,
            secretSeed: backupTip.secret_seed,
            tipAmountEffective: denomsSel.totalCoinValue,
            tipAmountRaw: Amounts.parseOrThrow(backupTip.tip_amount_raw),
            tipExpiration: backupTip.timestamp_expiration,
            walletTipId: backupTip.wallet_tip_id,
            denomSelUid: backupTip.selected_denoms_uid,
          });
        }
      }

      // We now process tombstones.
      // The import code above should already prevent
      // importing things that are tombstoned,
      // but we do tombstone processing last just to be sure.

      for (const tombstone of tombstoneSet) {
        const [type, ...rest] = tombstone.split(":");
        if (type === TombstoneTag.DeleteDepositGroup) {
          await tx.depositGroups.delete(rest[0]);
        } else if (type === TombstoneTag.DeletePayment) {
          await tx.purchases.delete(rest[0]);
        } else if (type === TombstoneTag.DeleteRefreshGroup) {
          await tx.refreshGroups.delete(rest[0]);
        } else if (type === TombstoneTag.DeleteRefund) {
          // Nothing required, will just prevent display
          // in the transactions list
        } else if (type === TombstoneTag.DeleteTip) {
          await tx.tips.delete(rest[0]);
        } else if (type === TombstoneTag.DeleteWithdrawalGroup) {
          await tx.withdrawalGroups.delete(rest[0]);
        } else {
          logger.warn(`unable to process tombstone of type '${type}'`);
        }
      }
    });
}
