/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
  describeStore,
  describeContents,
  describeIndex,
} from "./util/query.js";
import {
  AmountJson,
  AmountString,
  ExchangeAuditor,
  CoinDepositPermission,
  ContractTerms,
  DenominationPubKey,
  Duration,
  ExchangeSignKeyJson,
  InternationalizedString,
  MerchantInfo,
  Product,
  RefreshReason,
  TalerErrorDetail,
  UnblindedSignature,
  CoinEnvelope,
  TalerProtocolTimestamp,
  TalerProtocolDuration,
  AgeCommitmentProof,
  PayCoinSelection,
  PeerContractTerms,
  Location,
  WireInfo,
} from "@gnu-taler/taler-util";
import { RetryInfo } from "./util/retries.js";
import { Event, IDBDatabase } from "@gnu-taler/idb-bridge";

/**
 * Name of the Taler database.  This is effectively the major
 * version of the DB schema. Whenever it changes, custom import logic
 * for all previous versions must be written, which should be
 * avoided.
 */
export const TALER_DB_NAME = "taler-wallet-main-v5";

/**
 * Name of the metadata database.  This database is used
 * to track major migrations of the main Taler database.
 *
 * (Minor migrations are handled via upgrade transactions.)
 */
export const TALER_META_DB_NAME = "taler-wallet-meta";

export const CURRENT_DB_CONFIG_KEY = "currentMainDbName";

/**
 * Current database minor version, should be incremented
 * each time we do minor schema changes on the database.
 * A change is considered minor when fields are added in a
 * backwards-compatible way or object stores and indices
 * are added.
 */
export const WALLET_DB_MINOR_VERSION = 1;

export enum ReserveRecordStatus {
  /**
   * Reserve must be registered with the bank.
   */
  RegisteringBank = "registering-bank",

  /**
   * We've registered reserve's information with the bank
   * and are now waiting for the user to confirm the withdraw
   * with the bank (typically 2nd factor auth).
   */
  WaitConfirmBank = "wait-confirm-bank",

  /**
   * Querying reserve status with the exchange.
   */
  QueryingStatus = "querying-status",

  /**
   * The corresponding withdraw record has been created.
   * No further processing is done, unless explicitly requested
   * by the user.
   */
  Dormant = "dormant",

  /**
   * The bank aborted the withdrawal.
   */
  BankAborted = "bank-aborted",
}

/**
 * Extra info about a reserve that is used
 * with a bank-integrated withdrawal.
 */
export interface ReserveBankInfo {
  talerWithdrawUri: string;

  /**
   * URL that the user can be redirected to, and allows
   * them to confirm (or abort) the bank-integrated withdrawal.
   */
  confirmUrl?: string;

  /**
   * Exchange payto URI that the bank will use to fund the reserve.
   */
  exchangePaytoUri: string;

  /**
   * Time when the information about this reserve was posted to the bank.
   *
   * Only applies if bankWithdrawStatusUrl is defined.
   *
   * Set to undefined if that hasn't happened yet.
   */
  timestampReserveInfoPosted?: TalerProtocolTimestamp;

  /**
   * Time when the reserve was confirmed by the bank.
   *
   * Set to undefined if not confirmed yet.
   */
  timestampBankConfirmed?: TalerProtocolTimestamp;
}

/**
 * Record that indicates the wallet trusts
 * a particular auditor.
 */
export interface AuditorTrustRecord {
  /**
   * Currency that we trust this auditor for.
   */
  currency: string;

  /**
   * Base URL of the auditor.
   */
  auditorBaseUrl: string;

  /**
   * Public key of the auditor.
   */
  auditorPub: string;

  /**
   * UIDs for the operation of adding this auditor
   * as a trusted auditor.
   */
  uids: string[];
}

/**
 * Record to indicate trust for a particular exchange.
 */
export interface ExchangeTrustRecord {
  /**
   * Currency that we trust this exchange for.
   */
  currency: string;

  /**
   * Canonicalized exchange base URL.
   */
  exchangeBaseUrl: string;

  /**
   * Master public key of the exchange.
   */
  exchangeMasterPub: string;

  /**
   * UIDs for the operation of adding this exchange
   * as trusted.
   */
  uids: string[];
}

/**
 * Status of a denomination.
 */
export enum DenominationVerificationStatus {
  /**
   * Verification was delayed.
   */
  Unverified = "unverified",
  /**
   * Verified as valid.
   */
  VerifiedGood = "verified-good",
  /**
   * Verified as invalid.
   */
  VerifiedBad = "verified-bad",
}

/**
 * Denomination record as stored in the wallet's database.
 */
export interface DenominationRecord {
  /**
   * Value of one coin of the denomination.
   */
  value: AmountJson;

  /**
   * The denomination public key.
   */
  denomPub: DenominationPubKey;

  /**
   * Hash of the denomination public key.
   * Stored in the database for faster lookups.
   */
  denomPubHash: string;

  /**
   * Fee for withdrawing.
   */
  feeWithdraw: AmountJson;

  /**
   * Fee for depositing.
   */
  feeDeposit: AmountJson;

  /**
   * Fee for refreshing.
   */
  feeRefresh: AmountJson;

  /**
   * Fee for refunding.
   */
  feeRefund: AmountJson;

  /**
   * Validity start date of the denomination.
   */
  stampStart: TalerProtocolTimestamp;

  /**
   * Date after which the currency can't be withdrawn anymore.
   */
  stampExpireWithdraw: TalerProtocolTimestamp;

  /**
   * Date after the denomination officially doesn't exist anymore.
   */
  stampExpireLegal: TalerProtocolTimestamp;

  /**
   * Data after which coins of this denomination can't be deposited anymore.
   */
  stampExpireDeposit: TalerProtocolTimestamp;

  /**
   * Signature by the exchange's master key over the denomination
   * information.
   */
  masterSig: string;

  /**
   * Did we verify the signature on the denomination?
   */
  verificationStatus: DenominationVerificationStatus;

  /**
   * Was this denomination still offered by the exchange the last time
   * we checked?
   * Only false when the exchange redacts a previously published denomination.
   */
  isOffered: boolean;

  /**
   * Did the exchange revoke the denomination?
   * When this field is set to true in the database, the same transaction
   * should also mark all affected coins as revoked.
   */
  isRevoked: boolean;

  /**
   * Base URL of the exchange.
   */
  exchangeBaseUrl: string;

  /**
   * Master public key of the exchange that made the signature
   * on the denomination.
   */
  exchangeMasterPub: string;

  /**
   * Latest list issue date of the "/keys" response
   * that includes this denomination.
   */
  listIssueDate: TalerProtocolTimestamp;
}

/**
 * Information about one of the exchange's bank accounts.
 */
export interface ExchangeBankAccount {
  payto_uri: string;
  master_sig: string;
}

export interface ExchangeDetailsRecord {
  /**
   * Master public key of the exchange.
   */
  masterPublicKey: string;

  exchangeBaseUrl: string;

  /**
   * Currency that the exchange offers.
   */
  currency: string;

  /**
   * Auditors (partially) auditing the exchange.
   */
  auditors: ExchangeAuditor[];

  /**
   * Last observed protocol version.
   */
  protocolVersion: string;

  reserveClosingDelay: TalerProtocolDuration;

  /**
   * Signing keys we got from the exchange, can also contain
   * older signing keys that are not returned by /keys anymore.
   *
   * FIXME:  Should this be put into a separate object store?
   */
  signingKeys: ExchangeSignKeyJson[];

  /**
   * Terms of service text or undefined if not downloaded yet.
   *
   * This is just used as a cache of the last downloaded ToS.
   *
   * FIXME:  Put in separate object store!
   */
  termsOfServiceText: string | undefined;

  /**
   * content-type of the last downloaded termsOfServiceText.
   *
   * * FIXME:  Put in separate object store!
   */
  termsOfServiceContentType: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceLastEtag: string | undefined;

  /**
   * ETag for last terms of service accepted.
   */
  termsOfServiceAcceptedEtag: string | undefined;

  /**
   * Timestamp when the ToS was accepted.
   *
   * Used during backup merging.
   */
  termsOfServiceAcceptedTimestamp: TalerProtocolTimestamp | undefined;

  wireInfo: WireInfo;
}

export interface ExchangeDetailsPointer {
  masterPublicKey: string;

  currency: string;

  /**
   * Last observed protocol version range offered by the exchange.
   */
  protocolVersionRange: string;

  /**
   * Timestamp when the (masterPublicKey, currency) pointer
   * has been updated.
   */
  updateClock: TalerProtocolTimestamp;
}

export interface MergeReserveInfo {
  reservePub: string;
  reservePriv: string;
}

/**
 * Exchange record as stored in the wallet's database.
 */
export interface ExchangeRecord {
  /**
   * Base url of the exchange.
   */
  baseUrl: string;

  /**
   * Pointer to the current exchange details.
   */
  detailsPointer: ExchangeDetailsPointer | undefined;

  /**
   * Is this a permanent or temporary exchange record?
   */
  permanent: boolean;

  /**
   * Last time when the exchange was updated.
   */
  lastUpdate: TalerProtocolTimestamp | undefined;

  /**
   * Next scheduled update for the exchange.
   *
   * (This field must always be present, so we can index on the timestamp.)
   */
  nextUpdate: TalerProtocolTimestamp;

  /**
   * Next time that we should check if coins need to be refreshed.
   *
   * Updated whenever the exchange's denominations are updated or when
   * the refresh check has been done.
   */
  nextRefreshCheck: TalerProtocolTimestamp;

  /**
   * Public key of the reserve that we're currently using for
   * receiving P2P payments.
   */
  currentMergeReserveInfo?: MergeReserveInfo;
}

/**
 * A coin that isn't yet signed by an exchange.
 */
export interface PlanchetRecord {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key of the coin.
   */
  coinPriv: string;

  /**
   * Withdrawal group that this planchet belongs to
   * (or the empty string).
   */
  withdrawalGroupId: string;

  /**
   * Index within the withdrawal group (or -1).
   */
  coinIdx: number;

  withdrawalDone: boolean;

  lastError: TalerErrorDetail | undefined;

  /**
   * Public key of the reserve that this planchet
   * is being withdrawn from.
   *
   * Can be the empty string (non-null/undefined for DB indexing)
   * if this is a tipping reserve.
   */
  reservePub: string;

  denomPubHash: string;

  blindingKey: string;

  withdrawSig: string;

  coinEv: CoinEnvelope;

  coinEvHash: string;

  ageCommitmentProof?: AgeCommitmentProof;
}

/**
 * Status of a coin.
 */
export enum CoinStatus {
  /**
   * Withdrawn and never shown to anybody.
   */
  Fresh = "fresh",
  /**
   * A coin that has been spent and refreshed.
   */
  Dormant = "dormant",
}

export enum CoinSourceType {
  Withdraw = "withdraw",
  Refresh = "refresh",
  Tip = "tip",
}

export interface WithdrawCoinSource {
  type: CoinSourceType.Withdraw;

  /**
   * Can be the empty string for orphaned coins.
   */
  withdrawalGroupId: string;

  /**
   * Index of the coin in the withdrawal session.
   */
  coinIndex: number;

  /**
   * Reserve public key for the reserve we got this coin from.
   */
  reservePub: string;
}

export interface RefreshCoinSource {
  type: CoinSourceType.Refresh;
  oldCoinPub: string;
}

export interface TipCoinSource {
  type: CoinSourceType.Tip;
  walletTipId: string;
  coinIndex: number;
}

export type CoinSource = WithdrawCoinSource | RefreshCoinSource | TipCoinSource;

/**
 * CoinRecord as stored in the "coins" data store
 * of the wallet database.
 */
export interface CoinRecord {
  /**
   * Where did the coin come from?  Used for recouping coins.
   */
  coinSource: CoinSource;

  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key to authorize operations on the coin.
   */
  coinPriv: string;

  /**
   * Hash of the public key that signs the coin.
   */
  denomPubHash: string;

  /**
   * Unblinded signature by the exchange.
   */
  denomSig: UnblindedSignature;

  /**
   * Amount that's left on the coin.
   */
  currentAmount: AmountJson;

  /**
   * Base URL that identifies the exchange from which we got the
   * coin.
   */
  exchangeBaseUrl: string;

  /**
   * The coin is currently suspended, and will not be used for payments.
   */
  suspended: boolean;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally used again during payback.
   */
  blindingKey: string;

  /**
   * Hash of the coin envelope.
   *
   * Stored here for indexing purposes, so that when looking at a
   * reserve history, we can quickly find the coin for a withdrawal transaction.
   */
  coinEvHash: string;

  /**
   * Status of the coin.
   */
  status: CoinStatus;

  /**
   * Information about what the coin has been allocated for.
   * Used to prevent allocation of the same coin for two different payments.
   */
  allocation?: CoinAllocation;

  ageCommitmentProof?: AgeCommitmentProof;
}

export interface CoinAllocation {
  id: string;
  amount: AmountString;
}

export enum ProposalStatus {
  /**
   * Not downloaded yet.
   */
  Downloading = "downloading",
  /**
   * Proposal downloaded, but the user needs to accept/reject it.
   */
  Proposed = "proposed",
  /**
   * The user has accepted the proposal.
   */
  Accepted = "accepted",
  /**
   * The user has rejected the proposal.
   */
  Refused = "refused",
  /**
   * Downloading or processing the proposal has failed permanently.
   */
  PermanentlyFailed = "permanently-failed",
  /**
   * Downloaded proposal was detected as a re-purchase.
   */
  Repurchase = "repurchase",
}

export interface ProposalDownload {
  /**
   * The contract that was offered by the merchant.
   */
  contractTermsRaw: any;

  contractData: WalletContractData;
}

/**
 * Record for a downloaded order, stored in the wallet's database.
 */
export interface ProposalRecord {
  orderId: string;

  merchantBaseUrl: string;

  /**
   * Downloaded data from the merchant.
   */
  download: ProposalDownload | undefined;

  /**
   * Unique ID when the order is stored in the wallet DB.
   */
  proposalId: string;

  /**
   * Timestamp (in ms) of when the record
   * was created.
   */
  timestamp: TalerProtocolTimestamp;

  /**
   * Private key for the nonce.
   */
  noncePriv: string;

  /**
   * Public key for the nonce.
   */
  noncePub: string;

  claimToken: string | undefined;

  proposalStatus: ProposalStatus;

  repurchaseProposalId: string | undefined;

  /**
   * Session ID we got when downloading the contract.
   */
  downloadSessionId?: string;
}

/**
 * Status of a tip we got from a merchant.
 */
export interface TipRecord {
  /**
   * Has the user accepted the tip?  Only after the tip has been accepted coins
   * withdrawn from the tip may be used.
   */
  acceptedTimestamp: TalerProtocolTimestamp | undefined;

  /**
   * The tipped amount.
   */
  tipAmountRaw: AmountJson;

  tipAmountEffective: AmountJson;

  /**
   * Timestamp, the tip can't be picked up anymore after this deadline.
   */
  tipExpiration: TalerProtocolTimestamp;

  /**
   * The exchange that will sign our coins, chosen by the merchant.
   */
  exchangeBaseUrl: string;

  /**
   * Base URL of the merchant that is giving us the tip.
   */
  merchantBaseUrl: string;

  /**
   * Denomination selection made by the wallet for picking up
   * this tip.
   */
  denomsSel: DenomSelectionState;

  denomSelUid: string;

  /**
   * Tip ID chosen by the wallet.
   */
  walletTipId: string;

  /**
   * Secret seed used to derive planchets for this tip.
   */
  secretSeed: string;

  /**
   * The merchant's identifier for this tip.
   */
  merchantTipId: string;

  createdTimestamp: TalerProtocolTimestamp;

  /**
   * Timestamp for when the wallet finished picking up the tip
   * from the merchant.
   */
  pickedUpTimestamp: TalerProtocolTimestamp | undefined;
}

export enum RefreshCoinStatus {
  Pending = "pending",
  Finished = "finished",

  /**
   * The refresh for this coin has been frozen, because of a permanent error.
   * More info in lastErrorPerCoin.
   */
  Frozen = "frozen",
}

export enum OperationStatus {
  Finished = "finished",
  Pending = "pending",
}

export interface RefreshGroupRecord {
  operationStatus: OperationStatus;

  // FIXME: Put this into a different object store?
  lastErrorPerCoin: { [coinIndex: number]: TalerErrorDetail };

  /**
   * Unique, randomly generated identifier for this group of
   * refresh operations.
   */
  refreshGroupId: string;

  /**
   * Reason why this refresh group has been created.
   */
  reason: RefreshReason;

  oldCoinPubs: string[];

  // FIXME:  Should this go into a separate
  // object store for faster updates?
  refreshSessionPerCoin: (RefreshSessionRecord | undefined)[];

  inputPerCoin: AmountJson[];

  estimatedOutputPerCoin: AmountJson[];

  /**
   * Flag for each coin whether refreshing finished.
   * If a coin can't be refreshed (remaining value too small),
   * it will be marked as finished, but no refresh session will
   * be created.
   */
  statusPerCoin: RefreshCoinStatus[];

  timestampCreated: TalerProtocolTimestamp;

  /**
   * Timestamp when the refresh session finished.
   */
  timestampFinished: TalerProtocolTimestamp | undefined;

  /**
   * No coins are pending, but at least one is frozen.
   */
  frozen?: boolean;
}

/**
 * Ongoing refresh
 */
export interface RefreshSessionRecord {
  /**
   * 512-bit secret that can be used to derive
   * the other cryptographic material for the refresh session.
   */
  sessionSecretSeed: string;

  /**
   * Sum of the value of denominations we want
   * to withdraw in this session, without fees.
   */
  amountRefreshOutput: AmountJson;

  /**
   * Hashed denominations of the newly requested coins.
   */
  newDenoms: {
    denomPubHash: string;
    count: number;
  }[];

  /**
   * The no-reveal-index after we've done the melting.
   */
  norevealIndex?: number;
}

export enum RefundState {
  Failed = "failed",
  Applied = "applied",
  Pending = "pending",
}

/**
 * State of one refund from the merchant, maintained by the wallet.
 */
export type WalletRefundItem =
  | WalletRefundFailedItem
  | WalletRefundPendingItem
  | WalletRefundAppliedItem;

export interface WalletRefundItemCommon {
  // Execution time as claimed by the merchant
  executionTime: TalerProtocolTimestamp;

  /**
   * Time when the wallet became aware of the refund.
   */
  obtainedTime: TalerProtocolTimestamp;

  refundAmount: AmountJson;

  refundFee: AmountJson;

  /**
   * Upper bound on the refresh cost incurred by
   * applying this refund.
   *
   * Might be lower in practice when two refunds on the same
   * coin are refreshed in the same refresh operation.
   */
  totalRefreshCostBound: AmountJson;

  coinPub: string;

  rtransactionId: number;
}

/**
 * Failed refund, either because the merchant did
 * something wrong or it expired.
 */
export interface WalletRefundFailedItem extends WalletRefundItemCommon {
  type: RefundState.Failed;
}

export interface WalletRefundPendingItem extends WalletRefundItemCommon {
  type: RefundState.Pending;
}

export interface WalletRefundAppliedItem extends WalletRefundItemCommon {
  type: RefundState.Applied;
}

export enum RefundReason {
  /**
   * Normal refund given by the merchant.
   */
  NormalRefund = "normal-refund",
  /**
   * Refund from an aborted payment.
   */
  AbortRefund = "abort-pay-refund",
}

export interface AllowedAuditorInfo {
  auditorBaseUrl: string;
  auditorPub: string;
}

export interface AllowedExchangeInfo {
  exchangeBaseUrl: string;
  exchangePub: string;
}

/**
 * Data extracted from the contract terms that is relevant for payment
 * processing in the wallet.
 */
export interface WalletContractData {
  products?: Product[];
  summaryI18n: { [lang_tag: string]: string } | undefined;

  /**
   * Fulfillment URL, or the empty string if the order has no fulfillment URL.
   *
   * Stored as a non-nullable string as we use this field for IndexedDB indexing.
   */
  fulfillmentUrl: string;

  contractTermsHash: string;
  fulfillmentMessage?: string;
  fulfillmentMessageI18n?: InternationalizedString;
  merchantSig: string;
  merchantPub: string;
  merchant: MerchantInfo;
  amount: AmountJson;
  orderId: string;
  merchantBaseUrl: string;
  summary: string;
  autoRefund: TalerProtocolDuration | undefined;
  maxWireFee: AmountJson;
  wireFeeAmortization: number;
  payDeadline: TalerProtocolTimestamp;
  refundDeadline: TalerProtocolTimestamp;
  allowedAuditors: AllowedAuditorInfo[];
  allowedExchanges: AllowedExchangeInfo[];
  timestamp: TalerProtocolTimestamp;
  wireMethod: string;
  wireInfoHash: string;
  maxDepositFee: AmountJson;
  minimumAge?: number;
  deliveryDate: TalerProtocolTimestamp | undefined;
  deliveryLocation: Location | undefined;
}

export enum AbortStatus {
  None = "none",
  AbortRefund = "abort-refund",
  AbortFinished = "abort-finished",
}

/**
 * Record that stores status information about one purchase, starting from when
 * the customer accepts a proposal.  Includes refund status if applicable.
 */
export interface PurchaseRecord {
  /**
   * Proposal ID for this purchase.  Uniquely identifies the
   * purchase and the proposal.
   */
  proposalId: string;

  /**
   * Private key for the nonce.
   */
  noncePriv: string;

  /**
   * Public key for the nonce.
   */
  noncePub: string;

  /**
   * Downloaded and parsed proposal data.
   *
   * FIXME:  Move this into another object store,
   * to improve read/write perf on purchases.
   */
  download: ProposalDownload;

  /**
   * Deposit permissions, available once the user has accepted the payment.
   *
   * This value is cached and derived from payCoinSelection.
   */
  coinDepositPermissions: CoinDepositPermission[] | undefined;

  payCoinSelection: PayCoinSelection;

  payCoinSelectionUid: string;

  /**
   * Pending removals from pay coin selection.
   *
   * Used when a the pay coin selection needs to be changed
   * because a coin became known as double-spent or invalid,
   * but a new coin selection can't immediately be done, as
   * there is not enough balance (e.g. when waiting for a refresh).
   */
  pendingRemovedCoinPubs?: string[];

  totalPayCost: AmountJson;

  /**
   * Timestamp of the first time that sending a payment to the merchant
   * for this purchase was successful.
   *
   * FIXME: Does this need to be a timestamp, doesn't boolean suffice?
   */
  timestampFirstSuccessfulPay: TalerProtocolTimestamp | undefined;

  merchantPaySig: string | undefined;

  /**
   * When was the purchase made?
   * Refers to the time that the user accepted.
   */
  timestampAccept: TalerProtocolTimestamp;

  /**
   * Pending refunds for the purchase.  A refund is pending
   * when the merchant reports a transient error from the exchange.
   * 
   * FIXME: Put this into a separate object store?
   */
  refunds: { [refundKey: string]: WalletRefundItem };

  /**
   * When was the last refund made?
   * Set to 0 if no refund was made on the purchase.
   */
  timestampLastRefundStatus: TalerProtocolTimestamp | undefined;

  /**
   * Last session signature that we submitted to /pay (if any).
   */
  lastSessionId: string | undefined;

  /**
   * Do we still need to post the deposit permissions to the merchant?
   * Set for the first payment, or on re-plays.
   */
  paymentSubmitPending: boolean;

  /**
   * Do we need to query the merchant for the refund status
   * of the payment?
   */
  refundQueryRequested: boolean;

  /**
   * Continue querying the refund status until this deadline has expired.
   */
  autoRefundDeadline: TalerProtocolTimestamp | undefined;

  /**
   * How much merchant has refund to be taken but the wallet
   * did not picked up yet
   */
  refundAwaiting: AmountJson | undefined;

  /**
   * Is the payment frozen?  I.e. did we encounter
   * an error where it doesn't make sense to retry.
   */
  payFrozen?: boolean;

  /**
   * FIXME: How does this interact with payFrozen?
   */
  abortStatus: AbortStatus;
}

export const WALLET_BACKUP_STATE_KEY = "walletBackupState";

/**
 * Configuration key/value entries to configure
 * the wallet.
 */
export type ConfigRecord =
  | {
      key: typeof WALLET_BACKUP_STATE_KEY;
      value: WalletBackupConfState;
    }
  | { key: "currencyDefaultsApplied"; value: boolean };

export interface WalletBackupConfState {
  deviceId: string;
  walletRootPub: string;
  walletRootPriv: string;

  /**
   * Last hash of the canonicalized plain-text backup.
   */
  lastBackupPlainHash?: string;

  /**
   * Timestamp stored in the last backup.
   */
  lastBackupTimestamp?: TalerProtocolTimestamp;

  /**
   * Last time we tried to do a backup.
   */
  lastBackupCheckTimestamp?: TalerProtocolTimestamp;
  lastBackupNonce?: string;
}

/**
 * Selected denominations withn some extra info.
 */
export interface DenomSelectionState {
  totalCoinValue: AmountJson;
  totalWithdrawCost: AmountJson;
  selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[];
}

export const enum WithdrawalRecordType {
  BankManual = "bank-manual",
  BankIntegrated = "bank-integrated",
  PeerPullCredit = "peer-pull-credit",
  PeerPushCredit = "peer-push-credit",
  Recoup = "recoup",
}

export interface WgInfoBankIntegrated {
  withdrawalType: WithdrawalRecordType.BankIntegrated;
  /**
   * Extra state for when this is a withdrawal involving
   * a Taler-integrated bank.
   */
  bankInfo: ReserveBankInfo;
}

export interface WgInfoBankManual {
  withdrawalType: WithdrawalRecordType.BankManual;
}

export interface WgInfoBankPeerPull {
  withdrawalType: WithdrawalRecordType.PeerPullCredit;

  contractTerms: any;
  /**
   * Needed to quickly construct the taler:// URI for the counterparty
   * without a join.
   */
  contractPriv: string;
}

export interface WgInfoBankPeerPush {
  withdrawalType: WithdrawalRecordType.PeerPushCredit;

  contractTerms: any;
}

export interface WgInfoBankRecoup {
  withdrawalType: WithdrawalRecordType.Recoup;
}

export type WgInfo =
  | WgInfoBankIntegrated
  | WgInfoBankManual
  | WgInfoBankPeerPull
  | WgInfoBankPeerPush
  | WgInfoBankRecoup;

/**
 * Group of withdrawal operations that need to be executed.
 * (Either for a normal withdrawal or from a tip.)
 *
 * The withdrawal group record is only created after we know
 * the coin selection we want to withdraw.
 */
export interface WithdrawalGroupRecord {
  /**
   * Unique identifier for the withdrawal group.
   */
  withdrawalGroupId: string;

  wgInfo: WgInfo;

  /**
   * Secret seed used to derive planchets.
   * Stored since planchets are created lazily.
   */
  secretSeed: string;

  /**
   * Public key of the reserve that we're withdrawing from.
   */
  reservePub: string;

  /**
   * The reserve private key.
   *
   * FIXME: Already in the reserves object store, redundant!
   */
  reservePriv: string;

  /**
   * The exchange base URL that we're withdrawing from.
   * (Redundantly stored, as the reserve record also has this info.)
   */
  exchangeBaseUrl: string;

  /**
   * When was the withdrawal operation started started?
   * Timestamp in milliseconds.
   */
  timestampStart: TalerProtocolTimestamp;

  /**
   * When was the withdrawal operation completed?
   */
  timestampFinish?: TalerProtocolTimestamp;

  /**
   * Operation status of the withdrawal group.
   * Used for indexing in the database.
   */
  operationStatus: OperationStatus;

  /**
   * Current status of the reserve.
   */
  reserveStatus: ReserveRecordStatus;

  /**
   * Amount that was sent by the user to fund the reserve.
   */
  instructedAmount: AmountJson;

  /**
   * Wire information (as payto URI) for the bank account that
   * transferred funds for this reserve.
   */
  senderWire?: string;

  /**
   * Restrict withdrawals from this reserve to this age.
   */
  restrictAge?: number;

  /**
   * Amount including fees (i.e. the amount subtracted from the
   * reserve to withdraw all coins in this withdrawal session).
   */
  rawWithdrawalAmount: AmountJson;

  /**
   * Denominations selected for withdrawal.
   */
  denomsSel: DenomSelectionState;

  /**
   * UID of the denomination selection.
   *
   * Used for merging backups.
   *
   * FIXME: Should this not also include a timestamp for more logical merging?
   */
  denomSelUid: string;
}

export interface BankWithdrawUriRecord {
  /**
   * The withdraw URI we got from the bank.
   */
  talerWithdrawUri: string;

  /**
   * Reserve that was created for the withdraw URI.
   */
  reservePub: string;
}

/**
 * Status of recoup operations that were grouped together.
 *
 * The remaining amount of involved coins should be set to zero
 * in the same transaction that inserts the RecoupGroupRecord.
 */
export interface RecoupGroupRecord {
  /**
   * Unique identifier for the recoup group record.
   */
  recoupGroupId: string;

  exchangeBaseUrl: string;

  timestampStarted: TalerProtocolTimestamp;

  timestampFinished: TalerProtocolTimestamp | undefined;

  /**
   * Public keys that identify the coins being recouped
   * as part of this session.
   *
   * (Structured like this to enable multiEntry indexing in IndexedDB.)
   */
  coinPubs: string[];

  /**
   * Array of flags to indicate whether the recoup finished on each individual coin.
   */
  recoupFinishedPerCoin: boolean[];

  /**
   * We store old amount (i.e. before recoup) of recouped coins here,
   * as the balance of a recouped coin is set to zero when the
   * recoup group is created.
   */
  oldAmountPerCoin: AmountJson[];

  /**
   * Public keys of coins that should be scheduled for refreshing
   * after all individual recoups are done.
   */
  scheduleRefreshCoins: string[];
}

export enum BackupProviderStateTag {
  Provisional = "provisional",
  Ready = "ready",
  Retrying = "retrying",
}

export type BackupProviderState =
  | {
      tag: BackupProviderStateTag.Provisional;
    }
  | {
      tag: BackupProviderStateTag.Ready;
      nextBackupTimestamp: TalerProtocolTimestamp;
    }
  | {
      tag: BackupProviderStateTag.Retrying;
    };

export interface BackupProviderTerms {
  supportedProtocolVersion: string;
  annualFee: AmountString;
  storageLimitInMegabytes: number;
}

export interface BackupProviderRecord {
  /**
   * Base URL of the provider.
   *
   * Primary key for the record.
   */
  baseUrl: string;

  /**
   * Name of the provider
   */
  name: string;

  /**
   * Terms of service of the provider.
   * Might be unavailable in the DB in certain situations
   * (such as loading a recovery document).
   */
  terms?: BackupProviderTerms;

  /**
   * Hash of the last encrypted backup that we already merged
   * or successfully uploaded ourselves.
   */
  lastBackupHash?: string;

  /**
   * Last time that we successfully uploaded a backup (or
   * the uploaded backup was already current).
   *
   * Does NOT correspond to the timestamp of the backup,
   * which only changes when the backup content changes.
   */
  lastBackupCycleTimestamp?: TalerProtocolTimestamp;

  /**
   * Proposal that we're currently trying to pay for.
   *
   * (Also included in paymentProposalIds.)
   *
   * FIXME:  Make this part of a proper BackupProviderState?
   */
  currentPaymentProposalId?: string;

  /**
   * Proposals that were used to pay (or attempt to pay) the provider.
   *
   * Stored to display a history of payments to the provider, and
   * to make sure that the wallet isn't overpaying.
   */
  paymentProposalIds: string[];

  state: BackupProviderState;

  /**
   * UIDs for the operation that added the backup provider.
   */
  uids: string[];
}

/**
 * Group of deposits made by the wallet.
 */
export interface DepositGroupRecord {
  depositGroupId: string;

  merchantPub: string;
  merchantPriv: string;

  noncePriv: string;
  noncePub: string;

  /**
   * Wire information used by all deposits in this
   * deposit group.
   */
  wire: {
    payto_uri: string;
    salt: string;
  };

  /**
   * Verbatim contract terms.
   */
  contractTermsRaw: ContractTerms;

  contractTermsHash: string;

  payCoinSelection: PayCoinSelection;

  payCoinSelectionUid: string;

  totalPayCost: AmountJson;

  effectiveDepositAmount: AmountJson;

  depositedPerCoin: boolean[];

  timestampCreated: TalerProtocolTimestamp;

  timestampFinished: TalerProtocolTimestamp | undefined;

  operationStatus: OperationStatus;
}

/**
 * Record for a deposits that the wallet observed
 * as a result of double spending, but which is not
 * present in the wallet's own database otherwise.
 */
export interface GhostDepositGroupRecord {
  /**
   * When multiple deposits for the same contract terms hash
   * have a different timestamp, we choose the earliest one.
   */
  timestamp: TalerProtocolTimestamp;

  contractTermsHash: string;

  deposits: {
    coinPub: string;
    amount: AmountString;
    timestamp: TalerProtocolTimestamp;
    depositFee: AmountString;
    merchantPub: string;
    coinSig: string;
    wireHash: string;
  }[];
}

export interface TombstoneRecord {
  /**
   * Tombstone ID, with the syntax "<type>:<key>".
   */
  id: string;
}

export interface BalancePerCurrencyRecord {
  currency: string;

  availableNow: AmountString;

  availableExpected: AmountString;

  pendingIncoming: AmountString;

  pendingOutgoing: AmountString;
}

/**
 * Record for a push P2P payment that this wallet initiated.
 */
export interface PeerPushPaymentInitiationRecord {
  /**
   * What exchange are funds coming from?
   */
  exchangeBaseUrl: string;

  amount: AmountString;

  contractTerms: any;
  /**
   * Purse public key.  Used as the primary key to look
   * up this record.
   */
  pursePub: string;

  /**
   * Purse private key.
   */
  pursePriv: string;

  /**
   * Public key of the merge capability of the purse.
   */
  mergePub: string;

  /**
   * Private key of the merge capability of the purse.
   */
  mergePriv: string;

  contractPriv: string;

  purseExpiration: TalerProtocolTimestamp;

  /**
   * Did we successfully create the purse with the exchange?
   */
  purseCreated: boolean;

  timestampCreated: TalerProtocolTimestamp;
}

export interface PeerPullPaymentInitiationRecord {
  /**
   * What exchange are we using for the payment request?
   */
  exchangeBaseUrl: string;

  /**
   * Amount requested.
   */
  amount: AmountString;

  /**
   * Purse public key.  Used as the primary key to look
   * up this record.
   */
  pursePub: string;

  /**
   * Purse private key.
   */
  pursePriv: string;

  /**
   * Contract terms for the other party.
   *
   * FIXME: Nail down type!
   */
  contractTerms: any;
}

/**
 * Record for a push P2P payment that this wallet was offered.
 *
 * Unique: (exchangeBaseUrl, pursePub)
 */
export interface PeerPushPaymentIncomingRecord {
  peerPushPaymentIncomingId: string;

  exchangeBaseUrl: string;

  pursePub: string;

  mergePriv: string;

  contractPriv: string;

  timestamp: TalerProtocolTimestamp;

  contractTerms: PeerContractTerms;

  // FIXME: add status etc.
}

export interface PeerPullPaymentIncomingRecord {
  peerPullPaymentIncomingId: string;

  pursePub: string;

  exchangeBaseUrl: string;

  contractTerms: PeerContractTerms;

  timestampCreated: TalerProtocolTimestamp;

  paid: boolean;

  accepted: boolean;

  contractPriv: string;
}

// FIXME: give this some smaller "row ID" to
// reference in other records?
export interface ReserveRecord {
  reservePub: string;
  reservePriv: string;
}

export interface OperationRetryRecord {
  /**
   * Unique identifier for the operation.  Typically of
   * the format `${opType}-${opUniqueKey}`
   */
  id: string;

  lastError?: TalerErrorDetail;

  retryInfo: RetryInfo;
}

export enum OperationAttemptResultType {
  Finished = "finished",
  Pending = "pending",
  Error = "error",
  Longpoll = "longpoll",
}

// FIXME: not part of DB!
export type OperationAttemptResult<TSuccess = unknown, TPending = unknown> =
  | OperationAttemptFinishedResult<TSuccess>
  | OperationAttemptErrorResult
  | OperationAttemptLongpollResult
  | OperationAttemptPendingResult<TPending>;

export namespace OperationAttemptResult {
  export function finishedEmpty(): OperationAttemptResult<unknown, unknown> {
    return {
      type: OperationAttemptResultType.Finished,
      result: undefined,
    };
  }
}

export interface OperationAttemptFinishedResult<T> {
  type: OperationAttemptResultType.Finished;
  result: T;
}

export interface OperationAttemptPendingResult<T> {
  type: OperationAttemptResultType.Pending;
  result: T;
}

export interface OperationAttemptErrorResult {
  type: OperationAttemptResultType.Error;
  errorDetail: TalerErrorDetail;
}

export interface OperationAttemptLongpollResult {
  type: OperationAttemptResultType.Longpoll;
}

export const WalletStoresV1 = {
  coins: describeStore(
    describeContents<CoinRecord>("coins", {
      keyPath: "coinPub",
    }),
    {
      byBaseUrl: describeIndex("byBaseUrl", "exchangeBaseUrl"),
      byDenomPubHash: describeIndex("byDenomPubHash", "denomPubHash"),
      byCoinEvHash: describeIndex("byCoinEvHash", "coinEvHash"),
    },
  ),
  reserves: describeStore(
    describeContents<ReserveRecord>("reserves", {
      keyPath: "reservePub",
    }),
    {},
  ),
  config: describeStore(
    describeContents<ConfigRecord>("config", { keyPath: "key" }),
    {},
  ),
  auditorTrust: describeStore(
    describeContents<AuditorTrustRecord>("auditorTrust", {
      keyPath: ["currency", "auditorBaseUrl"],
    }),
    {
      byAuditorPub: describeIndex("byAuditorPub", "auditorPub"),
      byUid: describeIndex("byUid", "uids", {
        multiEntry: true,
      }),
    },
  ),
  exchangeTrust: describeStore(
    describeContents<ExchangeTrustRecord>("exchangeTrust", {
      keyPath: ["currency", "exchangeBaseUrl"],
    }),
    {
      byExchangeMasterPub: describeIndex(
        "byExchangeMasterPub",
        "exchangeMasterPub",
      ),
    },
  ),
  denominations: describeStore(
    describeContents<DenominationRecord>("denominations", {
      keyPath: ["exchangeBaseUrl", "denomPubHash"],
    }),
    {
      byExchangeBaseUrl: describeIndex("byExchangeBaseUrl", "exchangeBaseUrl"),
    },
  ),
  exchanges: describeStore(
    describeContents<ExchangeRecord>("exchanges", {
      keyPath: "baseUrl",
    }),
    {},
  ),
  exchangeDetails: describeStore(
    describeContents<ExchangeDetailsRecord>("exchangeDetails", {
      keyPath: ["exchangeBaseUrl", "currency", "masterPublicKey"],
    }),
    {},
  ),
  proposals: describeStore(
    describeContents<ProposalRecord>("proposals", { keyPath: "proposalId" }),
    {
      byUrlAndOrderId: describeIndex("byUrlAndOrderId", [
        "merchantBaseUrl",
        "orderId",
      ]),
    },
  ),
  refreshGroups: describeStore(
    describeContents<RefreshGroupRecord>("refreshGroups", {
      keyPath: "refreshGroupId",
    }),
    {
      byStatus: describeIndex("byStatus", "operationStatus"),
    },
  ),
  recoupGroups: describeStore(
    describeContents<RecoupGroupRecord>("recoupGroups", {
      keyPath: "recoupGroupId",
    }),
    {},
  ),
  purchases: describeStore(
    describeContents<PurchaseRecord>("purchases", { keyPath: "proposalId" }),
    {
      byFulfillmentUrl: describeIndex(
        "byFulfillmentUrl",
        "download.contractData.fulfillmentUrl",
      ),
      byMerchantUrlAndOrderId: describeIndex("byMerchantUrlAndOrderId", [
        "download.contractData.merchantBaseUrl",
        "download.contractData.orderId",
      ]),
    },
  ),
  tips: describeStore(
    describeContents<TipRecord>("tips", { keyPath: "walletTipId" }),
    {
      byMerchantTipIdAndBaseUrl: describeIndex("byMerchantTipIdAndBaseUrl", [
        "merchantTipId",
        "merchantBaseUrl",
      ]),
    },
  ),
  withdrawalGroups: describeStore(
    describeContents<WithdrawalGroupRecord>("withdrawalGroups", {
      keyPath: "withdrawalGroupId",
    }),
    {
      byReservePub: describeIndex("byReservePub", "reservePub"),
      byStatus: describeIndex("byStatus", "operationStatus"),
      byTalerWithdrawUri: describeIndex(
        "byTalerWithdrawUri",
        "wgInfo.bankInfo.talerWithdrawUri",
      ),
    },
  ),
  planchets: describeStore(
    describeContents<PlanchetRecord>("planchets", { keyPath: "coinPub" }),
    {
      byGroupAndIndex: describeIndex("byGroupAndIndex", [
        "withdrawalGroupId",
        "coinIdx",
      ]),
      byGroup: describeIndex("byGroup", "withdrawalGroupId"),
      byCoinEvHash: describeIndex("byCoinEv", "coinEvHash"),
    },
  ),
  bankWithdrawUris: describeStore(
    describeContents<BankWithdrawUriRecord>("bankWithdrawUris", {
      keyPath: "talerWithdrawUri",
    }),
    {},
  ),
  backupProviders: describeStore(
    describeContents<BackupProviderRecord>("backupProviders", {
      keyPath: "baseUrl",
    }),
    {
      byPaymentProposalId: describeIndex(
        "byPaymentProposalId",
        "paymentProposalIds",
        {
          multiEntry: true,
        },
      ),
    },
  ),
  depositGroups: describeStore(
    describeContents<DepositGroupRecord>("depositGroups", {
      keyPath: "depositGroupId",
    }),
    {
      byStatus: describeIndex("byStatus", "operationStatus"),
    },
  ),
  tombstones: describeStore(
    describeContents<TombstoneRecord>("tombstones", { keyPath: "id" }),
    {},
  ),
  operationRetries: describeStore(
    describeContents<OperationRetryRecord>("operationRetries", {
      keyPath: "id",
    }),
    {},
  ),
  ghostDepositGroups: describeStore(
    describeContents<GhostDepositGroupRecord>("ghostDepositGroups", {
      keyPath: "contractTermsHash",
    }),
    {},
  ),
  balancesPerCurrency: describeStore(
    describeContents<BalancePerCurrencyRecord>("balancesPerCurrency", {
      keyPath: "currency",
    }),
    {},
  ),
  peerPushPaymentIncoming: describeStore(
    describeContents<PeerPushPaymentIncomingRecord>("peerPushPaymentIncoming", {
      keyPath: "peerPushPaymentIncomingId",
    }),
    {
      byExchangeAndPurse: describeIndex("byExchangeAndPurse", [
        "exchangeBaseUrl",
        "pursePub",
      ]),
    },
  ),
  peerPullPaymentIncoming: describeStore(
    describeContents<PeerPullPaymentIncomingRecord>("peerPullPaymentIncoming", {
      keyPath: "peerPullPaymentIncomingId",
    }),
    {
      byExchangeAndPurse: describeIndex("byExchangeAndPurse", [
        "exchangeBaseUrl",
        "pursePub",
      ]),
    },
  ),
  peerPullPaymentInitiations: describeStore(
    describeContents<PeerPullPaymentInitiationRecord>(
      "peerPullPaymentInitiations",
      {
        keyPath: "pursePub",
      },
    ),
    {},
  ),
  peerPushPaymentInitiations: describeStore(
    describeContents<PeerPushPaymentInitiationRecord>(
      "peerPushPaymentInitiations",
      {
        keyPath: "pursePub",
      },
    ),
    {},
  ),
};

export interface MetaConfigRecord {
  key: string;
  value: any;
}

export const walletMetadataStore = {
  metaConfig: describeStore(
    describeContents<MetaConfigRecord>("metaConfig", { keyPath: "key" }),
    {},
  ),
};

export function exportDb(db: IDBDatabase): Promise<any> {
  const dump = {
    name: db.name,
    stores: {} as { [s: string]: any },
    version: db.version,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(Array.from(db.objectStoreNames));
    tx.addEventListener("complete", () => {
      resolve(dump);
    });
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const name = db.objectStoreNames[i];
      const storeDump = {} as { [s: string]: any };
      dump.stores[name] = storeDump;
      tx.objectStore(name)
        .openCursor()
        .addEventListener("success", (e: Event) => {
          const cursor = (e.target as any).result;
          if (cursor) {
            storeDump[cursor.key] = cursor.value;
            cursor.continue();
          }
        });
    }
  });
}

export interface DatabaseDump {
  name: string;
  stores: { [s: string]: any };
  version: string;
}

export function importDb(db: IDBDatabase, dump: DatabaseDump): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
    tx.addEventListener("complete", () => {
      resolve(db);
    });
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const name = db.objectStoreNames[i];
      const storeDump = dump.stores[name];
      if (!storeDump) continue;
      Object.keys(storeDump).forEach(async (key) => {
        const value = storeDump[key];
        if (!value) return;
        tx.objectStore(name).put(value);
      });
    }
    tx.commit();
  });
}
