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

import { BackupPurchase, AmountJson, Amounts, BackupDenomSel, WalletBackupContentV1, getTimestampNow, BackupCoinSourceType, BackupProposalStatus, codecForContractTerms, BackupRefundState, RefreshReason, BackupRefreshReason } from "@gnu-taler/taler-util";
import { Stores, WalletContractData, DenomSelectionState, ExchangeWireInfo, ExchangeUpdateStatus, DenominationStatus, CoinSource, CoinSourceType, CoinStatus, ReserveBankInfo, ReserveRecordStatus, ProposalDownload, ProposalStatus, WalletRefundItem, RefundState, AbortStatus, RefreshSessionRecord } from "../../db.js";
import { TransactionHandle } from "../../index.js";
import { PayCoinSelection } from "../../util/coinSelection";
import { j2s } from "../../util/helpers";
import { checkDbInvariant, checkLogicInvariant } from "../../util/invariants";
import { Logger } from "../../util/logging";
import { initRetryInfo } from "../../util/retries";
import { InternalWalletState } from "../state";
import { provideBackupState } from "./state";

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

async function getDenomSelStateFromBackup(
  tx: TransactionHandle<typeof Stores.denominations>,
  exchangeBaseUrl: string,
  sel: BackupDenomSel,
): Promise<DenomSelectionState> {
  const d0 = await tx.get(Stores.denominations, [
    exchangeBaseUrl,
    sel[0].denom_pub_hash,
  ]);
  checkBackupInvariant(!!d0);
  const selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[] = [];
  let totalCoinValue = Amounts.getZero(d0.value.currency);
  let totalWithdrawCost = Amounts.getZero(d0.value.currency);
  for (const s of sel) {
    const d = await tx.get(Stores.denominations, [
      exchangeBaseUrl,
      s.denom_pub_hash,
    ]);
    checkBackupInvariant(!!d);
    totalCoinValue = Amounts.add(totalCoinValue, d.value).amount;
    totalWithdrawCost = Amounts.add(totalWithdrawCost, d.value, d.feeWithdraw)
      .amount;
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
  denomPubToHash: Record<string, string>;
  coinPrivToCompletedCoin: Record<string, CompletedCoin>;
  proposalNoncePrivToPub: { [priv: string]: string };
  proposalIdToContractTermsHash: { [proposalId: string]: string };
  reservePrivToPub: Record<string, string>;
}

export async function importBackup(
  ws: InternalWalletState,
  backupBlobArg: any,
  cryptoComp: BackupCryptoPrecomputedData,
): Promise<void> {
  await provideBackupState(ws);

  logger.info(`importing backup ${j2s(backupBlobArg)}`);

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
      const backupBlob = backupBlobArg as WalletBackupContentV1;

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
              reserveClosingDelay: backupExchange.reserve_closing_delay,
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
                backupExchange.base_url,
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
                  backupExchange.base_url,
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
                timestampStart: backupWg.timestamp_created,
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
                  auditorPub: x.auditor_pub,
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
            case undefined:
              abortStatus = AbortStatus.None;
              break;
            default:
              logger.warn(
                `got backup purchase abort_status ${j2s(
                  backupPurchase.abort_status,
                )}`,
              );
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
                auditorPub: x.auditor_pub,
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
            timestampLastRefundStatus: undefined,
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
            const c = await tx.get(Stores.coins, oldCoin.coin_pub);
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
          await tx.put(Stores.refreshGroups, {
            timestampFinished: backupRefreshGroup.timestamp_finish,
            timestampCreated: backupRefreshGroup.timestamp_created,
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
            backupTip.exchange_base_url,
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
            pickedUpTimestamp: backupTip.timestamp_finished,
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
