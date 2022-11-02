/*
 This file is part of GNU Taler
 (C) 2015-2020 Taler Systems SA

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
 * Types used by clients of the wallet.
 *
 * These types are defined in a separate file make tree shaking easier, since
 * some components use these types (via RPC) but do not depend on the wallet
 * code directly.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import {
  AmountJson,
  codecForAmountJson,
  codecForAmountString,
} from "./amounts.js";
import { BackupRecovery } from "./backup-types.js";
import {
  buildCodecForObject,
  buildCodecForUnion,
  Codec,
  codecForAny,
  codecForBoolean,
  codecForConstString,
  codecForList,
  codecForMap,
  codecForNumber,
  codecForString,
  codecOptional,
} from "./codec.js";
import { VersionMatchResult } from "./libtool-version.js";
import { PaytoUri } from "./payto.js";
import { AgeCommitmentProof } from "./taler-crypto.js";
import { TalerErrorCode } from "./taler-error-codes.js";
import {
  AmountString,
  AuditorDenomSig,
  codecForContractTerms,
  CoinEnvelope,
  MerchantContractTerms,
  DenominationPubKey,
  DenomKeyType,
  ExchangeAuditor,
  UnblindedSignature,
} from "./taler-types.js";
import {
  AbsoluteTime,
  codecForAbsoluteTime,
  codecForTimestamp,
  TalerProtocolDuration,
  TalerProtocolTimestamp,
} from "./time.js";
import {
  codecForOrderShortInfo,
  OrderShortInfo,
} from "./transactions-types.js";

/**
 * Identifier for a transaction in the wallet.
 */
export type TransactionIdStr = `txn:${string}:${string}`;

/**
 * Identifier for a pending task in the wallet.
 */
export type PendingIdStr = `pnd:${string}:${string}`;

export type TombstoneIdStr = `tmb:${string}:${string}`;

/**
 * Response for the create reserve request to the wallet.
 */
export class CreateReserveResponse {
  /**
   * Exchange URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  exchange: string;

  /**
   * Reserve public key of the newly created reserve.
   */
  reservePub: string;
}

export interface Balance {
  available: AmountString;
  pendingIncoming: AmountString;
  pendingOutgoing: AmountString;

  // Does the balance for this currency have a pending
  // transaction?
  hasPendingTransactions: boolean;

  // Is there a pending transaction that would affect the balance
  // and requires user input?
  requiresUserInput: boolean;
}

export interface InitResponse {
  versionInfo: WalletCoreVersion;
}

export interface BalancesResponse {
  balances: Balance[];
}

export const codecForBalance = (): Codec<Balance> =>
  buildCodecForObject<Balance>()
    .property("available", codecForString())
    .property("hasPendingTransactions", codecForBoolean())
    .property("pendingIncoming", codecForString())
    .property("pendingOutgoing", codecForString())
    .property("requiresUserInput", codecForBoolean())
    .build("Balance");

export const codecForBalancesResponse = (): Codec<BalancesResponse> =>
  buildCodecForObject<BalancesResponse>()
    .property("balances", codecForList(codecForBalance()))
    .build("BalancesResponse");

/**
 * For terseness.
 */
export function mkAmount(
  value: number,
  fraction: number,
  currency: string,
): AmountJson {
  return { value, fraction, currency };
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
   * Fresh, but currently marked as "suspended", thus won't be used
   * for spending.  Used for testing.
   */
  FreshSuspended = "fresh-suspended",

  /**
   * A coin that has been spent and refreshed.
   */
  Dormant = "dormant",
}

/**
 * Easy to process format for the public data of coins
 * managed by the wallet.
 */
export interface CoinDumpJson {
  coins: Array<{
    /**
     * The coin's denomination's public key.
     */
    denom_pub: DenominationPubKey;
    /**
     * Hash of denom_pub.
     */
    denom_pub_hash: string;
    /**
     * Value of the denomination (without any fees).
     */
    denom_value: string;
    /**
     * Public key of the coin.
     */
    coin_pub: string;
    /**
     * Base URL of the exchange for the coin.
     */
    exchange_base_url: string;
    /**
     * Public key of the parent coin.
     * Only present if this coin was obtained via refreshing.
     */
    refresh_parent_coin_pub: string | undefined;
    /**
     * Public key of the reserve for this coin.
     * Only present if this coin was obtained via refreshing.
     */
    withdrawal_reserve_pub: string | undefined;
    coin_status: CoinStatus;
    spend_allocation:
      | {
          id: string;
          amount: string;
        }
      | undefined;
    /**
     * Information about the age restriction
     */
    ageCommitmentProof: AgeCommitmentProof | undefined;
  }>;
}

export enum ConfirmPayResultType {
  Done = "done",
  Pending = "pending",
}

/**
 * Result for confirmPay
 */
export interface ConfirmPayResultDone {
  type: ConfirmPayResultType.Done;
  contractTerms: MerchantContractTerms;
  transactionId: string;
}

export interface ConfirmPayResultPending {
  type: ConfirmPayResultType.Pending;
  transactionId: string;
  lastError: TalerErrorDetail | undefined;
}

export type ConfirmPayResult = ConfirmPayResultDone | ConfirmPayResultPending;

export const codecForConfirmPayResultPending =
  (): Codec<ConfirmPayResultPending> =>
    buildCodecForObject<ConfirmPayResultPending>()
      .property("lastError", codecForAny())
      .property("transactionId", codecForString())
      .property("type", codecForConstString(ConfirmPayResultType.Pending))
      .build("ConfirmPayResultPending");

export const codecForConfirmPayResultDone = (): Codec<ConfirmPayResultDone> =>
  buildCodecForObject<ConfirmPayResultDone>()
    .property("type", codecForConstString(ConfirmPayResultType.Done))
    .property("transactionId", codecForString())
    .property("contractTerms", codecForContractTerms())
    .build("ConfirmPayResultDone");

export const codecForConfirmPayResult = (): Codec<ConfirmPayResult> =>
  buildCodecForUnion<ConfirmPayResult>()
    .discriminateOn("type")
    .alternative(
      ConfirmPayResultType.Pending,
      codecForConfirmPayResultPending(),
    )
    .alternative(ConfirmPayResultType.Done, codecForConfirmPayResultDone())
    .build("ConfirmPayResult");

/**
 * Information about all sender wire details known to the wallet,
 * as well as exchanges that accept these wire types.
 */
export interface SenderWireInfos {
  /**
   * Mapping from exchange base url to list of accepted
   * wire types.
   */
  exchangeWireTypes: { [exchangeBaseUrl: string]: string[] };

  /**
   * Sender wire information stored in the wallet.
   */
  senderWires: string[];
}

/**
 * Request to create a reserve.
 */
export interface CreateReserveRequest {
  /**
   * The initial amount for the reserve.
   */
  amount: AmountJson;

  /**
   * Exchange URL where the bank should create the reserve.
   */
  exchange: string;

  /**
   * Payto URI that identifies the exchange's account that the funds
   * for this reserve go into.
   */
  exchangePaytoUri?: string;

  /**
   * Wire details (as a payto URI) for the bank account that sent the funds to
   * the exchange.
   */
  senderWire?: string;

  /**
   * URL to fetch the withdraw status from the bank.
   */
  bankWithdrawStatusUrl?: string;

  /**
   * Forced denomination selection for the first withdrawal
   * from this reserve, only used for testing.
   */
  forcedDenomSel?: ForcedDenomSel;

  restrictAge?: number;
}

export const codecForCreateReserveRequest = (): Codec<CreateReserveRequest> =>
  buildCodecForObject<CreateReserveRequest>()
    .property("amount", codecForAmountJson())
    .property("exchange", codecForString())
    .property("exchangePaytoUri", codecForString())
    .property("senderWire", codecOptional(codecForString()))
    .property("bankWithdrawStatusUrl", codecOptional(codecForString()))
    .property("forcedDenomSel", codecForAny())
    .build("CreateReserveRequest");

/**
 * Request to mark a reserve as confirmed.
 */
export interface ConfirmReserveRequest {
  /**
   * Public key of then reserve that should be marked
   * as confirmed.
   */
  reservePub: string;
}

export const codecForConfirmReserveRequest = (): Codec<ConfirmReserveRequest> =>
  buildCodecForObject<ConfirmReserveRequest>()
    .property("reservePub", codecForString())
    .build("ConfirmReserveRequest");

/**
 * Wire coins to the user's own bank account.
 */
export interface ReturnCoinsRequest {
  /**
   * The amount to wire.
   */
  amount: AmountJson;

  /**
   * The exchange to take the coins from.
   */
  exchange: string;

  /**
   * Wire details for the bank account of the customer that will
   * receive the funds.
   */
  senderWire?: string;
}

export interface PrepareRefundResult {
  proposalId: string;

  effectivePaid: AmountString;
  gone: AmountString;
  granted: AmountString;
  pending: boolean;
  awaiting: AmountString;

  info: OrderShortInfo;
}

export interface PrepareTipResult {
  /**
   * Unique ID for the tip assigned by the wallet.
   * Typically different from the merchant-generated tip ID.
   */
  walletTipId: string;

  /**
   * Has the tip already been accepted?
   */
  accepted: boolean;

  /**
   * Amount that the merchant gave.
   */
  tipAmountRaw: AmountString;

  /**
   * Amount that arrived at the wallet.
   * Might be lower than the raw amount due to fees.
   */
  tipAmountEffective: AmountString;

  /**
   * Base URL of the merchant backend giving then tip.
   */
  merchantBaseUrl: string;

  /**
   * Base URL of the exchange that is used to withdraw the tip.
   * Determined by the merchant, the wallet/user has no choice here.
   */
  exchangeBaseUrl: string;

  /**
   * Time when the tip will expire.  After it expired, it can't be picked
   * up anymore.
   */
  expirationTimestamp: TalerProtocolTimestamp;
}

export interface AcceptTipResponse {
  transactionId: string;
}

export const codecForPrepareTipResult = (): Codec<PrepareTipResult> =>
  buildCodecForObject<PrepareTipResult>()
    .property("accepted", codecForBoolean())
    .property("tipAmountRaw", codecForAmountString())
    .property("tipAmountEffective", codecForAmountString())
    .property("exchangeBaseUrl", codecForString())
    .property("merchantBaseUrl", codecForString())
    .property("expirationTimestamp", codecForTimestamp)
    .property("walletTipId", codecForString())
    .build("PrepareTipResult");

export interface BenchmarkResult {
  time: { [s: string]: number };
  repetitions: number;
}

export enum PreparePayResultType {
  PaymentPossible = "payment-possible",
  InsufficientBalance = "insufficient-balance",
  AlreadyConfirmed = "already-confirmed",
}

export const codecForPreparePayResultPaymentPossible =
  (): Codec<PreparePayResultPaymentPossible> =>
    buildCodecForObject<PreparePayResultPaymentPossible>()
      .property("amountEffective", codecForAmountString())
      .property("amountRaw", codecForAmountString())
      .property("contractTerms", codecForContractTerms())
      .property("proposalId", codecForString())
      .property("contractTermsHash", codecForString())
      .property("noncePriv", codecForString())
      .property(
        "status",
        codecForConstString(PreparePayResultType.PaymentPossible),
      )
      .build("PreparePayResultPaymentPossible");

export const codecForPreparePayResultInsufficientBalance =
  (): Codec<PreparePayResultInsufficientBalance> =>
    buildCodecForObject<PreparePayResultInsufficientBalance>()
      .property("amountRaw", codecForAmountString())
      .property("contractTerms", codecForAny())
      .property("proposalId", codecForString())
      .property("noncePriv", codecForString())
      .property(
        "status",
        codecForConstString(PreparePayResultType.InsufficientBalance),
      )
      .build("PreparePayResultInsufficientBalance");

export const codecForPreparePayResultAlreadyConfirmed =
  (): Codec<PreparePayResultAlreadyConfirmed> =>
    buildCodecForObject<PreparePayResultAlreadyConfirmed>()
      .property(
        "status",
        codecForConstString(PreparePayResultType.AlreadyConfirmed),
      )
      .property("amountEffective", codecForAmountString())
      .property("amountRaw", codecForAmountString())
      .property("paid", codecForBoolean())
      .property("contractTerms", codecForAny())
      .property("contractTermsHash", codecForString())
      .property("proposalId", codecForString())
      .build("PreparePayResultAlreadyConfirmed");

export const codecForPreparePayResult = (): Codec<PreparePayResult> =>
  buildCodecForUnion<PreparePayResult>()
    .discriminateOn("status")
    .alternative(
      PreparePayResultType.AlreadyConfirmed,
      codecForPreparePayResultAlreadyConfirmed(),
    )
    .alternative(
      PreparePayResultType.InsufficientBalance,
      codecForPreparePayResultInsufficientBalance(),
    )
    .alternative(
      PreparePayResultType.PaymentPossible,
      codecForPreparePayResultPaymentPossible(),
    )
    .build("PreparePayResult");

/**
 * Result of a prepare pay operation.
 */
export type PreparePayResult =
  | PreparePayResultInsufficientBalance
  | PreparePayResultAlreadyConfirmed
  | PreparePayResultPaymentPossible;

/**
 * Payment is possible.
 */
export interface PreparePayResultPaymentPossible {
  status: PreparePayResultType.PaymentPossible;
  proposalId: string;
  contractTerms: MerchantContractTerms;
  contractTermsHash: string;
  amountRaw: string;
  amountEffective: string;
  noncePriv: string;
}

export interface PreparePayResultInsufficientBalance {
  status: PreparePayResultType.InsufficientBalance;
  proposalId: string;
  contractTerms: MerchantContractTerms;
  amountRaw: string;
  noncePriv: string;
}

export interface PreparePayResultAlreadyConfirmed {
  status: PreparePayResultType.AlreadyConfirmed;
  contractTerms: MerchantContractTerms;
  paid: boolean;
  amountRaw: string;
  amountEffective: string;
  contractTermsHash: string;
  proposalId: string;
}

export interface BankWithdrawDetails {
  selectionDone: boolean;
  transferDone: boolean;
  amount: AmountJson;
  senderWire?: string;
  suggestedExchange?: string;
  confirmTransferUrl?: string;
  wireTypes: string[];
}

export interface AcceptWithdrawalResponse {
  reservePub: string;
  confirmTransferUrl?: string;
  transactionId: string;
}

/**
 * Details about a purchase, including refund status.
 */
export interface PurchaseDetails {
  contractTerms: Record<string, undefined>;
  hasRefund: boolean;
  totalRefundAmount: AmountJson;
  totalRefundAndRefreshFees: AmountJson;
}

export interface WalletDiagnostics {
  walletManifestVersion: string;
  walletManifestDisplayVersion: string;
  errors: string[];
  firefoxIdbProblem: boolean;
  dbOutdated: boolean;
}

export interface TalerErrorDetail {
  code: TalerErrorCode;
  hint?: string;
  [x: string]: unknown;
}

/**
 * Minimal information needed about a planchet for unblinding a signature.
 *
 * Can be a withdrawal/tipping/refresh planchet.
 */
export interface PlanchetUnblindInfo {
  denomPub: DenominationPubKey;
  blindingKey: string;
}

export interface WithdrawalPlanchet {
  coinPub: string;
  coinPriv: string;
  reservePub: string;
  denomPubHash: string;
  denomPub: DenominationPubKey;
  blindingKey: string;
  withdrawSig: string;
  coinEv: CoinEnvelope;
  coinValue: AmountJson;
  coinEvHash: string;
  ageCommitmentProof?: AgeCommitmentProof;
}

export interface PlanchetCreationRequest {
  secretSeed: string;
  coinIndex: number;
  value: AmountJson;
  feeWithdraw: AmountJson;
  denomPub: DenominationPubKey;
  reservePub: string;
  reservePriv: string;
  restrictAge?: number;
}

/**
 * Reasons for why a coin is being refreshed.
 */
export enum RefreshReason {
  Manual = "manual",
  PayMerchant = "pay-merchant",
  PayDeposit = "pay-deposit",
  PayPeerPush = "pay-peer-push",
  PayPeerPull = "pay-peer-pull",
  Refund = "refund",
  AbortPay = "abort-pay",
  Recoup = "recoup",
  BackupRestored = "backup-restored",
  Scheduled = "scheduled",
}

/**
 * Request to refresh a single coin.
 */
export interface CoinRefreshRequest {
  readonly coinPub: string;
  readonly amount: AmountString;
}

/**
 * Wrapper for refresh group IDs.
 */
export interface RefreshGroupId {
  readonly refreshGroupId: string;
}

/**
 * Private data required to make a deposit permission.
 */
export interface DepositInfo {
  exchangeBaseUrl: string;
  contractTermsHash: string;
  coinPub: string;
  coinPriv: string;
  spendAmount: AmountJson;
  timestamp: TalerProtocolTimestamp;
  refundDeadline: TalerProtocolTimestamp;
  merchantPub: string;
  feeDeposit: AmountJson;
  wireInfoHash: string;
  denomKeyType: DenomKeyType;
  denomPubHash: string;
  denomSig: UnblindedSignature;

  requiredMinimumAge?: number;

  ageCommitmentProof?: AgeCommitmentProof;
}

export interface ExchangesListResponse {
  exchanges: ExchangeListItem[];
}

export interface ExchangeDetailedResponse {
  exchange: ExchangeFullDetails;
}

export interface WalletCoreVersion {
  hash: string | undefined;
  version: string;
  exchange: string;
  merchant: string;
  bank: string;
  devMode: boolean;
}

export interface KnownBankAccountsInfo {
  uri: PaytoUri;
  kyc_completed: boolean;
  currency: string;
  alias: string;
}

export interface KnownBankAccounts {
  accounts: KnownBankAccountsInfo[];
}

export interface ExchangeTosStatusDetails {
  acceptedVersion?: string;
  currentVersion?: string;
  contentType?: string;
  content?: string;
}

/**
 * Wire fee for one wire method
 */
export interface WireFee {
  /**
   * Fee for wire transfers.
   */
  wireFee: AmountString;

  /**
   * Fees to close and refund a reserve.
   */
  closingFee: AmountString;

  /**
   * Start date of the fee.
   */
  startStamp: TalerProtocolTimestamp;

  /**
   * End date of the fee.
   */
  endStamp: TalerProtocolTimestamp;

  /**
   * Signature made by the exchange master key.
   */
  sig: string;
}

/**
 * Information about one of the exchange's bank accounts.
 */
export interface ExchangeAccount {
  payto_uri: string;
  master_sig: string;
}

export type WireFeeMap = { [wireMethod: string]: WireFee[] };

export interface WireInfo {
  feesForType: WireFeeMap;
  accounts: ExchangeAccount[];
}

export interface ExchangeGlobalFees {
  startDate: TalerProtocolTimestamp;
  endDate: TalerProtocolTimestamp;

  historyFee: AmountString;
  accountFee: AmountString;
  purseFee: AmountString;

  historyTimeout: TalerProtocolDuration;
  purseTimeout: TalerProtocolDuration;

  purseLimit: number;

  signature: string;
}

const codecForExchangeAccount = (): Codec<ExchangeAccount> =>
  buildCodecForObject<ExchangeAccount>()
    .property("payto_uri", codecForString())
    .property("master_sig", codecForString())
    .build("codecForExchangeAccount");

const codecForWireFee = (): Codec<WireFee> =>
  buildCodecForObject<WireFee>()
    .property("sig", codecForString())
    .property("wireFee", codecForAmountString())
    .property("closingFee", codecForAmountString())
    .property("startStamp", codecForTimestamp)
    .property("endStamp", codecForTimestamp)
    .build("codecForWireFee");

const codecForWireInfo = (): Codec<WireInfo> =>
  buildCodecForObject<WireInfo>()
    .property("feesForType", codecForMap(codecForList(codecForWireFee())))
    .property("accounts", codecForList(codecForExchangeAccount()))
    .build("codecForWireInfo");

export interface DenominationInfo {
  /**
   * Value of one coin of the denomination.
   */
  value: AmountString;

  /**
   * Hash of the denomination public key.
   * Stored in the database for faster lookups.
   */
  denomPubHash: string;

  denomPub: DenominationPubKey;

  /**
   * Fee for withdrawing.
   */
  feeWithdraw: AmountString;

  /**
   * Fee for depositing.
   */
  feeDeposit: AmountString;

  /**
   * Fee for refreshing.
   */
  feeRefresh: AmountString;

  /**
   * Fee for refunding.
   */
  feeRefund: AmountString;

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

  exchangeBaseUrl: string;
}

export type DenomOperation = "deposit" | "withdraw" | "refresh" | "refund";
export type DenomOperationMap<T> = { [op in DenomOperation]: T };

export interface FeeDescription {
  group: string;
  from: AbsoluteTime;
  until: AbsoluteTime;
  fee?: AmountString;
}

export interface FeeDescriptionPair {
  group: string;
  from: AbsoluteTime;
  until: AbsoluteTime;
  left?: AmountString;
  right?: AmountString;
}

export interface TimePoint<T> {
  id: string;
  group: string;
  fee: AmountString;
  type: "start" | "end";
  moment: AbsoluteTime;
  denom: T;
}

export interface ExchangeFullDetails {
  exchangeBaseUrl: string;
  currency: string;
  paytoUris: string[];
  tos: ExchangeTosStatusDetails;
  auditors: ExchangeAuditor[];
  wireInfo: WireInfo;
  denomFees: DenomOperationMap<FeeDescription[]>;
  transferFees: Record<string, FeeDescription[]>;
  globalFees: FeeDescription[];
}

export enum ExchangeTosStatus {
  New = "new",
  Accepted = "accepted",
  Changed = "changed",
  NotFound = "not-found",
  Unknown = "unknown",
}

export enum ExchangeEntryStatus {
  Unknown = "unknown",
  Outdated = "outdated",
  Ok = "ok",
}

export interface OperationErrorInfo {
  error: TalerErrorDetail;
}

// FIXME: This should probably include some error status.
export interface ExchangeListItem {
  exchangeBaseUrl: string;
  currency: string | undefined;
  paytoUris: string[];
  tosStatus: ExchangeTosStatus;
  exchangeStatus: ExchangeEntryStatus;
  ageRestrictionOptions: number[];
  /**
   * Permanently added to the wallet, as opposed to just
   * temporarily queried.
   */
  permanent: boolean;

  /**
   * Information about the last error that occured when trying
   * to update the exchange info.
   */
  lastUpdateErrorInfo?: OperationErrorInfo;
}

const codecForAuditorDenomSig = (): Codec<AuditorDenomSig> =>
  buildCodecForObject<AuditorDenomSig>()
    .property("denom_pub_h", codecForString())
    .property("auditor_sig", codecForString())
    .build("AuditorDenomSig");

const codecForExchangeAuditor = (): Codec<ExchangeAuditor> =>
  buildCodecForObject<ExchangeAuditor>()
    .property("auditor_pub", codecForString())
    .property("auditor_url", codecForString())
    .property("denomination_keys", codecForList(codecForAuditorDenomSig()))
    .build("codecForExchangeAuditor");

const codecForExchangeTos = (): Codec<ExchangeTosStatusDetails> =>
  buildCodecForObject<ExchangeTosStatusDetails>()
    .property("acceptedVersion", codecOptional(codecForString()))
    .property("currentVersion", codecOptional(codecForString()))
    .property("contentType", codecOptional(codecForString()))
    .property("content", codecOptional(codecForString()))
    .build("ExchangeTos");

export const codecForFeeDescriptionPair = (): Codec<FeeDescriptionPair> =>
  buildCodecForObject<FeeDescriptionPair>()
    .property("group", codecForString())
    .property("from", codecForAbsoluteTime)
    .property("until", codecForAbsoluteTime)
    .property("left", codecOptional(codecForAmountString()))
    .property("right", codecOptional(codecForAmountString()))
    .build("FeeDescriptionPair");

export const codecForFeeDescription = (): Codec<FeeDescription> =>
  buildCodecForObject<FeeDescription>()
    .property("group", codecForString())
    .property("from", codecForAbsoluteTime)
    .property("until", codecForAbsoluteTime)
    .property("fee", codecOptional(codecForAmountString()))
    .build("FeeDescription");

export const codecForFeesByOperations = (): Codec<
  DenomOperationMap<FeeDescription[]>
> =>
  buildCodecForObject<DenomOperationMap<FeeDescription[]>>()
    .property("deposit", codecForList(codecForFeeDescription()))
    .property("withdraw", codecForList(codecForFeeDescription()))
    .property("refresh", codecForList(codecForFeeDescription()))
    .property("refund", codecForList(codecForFeeDescription()))
    .build("DenomOperationMap");

export const codecForExchangeFullDetails = (): Codec<ExchangeFullDetails> =>
  buildCodecForObject<ExchangeFullDetails>()
    .property("currency", codecForString())
    .property("exchangeBaseUrl", codecForString())
    .property("paytoUris", codecForList(codecForString()))
    .property("tos", codecForExchangeTos())
    .property("auditors", codecForList(codecForExchangeAuditor()))
    .property("wireInfo", codecForWireInfo())
    .property("denomFees", codecForFeesByOperations())
    .property(
      "transferFees",
      codecForMap(codecForList(codecForFeeDescription())),
    )
    .property("globalFees", codecForList(codecForFeeDescription()))
    .build("ExchangeFullDetails");

export const codecForExchangeListItem = (): Codec<ExchangeListItem> =>
  buildCodecForObject<ExchangeListItem>()
    .property("currency", codecForString())
    .property("exchangeBaseUrl", codecForString())
    .property("paytoUris", codecForList(codecForString()))
    .property("tosStatus", codecForAny())
    .property("exchangeStatus", codecForAny())
    .property("permanent", codecForBoolean())
    .property("ageRestrictionOptions", codecForList(codecForNumber()))
    .build("ExchangeListItem");

export const codecForExchangesListResponse = (): Codec<ExchangesListResponse> =>
  buildCodecForObject<ExchangesListResponse>()
    .property("exchanges", codecForList(codecForExchangeListItem()))
    .build("ExchangesListResponse");

export interface AcceptManualWithdrawalResult {
  /**
   * Payto URIs that can be used to fund the withdrawal.
   */
  exchangePaytoUris: string[];

  /**
   * Public key of the newly created reserve.
   */
  reservePub: string;

  transactionId: string;
}

export interface ManualWithdrawalDetails {
  /**
   * Did the user accept the current version of the exchange's
   * terms of service?
   */
  tosAccepted: boolean;

  /**
   * Amount that the user will transfer to the exchange.
   */
  amountRaw: AmountString;

  /**
   * Amount that will be added to the user's wallet balance.
   */
  amountEffective: AmountString;

  /**
   * Ways to pay the exchange.
   */
  paytoUris: string[];

  /**
   * If the exchange supports age-restricted coins it will return
   * the array of ages.
   */
  ageRestrictionOptions?: number[];
}

/**
 * Selected denominations withn some extra info.
 */
export interface DenomSelectionState {
  totalCoinValue: AmountString;
  totalWithdrawCost: AmountString;
  selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[];
}

/**
 * Information about what will happen doing a withdrawal.
 *
 * Sent to the wallet frontend to be rendered and shown to the user.
 */
export interface ExchangeWithdrawalDetails {
  exchangePaytoUris: string[];

  /**
   * Filtered wire info to send to the bank.
   */
  exchangeWireAccounts: string[];

  /**
   * Selected denominations for withdraw.
   */
  selectedDenoms: DenomSelectionState;

  /**
   * Does the wallet know about an auditor for
   * the exchange that the reserve.
   */
  isAudited: boolean;

  /**
   * Did the user already accept the current terms of service for the exchange?
   */
  termsOfServiceAccepted: boolean;

  /**
   * The exchange is trusted directly.
   */
  isTrusted: boolean;

  /**
   * The earliest deposit expiration of the selected coins.
   */
  earliestDepositExpiration: TalerProtocolTimestamp;

  /**
   * Number of currently offered denominations.
   */
  numOfferedDenoms: number;

  /**
   * Public keys of trusted auditors for the currency we're withdrawing.
   */
  trustedAuditorPubs: string[];

  /**
   * Result of checking the wallet's version
   * against the exchange's version.
   *
   * Older exchanges don't return version information.
   */
  versionMatch: VersionMatchResult | undefined;

  /**
   * Libtool-style version string for the exchange or "unknown"
   * for older exchanges.
   */
  exchangeVersion: string;

  /**
   * Libtool-style version string for the wallet.
   */
  walletVersion: string;

  /**
   * Amount that will be subtracted from the reserve's balance.
   */
  withdrawalAmountRaw: AmountString;

  /**
   * Amount that will actually be added to the wallet's balance.
   */
  withdrawalAmountEffective: AmountString;

  /**
   * If the exchange supports age-restricted coins it will return
   * the array of ages.
   *
   */
  ageRestrictionOptions?: number[];
}

export interface GetExchangeTosResult {
  /**
   * Markdown version of the current ToS.
   */
  content: string;

  /**
   * Version tag of the current ToS.
   */
  currentEtag: string;

  /**
   * Version tag of the last ToS that the user has accepted,
   * if any.
   */
  acceptedEtag: string | undefined;

  /**
   * Accepted content type
   */
  contentType: string;

  tosStatus: ExchangeTosStatus;
}

export interface TestPayArgs {
  merchantBaseUrl: string;
  merchantAuthToken?: string;
  amount: string;
  summary: string;
  forcedCoinSel?: ForcedCoinSel;
}

export const codecForTestPayArgs = (): Codec<TestPayArgs> =>
  buildCodecForObject<TestPayArgs>()
    .property("merchantBaseUrl", codecForString())
    .property("merchantAuthToken", codecOptional(codecForString()))
    .property("amount", codecForString())
    .property("summary", codecForString())
    .property("forcedCoinSel", codecForAny())
    .build("TestPayArgs");

export interface IntegrationTestArgs {
  exchangeBaseUrl: string;
  bankBaseUrl: string;
  bankAccessApiBaseUrl?: string;
  merchantBaseUrl: string;
  merchantAuthToken?: string;
  amountToWithdraw: string;
  amountToSpend: string;
}

export const codecForIntegrationTestArgs = (): Codec<IntegrationTestArgs> =>
  buildCodecForObject<IntegrationTestArgs>()
    .property("exchangeBaseUrl", codecForString())
    .property("bankBaseUrl", codecForString())
    .property("merchantBaseUrl", codecForString())
    .property("merchantAuthToken", codecOptional(codecForString()))
    .property("amountToSpend", codecForAmountString())
    .property("amountToWithdraw", codecForAmountString())
    .property("bankAccessApiBaseUrl", codecOptional(codecForAmountString()))
    .build("IntegrationTestArgs");

export interface AddExchangeRequest {
  exchangeBaseUrl: string;
  forceUpdate?: boolean;
}

export const codecForAddExchangeRequest = (): Codec<AddExchangeRequest> =>
  buildCodecForObject<AddExchangeRequest>()
    .property("exchangeBaseUrl", codecForString())
    .property("forceUpdate", codecOptional(codecForBoolean()))
    .build("AddExchangeRequest");

export interface ForceExchangeUpdateRequest {
  exchangeBaseUrl: string;
}

export const codecForForceExchangeUpdateRequest =
  (): Codec<AddExchangeRequest> =>
    buildCodecForObject<AddExchangeRequest>()
      .property("exchangeBaseUrl", codecForString())
      .build("AddExchangeRequest");

export interface GetExchangeTosRequest {
  exchangeBaseUrl: string;
  acceptedFormat?: string[];
}

export const codecForGetExchangeTosRequest = (): Codec<GetExchangeTosRequest> =>
  buildCodecForObject<GetExchangeTosRequest>()
    .property("exchangeBaseUrl", codecForString())
    .property("acceptedFormat", codecOptional(codecForList(codecForString())))
    .build("GetExchangeTosRequest");

export interface AcceptManualWithdrawalRequest {
  exchangeBaseUrl: string;
  amount: string;
  restrictAge?: number;
}

export const codecForAcceptManualWithdrawalRequet =
  (): Codec<AcceptManualWithdrawalRequest> =>
    buildCodecForObject<AcceptManualWithdrawalRequest>()
      .property("exchangeBaseUrl", codecForString())
      .property("amount", codecForString())
      .property("restrictAge", codecOptional(codecForNumber()))
      .build("AcceptManualWithdrawalRequest");

export interface GetWithdrawalDetailsForAmountRequest {
  exchangeBaseUrl: string;
  amount: string;
  restrictAge?: number;
}

export interface AcceptBankIntegratedWithdrawalRequest {
  talerWithdrawUri: string;
  exchangeBaseUrl: string;
  forcedDenomSel?: ForcedDenomSel;
  restrictAge?: number;
}

export const codecForAcceptBankIntegratedWithdrawalRequest =
  (): Codec<AcceptBankIntegratedWithdrawalRequest> =>
    buildCodecForObject<AcceptBankIntegratedWithdrawalRequest>()
      .property("exchangeBaseUrl", codecForString())
      .property("talerWithdrawUri", codecForString())
      .property("forcedDenomSel", codecForAny())
      .property("restrictAge", codecOptional(codecForNumber()))
      .build("AcceptBankIntegratedWithdrawalRequest");

export const codecForGetWithdrawalDetailsForAmountRequest =
  (): Codec<GetWithdrawalDetailsForAmountRequest> =>
    buildCodecForObject<GetWithdrawalDetailsForAmountRequest>()
      .property("exchangeBaseUrl", codecForString())
      .property("amount", codecForString())
      .property("restrictAge", codecOptional(codecForNumber()))
      .build("GetWithdrawalDetailsForAmountRequest");

export interface AcceptExchangeTosRequest {
  exchangeBaseUrl: string;
  etag: string | undefined;
}

export const codecForAcceptExchangeTosRequest =
  (): Codec<AcceptExchangeTosRequest> =>
    buildCodecForObject<AcceptExchangeTosRequest>()
      .property("exchangeBaseUrl", codecForString())
      .property("etag", codecOptional(codecForString()))
      .build("AcceptExchangeTosRequest");

export interface ApplyRefundRequest {
  talerRefundUri: string;
}

export const codecForApplyRefundRequest = (): Codec<ApplyRefundRequest> =>
  buildCodecForObject<ApplyRefundRequest>()
    .property("talerRefundUri", codecForString())
    .build("ApplyRefundRequest");

export interface ApplyRefundFromPurchaseIdRequest {
  purchaseId: string;
}

export const codecForApplyRefundFromPurchaseIdRequest =
  (): Codec<ApplyRefundFromPurchaseIdRequest> =>
    buildCodecForObject<ApplyRefundFromPurchaseIdRequest>()
      .property("purchaseId", codecForString())
      .build("ApplyRefundFromPurchaseIdRequest");

export interface GetWithdrawalDetailsForUriRequest {
  talerWithdrawUri: string;
  restrictAge?: number;
}

export const codecForGetWithdrawalDetailsForUri =
  (): Codec<GetWithdrawalDetailsForUriRequest> =>
    buildCodecForObject<GetWithdrawalDetailsForUriRequest>()
      .property("talerWithdrawUri", codecForString())
      .property("restrictAge", codecOptional(codecForNumber()))
      .build("GetWithdrawalDetailsForUriRequest");

export interface ListKnownBankAccountsRequest {
  currency?: string;
}

export const codecForListKnownBankAccounts =
  (): Codec<ListKnownBankAccountsRequest> =>
    buildCodecForObject<ListKnownBankAccountsRequest>()
      .property("currency", codecOptional(codecForString()))
      .build("ListKnownBankAccountsRequest");

export interface AddKnownBankAccountsRequest {
  payto: string;
  alias: string;
  currency: string;
}
export const codecForAddKnownBankAccounts =
  (): Codec<AddKnownBankAccountsRequest> =>
    buildCodecForObject<AddKnownBankAccountsRequest>()
      .property("payto", codecForString())
      .property("alias", codecForString())
      .property("currency", codecForString())
      .build("AddKnownBankAccountsRequest");

export interface ForgetKnownBankAccountsRequest {
  payto: string;
}

export const codecForForgetKnownBankAccounts =
  (): Codec<ForgetKnownBankAccountsRequest> =>
    buildCodecForObject<ForgetKnownBankAccountsRequest>()
      .property("payto", codecForString())
      .build("ForgetKnownBankAccountsRequest");

export interface AbortProposalRequest {
  proposalId: string;
}

export const codecForAbortProposalRequest = (): Codec<AbortProposalRequest> =>
  buildCodecForObject<AbortProposalRequest>()
    .property("proposalId", codecForString())
    .build("AbortProposalRequest");

export interface GetContractTermsDetailsRequest {
  proposalId: string;
}

export const codecForGetContractTermsDetails =
  (): Codec<GetContractTermsDetailsRequest> =>
    buildCodecForObject<GetContractTermsDetailsRequest>()
      .property("proposalId", codecForString())
      .build("GetContractTermsDetails");

export interface PreparePayRequest {
  talerPayUri: string;
}

export const codecForPreparePayRequest = (): Codec<PreparePayRequest> =>
  buildCodecForObject<PreparePayRequest>()
    .property("talerPayUri", codecForString())
    .build("PreparePay");

export interface ConfirmPayRequest {
  proposalId: string;
  sessionId?: string;
  forcedCoinSel?: ForcedCoinSel;
}

export const codecForConfirmPayRequest = (): Codec<ConfirmPayRequest> =>
  buildCodecForObject<ConfirmPayRequest>()
    .property("proposalId", codecForString())
    .property("sessionId", codecOptional(codecForString()))
    .property("forcedCoinSel", codecForAny())
    .build("ConfirmPay");

export type CoreApiResponse = CoreApiResponseSuccess | CoreApiResponseError;

export type CoreApiEnvelope = CoreApiResponse | CoreApiNotification;

export interface CoreApiNotification {
  type: "notification";
  payload: unknown;
}

export interface CoreApiResponseSuccess {
  // To distinguish the message from notifications
  type: "response";
  operation: string;
  id: string;
  result: unknown;
}

export interface CoreApiResponseError {
  // To distinguish the message from notifications
  type: "error";
  operation: string;
  id: string;
  error: TalerErrorDetail;
}

export interface WithdrawTestBalanceRequest {
  amount: string;
  bankBaseUrl: string;
  /**
   * Bank access API base URL.  Defaults to the bankBaseUrl.
   */
  bankAccessApiBaseUrl?: string;
  exchangeBaseUrl: string;
  forcedDenomSel?: ForcedDenomSel;
}

export const withdrawTestBalanceDefaults = {
  amount: "TESTKUDOS:10",
  bankBaseUrl: "https://bank.test.taler.net/",
  exchangeBaseUrl: "https://exchange.test.taler.net/",
};

/**
 * Request to the crypto worker to make a sync signature.
 */
export interface MakeSyncSignatureRequest {
  accountPriv: string;
  oldHash: string | undefined;
  newHash: string;
}

/**
 * Planchet for a coin during refresh.
 */
export interface RefreshPlanchetInfo {
  /**
   * Public key for the coin.
   */
  coinPub: string;

  /**
   * Private key for the coin.
   */
  coinPriv: string;

  /**
   * Blinded public key.
   */
  coinEv: CoinEnvelope;

  coinEvHash: string;

  /**
   * Blinding key used.
   */
  blindingKey: string;

  maxAge: number;
  ageCommitmentProof?: AgeCommitmentProof;
}

/**
 * Strategy for loading recovery information.
 */
export enum RecoveryMergeStrategy {
  /**
   * Keep the local wallet root key, import and take over providers.
   */
  Ours = "ours",

  /**
   * Migrate to the wallet root key from the recovery information.
   */
  Theirs = "theirs",
}

/**
 * Load recovery information into the wallet.
 */
export interface RecoveryLoadRequest {
  recovery: BackupRecovery;
  strategy?: RecoveryMergeStrategy;
}

export const codecForWithdrawTestBalance =
  (): Codec<WithdrawTestBalanceRequest> =>
    buildCodecForObject<WithdrawTestBalanceRequest>()
      .property("amount", codecForString())
      .property("bankBaseUrl", codecForString())
      .property("exchangeBaseUrl", codecForString())
      .property("forcedDenomSel", codecForAny())
      .property("bankAccessApiBaseUrl", codecOptional(codecForString()))
      .build("WithdrawTestBalanceRequest");

export interface ApplyRefundResponse {
  contractTermsHash: string;

  transactionId: string;

  proposalId: string;

  amountEffectivePaid: AmountString;

  amountRefundGranted: AmountString;

  amountRefundGone: AmountString;

  pendingAtExchange: boolean;

  info: OrderShortInfo;
}

export const codecForApplyRefundResponse = (): Codec<ApplyRefundResponse> =>
  buildCodecForObject<ApplyRefundResponse>()
    .property("amountEffectivePaid", codecForAmountString())
    .property("amountRefundGone", codecForAmountString())
    .property("amountRefundGranted", codecForAmountString())
    .property("contractTermsHash", codecForString())
    .property("pendingAtExchange", codecForBoolean())
    .property("proposalId", codecForString())
    .property("transactionId", codecForString())
    .property("info", codecForOrderShortInfo())
    .build("ApplyRefundResponse");

export interface SetCoinSuspendedRequest {
  coinPub: string;
  suspended: boolean;
}

export const codecForSetCoinSuspendedRequest =
  (): Codec<SetCoinSuspendedRequest> =>
    buildCodecForObject<SetCoinSuspendedRequest>()
      .property("coinPub", codecForString())
      .property("suspended", codecForBoolean())
      .build("SetCoinSuspendedRequest");

export interface ForceRefreshRequest {
  coinPubList: string[];
}

export const codecForForceRefreshRequest = (): Codec<ForceRefreshRequest> =>
  buildCodecForObject<ForceRefreshRequest>()
    .property("coinPubList", codecForList(codecForString()))
    .build("ForceRefreshRequest");

export interface PrepareRefundRequest {
  talerRefundUri: string;
}

export const codecForPrepareRefundRequest = (): Codec<PrepareRefundRequest> =>
  buildCodecForObject<PrepareRefundRequest>()
    .property("talerRefundUri", codecForString())
    .build("PrepareRefundRequest");

export interface PrepareTipRequest {
  talerTipUri: string;
}

export const codecForPrepareTipRequest = (): Codec<PrepareTipRequest> =>
  buildCodecForObject<PrepareTipRequest>()
    .property("talerTipUri", codecForString())
    .build("PrepareTipRequest");

export interface AcceptTipRequest {
  walletTipId: string;
}

export const codecForAcceptTipRequest = (): Codec<AcceptTipRequest> =>
  buildCodecForObject<AcceptTipRequest>()
    .property("walletTipId", codecForString())
    .build("AcceptTipRequest");

export interface AbortPayWithRefundRequest {
  proposalId: string;
}

export const codecForAbortPayWithRefundRequest =
  (): Codec<AbortPayWithRefundRequest> =>
    buildCodecForObject<AbortPayWithRefundRequest>()
      .property("proposalId", codecForString())
      .build("AbortPayWithRefundRequest");

export interface GetFeeForDepositRequest {
  depositPaytoUri: string;
  amount: AmountString;
}

export interface DepositGroupFees {
  coin: AmountString;
  wire: AmountString;
  refresh: AmountString;
}

export interface CreateDepositGroupRequest {
  depositPaytoUri: string;
  amount: AmountString;
}

export const codecForGetFeeForDeposit = (): Codec<GetFeeForDepositRequest> =>
  buildCodecForObject<GetFeeForDepositRequest>()
    .property("amount", codecForAmountString())
    .property("depositPaytoUri", codecForString())
    .build("GetFeeForDepositRequest");

export interface PrepareDepositRequest {
  depositPaytoUri: string;
  amount: AmountString;
}
export const codecForPrepareDepositRequest = (): Codec<PrepareDepositRequest> =>
  buildCodecForObject<PrepareDepositRequest>()
    .property("amount", codecForAmountString())
    .property("depositPaytoUri", codecForString())
    .build("PrepareDepositRequest");

export interface PrepareDepositResponse {
  totalDepositCost: AmountString;
  effectiveDepositAmount: AmountString;
}

export const codecForCreateDepositGroupRequest =
  (): Codec<CreateDepositGroupRequest> =>
    buildCodecForObject<CreateDepositGroupRequest>()
      .property("amount", codecForAmountString())
      .property("depositPaytoUri", codecForString())
      .build("CreateDepositGroupRequest");

export interface CreateDepositGroupResponse {
  depositGroupId: string;
  transactionId: string;
}

export interface TrackDepositGroupRequest {
  depositGroupId: string;
}

export interface TrackDepositGroupResponse {
  responses: {
    status: number;
    body: any;
  }[];
}

export const codecForTrackDepositGroupRequest =
  (): Codec<TrackDepositGroupRequest> =>
    buildCodecForObject<TrackDepositGroupRequest>()
      .property("depositGroupId", codecForAmountString())
      .build("TrackDepositGroupRequest");

export interface WithdrawUriInfoResponse {
  amount: AmountString;
  defaultExchangeBaseUrl?: string;
  possibleExchanges: ExchangeListItem[];
}

export const codecForWithdrawUriInfoResponse =
  (): Codec<WithdrawUriInfoResponse> =>
    buildCodecForObject<WithdrawUriInfoResponse>()
      .property("amount", codecForAmountString())
      .property("defaultExchangeBaseUrl", codecOptional(codecForString()))
      .property("possibleExchanges", codecForList(codecForExchangeListItem()))
      .build("WithdrawUriInfoResponse");

export interface WalletCurrencyInfo {
  trustedAuditors: {
    currency: string;
    auditorPub: string;
    auditorBaseUrl: string;
  }[];
  trustedExchanges: {
    currency: string;
    exchangeMasterPub: string;
    exchangeBaseUrl: string;
  }[];
}

export interface DeleteTransactionRequest {
  transactionId: string;
}

export interface RetryTransactionRequest {
  transactionId: string;
}

export const codecForDeleteTransactionRequest =
  (): Codec<DeleteTransactionRequest> =>
    buildCodecForObject<DeleteTransactionRequest>()
      .property("transactionId", codecForString())
      .build("DeleteTransactionRequest");

export const codecForRetryTransactionRequest =
  (): Codec<RetryTransactionRequest> =>
    buildCodecForObject<RetryTransactionRequest>()
      .property("transactionId", codecForString())
      .build("RetryTransactionRequest");

export interface SetWalletDeviceIdRequest {
  /**
   * New wallet device ID to set.
   */
  walletDeviceId: string;
}

export const codecForSetWalletDeviceIdRequest =
  (): Codec<SetWalletDeviceIdRequest> =>
    buildCodecForObject<SetWalletDeviceIdRequest>()
      .property("walletDeviceId", codecForString())
      .build("SetWalletDeviceIdRequest");

export interface WithdrawFakebankRequest {
  amount: AmountString;
  exchange: string;
  bank: string;
}

export const codecForWithdrawFakebankRequest =
  (): Codec<WithdrawFakebankRequest> =>
    buildCodecForObject<WithdrawFakebankRequest>()
      .property("amount", codecForAmountString())
      .property("bank", codecForString())
      .property("exchange", codecForString())
      .build("WithdrawFakebankRequest");

export interface ImportDb {
  dump: any;
}

export const codecForImportDbRequest = (): Codec<ImportDb> =>
  buildCodecForObject<ImportDb>()
    .property("dump", codecForAny())
    .build("ImportDbRequest");

export interface ForcedDenomSel {
  denoms: {
    value: AmountString;
    count: number;
  }[];
}

/**
 * Forced coin selection for deposits/payments.
 */
export interface ForcedCoinSel {
  coins: {
    value: AmountString;
    contribution: AmountString;
  }[];
}

export interface TestPayResult {
  payCoinSelection: PayCoinSelection;
}

/**
 * Result of selecting coins, contains the exchange, and selected
 * coins with their denomination.
 */
export interface PayCoinSelection {
  /**
   * Amount requested by the merchant.
   */
  paymentAmount: AmountString;

  /**
   * Public keys of the coins that were selected.
   */
  coinPubs: string[];

  /**
   * Amount that each coin contributes.
   */
  coinContributions: AmountString[];

  /**
   * How much of the wire fees is the customer paying?
   */
  customerWireFees: AmountString;

  /**
   * How much of the deposit fees is the customer paying?
   */
  customerDepositFees: AmountString;
}

export interface InitiatePeerPushPaymentRequest {
  amount: AmountString;
  partialContractTerms: any;
}

export interface InitiatePeerPushPaymentResponse {
  exchangeBaseUrl: string;
  pursePub: string;
  mergePriv: string;
  contractPriv: string;
  talerUri: string;
  transactionId: string;
}

export const codecForInitiatePeerPushPaymentRequest =
  (): Codec<InitiatePeerPushPaymentRequest> =>
    buildCodecForObject<InitiatePeerPushPaymentRequest>()
      .property("amount", codecForAmountString())
      .property("partialContractTerms", codecForAny())
      .build("InitiatePeerPushPaymentRequest");

export interface CheckPeerPushPaymentRequest {
  talerUri: string;
}

export interface CheckPeerPullPaymentRequest {
  talerUri: string;
}

export interface CheckPeerPushPaymentResponse {
  contractTerms: any;
  amount: AmountString;
  peerPushPaymentIncomingId: string;
}

export interface CheckPeerPullPaymentResponse {
  contractTerms: any;
  amount: AmountString;
  peerPullPaymentIncomingId: string;
}

export const codecForCheckPeerPushPaymentRequest =
  (): Codec<CheckPeerPushPaymentRequest> =>
    buildCodecForObject<CheckPeerPushPaymentRequest>()
      .property("talerUri", codecForString())
      .build("CheckPeerPushPaymentRequest");

export const codecForCheckPeerPullPaymentRequest =
  (): Codec<CheckPeerPullPaymentRequest> =>
    buildCodecForObject<CheckPeerPullPaymentRequest>()
      .property("talerUri", codecForString())
      .build("CheckPeerPullPaymentRequest");

export interface AcceptPeerPushPaymentRequest {
  /**
   * Transparent identifier of the incoming peer push payment.
   */
  peerPushPaymentIncomingId: string;
}
export interface AcceptPeerPushPaymentResponse {
  transactionId: string;
}

export interface AcceptPeerPullPaymentResponse {
  transactionId: string;
}

export const codecForAcceptPeerPushPaymentRequest =
  (): Codec<AcceptPeerPushPaymentRequest> =>
    buildCodecForObject<AcceptPeerPushPaymentRequest>()
      .property("peerPushPaymentIncomingId", codecForString())
      .build("AcceptPeerPushPaymentRequest");

export interface AcceptPeerPullPaymentRequest {
  /**
   * Transparent identifier of the incoming peer pull payment.
   */
  peerPullPaymentIncomingId: string;
}

export interface SetDevModeRequest {
  devModeEnabled: boolean;
}

export const codecForSetDevModeRequest = (): Codec<SetDevModeRequest> =>
  buildCodecForObject<SetDevModeRequest>()
    .property("devModeEnabled", codecForBoolean())
    .build("SetDevModeRequest");

export interface ApplyDevExperimentRequest {
  devExperimentUri: string;
}

export const codecForApplyDevExperiment =
  (): Codec<ApplyDevExperimentRequest> =>
    buildCodecForObject<ApplyDevExperimentRequest>()
      .property("devExperimentUri", codecForString())
      .build("ApplyDevExperimentRequest");

export const codecForAcceptPeerPullPaymentRequest =
  (): Codec<AcceptPeerPullPaymentRequest> =>
    buildCodecForObject<AcceptPeerPullPaymentRequest>()
      .property("peerPullPaymentIncomingId", codecForString())
      .build("AcceptPeerPllPaymentRequest");

export interface InitiatePeerPullPaymentRequest {
  /**
   * FIXME: Make this optional?
   */
  exchangeBaseUrl: string;
  amount: AmountString;
  partialContractTerms: any;
}

export const codecForInitiatePeerPullPaymentRequest =
  (): Codec<InitiatePeerPullPaymentRequest> =>
    buildCodecForObject<InitiatePeerPullPaymentRequest>()
      .property("partialContractTerms", codecForAny())
      .property("amount", codecForAmountString())
      .property("exchangeBaseUrl", codecForAmountString())
      .build("InitiatePeerPullPaymentRequest");

export interface InitiatePeerPullPaymentResponse {
  /**
   * Taler URI for the other party to make the payment
   * that was requested.
   */
  talerUri: string;

  transactionId: string;
}
