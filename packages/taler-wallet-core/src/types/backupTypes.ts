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

import { Timestamp } from "../util/time";

/**
 * Type declarations for backup.
 *
 * Contains some redundancy with the other type declarations,
 * as the backup schema must be very stable.
 *
 * Current limitations:
 * 1. Contracts that are claimed but not accepted aren't
 *    exported yet.
 * 2. There is no garbage collection mechanism for the export yet.
 *    (But this should actually become the main GC mechanism!)
 * 3. Reserve history isn't backed up yet.
 * 4. Recoup metadata isn't exported yet.
 *
 * General considerations / decisions:
 * 1. Information about previously occurring errors and
 *    retries is never backed up.
 * 2. The ToS text of an exchange is never backed up.
 * 3. Public keys are always exported in the backup
 *    and never recomputed (this allows the import to
 *    complete within a DB transaction that can't access
 *    the crypto worker).
 *
 * @author Florian Dold <dold@taler.net>
 */

type BackupAmountString = string;

/**
 * Content of the backup.
 *
 * The contents of the wallet must be serialized in a deterministic
 * way across implementations, so that the normalized backup content
 * JSON is identical when the wallet's content is identical.
 */
export interface WalletBackupContentV1 {
  schemaId: "gnu-taler-wallet-backup";

  schemaVersion: 1;

  /**
   * Monotonically increasing clock of the wallet,
   * used to determine causality when merging backups.
   */
  clock: number;

  walletRootPub: string;

  /**
   * Per-exchange data sorted by exchange master public key.
   */
  exchanges: BackupExchangeData[];

  denominations: BackupDenomination[];

  reserves: BackupReserveData[];

  withdrawalGroups: BackupWithdrawalGroup[];

  refreshGroups: BackupRefreshGroup[];

  coins: BackupCoin[];

  purchases: BackupPurchase[];
}

export enum BackupCoinSourceType {
  Withdraw = "withdraw",
  Refresh = "refresh",
  Tip = "tip",
}

export interface BackupWithdrawCoinSource {
  type: BackupCoinSourceType.Withdraw;

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

export interface BackupRefreshCoinSource {
  type: BackupCoinSourceType.Refresh;
  oldCoinPub: string;
}

export interface BackupTipCoinSource {
  type: BackupCoinSourceType.Tip;
  walletTipId: string;
  coinIndex: number;
}

export type BackupCoinSource =
  | BackupWithdrawCoinSource
  | BackupRefreshCoinSource
  | BackupTipCoinSource;

export interface BackupCoin {
  /**
   * Where did the coin come from?  Used for recouping coins.
   */
  coinSource: BackupCoinSource;

  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key to authorize operations on the coin.
   */
  coinPriv: string;

  /**
   * Key used by the exchange used to sign the coin.
   */
  denomPub: string;

  /**
   * Hash of the public key that signs the coin.
   */
  denomPubHash: string;

  /**
   * Unblinded signature by the exchange.
   */
  denomSig: string;

  /**
   * Amount that's left on the coin.
   */
  currentAmount: BackupAmountString;

  /**
   * Base URL that identifies the exchange from which we got the
   * coin.
   */
  exchangeBaseUrl: string;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally used again during payback.
   */
  blindingKey: string;

  fresh: boolean;
}

/**
 * Status of a tip we got from a merchant.
 */
export interface BackupTip {
  /**
   * Tip ID chosen by the wallet.
   */
  walletTipId: string;

  /**
   * The merchant's identifier for this tip.
   */
  merchantTipId: string;

  /**
   * Has the user accepted the tip?  Only after the tip has been accepted coins
   * withdrawn from the tip may be used.
   */
  acceptedTimestamp: Timestamp | undefined;

  createdTimestamp: Timestamp;

  /**
   * Timestamp for when the wallet finished picking up the tip
   * from the merchant.
   */
  pickedUpTimestamp: Timestamp | undefined;

  /**
   * The tipped amount.
   */
  tipAmountRaw: BackupAmountString;

  tipAmountEffective: BackupAmountString;

  /**
   * Timestamp, the tip can't be picked up anymore after this deadline.
   */
  tipExpiration: Timestamp;

  /**
   * The exchange that will sign our coins, chosen by the merchant.
   */
  exchangeBaseUrl: string;

  /**
   * Base URL of the merchant that is giving us the tip.
   */
  merchantBaseUrl: string;

  /**
   * Planchets, the members included in TipPlanchetDetail will be sent to the
   * merchant.
   */
  planchets?: {
    blindingKey: string;
    coinEv: string;
    coinPriv: string;
    coinPub: string;
  }[];

  totalCoinValue: BackupAmountString;
  totalWithdrawCost: BackupAmountString;

  selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[];
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
 * Planchet for a coin during refrehs.
 */
export interface BackupRefreshPlanchet {
  /**
   * Public key for the coin.
   */
  publicKey: string;
  /**
   * Private key for the coin.
   */
  privateKey: string;
  /**
   * Blinded public key.
   */
  coinEv: string;
  /**
   * Blinding key used.
   */
  blindingKey: string;
}

export interface BackupRefreshSessionRecord {
  /**
   * Public key that's being melted in this session.
   */
  meltCoinPub: string;

  /**
   * How much of the coin's value is melted away
   * with this refresh session?
   */
  amountRefreshInput: BackupAmountString;

  /**
   * Sum of the value of denominations we want
   * to withdraw in this session, without fees.
   */
  amountRefreshOutput: BackupAmountString;

  /**
   * Signature to confirm the melting.
   */
  confirmSig: string;

  /**
   * Hased denominations of the newly requested coins.
   */
  newDenomHashes: string[];

  /**
   * Denominations of the newly requested coins.
   */
  newDenoms: string[];

  /**
   * Planchets for each cut-and-choose instance.
   */
  planchetsForGammas: BackupRefreshPlanchet[][];

  /**
   * The transfer keys, kappa of them.
   */
  transferPubs: string[];

  /**
   * Private keys for the transfer public keys.
   */
  transferPrivs: string[];

  /**
   * The no-reveal-index after we've done the melting.
   */
  norevealIndex?: number;

  /**
   * Hash of the session.
   */
  hash: string;

  /**
   * Timestamp when the refresh session finished.
   */
  finishedTimestamp: Timestamp | undefined;

  /**
   * When has this refresh session been created?
   */
  timestampCreated: Timestamp;

  /**
   * Base URL for the exchange we're doing the refresh with.
   */
  exchangeBaseUrl: string;
}

export interface BackupRefreshGroup {
  refreshGroupId: string;

  reason: BackupRefreshReason;

  oldCoinPubs: string[];

  refreshSessionPerCoin: (BackupRefreshSessionRecord | undefined)[];

  inputPerCoin: BackupAmountString[];

  estimatedOutputPerCoin: BackupAmountString[];

  /**
   * Timestamp when the refresh session finished.
   */
  timestampFinished: Timestamp | undefined;
}

export interface BackupWithdrawalGroup {
  withdrawalGroupId: string;

  reservePub: string;

  /**
   * When was the withdrawal operation started started?
   * Timestamp in milliseconds.
   */
  timestampStart: Timestamp;

  /**
   * When was the withdrawal operation completed?
   */
  timestampFinish?: Timestamp;

  /**
   * Amount including fees (i.e. the amount subtracted from the
   * reserve to withdraw all coins in this withdrawal session).
   */
  rawWithdrawalAmount: BackupAmountString;

  totalCoinValue: BackupAmountString;
  totalWithdrawCost: BackupAmountString;

  selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[];

  /**
   * One planchet/coin for each selected denomination.
   */
  planchets: {
    blindingKey: string;
    coinPriv: string;
    coinPub: string;
  }[];
}

export enum BackupRefundState {
  Failed = "failed",
  Applied = "applied",
  Pending = "pending",
}

export interface BackupRefundItemCommon {
  // Execution time as claimed by the merchant
  executionTime: Timestamp;

  /**
   * Time when the wallet became aware of the refund.
   */
  obtainedTime: Timestamp;

  refundAmount: BackupAmountString;
  refundFee: BackupAmountString;

  /**
   * Upper bound on the refresh cost incurred by
   * applying this refund.
   *
   * Might be lower in practice when two refunds on the same
   * coin are refreshed in the same refresh operation.
   */
  totalRefreshCostBound: BackupAmountString;
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

export interface BackupPurchase {
  /**
   * Proposal ID for this purchase.  Uniquely identifies the
   * purchase and the proposal.
   */
  proposalId: string;

  /**
   * Contract terms we got from the merchant.
   */
  contractTermsRaw: string;

  /**
   * Amount requested by the merchant.
   */
  paymentAmount: BackupAmountString;

  /**
   * Public keys of the coins that were selected.
   */
  coinPubs: string[];

  /**
   * Deposit permission signature of each coin.
   */
  coinSigs: string[];

  /**
   * Amount that each coin contributes.
   */
  coinContributions: BackupAmountString[];

  /**
   * How much of the wire fees is the customer paying?
   */
  customerWireFees: BackupAmountString;

  /**
   * How much of the deposit fees is the customer paying?
   */
  customerDepositFees: BackupAmountString;

  totalPayCost: BackupAmountString;

  /**
   * Timestamp of the first time that sending a payment to the merchant
   * for this purchase was successful.
   */
  timestampFirstSuccessfulPay: Timestamp | undefined;

  merchantPaySig: string | undefined;

  /**
   * When was the purchase made?
   * Refers to the time that the user accepted.
   */
  timestampAccept: Timestamp;

  /**
   * Pending refunds for the purchase.  A refund is pending
   * when the merchant reports a transient error from the exchange.
   */
  refunds: { [refundKey: string]: BackupRefundItem };

  /**
   * When was the last refund made?
   * Set to 0 if no refund was made on the purchase.
   */
  timestampLastRefundStatus: Timestamp | undefined;

  abortStatus?: "abort-refund" | "abort-finished";

  /**
   * Continue querying the refund status until this deadline has expired.
   */
  autoRefundDeadline: Timestamp | undefined;
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
  denomPub: string;

  /**
   * Hash of the denomination public key.
   * Stored in the database for faster lookups.
   */
  denomPubHash: string;

  /**
   * Fee for withdrawing.
   */
  feeWithdraw: BackupAmountString;

  /**
   * Fee for depositing.
   */
  feeDeposit: BackupAmountString;

  /**
   * Fee for refreshing.
   */
  feeRefresh: BackupAmountString;

  /**
   * Fee for refunding.
   */
  feeRefund: BackupAmountString;

  /**
   * Validity start date of the denomination.
   */
  stampStart: Timestamp;

  /**
   * Date after which the currency can't be withdrawn anymore.
   */
  stampExpireWithdraw: Timestamp;

  /**
   * Date after the denomination officially doesn't exist anymore.
   */
  stampExpireLegal: Timestamp;

  /**
   * Data after which coins of this denomination can't be deposited anymore.
   */
  stampExpireDeposit: Timestamp;

  /**
   * Signature by the exchange's master key over the denomination
   * information.
   */
  masterSig: string;

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
}

export interface BackupReserve {
  reservePub: string;
  reservePriv: string;
  /**
   * The exchange base URL.
   */
  exchangeBaseUrl: string;

  bankConfirmUrl?: string;

  /**
   * Wire information (as payto URI) for the bank account that
   * transfered funds for this reserve.
   */
  senderWire?: string;
}

export interface BackupReserveData {
  /**
   * The reserve public key.
   */
  reservePub: string;

  /**
   * The reserve private key.
   */
  reservePriv: string;

  /**
   * The exchange base URL.
   */
  exchangeBaseUrl: string;

  /**
   * Time when the reserve was created.
   */
  timestampCreated: Timestamp;

  /**
   * Time when the information about this reserve was posted to the bank.
   *
   * Only applies if bankWithdrawStatusUrl is defined.
   *
   * Set to 0 if that hasn't happened yet.
   */
  timestampReserveInfoPosted: Timestamp | undefined;

  /**
   * Time when the reserve was confirmed by the bank.
   *
   * Set to undefined if not confirmed yet.
   */
  timestampBankConfirmed: Timestamp | undefined;

  /**
   * Wire information (as payto URI) for the bank account that
   * transfered funds for this reserve.
   */
  senderWire?: string;

  /**
   * Amount that was sent by the user to fund the reserve.
   */
  instructedAmount: BackupAmountString;

  /**
   * Extra state for when this is a withdrawal involving
   * a Taler-integrated bank.
   */
  bankInfo?: {
    /**
     * Status URL that the wallet will use to query the status
     * of the Taler withdrawal operation on the bank's side.
     */
    statusUrl: string;

    confirmUrl?: string;

    /**
     * Exchange payto URI that the bank will use to fund the reserve.
     */
    exchangePaytoUri: string;

    /**
     * Do we still need to register the reserve with the bank?
     */
    registerPending: boolean;
  };

  initialWithdrawalGroupId: string;

  initialTotalCoinValue: BackupAmountString;

  initialTotalWithdrawCost: BackupAmountString;
  initialSelectedDenoms: {
    denomPubHash: string;
    count: number;
  }[];
}

export interface ExchangeBankAccount {
  paytoUri: string;
}

/**
 * Wire fee for one wire method as stored in the
 * wallet's database.
 */
export interface BackupExchangeWireFee {
  wireType: string;

  /**
   * Fee for wire transfers.
   */
  wireFee: string;

  /**
   * Fees to close and refund a reserve.
   */
  closingFee: string;

  /**
   * Start date of the fee.
   */
  startStamp: Timestamp;

  /**
   * End date of the fee.
   */
  endStamp: Timestamp;

  /**
   * Signature made by the exchange master key.
   */
  sig: string;
}

/**
 * Structure of one exchange signing key in the /keys response.
 */
export class BackupExchangeSignKey {
  stampStart: Timestamp;
  stampExpire: Timestamp;
  stampEnd: Timestamp;
  key: string;
  masterSig: string;
}

/**
 * Signature by the auditor that a particular denomination key is audited.
 */
export class AuditorDenomSig {
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
  auditorPub: string;

  /**
   * Base URL of the auditor.
   */
  auditorUrl: string;

  /**
   * List of signatures for denominations by the auditor.
   */
  denominationKeys: AuditorDenomSig[];
}

export interface BackupExchangeData {
  /**
   * Base url of the exchange.
   */
  baseUrl: string;

  /**
   * Master public key of the exchange.
   */
  masterPublicKey: string;

  /**
   * Auditors (partially) auditing the exchange.
   */
  auditors: BackupExchangeAuditor[];

  /**
   * Currency that the exchange offers.
   */
  currency: string;

  /**
   * Last observed protocol version.
   */
  protocolVersion: string;

  /**
   * Signing keys we got from the exchange, can also contain
   * older signing keys that are not returned by /keys anymore.
   */
  signingKeys: BackupExchangeSignKey[];

  wireFees: BackupExchangeWireFee[];

  accounts: ExchangeBankAccount[];

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceLastEtag: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceAcceptedEtag: string | undefined;
}
