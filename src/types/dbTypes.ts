/*
 This file is part of TALER
 (C) 2018 GNUnet e.V. and INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Types for records stored in the wallet's database.
 *
 * Types for the objects in the database should end in "-Record".
 */

/**
 * Imports.
 */
import { AmountJson } from "../util/amounts";
import {
  Auditor,
  CoinDepositPermission,
  MerchantRefundPermission,
  PayReq,
  TipResponse,
} from "./talerTypes";

import { Index, Store } from "../util/query";
import { OperationError, RefreshReason } from "./walletTypes";
import { ReserveTransaction } from "./ReserveTransaction";
import { Timestamp, Duration, getTimestampNow } from "../util/time";

export enum ReserveRecordStatus {
  /**
   * Waiting for manual confirmation.
   */
  UNCONFIRMED = "unconfirmed",

  /**
   * Reserve must be registered with the bank.
   */
  REGISTERING_BANK = "registering-bank",

  /**
   * We've registered reserve's information with the bank
   * and are now waiting for the user to confirm the withdraw
   * with the bank (typically 2nd factor auth).
   */
  WAIT_CONFIRM_BANK = "wait-confirm-bank",

  /**
   * Querying reserve status with the exchange.
   */
  QUERYING_STATUS = "querying-status",

  /**
   * Status is queried, the wallet must now select coins
   * and start withdrawing.
   */
  WITHDRAWING = "withdrawing",

  /**
   * The corresponding withdraw record has been created.
   * No further processing is done, unless explicitly requested
   * by the user.
   */
  DORMANT = "dormant",
}

export interface RetryInfo {
  firstTry: Timestamp;
  nextRetry: Timestamp;
  retryCounter: number;
  active: boolean;
}

export interface RetryPolicy {
  readonly backoffDelta: Duration;
  readonly backoffBase: number;
}

const defaultRetryPolicy: RetryPolicy = {
  backoffBase: 1.5,
  backoffDelta: { d_ms: 200 },
};

export function updateRetryInfoTimeout(
  r: RetryInfo,
  p: RetryPolicy = defaultRetryPolicy,
): void {
  const now = getTimestampNow();
  if (now.t_ms === "never") {
    throw Error("assertion failed");
  }
  if (p.backoffDelta.d_ms === "forever") {
    r.nextRetry = { t_ms: "never" };
    return;
  }
  const t =
    now.t_ms + p.backoffDelta.d_ms * Math.pow(p.backoffBase, r.retryCounter);
  r.nextRetry = { t_ms: t };
}

export function initRetryInfo(
  active: boolean = true,
  p: RetryPolicy = defaultRetryPolicy,
): RetryInfo {
  if (!active) {
    return {
      active: false,
      firstTry: { t_ms: Number.MAX_SAFE_INTEGER },
      nextRetry: { t_ms: Number.MAX_SAFE_INTEGER },
      retryCounter: 0,
    };
  }
  const info = {
    firstTry: getTimestampNow(),
    active: true,
    nextRetry: { t_ms: 0 },
    retryCounter: 0,
  };
  updateRetryInfoTimeout(info, p);
  return info;
}

/**
 * A reserve record as stored in the wallet's database.
 */
export interface ReserveRecord {
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
   * Time when the reserve was confirmed.
   *
   * Set to 0 if not confirmed yet.
   */
  timestampConfirmed: Timestamp | undefined;

  /**
   * Amount that's still available for withdrawing
   * from this reserve.
   */
  amountWithdrawRemaining: AmountJson;

  /**
   * Amount allocated for withdrawing.
   * The corresponding withdraw operation may or may not
   * have been completed yet.
   */
  amountWithdrawAllocated: AmountJson;

  amountWithdrawCompleted: AmountJson;

  /**
   * Amount requested when the reserve was created.
   * When a reserve is re-used (rare!)  the current_amount can
   * be higher than the requested_amount
   */
  amountInitiallyRequested: AmountJson;

  /**
   * Wire information (as payto URI) for the bank account that
   * transfered funds for this reserve.
   */
  senderWire?: string;

  /**
   * Wire information (as payto URI) for the exchange, specifically
   * the account that was transferred to when creating the reserve.
   */
  exchangeWire: string;

  bankWithdrawStatusUrl?: string;

  /**
   * URL that the bank gave us to redirect the customer
   * to in order to confirm a withdrawal.
   */
  bankWithdrawConfirmUrl?: string;

  reserveStatus: ReserveRecordStatus;

  /**
   * Time of the last successful status query.
   */
  lastSuccessfulStatusQuery: Timestamp | undefined;

  /**
   * Retry info.  This field is present even if no retry is scheduled,
   * because we need it to be present for the index on the object store
   * to work.
   */
  retryInfo: RetryInfo;

  /**
   * Last error that happened in a reserve operation
   * (either talking to the bank or the exchange).
   */
  lastError: OperationError | undefined;

  reserveTransactions: ReserveTransaction[];
}

/**
 * Auditor record as stored with currencies in the exchange database.
 */
export interface AuditorRecord {
  /**
   * Base url of the auditor.
   */
  baseUrl: string;
  /**
   * Public signing key of the auditor.
   */
  auditorPub: string;
  /**
   * Time when the auditing expires.
   */
  expirationStamp: number;
}

/**
 * Exchange for currencies as stored in the wallet's currency
 * information database.
 */
export interface ExchangeForCurrencyRecord {
  /**
   * FIXME: unused?
   */
  exchangePub: string;
  /**
   * Base URL of the exchange.
   */
  baseUrl: string;
}

/**
 * Information about a currency as displayed in the wallet's database.
 */
export interface CurrencyRecord {
  /**
   * Name of the currency.
   */
  name: string;
  /**
   * Number of fractional digits to show when rendering the currency.
   */
  fractionalDigits: number;
  /**
   * Auditors that the wallet trusts for this currency.
   */
  auditors: AuditorRecord[];
  /**
   * Exchanges that the wallet trusts for this currency.
   */
  exchanges: ExchangeForCurrencyRecord[];
}

/**
 * Status of a denomination.
 */
export enum DenominationStatus {
  /**
   * Verification was delayed.
   */
  Unverified,
  /**
   * Verified as valid.
   */
  VerifiedGood,
  /**
   * Verified as invalid.
   */
  VerifiedBad,
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
  denomPub: string;

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
   * Did we verify the signature on the denomination?
   *
   * FIXME:  Rename to "verificationStatus"?
   */
  status: DenominationStatus;

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

/**
 * Details about the exchange that we only know after
 * querying /keys and /wire.
 */
export interface ExchangeDetails {
  /**
   * Master public key of the exchange.
   */
  masterPublicKey: string;
  /**
   * Auditors (partially) auditing the exchange.
   */
  auditors: Auditor[];

  /**
   * Currency that the exchange offers.
   */
  currency: string;

  /**
   * Last observed protocol version.
   */
  protocolVersion: string;

  /**
   * Timestamp for last update.
   */
  lastUpdateTime: Timestamp;
}

export const enum ExchangeUpdateStatus {
  FetchKeys = "fetch-keys",
  FetchWire = "fetch-wire",
  FetchTerms = "fetch-terms",
  FinalizeUpdate = "finalize-update",
  Finished = "finished",
}

export interface ExchangeBankAccount {
  payto_uri: string;
}

export interface ExchangeWireInfo {
  feesForType: { [wireMethod: string]: WireFee[] };
  accounts: ExchangeBankAccount[];
}

/**
 * Summary of updates to the exchange.
 */
export interface ExchangeUpdateDiff {
  // FIXME: implement!
}

export const enum ExchangeUpdateReason {
  Initial = "initial",
  Forced = "forced",
  Scheduled = "scheduled",
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
   * Was the exchange added as a built-in exchange?
   */
  builtIn: boolean;

  /**
   * Details, once known.
   */
  details: ExchangeDetails | undefined;

  /**
   * Mapping from wire method type to the wire fee.
   */
  wireInfo: ExchangeWireInfo | undefined;

  /**
   * When was the exchange added to the wallet?
   */
  timestampAdded: Timestamp;

  /**
   * Terms of service text or undefined if not downloaded yet.
   */
  termsOfServiceText: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceLastEtag: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceAcceptedEtag: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceAcceptedTimestamp: Timestamp | undefined;

  /**
   * Time when the update to the exchange has been started or
   * undefined if no update is in progress.
   */
  updateStarted: Timestamp | undefined;

  updateStatus: ExchangeUpdateStatus;

  updateReason?: ExchangeUpdateReason;

  /**
   * Update diff, will be incorporated when the update is finalized.
   */
  updateDiff: ExchangeUpdateDiff | undefined;

  lastError?: OperationError;
}

/**
 * A coin that isn't yet signed by an exchange.
 */
export interface PlanchetRecord {
  /**
   * Public key of the coin.
   */
  coinPub: string;
  coinPriv: string;
  /**
   * Public key of the reserve, this might be a reserve not
   * known to the wallet if the planchet is from a tip.
   */
  reservePub: string;
  denomPubHash: string;
  denomPub: string;
  blindingKey: string;
  withdrawSig: string;
  coinEv: string;
  coinValue: AmountJson;
  isFromTip: boolean;
}

/**
 * Planchet for a coin during refrehs.
 */
export interface RefreshPlanchetRecord {
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

/**
 * Status of a coin.
 */
export const enum CoinStatus {
  /**
   * Withdrawn and never shown to anybody.
   */
  Fresh = "fresh",
  /**
   * A coin that has been spent and refreshed.
   */
  Dormant = "dormant",
}

export const enum CoinSourceType {
  Withdraw = "withdraw",
  Refresh = "refresh",
  Tip = "tip",
}

export interface WithdrawCoinSource {
  type: CoinSourceType.Withdraw;
  withdrawSessionId: string;

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
  currentAmount: AmountJson;

  /**
   * Base URL that identifies the exchange from which we got the
   * coin.
   */
  exchangeBaseUrl: string;

  /**
   * We have withdrawn the coin, but it's not accepted by the exchange anymore.
   * We have to tell an auditor and wait for compensation or for the exchange
   * to fix it.
   */
  suspended?: boolean;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally sed again during payback.
   */
  blindingKey: string;

  /**
   * Status of the coin.
   */
  status: CoinStatus;
}

export const enum ProposalStatus {
  /**
   * Not downloaded yet.
   */
  DOWNLOADING = "downloading",
  /**
   * Proposal downloaded, but the user needs to accept/reject it.
   */
  PROPOSED = "proposed",
  /**
   * The user has accepted the proposal.
   */
  ACCEPTED = "accepted",
  /**
   * The user has rejected the proposal.
   */
  REFUSED = "refused",
  /**
   * Downloaded proposal was detected as a re-purchase.
   */
  REPURCHASE = "repurchase",
}

export interface ProposalDownload {
  /**
   * The contract that was offered by the merchant.
   */
  contractTermsRaw: string;

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
  timestamp: Timestamp;

  /**
   * Private key for the nonce.
   */
  noncePriv: string;

  /**
   * Public key for the nonce.
   */
  noncePub: string;

  proposalStatus: ProposalStatus;

  repurchaseProposalId: string | undefined;

  /**
   * Session ID we got when downloading the contract.
   */
  downloadSessionId?: string;

  /**
   * Retry info, even present when the operation isn't active to allow indexing
   * on the next retry timestamp.
   */
  retryInfo: RetryInfo;

  lastError: OperationError | undefined;
}

/**
 * Status of a tip we got from a merchant.
 */
export interface TipRecord {
  lastError: OperationError | undefined;

  /**
   * Has the user accepted the tip?  Only after the tip has been accepted coins
   * withdrawn from the tip may be used.
   */
  acceptedTimestamp: Timestamp | undefined;

  /**
   * Has the user rejected the tip?
   */
  rejectedTimestamp: Timestamp | undefined;

  /**
   * Have we picked up the tip record from the merchant already?
   */
  pickedUp: boolean;

  /**
   * The tipped amount.
   */
  amount: AmountJson;

  totalFees: AmountJson;

  /**
   * Timestamp, the tip can't be picked up anymore after this deadline.
   */
  deadline: Timestamp;

  /**
   * The exchange that will sign our coins, chosen by the merchant.
   */
  exchangeUrl: string;

  /**
   * Base URL of the merchant that is giving us the tip.
   */
  merchantBaseUrl: string;

  /**
   * Planchets, the members included in TipPlanchetDetail will be sent to the
   * merchant.
   */
  planchets?: TipPlanchet[];

  /**
   * Response if the merchant responded,
   * undefined otherwise.
   */
  response?: TipResponse[];

  /**
   * Tip ID chosen by the wallet.
   */
  tipId: string;

  /**
   * The merchant's identifier for this tip.
   */
  merchantTipId: string;

  /**
   * URL to go to once the tip has been accepted.
   */
  nextUrl?: string;

  createdTimestamp: Timestamp;

  /**
   * Retry info, even present when the operation isn't active to allow indexing
   * on the next retry timestamp.
   */
  retryInfo: RetryInfo;
}

export interface RefreshGroupRecord {
  /**
   * Retry info, even present when the operation isn't active to allow indexing
   * on the next retry timestamp.
   */
  retryInfo: RetryInfo;

  lastError: OperationError | undefined;

  lastErrorPerCoin: { [coinIndex: number]: OperationError };

  refreshGroupId: string;

  reason: RefreshReason;

  oldCoinPubs: string[];

  refreshSessionPerCoin: (RefreshSessionRecord | undefined)[];

  /**
   * Flag for each coin whether refreshing finished.
   * If a coin can't be refreshed (remaining value too small),
   * it will be marked as finished, but no refresh session will
   * be created.
   */
  finishedPerCoin: boolean[];

  /**
   * Timestamp when the refresh session finished.
   */
  timestampFinished: Timestamp | undefined;
}

/**
 * Ongoing refresh
 */
export interface RefreshSessionRecord {
  lastError: OperationError | undefined;

  /**
   * Public key that's being melted in this session.
   */
  meltCoinPub: string;

  /**
   * How much of the coin's value is melted away
   * with this refresh session?
   */
  amountRefreshInput: AmountJson;

  /**
   * Sum of the value of denominations we want
   * to withdraw in this session, without fees.
   */
  amountRefreshOutput: AmountJson;

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
  planchetsForGammas: RefreshPlanchetRecord[][];

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

/**
 * Tipping planchet stored in the database.
 */
export interface TipPlanchet {
  blindingKey: string;
  coinEv: string;
  coinPriv: string;
  coinPub: string;
  coinValue: AmountJson;
  denomPubHash: string;
  denomPub: string;
}

/**
 * Wire fee for one wire method as stored in the
 * wallet's database.
 */
export interface WireFee {
  /**
   * Fee for wire transfers.
   */
  wireFee: AmountJson;

  /**
   * Fees to close and refund a reserve.
   */
  closingFee: AmountJson;

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
 * Record to store information about a refund event.
 *
 * All information about a refund is stored with the purchase,
 * this event is just for the history.
 *
 * The event is only present for completed refunds.
 */
export interface RefundEventRecord {
  timestamp: Timestamp;
  refundGroupId: string;
  proposalId: string;
}

export interface RefundInfo {
  refundGroupId: string;
  perm: MerchantRefundPermission;
}

export const enum RefundReason {
  /**
   * Normal refund given by the merchant.
   */
  NormalRefund = "normal-refund",
  /**
   * Refund from an aborted payment.
   */
  AbortRefund = "abort-refund",
}

export interface RefundGroupInfo {
  timestampQueried: Timestamp;
  reason: RefundReason;
}

export interface PurchaseRefundState {
  /**
   * Information regarding each group of refunds we receive at once.
   */
  refundGroups: RefundGroupInfo[];

  /**
   * Pending refunds for the purchase.
   */
  refundsPending: { [refundSig: string]: RefundInfo };

  /**
   * Applied refunds for the purchase.
   */
  refundsDone: { [refundSig: string]: RefundInfo };

  /**
   * Submitted refunds for the purchase.
   */
  refundsFailed: { [refundSig: string]: RefundInfo };
}

/**
 * Record stored for every time we successfully submitted
 * a payment to the merchant (both first time and re-play).
 */
export interface PayEventRecord {
  proposalId: string;
  sessionId: string | undefined;
  isReplay: boolean;
  timestamp: Timestamp;
}

export interface ExchangeUpdatedEventRecord {
  exchangeBaseUrl: string;
  timestamp: Timestamp;
}

export interface ReserveUpdatedEventRecord {
  amountReserveBalance: string;
  amountExpected: string;
  reservePub: string;
  timestamp: Timestamp;
  reserveUpdateId: string;
  newHistoryTransactions: ReserveTransaction[];
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
  fulfillmentUrl: string;
  contractTermsHash: string;
  merchantSig: string;
  merchantPub: string;
  amount: AmountJson;
  orderId: string;
  merchantBaseUrl: string;
  summary: string;
  autoRefund: Duration | undefined;
  maxWireFee: AmountJson;
  wireFeeAmortization: number;
  payDeadline: Timestamp;
  refundDeadline: Timestamp;
  allowedAuditors: AllowedAuditorInfo[];
  allowedExchanges: AllowedExchangeInfo[];
  timestamp: Timestamp;
  wireMethod: string;
  wireInfoHash: string;
  maxDepositFee: AmountJson;
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
   * Contract terms we got from the merchant.
   */
  contractTermsRaw: string;

  contractData: WalletContractData;

  /**
   * The payment request, ready to be send to the merchant's
   * /pay URL.
   */
  payReq: PayReq;

  /**
   * Timestamp of the first time that sending a payment to the merchant
   * for this purchase was successful.
   */
  timestampFirstSuccessfulPay: Timestamp | undefined;

  /**
   * When was the purchase made?
   * Refers to the time that the user accepted.
   */
  timestampAccept: Timestamp;

  /**
   * State of refunds for this proposal.
   */
  refundState: PurchaseRefundState;

  /**
   * When was the last refund made?
   * Set to 0 if no refund was made on the purchase.
   */
  timestampLastRefundStatus: Timestamp | undefined;

  /**
   * Last session signature that we submitted to /pay (if any).
   */
  lastSessionId: string | undefined;

  /**
   * Set for the first payment, or on re-plays.
   */
  paymentSubmitPending: boolean;

  /**
   * Do we need to query the merchant for the refund status
   * of the payment?
   */
  refundStatusRequested: boolean;

  /**
   * An abort (with refund) was requested for this (incomplete!) purchase.
   */
  abortRequested: boolean;

  /**
   * The abort (with refund) was completed for this (incomplete!) purchase.
   */
  abortDone: boolean;

  payRetryInfo: RetryInfo;

  lastPayError: OperationError | undefined;

  /**
   * Retry information for querying the refund status with the merchant.
   */
  refundStatusRetryInfo: RetryInfo;

  /**
   * Last error (or undefined) for querying the refund status with the merchant.
   */
  lastRefundStatusError: OperationError | undefined;

  /**
   * Retry information for querying the refund status with the merchant.
   */
  refundApplyRetryInfo: RetryInfo;

  /**
   * Last error (or undefined) for querying the refund status with the merchant.
   */
  lastRefundApplyError: OperationError | undefined;

  /**
   * Continue querying the refund status until this deadline has expired.
   */
  autoRefundDeadline: Timestamp | undefined;
}

/**
 * Information about wire information for bank accounts we withdrew coins from.
 */
export interface SenderWireRecord {
  paytoUri: string;
}

/**
 * Configuration key/value entries to configure
 * the wallet.
 */
export interface ConfigRecord {
  key: string;
  value: any;
}

/**
 * Coin that we're depositing ourselves.
 */
export interface DepositCoin {
  coinPaySig: CoinDepositPermission;

  /**
   * Undefined if coin not deposited, otherwise signature
   * from the exchange confirming the deposit.
   */
  depositedSig?: string;
}

/**
 * Record stored in the wallet's database when the user sends coins back to
 * their own bank account.  Stores the status of coins that are deposited to
 * the wallet itself, where the wallet acts as a "merchant" for the customer.
 */
export interface CoinsReturnRecord {
  contractTermsRaw: string;

  contractData: WalletContractData;

  /**
   * Private key where corresponding
   * public key is used in the contract terms
   * as merchant pub.
   */
  merchantPriv: string;

  coins: DepositCoin[];

  /**
   * Exchange base URL to deposit coins at.
   */
  exchange: string;

  /**
   * Our own wire information for the deposit.
   */
  wire: any;
}

export interface WithdrawalSourceTip {
  type: "tip";
  tipId: string;
}

export interface WithdrawalSourceReserve {
  type: "reserve";
  reservePub: string;
}

export type WithdrawalSource = WithdrawalSourceTip | WithdrawalSourceReserve;

export interface WithdrawalSessionRecord {
  withdrawSessionId: string;

  /**
   * Withdrawal source.  Fields that don't apply to the respective
   * withdrawal source type must be null (i.e. can't be absent),
   * otherwise the IndexedDB indexing won't like us.
   */
  source: WithdrawalSource;

  exchangeBaseUrl: string;

  /**
   * When was the withdrawal operation started started?
   * Timestamp in milliseconds.
   */
  timestampStart: Timestamp;

  /**
   * When was the withdrawal operation completed?
   */
  timestampFinish?: Timestamp;

  totalCoinValue: AmountJson;

  /**
   * Amount including fees (i.e. the amount subtracted from the
   * reserve to withdraw all coins in this withdrawal session).
   */
  rawWithdrawalAmount: AmountJson;

  denoms: string[];

  planchets: (undefined | PlanchetRecord)[];

  /**
   * Coins in this session that are withdrawn are set to true.
   */
  withdrawn: boolean[];

  /**
   * Retry info, always present even on completed operations so that indexing works.
   */
  retryInfo: RetryInfo;

  /**
   * Last error per coin/planchet, or undefined if no error occured for
   * the coin/planchet.
   */
  lastErrorPerCoin: { [coinIndex: number]: OperationError };

  lastError: OperationError | undefined;
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

  timestampStarted: Timestamp;

  timestampFinished: Timestamp | undefined;

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
   * Retry info.
   */
  retryInfo: RetryInfo;

  /**
   * Last error that occured, if any.
   */
  lastError: OperationError | undefined;
}

export const enum ImportPayloadType {
  CoreSchema = "core-schema",
}

/**
 * Record to keep track of data imported into the wallet.
 */
export class WalletImportRecord {
  /**
   * Unique ID to reference this import record.
   */
  walletImportId: string;

  /**
   * When was the data imported?
   */
  timestampImportStarted: Timestamp;

  timestampImportFinished: Timestamp | undefined;

  payloadType: ImportPayloadType;

  /**
   * The actual data to import.
   */
  payload: any;
}

/* tslint:disable:completed-docs */

/**
 * The stores and indices for the wallet database.
 */
export namespace Stores {
  class ExchangesStore extends Store<ExchangeRecord> {
    constructor() {
      super("exchanges", { keyPath: "baseUrl" });
    }
  }

  class CoinsStore extends Store<CoinRecord> {
    constructor() {
      super("coins", { keyPath: "coinPub" });
    }

    exchangeBaseUrlIndex = new Index<string, CoinRecord>(
      this,
      "exchangeBaseUrl",
      "exchangeBaseUrl",
    );
    denomPubIndex = new Index<string, CoinRecord>(
      this,
      "denomPubIndex",
      "denomPub",
    );
  }

  class ProposalsStore extends Store<ProposalRecord> {
    constructor() {
      super("proposals", { keyPath: "proposalId" });
    }
    urlAndOrderIdIndex = new Index<string, ProposalRecord>(this, "urlIndex", [
      "merchantBaseUrl",
      "orderId",
    ]);
  }

  class PurchasesStore extends Store<PurchaseRecord> {
    constructor() {
      super("purchases", { keyPath: "proposalId" });
    }

    fulfillmentUrlIndex = new Index<string, PurchaseRecord>(
      this,
      "fulfillmentUrlIndex",
      "contractData.fulfillmentUrl",
    );
    orderIdIndex = new Index<string, PurchaseRecord>(this, "orderIdIndex", [
      "contractData.merchantBaseUrl",
      "contractData.orderId",
    ]);
  }

  class DenominationsStore extends Store<DenominationRecord> {
    constructor() {
      // cast needed because of bug in type annotations
      super("denominations", {
        keyPath: (["exchangeBaseUrl", "denomPub"] as any) as IDBKeyPath,
      });
    }

    denomPubHashIndex = new Index<string, DenominationRecord>(
      this,
      "denomPubHashIndex",
      "denomPubHash",
    );
    exchangeBaseUrlIndex = new Index<string, DenominationRecord>(
      this,
      "exchangeBaseUrlIndex",
      "exchangeBaseUrl",
    );
    denomPubIndex = new Index<string, DenominationRecord>(
      this,
      "denomPubIndex",
      "denomPub",
    );
  }

  class CurrenciesStore extends Store<CurrencyRecord> {
    constructor() {
      super("currencies", { keyPath: "name" });
    }
  }

  class ConfigStore extends Store<ConfigRecord> {
    constructor() {
      super("config", { keyPath: "key" });
    }
  }

  class ReservesStore extends Store<ReserveRecord> {
    constructor() {
      super("reserves", { keyPath: "reservePub" });
    }
  }

  class TipsStore extends Store<TipRecord> {
    constructor() {
      super("tips", { keyPath: "tipId" });
    }
  }

  class SenderWiresStore extends Store<SenderWireRecord> {
    constructor() {
      super("senderWires", { keyPath: "paytoUri" });
    }
  }

  class WithdrawalSessionsStore extends Store<WithdrawalSessionRecord> {
    constructor() {
      super("withdrawals", { keyPath: "withdrawSessionId" });
    }
  }

  class RefundEventsStore extends Store<RefundEventRecord> {
    constructor() {
      super("refundEvents", { keyPath: "refundGroupId" });
    }
  }

  class PayEventsStore extends Store<PayEventRecord> {
    constructor() {
      super("payEvents", { keyPath: "proposalId" });
    }
  }

  class ExchangeUpdatedEventsStore extends Store<ExchangeUpdatedEventRecord> {
    constructor() {
      super("exchangeUpdatedEvents", { keyPath: "exchangeBaseUrl" });
    }
  }

  class ReserveUpdatedEventsStore extends Store<ReserveUpdatedEventRecord> {
    constructor() {
      super("reserveUpdatedEvents", { keyPath: "reservePub" });
    }
  }

  class BankWithdrawUrisStore extends Store<BankWithdrawUriRecord> {
    constructor() {
      super("bankWithdrawUris", { keyPath: "talerWithdrawUri" });
    }
  }

  class WalletImportsStore extends Store<WalletImportRecord> {
    constructor() {
      super("walletImports", { keyPath: "walletImportId" });
    }
  }

  export const coins = new CoinsStore();
  export const coinsReturns = new Store<CoinsReturnRecord>("coinsReturns", {
    keyPath: "contractTermsHash",
  });
  export const config = new ConfigStore();
  export const currencies = new CurrenciesStore();
  export const denominations = new DenominationsStore();
  export const exchanges = new ExchangesStore();
  export const proposals = new ProposalsStore();
  export const refreshGroups = new Store<RefreshGroupRecord>("refreshGroups", {
    keyPath: "refreshGroupId",
  });
  export const recoupGroups = new Store<RecoupGroupRecord>("recoupGroups", {
    keyPath: "recoupGroupId",
  });
  export const reserves = new ReservesStore();
  export const purchases = new PurchasesStore();
  export const tips = new TipsStore();
  export const senderWires = new SenderWiresStore();
  export const withdrawalSession = new WithdrawalSessionsStore();
  export const bankWithdrawUris = new BankWithdrawUrisStore();
  export const refundEvents = new RefundEventsStore();
  export const payEvents = new PayEventsStore();
  export const reserveUpdatedEvents = new ReserveUpdatedEventsStore();
  export const exchangeUpdatedEvents = new ExchangeUpdatedEventsStore();
  export const walletImports = new WalletImportsStore();
}

/* tslint:enable:completed-docs */
