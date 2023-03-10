/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
 * Type declarations for the backup content format.
 *
 * Contains some redundancy with the other type declarations,
 * as the backup schema must remain very stable and should be self-contained.
 *
 * Future:
 * 1. Ghost spends (coin unexpectedly spent by a wallet with shared data)
 * 2. Ghost withdrawals (reserve unexpectedly emptied by another wallet with shared data)
 * 3. Track losses through re-denomination of payments/refreshes
 * 4. (Feature:) Payments to own bank account and P2P-payments need to be backed up
 * 5. Track last/next update time, so on restore we need to do less work
 * 6. Currency render preferences?
 *
 * Questions:
 * 1. What happens when two backups are merged that have
 *    the same coin in different refresh groups?
 *    => Both are added, one will eventually fail
 * 2. Should we make more information forgettable?  I.e. is
 *    the coin selection still relevant for a purchase after the coins
 *    are legally expired?
 *    => Yes, still needs to be implemented
 * 3. What about re-denominations / re-selection of payment coins?
 *    Is it enough to store a clock value for the selection?
 *    => Coin derivation should also consider denom pub hash
 *
 * General considerations / decisions:
 * 1. Information about previously occurring errors and
 *    retries is never backed up.
 * 2. The ToS text of an exchange is never backed up.
 * 3. Derived information is never backed up (hashed values, public keys
 *    when we know the private key).
 *
 * Problems:
 *
 * Withdrawal group fork/merging loses money:
 * - Before the withdrawal happens, wallet forks into two backups.
 * - Both wallets need to re-denominate the withdrawal (unlikely but possible).
 * - Because the backup doesn't store planchets where a withdrawal was attempted,
 *   after merging some money will be list.
 * - Fix: backup withdrawal objects also store planchets where withdrawal has been attempted
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import { DenominationPubKey, UnblindedSignature } from "./taler-types.js";
import { TalerProtocolDuration, TalerProtocolTimestamp } from "./time.js";

export const BACKUP_TAG = "gnu-taler-wallet-backup-content" as const;
/**
 * Major version.  Each increment means a backwards-incompatible change.
 * Typically this means that a custom converter needs to be written.
 */
export const BACKUP_VERSION_MAJOR = 1 as const;

/**
 * Minor version.  Each increment means that information is added to the backup
 * in a backwards-compatible way.
 *
 * Wallets can always import a smaller minor version than their own backup code version.
 * When importing a bigger version, data loss is possible and the user should be urged to
 * upgrade their wallet first.
 */
export const BACKUP_VERSION_MINOR = 1 as const;

/**
 * Type alias for strings that are to be treated like amounts.
 */
type BackupAmountString = string;

/**
 * A human-recognizable identifier here that is
 * reasonable unique and assigned the first time the wallet is
 * started/installed, such as:
 *
 * `${wallet-implementation} ${os} ${hostname} (${short-uid})`
 * => e.g. "GNU Taler Android iceking ABC123"
 */
type DeviceIdString = string;

/**
 * Contract terms JSON.
 */
type RawContractTerms = any;

/**
 * Unique identifier for an operation, used to either (a) reference
 * the operation in a tombstone (b) disambiguate conflicting writes.
 */
type OperationUid = string;

/**
 * Content of the backup.
 *
 * The contents of the wallet must be serialized in a deterministic
 * way across implementations, so that the normalized backup content
 * JSON is identical when the wallet's content is identical.
 */
export interface WalletBackupContentV1 {
  /**
   * Magic constant to identify that this is a backup content JSON.
   */
  schema_id: typeof BACKUP_TAG;

  /**
   * Version of the schema.
   */
  schema_version: typeof BACKUP_VERSION_MAJOR;

  minor_version: number;

  /**
   * Root public key of the wallet.  This field is present as
   * a sanity check if the backup content JSON is loaded from file.
   */
  wallet_root_pub: string;

  /**
   * Current device identifier that "owns" the backup.
   *
   * This identifier allows one wallet to notice when another
   * wallet is "alive" and connected to the same sync provider.
   */
  current_device_id: DeviceIdString;

  /**
   * Timestamp of the backup.
   *
   * This timestamp should only be advanced if the content
   * of the backup changes.
   */
  timestamp: TalerProtocolTimestamp;

  /**
   * Per-exchange data sorted by exchange master public key.
   *
   * Sorted by the exchange public key.
   */
  exchanges: BackupExchange[];

  exchange_details: BackupExchangeDetails[];

  /**
   * Withdrawal groups.
   *
   * Sorted by the withdrawal group ID.
   */
  withdrawal_groups: BackupWithdrawalGroup[];

  /**
   * Grouped refresh sessions.
   *
   * Sorted by the refresh group ID.
   */
  refresh_groups: BackupRefreshGroup[];

  /**
   * Tips.
   *
   * Sorted by the wallet tip ID.
   */
  tips: BackupTip[];

  /**
   * Accepted purchases.
   *
   * Sorted by the proposal ID.
   */
  purchases: BackupPurchase[];

  /**
   * All backup providers.  Backup providers
   * in this list should be considered "active".
   *
   * Sorted by the provider base URL.
   */
  backup_providers: BackupBackupProvider[];

  /**
   * Recoup groups.
   */
  recoup_groups: BackupRecoupGroup[];

  /**
   * Trusted auditors, either for official (3 letter) or local (4-12 letter)
   * currencies.
   *
   * Auditors are sorted by their canonicalized base URL.
   */
  trusted_auditors: { [currency: string]: BackupTrustAuditor[] };

  /**
   * Trusted exchange.  Only applicable for local currencies (4-12 letter currency code).
   *
   * Exchanges are sorted by their canonicalized base URL.
   */
  trusted_exchanges: { [currency: string]: BackupTrustExchange[] };

  /**
   * Interning table for forgettable values of contract terms.
   *
   * Used to reduce storage space, as many forgettable items (product image,
   * addresses, etc.) might be shared among many contract terms.
   */
  intern_table: { [hash: string]: any };

  /**
   * Permanent error reports.
   */
  error_reports: BackupErrorReport[];

  /**
   * Deletion tombstones.  Lexically sorted.
   */
  tombstones: Tombstone[];
}

export enum BackupOperationStatus {
  Cancelled = "cancelled",
  Finished = "finished",
  Pending = "pending",
}

export enum BackupWgType {
  BankManual = "bank-manual",
  BankIntegrated = "bank-integrated",
  PeerPullCredit = "peer-pull-credit",
  PeerPushCredit = "peer-push-credit",
  Recoup = "recoup",
}

export type BackupWgInfo =
  | {
      type: BackupWgType.BankManual;
    }
  | {
      type: BackupWgType.BankIntegrated;
      taler_withdraw_uri: string;

      /**
       * URL that the user can be redirected to, and allows
       * them to confirm (or abort) the bank-integrated withdrawal.
       */
      confirm_url?: string;

      /**
       * Exchange payto URI that the bank will use to fund the reserve.
       */
      exchange_payto_uri: string;

      /**
       * Time when the information about this reserve was posted to the bank.
       *
       * Only applies if bankWithdrawStatusUrl is defined.
       *
       * Set to undefined if that hasn't happened yet.
       */
      timestamp_reserve_info_posted?: TalerProtocolTimestamp;

      /**
       * Time when the reserve was confirmed by the bank.
       *
       * Set to undefined if not confirmed yet.
       */
      timestamp_bank_confirmed?: TalerProtocolTimestamp;
    }
  | {
      type: BackupWgType.PeerPullCredit;
      contract_terms: any;
      contract_priv: string;
    }
  | {
      type: BackupWgType.PeerPushCredit;
      contract_terms: any;
    }
  | {
      type: BackupWgType.Recoup;
    };

/**
 * FIXME: Open questions:
 * - Do we have to store the denomination selection?  Why?
 *   (If deterministic, amount shouldn't change. Not storing it is simpler.)
 */
export interface BackupWithdrawalGroup {
  withdrawal_group_id: string;

  /**
   * Detailed info based on the type of withdrawal group.
   */
  info: BackupWgInfo;

  secret_seed: string;

  reserve_priv: string;

  exchange_base_url: string;

  timestamp_created: TalerProtocolTimestamp;

  timestamp_finish?: TalerProtocolTimestamp;

  operation_status: BackupOperationStatus;

  instructed_amount: BackupAmountString;

  /**
   * Amount including fees (i.e. the amount subtracted from the
   * reserve to withdraw all coins in this withdrawal session).
   *
   * Note that this *includes* the amount remaining in the reserve
   * that is too small to be withdrawn, and thus can't be derived
   * from selectedDenoms.
   */
  raw_withdrawal_amount: BackupAmountString;

  effective_withdrawal_amount: BackupAmountString;

  /**
   * Restrict withdrawals from this reserve to this age.
   */
  restrict_age?: number;

  /**
   * Multiset of denominations selected for withdrawal.
   */
  selected_denoms: BackupDenomSel;

  selected_denoms_uid: OperationUid;
}

/**
 * Tombstone in the format "<type>:<key>"
 */
export type Tombstone = string;

/**
 * Detailed error report.
 *
 * For auditor-relevant reports with attached cryptographic proof,
 * the error report also should contain the submission status to
 * the auditor(s).
 */
interface BackupErrorReport {
  // FIXME: specify!
}

/**
 * Trust declaration for an auditor.
 *
 * The trust applies based on the public key of
 * the auditor, irrespective of what base URL the exchange
 * is referencing.
 */
export interface BackupTrustAuditor {
  /**
   * Base URL of the auditor.
   */
  auditor_base_url: string;

  /**
   * Public key of the auditor.
   */
  auditor_pub: string;

  /**
   * UIDs for the operation of adding this auditor
   * as a trusted auditor.
   */
  uids: OperationUid;
}

/**
 * Trust declaration for an exchange.
 *
 * The trust only applies for the combination of base URL
 * and public key.  If the master public key changes while the base
 * URL stays the same, the exchange has to be re-added by a wallet update
 * or by the user.
 */
export interface BackupTrustExchange {
  /**
   * Canonicalized exchange base URL.
   */
  exchange_base_url: string;

  /**
   * Master public key of the exchange.
   */
  exchange_master_pub: string;

  /**
   * UIDs for the operation of adding this exchange
   * as trusted.
   */
  uids: OperationUid;
}

export class BackupBackupProviderTerms {
  /**
   * Last known supported protocol version.
   */
  supported_protocol_version: string;

  /**
   * Last known annual fee.
   */
  annual_fee: BackupAmountString;

  /**
   * Last known storage limit.
   */
  storage_limit_in_megabytes: number;
}

/**
 * Backup information about one backup storage provider.
 */
export class BackupBackupProvider {
  /**
   * Canonicalized base URL of the provider.
   */
  base_url: string;

  /**
   * Last known terms.  Might be unavailable in some situations, such
   * as directly after restoring form a backup recovery document.
   */
  terms?: BackupBackupProviderTerms;

  /**
   * Proposal IDs for payments to this provider.
   */
  pay_proposal_ids: string[];

  /**
   * UIDs for adding this backup provider.
   */
  uids: OperationUid[];
}

/**
 * Status of recoup operations that were grouped together.
 *
 * The remaining amount of the corresponding coins must be set to
 * zero when the recoup group is created/imported.
 */
export interface BackupRecoupGroup {
  /**
   * Unique identifier for the recoup group record.
   */
  recoup_group_id: string;

  /**
   * Timestamp when the recoup was started.
   */
  timestamp_created: TalerProtocolTimestamp;

  timestamp_finish?: TalerProtocolTimestamp;
  finish_clock?: TalerProtocolTimestamp;
  // FIXME: Use some enum here!
  finish_is_failure?: boolean;

  /**
   * Information about each coin being recouped.
   */
  coins: {
    coin_pub: string;
    recoup_finished: boolean;
  }[];
}

/**
 * Types of coin sources.
 */
export enum BackupCoinSourceType {
  Withdraw = "withdraw",
  Refresh = "refresh",
  Tip = "tip",
}

/**
 * Metadata about a coin obtained via withdrawing.
 */
export interface BackupWithdrawCoinSource {
  type: BackupCoinSourceType.Withdraw;

  /**
   * Can be the empty string for orphaned coins.
   */
  withdrawal_group_id: string;

  /**
   * Index of the coin in the withdrawal session.
   */
  coin_index: number;

  /**
   * Reserve public key for the reserve we got this coin from.
   */
  reserve_pub: string;
}

/**
 * Metadata about a coin obtained from refreshing.
 *
 * FIXME:  Currently does not link to the refreshGroupId because
 * the wallet DB doesn't do this.  Not really necessary,
 * but would be more consistent.
 */
export interface BackupRefreshCoinSource {
  type: BackupCoinSourceType.Refresh;

  /**
   * Public key of the coin that was refreshed into this coin.
   */
  old_coin_pub: string;

  refresh_group_id: string;
}

/**
 * Metadata about a coin obtained from a tip.
 */
export interface BackupTipCoinSource {
  type: BackupCoinSourceType.Tip;

  /**
   * Wallet's identifier for the tip that this coin
   * originates from.
   */
  wallet_tip_id: string;

  /**
   * Index in the tip planchets of the tip.
   */
  coin_index: number;
}

/**
 * Metadata about a coin depending on the origin.
 */
export type BackupCoinSource =
  | BackupWithdrawCoinSource
  | BackupRefreshCoinSource
  | BackupTipCoinSource;

/**
 * Backup information about a coin.
 *
 * (Always part of a BackupExchange/BackupDenom)
 */
export interface BackupCoin {
  /**
   * Where did the coin come from?  Used for recouping coins.
   */
  coin_source: BackupCoinSource;

  /**
   * Private key to authorize operations on the coin.
   */
  coin_priv: string;

  /**
   * Unblinded signature by the exchange.
   */
  denom_sig: UnblindedSignature;

  /**
   * Information about where and how the coin was spent.
   */
  spend_allocation:
    | {
        id: string;
        amount: BackupAmountString;
      }
    | undefined;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally used again during payback.
   */
  blinding_key: string;

  /**
   * Does the wallet think that the coin is still fresh?
   *
   * Note that even if a fresh coin is imported, it should still
   * be refreshed in most situations.
   */
  fresh: boolean;
}

/**
 * Status of a tip we got from a merchant.
 */
export interface BackupTip {
  /**
   * Tip ID chosen by the wallet.
   */
  wallet_tip_id: string;

  /**
   * The merchant's identifier for this tip.
   */
  merchant_tip_id: string;

  /**
   * Secret seed used for the tipping planchets.
   */
  secret_seed: string;

  /**
   * Has the user accepted the tip?  Only after the tip has been accepted coins
   * withdrawn from the tip may be used.
   */
  timestamp_accepted: TalerProtocolTimestamp | undefined;

  /**
   * When was the tip first scanned by the wallet?
   */
  timestamp_created: TalerProtocolTimestamp;

  timestamp_finished?: TalerProtocolTimestamp;
  finish_is_failure?: boolean;

  /**
   * The tipped amount.
   */
  tip_amount_raw: BackupAmountString;

  /**
   * Timestamp, the tip can't be picked up anymore after this deadline.
   */
  timestamp_expiration: TalerProtocolTimestamp;

  /**
   * The exchange that will sign our coins, chosen by the merchant.
   */
  exchange_base_url: string;

  /**
   * Base URL of the merchant that is giving us the tip.
   */
  merchant_base_url: string;

  /**
   * Selected denominations.  Determines the effective tip amount.
   */
  selected_denoms: BackupDenomSel;

  /**
   * UID for the denomination selection.
   * Used to disambiguate when merging.
   */
  selected_denoms_uid: OperationUid;
}

/**
 * Reasons for why a coin is being refreshed.
 */
export enum BackupRefreshReason {
  Manual = "manual",
  Pay = "pay",
  Refund = "refund",
  AbortPay = "abort-pay",
  Recoup = "recoup",
  BackupRestored = "backup-restored",
  Scheduled = "scheduled",
}

/**
 * Information about one refresh session, always part
 * of a refresh group.
 *
 * (Public key of the old coin is stored in the refresh group.)
 */
export interface BackupRefreshSession {
  /**
   * Hashed denominations of the newly requested coins.
   */
  new_denoms: BackupDenomSel;

  /**
   * Seed used to derive the planchets and
   * transfer private keys for this refresh session.
   */
  session_secret_seed: string;

  /**
   * The no-reveal-index after we've done the melting.
   */
  noreveal_index?: number;
}

/**
 * Refresh session for one coin inside a refresh group.
 */
export interface BackupRefreshOldCoin {
  /**
   * Public key of the old coin,
   */
  coin_pub: string;

  /**
   * Requested amount to refresh.  Must be subtracted from the coin's remaining
   * amount as soon as the coin is added to the refresh group.
   */
  input_amount: BackupAmountString;

  /**
   * Estimated output (may change if it takes a long time to create the
   * actual session).
   */
  estimated_output_amount: BackupAmountString;

  /**
   * Did the refresh session finish (or was it unnecessary/impossible to create
   * one)
   */
  finished: boolean;

  /**
   * Refresh session (if created) or undefined it not created yet.
   */
  refresh_session: BackupRefreshSession | undefined;
}

/**
 * Information about one refresh group.
 *
 * May span more than one exchange, but typically doesn't
 */
export interface BackupRefreshGroup {
  refresh_group_id: string;

  reason: BackupRefreshReason;

  /**
   * Details per old coin.
   */
  old_coins: BackupRefreshOldCoin[];

  timestamp_created: TalerProtocolTimestamp;

  timestamp_finish?: TalerProtocolTimestamp;
  finish_is_failure?: boolean;
}

export enum BackupRefundState {
  Failed = "failed",
  Applied = "applied",
  Pending = "pending",
}

/**
 * Common information about a refund.
 */
export interface BackupRefundItemCommon {
  /**
   * Execution time as claimed by the merchant
   */
  execution_time: TalerProtocolTimestamp;

  /**
   * Time when the wallet became aware of the refund.
   */
  obtained_time: TalerProtocolTimestamp;

  /**
   * Amount refunded for the coin.
   */
  refund_amount: BackupAmountString;

  /**
   * Coin being refunded.
   */
  coin_pub: string;

  /**
   * The refund transaction ID for the refund.
   */
  rtransaction_id: number;

  /**
   * Upper bound on the refresh cost incurred by
   * applying this refund.
   *
   * Might be lower in practice when two refunds on the same
   * coin are refreshed in the same refresh operation.
   *
   * Used to display fees, and stored since it's expensive to recompute
   * accurately.
   */
  total_refresh_cost_bound: BackupAmountString;
}

/**
 * Failed refund, either because the merchant did
 * something wrong or it expired.
 */
export interface BackupRefundFailedItem extends BackupRefundItemCommon {
  type: BackupRefundState.Failed;
}

export interface BackupRefundPendingItem extends BackupRefundItemCommon {
  type: BackupRefundState.Pending;
}

export interface BackupRefundAppliedItem extends BackupRefundItemCommon {
  type: BackupRefundState.Applied;
}

/**
 * State of one refund from the merchant, maintained by the wallet.
 */
export type BackupRefundItem =
  | BackupRefundFailedItem
  | BackupRefundPendingItem
  | BackupRefundAppliedItem;

/**
 * Data we store when the payment was accepted.
 */
export interface BackupPayInfo {
  pay_coins: {
    /**
     * Public keys of the coins that were selected.
     */
    coin_pub: string;

    /**
     * Amount that each coin contributes.
     */
    contribution: BackupAmountString;
  }[];

  /**
   * Unique ID to disambiguate pay coin selection on merge.
   */
  pay_coins_uid: OperationUid;

  /**
   * Total cost initially shown to the user.
   *
   * This includes the amount taken by the merchant, fees (wire/deposit) contributed
   * by the customer, refreshing fees, fees for withdraw-after-refresh and "trimmings"
   * of coins that are too small to spend.
   *
   * Note that in rare situations, this cost might not be accurate (e.g.
   * when the payment or refresh gets re-denominated).
   * We might show adjustments to this later, but currently we don't do so.
   */
  total_pay_cost: BackupAmountString;
}

export interface BackupPurchase {
  /**
   * Proposal ID for this purchase.  Uniquely identifies the
   * purchase and the proposal.
   */
  proposal_id: string;

  /**
   * Status of the proposal.
   */
  proposal_status: BackupProposalStatus;

  /**
   * Proposal that this one got "redirected" to as part of
   * the repurchase detection.
   */
  repurchase_proposal_id: string | undefined;

  /**
   * Session ID we got when downloading the contract.
   */
  download_session_id?: string;

  /**
   * Merchant-assigned order ID of the proposal.
   */
  order_id: string;

  /**
   * Base URL of the merchant that proposed the purchase.
   */
  merchant_base_url: string;

  /**
   * Claim token initially given by the merchant.
   */
  claim_token: string | undefined;

  /**
   * Contract terms we got from the merchant.
   */
  contract_terms_raw?: RawContractTerms;

  /**
   * Signature on the contract terms.
   *
   * FIXME: Better name needed.
   */
  merchant_sig?: string;

  /**
   * Private key for the nonce.  Might eventually be used
   * to prove ownership of the contract.
   */
  nonce_priv: string;

  pay_info: BackupPayInfo | undefined;

  /**
   * Timestamp of the first time that sending a payment to the merchant
   * for this purchase was successful.
   */
  timestamp_first_successful_pay: TalerProtocolTimestamp | undefined;

  /**
   * Signature by the merchant confirming the payment.
   */
  merchant_pay_sig: string | undefined;

  timestamp_proposed: TalerProtocolTimestamp;

  /**
   * When was the purchase made?
   * Refers to the time that the user accepted.
   */
  timestamp_accepted: TalerProtocolTimestamp | undefined;

  /**
   * Pending refunds for the purchase.  A refund is pending
   * when the merchant reports a transient error from the exchange.
   */
  refunds: BackupRefundItem[];

  /**
   * Continue querying the refund status until this deadline has expired.
   */
  auto_refund_deadline: TalerProtocolTimestamp | undefined;
}

/**
 * Info about one denomination in the backup.
 *
 * Note that the wallet only backs up validated denominations.
 */
export interface BackupDenomination {
  /**
   * Value of one coin of the denomination.
   */
  value: BackupAmountString;

  /**
   * The denomination public key.
   */
  denom_pub: DenominationPubKey;

  /**
   * Fee for withdrawing.
   */
  fee_withdraw: BackupAmountString;

  /**
   * Fee for depositing.
   */
  fee_deposit: BackupAmountString;

  /**
   * Fee for refreshing.
   */
  fee_refresh: BackupAmountString;

  /**
   * Fee for refunding.
   */
  fee_refund: BackupAmountString;

  /**
   * Validity start date of the denomination.
   */
  stamp_start: TalerProtocolTimestamp;

  /**
   * Date after which the currency can't be withdrawn anymore.
   */
  stamp_expire_withdraw: TalerProtocolTimestamp;

  /**
   * Date after the denomination officially doesn't exist anymore.
   */
  stamp_expire_legal: TalerProtocolTimestamp;

  /**
   * Data after which coins of this denomination can't be deposited anymore.
   */
  stamp_expire_deposit: TalerProtocolTimestamp;

  /**
   * Signature by the exchange's master key over the denomination
   * information.
   */
  master_sig: string;

  /**
   * Was this denomination still offered by the exchange the last time
   * we checked?
   * Only false when the exchange redacts a previously published denomination.
   */
  is_offered: boolean;

  /**
   * Did the exchange revoke the denomination?
   * When this field is set to true in the database, the same transaction
   * should also mark all affected coins as revoked.
   */
  is_revoked: boolean;

  /**
   * Coins of this denomination.
   */
  coins: BackupCoin[];

  /**
   * The list issue date of the exchange "/keys" response
   * that this denomination was last seen in.
   */
  list_issue_date: TalerProtocolTimestamp;
}

/**
 * Denomination selection.
 */
export type BackupDenomSel = {
  denom_pub_hash: string;
  count: number;
}[];

/**
 * Wire fee for one wire payment target type as stored in the
 * wallet's database.
 *
 * (Flattened to a list to make the declaration simpler).
 */
export interface BackupExchangeWireFee {
  wire_type: string;

  /**
   * Fee for wire transfers.
   */
  wire_fee: string;

  /**
   * Fees to close and refund a reserve.
   */
  closing_fee: string;

  /**
   * Start date of the fee.
   */
  start_stamp: TalerProtocolTimestamp;

  /**
   * End date of the fee.
   */
  end_stamp: TalerProtocolTimestamp;

  /**
   * Signature made by the exchange master key.
   */
  sig: string;
}

/**
 * Global fee as stored in the wallet's database.
 *
 */
export interface BackupExchangeGlobalFees {
  startDate: TalerProtocolTimestamp;
  endDate: TalerProtocolTimestamp;

  historyFee: BackupAmountString;
  accountFee: BackupAmountString;
  purseFee: BackupAmountString;

  historyTimeout: TalerProtocolDuration;
  purseTimeout: TalerProtocolDuration;

  purseLimit: number;

  signature: string;
}
/**
 * Structure of one exchange signing key in the /keys response.
 */
export class BackupExchangeSignKey {
  stamp_start: TalerProtocolTimestamp;
  stamp_expire: TalerProtocolTimestamp;
  stamp_end: TalerProtocolTimestamp;
  key: string;
  master_sig: string;
}

/**
 * Signature by the auditor that a particular denomination key is audited.
 */
export class BackupAuditorDenomSig {
  /**
   * Denomination public key's hash.
   */
  denom_pub_h: string;

  /**
   * The signature.
   */
  auditor_sig: string;
}

/**
 * Auditor information as given by the exchange in /keys.
 */
export class BackupExchangeAuditor {
  /**
   * Auditor's public key.
   */
  auditor_pub: string;

  /**
   * Base URL of the auditor.
   */
  auditor_url: string;

  /**
   * List of signatures for denominations by the auditor.
   */
  denomination_keys: BackupAuditorDenomSig[];
}

/**
 * Backup information for an exchange.  Serves effectively
 * as a pointer to the exchange details identified by
 * the base URL, master public key and currency.
 */
export interface BackupExchange {
  base_url: string;

  master_public_key: string;

  currency: string;

  /**
   * Time when the pointer to the exchange details
   * was last updated.
   *
   * Used to facilitate automatic merging.
   */
  update_clock: TalerProtocolTimestamp;
}

/**
 * Backup information about an exchange's details.
 *
 * Note that one base URL can have multiple exchange
 * details.  The BackupExchange stores a pointer
 * to the current exchange details.
 */
export interface BackupExchangeDetails {
  /**
   * Canonicalized base url of the exchange.
   */
  base_url: string;

  /**
   * Master public key of the exchange.
   */
  master_public_key: string;

  /**
   * Auditors (partially) auditing the exchange.
   */
  auditors: BackupExchangeAuditor[];

  /**
   * Currency that the exchange offers.
   */
  currency: string;

  /**
   * Denominations offered by the exchange.
   */
  denominations: BackupDenomination[];

  /**
   * Last observed protocol version.
   */
  protocol_version: string;

  /**
   * Closing delay of reserves.
   */
  reserve_closing_delay: TalerProtocolDuration;

  /**
   * Signing keys we got from the exchange, can also contain
   * older signing keys that are not returned by /keys anymore.
   */
  signing_keys: BackupExchangeSignKey[];

  wire_fees: BackupExchangeWireFee[];

  global_fees: BackupExchangeGlobalFees[];

  /**
   * Bank accounts offered by the exchange;
   */
  accounts: {
    payto_uri: string;
    master_sig: string;
  }[];

  /**
   * ETag for last terms of service download.
   */
  tos_accepted_etag: string | undefined;

  /**
   * Timestamp when the ToS has been accepted.
   */
  tos_accepted_timestamp: TalerProtocolTimestamp | undefined;
}

export enum BackupProposalStatus {
  /**
   * Proposed (and either downloaded or not,
   * depending on whether contract terms are present),
   * but the user needs to accept/reject it.
   */
  Proposed = "proposed",
  /**
   * The user has rejected the proposal.
   */
  Refused = "refused",
  /**
   * Downloading or processing the proposal has failed permanently.
   *
   * FIXME:  Should this be modeled as a "misbehavior report" instead?
   */
  PermanentlyFailed = "permanently-failed",
  /**
   * Downloaded proposal was detected as a re-purchase.
   */
  Repurchase = "repurchase",

  Paid = "paid",
}

export interface BackupRecovery {
  walletRootPriv: string;
  providers: {
    name: string;
    url: string;
  }[];
}
