/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * Type and schema definitions and helpers for the core GNU Taler protocol.
 *
 * Even though the rest of the wallet uses camelCase for fields, use snake_case
 * here, since that's the convention for the Taler JSON+HTTP API.
 */

/**
 * Imports.
 */

import { codecForAmountString } from "./amounts.js";
import {
  buildCodecForObject,
  buildCodecForUnion,
  Codec,
  codecForAny,
  codecForBoolean,
  codecForConstNumber,
  codecForConstString,
  codecForList,
  codecForMap,
  codecForNumber,
  codecForString,
  codecOptional,
} from "./codec.js";
import { strcmp } from "./helpers.js";
import { AgeCommitmentProof, Edx25519PublicKeyEnc } from "./taler-crypto.js";
import {
  codecForAbsoluteTime,
  codecForDuration,
  codecForTimestamp,
  TalerProtocolDuration,
  TalerProtocolTimestamp,
} from "./time.js";

/**
 * Denomination as found in the /keys response from the exchange.
 */
export class ExchangeDenomination {
  /**
   * Value of one coin of the denomination.
   */
  value: string;

  /**
   * Public signing key of the denomination.
   */
  denom_pub: DenominationPubKey;

  /**
   * Fee for withdrawing.
   */
  fee_withdraw: string;

  /**
   * Fee for depositing.
   */
  fee_deposit: string;

  /**
   * Fee for refreshing.
   */
  fee_refresh: string;

  /**
   * Fee for refunding.
   */
  fee_refund: string;

  /**
   * Start date from which withdraw is allowed.
   */
  stamp_start: TalerProtocolTimestamp;

  /**
   * End date for withdrawing.
   */
  stamp_expire_withdraw: TalerProtocolTimestamp;

  /**
   * Expiration date after which the exchange can forget about
   * the currency.
   */
  stamp_expire_legal: TalerProtocolTimestamp;

  /**
   * Date after which the coins of this denomination can't be
   * deposited anymore.
   */
  stamp_expire_deposit: TalerProtocolTimestamp;

  /**
   * Signature over the denomination information by the exchange's master
   * signing key.
   */
  master_sig: string;
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
export class ExchangeAuditor {
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
  denomination_keys: AuditorDenomSig[];
}

export type ExchangeWithdrawValue =
  | ExchangeRsaWithdrawValue
  | ExchangeCsWithdrawValue;

export interface ExchangeRsaWithdrawValue {
  cipher: "RSA";
}

export interface ExchangeCsWithdrawValue {
  cipher: "CS";

  /**
   *  CSR R0 value
   */
  r_pub_0: string;

  /**
   * CSR R1 value
   */
  r_pub_1: string;
}

export interface RecoupRequest {
  /**
   * Hashed denomination public key of the coin we want to get
   * paid back.
   */
  denom_pub_hash: string;

  /**
   * Signature over the coin public key by the denomination.
   *
   * The string variant is for the legacy exchange protocol.
   */
  denom_sig: UnblindedSignature;

  /**
   * Blinding key that was used during withdraw,
   * used to prove that we were actually withdrawing the coin.
   */
  coin_blind_key_secret: string;

  /**
   * Signature of TALER_RecoupRequestPS created with the coin's private key.
   */
  coin_sig: string;

  ewv: ExchangeWithdrawValue;
}

export interface RecoupRefreshRequest {
  /**
   * Hashed enomination public key of the coin we want to get
   * paid back.
   */
  denom_pub_hash: string;

  /**
   * Signature over the coin public key by the denomination.
   *
   * The string variant is for the legacy exchange protocol.
   */
  denom_sig: UnblindedSignature;

  /**
   * Coin's blinding factor.
   */
  coin_blind_key_secret: string;

  /**
   * Signature of TALER_RecoupRefreshRequestPS created with
   * the coin's private key.
   */
  coin_sig: string;

  ewv: ExchangeWithdrawValue;
}

/**
 * Response that we get from the exchange for a payback request.
 */
export interface RecoupConfirmation {
  /**
   * Public key of the reserve that will receive the payback.
   */
  reserve_pub?: string;

  /**
   * Public key of the old coin that will receive the recoup,
   * provided if refreshed was true.
   */
  old_coin_pub?: string;
}

export type UnblindedSignature = RsaUnblindedSignature;

export interface RsaUnblindedSignature {
  cipher: DenomKeyType.Rsa;
  rsa_signature: string;
}

/**
 * Deposit permission for a single coin.
 */
export interface CoinDepositPermission {
  /**
   * Signature by the coin.
   */
  coin_sig: string;

  /**
   * Public key of the coin being spend.
   */
  coin_pub: string;

  /**
   * Signature made by the denomination public key.
   *
   * The string variant is for legacy protocol support.
   */

  ub_sig: UnblindedSignature;

  /**
   * The denomination public key associated with this coin.
   */
  h_denom: string;

  /**
   * The amount that is subtracted from this coin with this payment.
   */
  contribution: string;

  /**
   * URL of the exchange this coin was withdrawn from.
   */
  exchange_url: string;

  minimum_age_sig?: EddsaSignatureString;

  age_commitment?: Edx25519PublicKeyEnc[];
}

/**
 * Information about an exchange as stored inside a
 * merchant's contract terms.
 */
export interface ExchangeHandle {
  /**
   * Master public signing key of the exchange.
   */
  master_pub: string;

  /**
   * Base URL of the exchange.
   */
  url: string;
}

export interface AuditorHandle {
  /**
   * Official name of the auditor.
   */
  name: string;

  /**
   * Master public signing key of the auditor.
   */
  auditor_pub: string;

  /**
   * Base URL of the auditor.
   */
  url: string;
}

// Delivery location, loosely modeled as a subset of
// ISO20022's PostalAddress25.
export interface Location {
  // Nation with its own government.
  country?: string;

  // Identifies a subdivision of a country such as state, region, county.
  country_subdivision?: string;

  // Identifies a subdivision within a country sub-division.
  district?: string;

  // Name of a built-up area, with defined boundaries, and a local government.
  town?: string;

  // Specific location name within the town.
  town_location?: string;

  // Identifier consisting of a group of letters and/or numbers that
  // is added to a postal address to assist the sorting of mail.
  post_code?: string;

  // Name of a street or thoroughfare.
  street?: string;

  // Name of the building or house.
  building_name?: string;

  // Number that identifies the position of a building on a street.
  building_number?: string;

  // Free-form address lines, should not exceed 7 elements.
  address_lines?: string[];
}

export interface MerchantInfo {
  name: string;
  jurisdiction?: Location;
  address?: Location;
  logo?: string;
  website?: string;
  email?: string;
}

export interface Tax {
  // the name of the tax
  name: string;

  // amount paid in tax
  tax: AmountString;
}

export interface Product {
  // merchant-internal identifier for the product.
  product_id?: string;

  // Human-readable product description.
  description: string;

  // Map from IETF BCP 47 language tags to localized descriptions
  description_i18n?: { [lang_tag: string]: string };

  // The number of units of the product to deliver to the customer.
  quantity?: number;

  // The unit in which the product is measured (liters, kilograms, packages, etc.)
  unit?: string;

  // The price of the product; this is the total price for quantity times unit of this product.
  price?: AmountString;

  // An optional base64-encoded product image
  image?: string;

  // a list of taxes paid by the merchant for this product. Can be empty.
  taxes?: Tax[];

  // time indicating when this product should be delivered
  delivery_date?: TalerProtocolTimestamp;
}

export interface InternationalizedString {
  [lang_tag: string]: string;
}

/**
 * Contract terms from a merchant.
 */
export interface ContractTerms {
  /**
   * Hash of the merchant's wire details.
   */
  h_wire: string;

  /**
   * Hash of the merchant's wire details.
   */
  auto_refund?: TalerProtocolDuration;

  /**
   * Wire method the merchant wants to use.
   */
  wire_method: string;

  /**
   * Human-readable short summary of the contract.
   */
  summary: string;

  summary_i18n?: InternationalizedString;

  /**
   * Nonce used to ensure freshness.
   */
  nonce: string;

  /**
   * Total amount payable.
   */
  amount: string;

  /**
   * Auditors accepted by the merchant.
   */
  auditors: AuditorHandle[];

  /**
   * Deadline to pay for the contract.
   */
  pay_deadline: TalerProtocolTimestamp;

  /**
   * Maximum deposit fee covered by the merchant.
   */
  max_fee: string;

  /**
   * Information about the merchant.
   */
  merchant: MerchantInfo;

  /**
   * Public key of the merchant.
   */
  merchant_pub: string;

  /**
   * Time indicating when the order should be delivered.
   * May be overwritten by individual products.
   */
  delivery_date?: TalerProtocolTimestamp;

  /**
   * Delivery location for (all!) products.
   */
  delivery_location?: Location;

  /**
   * List of accepted exchanges.
   */
  exchanges: ExchangeHandle[];

  /**
   * Products that are sold in this contract.
   */
  products?: Product[];

  /**
   * Deadline for refunds.
   */
  refund_deadline: TalerProtocolTimestamp;

  /**
   * Deadline for the wire transfer.
   */
  wire_transfer_deadline: TalerProtocolTimestamp;

  /**
   * Time when the contract was generated by the merchant.
   */
  timestamp: TalerProtocolTimestamp;

  /**
   * Order id to uniquely identify the purchase within
   * one merchant instance.
   */
  order_id: string;

  /**
   * Base URL of the merchant's backend.
   */
  merchant_base_url: string;

  /**
   * Fulfillment URL to view the product or
   * delivery status.
   */
  fulfillment_url?: string;

  /**
   * URL meant to share the shopping cart.
   */
  public_reorder_url?: string;

  /**
   * Plain text fulfillment message in the merchant's default language.
   */
  fulfillment_message?: string;

  /**
   * Internationalized fulfillment messages.
   */
  fulfillment_message_i18n?: InternationalizedString;

  /**
   * Share of the wire fee that must be settled with one payment.
   */
  wire_fee_amortization?: number;

  /**
   * Maximum wire fee that the merchant agrees to pay for.
   */
  max_wire_fee?: string;

  minimum_age?: number;

  /**
   * Extra data, interpreted by the mechant only.
   */
  extra?: any;
}

/**
 * Refund permission in the format that the merchant gives it to us.
 */
export interface MerchantAbortPayRefundDetails {
  /**
   * Amount to be refunded.
   */
  refund_amount: string;

  /**
   * Fee for the refund.
   */
  refund_fee: string;

  /**
   * Public key of the coin being refunded.
   */
  coin_pub: string;

  /**
   * Refund transaction ID between merchant and exchange.
   */
  rtransaction_id: number;

  /**
   * Exchange's key used for the signature.
   */
  exchange_pub?: string;

  /**
   * Exchange's signature to confirm the refund.
   */
  exchange_sig?: string;

  /**
   * Error replay from the exchange (if any).
   */
  exchange_reply?: any;

  /**
   * Error code from the exchange (if any).
   */
  exchange_code?: number;

  /**
   * HTTP status code of the exchange's response
   * to the merchant's refund request.
   */
  exchange_http_status: number;
}

/**
 * Response for a refund pickup or a /pay in abort mode.
 */
export interface MerchantRefundResponse {
  /**
   * Public key of the merchant
   */
  merchant_pub: string;

  /**
   * Contract terms hash of the contract that
   * is being refunded.
   */
  h_contract_terms: string;

  /**
   * The signed refund permissions, to be sent to the exchange.
   */
  refunds: MerchantAbortPayRefundDetails[];
}

/**
 * Planchet detail sent to the merchant.
 */
export interface TipPlanchetDetail {
  /**
   * Hashed denomination public key.
   */
  denom_pub_hash: string;

  /**
   * Coin's blinded public key.
   */
  coin_ev: CoinEnvelope;
}

/**
 * Request sent to the merchant to pick up a tip.
 */
export interface TipPickupRequest {
  /**
   * Identifier of the tip.
   */
  tip_id: string;

  /**
   * List of planchets the wallet wants to use for the tip.
   */
  planchets: TipPlanchetDetail[];
}

/**
 * Reserve signature, defined as separate class to facilitate
 * schema validation.
 */
export interface MerchantBlindSigWrapperV1 {
  /**
   * Reserve signature.
   */
  blind_sig: string;
}

/**
 * Response of the merchant
 * to the TipPickupRequest.
 */
export interface MerchantTipResponseV1 {
  /**
   * The order of the signatures matches the planchets list.
   */
  blind_sigs: MerchantBlindSigWrapperV1[];
}

export interface MerchantBlindSigWrapperV2 {
  blind_sig: BlindedDenominationSignature;
}

/**
 * Response of the merchant
 * to the TipPickupRequest.
 */
export interface MerchantTipResponseV2 {
  /**
   * The order of the signatures matches the planchets list.
   */
  blind_sigs: MerchantBlindSigWrapperV2[];
}

/**
 * Element of the payback list that the
 * exchange gives us in /keys.
 */
export class Recoup {
  /**
   * The hash of the denomination public key for which the payback is offered.
   */
  h_denom_pub: string;
}

/**
 * Structure of one exchange signing key in the /keys response.
 */
export class ExchangeSignKeyJson {
  stamp_start: TalerProtocolTimestamp;
  stamp_expire: TalerProtocolTimestamp;
  stamp_end: TalerProtocolTimestamp;
  key: EddsaPublicKeyString;
  master_sig: EddsaSignatureString;
}

/**
 * Structure that the exchange gives us in /keys.
 */
export class ExchangeKeysJson {
  /**
   * List of offered denominations.
   */
  denoms: ExchangeDenomination[];

  /**
   * The exchange's master public key.
   */
  master_public_key: string;

  /**
   * The list of auditors (partially) auditing the exchange.
   */
  auditors: ExchangeAuditor[];

  /**
   * Timestamp when this response was issued.
   */
  list_issue_date: TalerProtocolTimestamp;

  /**
   * List of revoked denominations.
   */
  recoup?: Recoup[];

  /**
   * Short-lived signing keys used to sign online
   * responses.
   */
  signkeys: ExchangeSignKeyJson[];

  /**
   * Protocol version.
   */
  version: string;

  reserve_closing_delay: TalerProtocolDuration;

  global_fees: GlobalFees[];
}

export interface GlobalFees {
  // What date (inclusive) does these fees go into effect?
  start_date: TalerProtocolTimestamp;

  // What date (exclusive) does this fees stop going into effect?
  end_date: TalerProtocolTimestamp;

  // KYC fee, charged when a user wants to create an account.
  // The first year of the account_annual_fee after the KYC is
  // always included.
  kyc_fee: AmountString;

  // Account history fee, charged when a user wants to
  // obtain a reserve/account history.
  history_fee: AmountString;

  // Annual fee charged for having an open account at the
  // exchange.  Charged to the account.  If the account
  // balance is insufficient to cover this fee, the account
  // is automatically deleted/closed. (Note that the exchange
  // will keep the account history around for longer for
  // regulatory reasons.)
  account_fee: AmountString;

  // Purse fee, charged only if a purse is abandoned
  // and was not covered by the account limit.
  purse_fee: AmountString;

  // How long will the exchange preserve the account history?
  // After an account was deleted/closed, the exchange will
  // retain the account history for legal reasons until this time.
  history_expiration: TalerProtocolDuration;

  // How long does the exchange promise to keep funds
  // an account for which the KYC has never happened
  // after a purse was merged into an account? Basically,
  // after this time funds in an account without KYC are
  // forfeit.
  account_kyc_timeout: TalerProtocolDuration;

  // Non-negative number of concurrent purses that any
  // account holder is allowed to create without having
  // to pay the purse_fee.
  purse_account_limit: number;

  // How long does an exchange keep a purse around after a purse
  // has expired (or been successfully merged)?  A 'GET' request
  // for a purse will succeed until the purse expiration time
  // plus this value.
  purse_timeout: TalerProtocolDuration;

  // Signature of TALER_GlobalFeesPS.
  master_sig: string;
}
/**
 * Wire fees as announced by the exchange.
 */
export class WireFeesJson {
  /**
   * Cost of a wire transfer.
   */
  wire_fee: string;

  wad_fee: string;

  /**
   * Cost of clising a reserve.
   */
  closing_fee: string;

  /**
   * Signature made with the exchange's master key.
   */
  sig: string;

  /**
   * Date from which the fee applies.
   */
  start_date: TalerProtocolTimestamp;

  /**
   * Data after which the fee doesn't apply anymore.
   */
  end_date: TalerProtocolTimestamp;
}

export interface AccountInfo {
  payto_uri: string;
  master_sig: string;
}

export interface ExchangeWireJson {
  accounts: AccountInfo[];
  fees: { [methodName: string]: WireFeesJson[] };
}

/**
 * Proposal returned from the contract URL.
 */
export class Proposal {
  /**
   * Contract terms for the propoal.
   * Raw, un-decoded JSON object.
   */
  contract_terms: any;

  /**
   * Signature over contract, made by the merchant.  The public key used for signing
   * must be contract_terms.merchant_pub.
   */
  sig: string;
}

/**
 * Response from the internal merchant API.
 */
export class CheckPaymentResponse {
  order_status: string;
  refunded: boolean | undefined;
  refunded_amount: string | undefined;
  contract_terms: any | undefined;
  taler_pay_uri: string | undefined;
  contract_url: string | undefined;
}

/**
 * Response from the bank.
 */
export class WithdrawOperationStatusResponse {
  selection_done: boolean;

  transfer_done: boolean;

  aborted: boolean;

  amount: string;

  sender_wire?: string;

  suggested_exchange?: string;

  confirm_transfer_url?: string;

  wire_types: string[];
}

/**
 * Response from the merchant.
 */
export class TipPickupGetResponse {
  tip_amount: string;

  exchange_url: string;

  expiration: TalerProtocolTimestamp;
}

export enum DenomKeyType {
  Rsa = "RSA",
  ClauseSchnorr = "CS",
}

export namespace DenomKeyType {
  export function toIntTag(t: DenomKeyType): number {
    switch (t) {
      case DenomKeyType.Rsa:
        return 1;
      case DenomKeyType.ClauseSchnorr:
        return 2;
    }
  }
}

export interface RsaBlindedDenominationSignature {
  cipher: DenomKeyType.Rsa;
  blinded_rsa_signature: string;
}

export interface CSBlindedDenominationSignature {
  cipher: DenomKeyType.ClauseSchnorr;
}

export type BlindedDenominationSignature =
  | RsaBlindedDenominationSignature
  | CSBlindedDenominationSignature;

export const codecForRsaBlindedDenominationSignature = () =>
  buildCodecForObject<RsaBlindedDenominationSignature>()
    .property("cipher", codecForConstString(DenomKeyType.Rsa))
    .property("blinded_rsa_signature", codecForString())
    .build("RsaBlindedDenominationSignature");

export const codecForBlindedDenominationSignature = () =>
  buildCodecForUnion<BlindedDenominationSignature>()
    .discriminateOn("cipher")
    .alternative(DenomKeyType.Rsa, codecForRsaBlindedDenominationSignature())
    .build("BlindedDenominationSignature");

export class WithdrawResponse {
  ev_sig: BlindedDenominationSignature;
}

export class WithdrawBatchResponse {
  ev_sigs: WithdrawResponse[];
}

export interface MerchantPayResponse {
  sig: string;
}

export interface ExchangeMeltRequest {
  coin_pub: CoinPublicKeyString;
  confirm_sig: EddsaSignatureString;
  denom_pub_hash: HashCodeString;
  denom_sig: UnblindedSignature;
  rc: string;
  value_with_fee: AmountString;
  age_commitment_hash?: HashCodeString;
}

export interface ExchangeMeltResponse {
  /**
   * Which of the kappa indices does the client not have to reveal.
   */
  noreveal_index: number;

  /**
   * Signature of TALER_RefreshMeltConfirmationPS whereby the exchange
   * affirms the successful melt and confirming the noreveal_index
   */
  exchange_sig: EddsaSignatureString;

  /*
   * public EdDSA key of the exchange that was used to generate the signature.
   * Should match one of the exchange's signing keys from /keys.  Again given
   * explicitly as the client might otherwise be confused by clock skew as to
   * which signing key was used.
   */
  exchange_pub: EddsaPublicKeyString;

  /*
   * Base URL to use for operations on the refresh context
   * (so the reveal operation).  If not given,
   * the base URL is the same as the one used for this request.
   * Can be used if the base URL for /refreshes/ differs from that
   * for /coins/, i.e. for load balancing.  Clients SHOULD
   * respect the refresh_base_url if provided.  Any HTTP server
   * belonging to an exchange MUST generate a 307 or 308 redirection
   * to the correct base URL should a client uses the wrong base
   * URL, or if the base URL has changed since the melt.
   *
   * When melting the same coin twice (technically allowed
   * as the response might have been lost on the network),
   * the exchange may return different values for the refresh_base_url.
   */
  refresh_base_url?: string;
}

export interface ExchangeRevealItem {
  ev_sig: BlindedDenominationSignature;
}

export interface ExchangeRevealResponse {
  // List of the exchange's blinded RSA signatures on the new coins.
  ev_sigs: ExchangeRevealItem[];
}

interface MerchantOrderStatusPaid {
  // Was the payment refunded (even partially, via refund or abort)?
  refunded: boolean;

  // Is any amount of the refund still waiting to be picked up (even partially)?
  refund_pending: boolean;

  // Amount that was refunded in total.
  refund_amount: AmountString;

  // Amount that already taken by the wallet.
  refund_taken: AmountString;
}

interface MerchantOrderRefundResponse {
  /**
   * Amount that was refunded in total.
   */
  refund_amount: AmountString;

  /**
   * Successful refunds for this payment, empty array for none.
   */
  refunds: MerchantCoinRefundStatus[];

  /**
   * Public key of the merchant.
   */
  merchant_pub: EddsaPublicKeyString;
}

export type MerchantCoinRefundStatus =
  | MerchantCoinRefundSuccessStatus
  | MerchantCoinRefundFailureStatus;

export interface MerchantCoinRefundSuccessStatus {
  type: "success";

  // HTTP status of the exchange request, 200 (integer) required for refund confirmations.
  exchange_status: 200;

  // the EdDSA :ref:signature (binary-only) with purpose
  // TALER_SIGNATURE_EXCHANGE_CONFIRM_REFUND using a current signing key of the
  // exchange affirming the successful refund
  exchange_sig: EddsaSignatureString;

  // public EdDSA key of the exchange that was used to generate the signature.
  // Should match one of the exchange's signing keys from /keys.  It is given
  // explicitly as the client might otherwise be confused by clock skew as to
  // which signing key was used.
  exchange_pub: EddsaPublicKeyString;

  // Refund transaction ID.
  rtransaction_id: number;

  // public key of a coin that was refunded
  coin_pub: EddsaPublicKeyString;

  // Amount that was refunded, including refund fee charged by the exchange
  // to the customer.
  refund_amount: AmountString;

  execution_time: TalerProtocolTimestamp;
}

export interface MerchantCoinRefundFailureStatus {
  type: "failure";

  // HTTP status of the exchange request, must NOT be 200.
  exchange_status: number;

  // Taler error code from the exchange reply, if available.
  exchange_code?: number;

  // If available, HTTP reply from the exchange.
  exchange_reply?: any;

  // Refund transaction ID.
  rtransaction_id: number;

  // public key of a coin that was refunded
  coin_pub: EddsaPublicKeyString;

  // Amount that was refunded, including refund fee charged by the exchange
  // to the customer.
  refund_amount: AmountString;

  execution_time: TalerProtocolTimestamp;
}

export interface MerchantOrderStatusUnpaid {
  /**
   * URI that the wallet must process to complete the payment.
   */
  taler_pay_uri: string;

  /**
   * Alternative order ID which was paid for already in the same session.
   *
   * Only given if the same product was purchased before in the same session.
   */
  already_paid_order_id?: string;
}

/**
 * Response body for the following endpoint:
 *
 * POST {talerBankIntegrationApi}/withdrawal-operation/{wopid}
 */
export interface BankWithdrawalOperationPostResponse {
  transfer_done: boolean;
}

export type DenominationPubKey = RsaDenominationPubKey | CsDenominationPubKey;

export interface RsaDenominationPubKey {
  readonly cipher: DenomKeyType.Rsa;
  readonly rsa_public_key: string;
  readonly age_mask: number;
}

export interface CsDenominationPubKey {
  readonly cipher: DenomKeyType.ClauseSchnorr;
  readonly age_mask: number;
  readonly cs_public_key: string;
}

export namespace DenominationPubKey {
  export function cmp(
    p1: DenominationPubKey,
    p2: DenominationPubKey,
  ): -1 | 0 | 1 {
    if (p1.cipher < p2.cipher) {
      return -1;
    } else if (p1.cipher > p2.cipher) {
      return +1;
    } else if (
      p1.cipher === DenomKeyType.Rsa &&
      p2.cipher === DenomKeyType.Rsa
    ) {
      if ((p1.age_mask ?? 0) < (p2.age_mask ?? 0)) {
        return -1;
      } else if ((p1.age_mask ?? 0) > (p2.age_mask ?? 0)) {
        return 1;
      }
      return strcmp(p1.rsa_public_key, p2.rsa_public_key);
    } else if (
      p1.cipher === DenomKeyType.ClauseSchnorr &&
      p2.cipher === DenomKeyType.ClauseSchnorr
    ) {
      if ((p1.age_mask ?? 0) < (p2.age_mask ?? 0)) {
        return -1;
      } else if ((p1.age_mask ?? 0) > (p2.age_mask ?? 0)) {
        return 1;
      }
      return strcmp(p1.cs_public_key, p2.cs_public_key);
    } else {
      throw Error("unsupported cipher");
    }
  }
}

export const codecForRsaDenominationPubKey = () =>
  buildCodecForObject<RsaDenominationPubKey>()
    .property("cipher", codecForConstString(DenomKeyType.Rsa))
    .property("rsa_public_key", codecForString())
    .property("age_mask", codecForNumber())
    .build("DenominationPubKey");

export const codecForCsDenominationPubKey = () =>
  buildCodecForObject<CsDenominationPubKey>()
    .property("cipher", codecForConstString(DenomKeyType.ClauseSchnorr))
    .property("cs_public_key", codecForString())
    .property("age_mask", codecForNumber())
    .build("CsDenominationPubKey");

export const codecForDenominationPubKey = () =>
  buildCodecForUnion<DenominationPubKey>()
    .discriminateOn("cipher")
    .alternative(DenomKeyType.Rsa, codecForRsaDenominationPubKey())
    .alternative(DenomKeyType.ClauseSchnorr, codecForCsDenominationPubKey())
    .build("DenominationPubKey");

export const codecForBankWithdrawalOperationPostResponse =
  (): Codec<BankWithdrawalOperationPostResponse> =>
    buildCodecForObject<BankWithdrawalOperationPostResponse>()
      .property("transfer_done", codecForBoolean())
      .build("BankWithdrawalOperationPostResponse");

export type AmountString = string;
export type Base32String = string;
export type EddsaSignatureString = string;
export type EddsaPublicKeyString = string;
export type CoinPublicKeyString = string;

export const codecForDenomination = (): Codec<ExchangeDenomination> =>
  buildCodecForObject<ExchangeDenomination>()
    .property("value", codecForString())
    .property("denom_pub", codecForDenominationPubKey())
    .property("fee_withdraw", codecForString())
    .property("fee_deposit", codecForString())
    .property("fee_refresh", codecForString())
    .property("fee_refund", codecForString())
    .property("stamp_start", codecForTimestamp)
    .property("stamp_expire_withdraw", codecForTimestamp)
    .property("stamp_expire_legal", codecForTimestamp)
    .property("stamp_expire_deposit", codecForTimestamp)
    .property("master_sig", codecForString())
    .build("Denomination");

export const codecForAuditorDenomSig = (): Codec<AuditorDenomSig> =>
  buildCodecForObject<AuditorDenomSig>()
    .property("denom_pub_h", codecForString())
    .property("auditor_sig", codecForString())
    .build("AuditorDenomSig");

export const codecForAuditor = (): Codec<ExchangeAuditor> =>
  buildCodecForObject<ExchangeAuditor>()
    .property("auditor_pub", codecForString())
    .property("auditor_url", codecForString())
    .property("denomination_keys", codecForList(codecForAuditorDenomSig()))
    .build("Auditor");

export const codecForExchangeHandle = (): Codec<ExchangeHandle> =>
  buildCodecForObject<ExchangeHandle>()
    .property("master_pub", codecForString())
    .property("url", codecForString())
    .build("ExchangeHandle");

export const codecForAuditorHandle = (): Codec<AuditorHandle> =>
  buildCodecForObject<AuditorHandle>()
    .property("name", codecForString())
    .property("auditor_pub", codecForString())
    .property("url", codecForString())
    .build("AuditorHandle");

export const codecForLocation = (): Codec<Location> =>
  buildCodecForObject<Location>()
    .property("country", codecOptional(codecForString()))
    .property("country_subdivision", codecOptional(codecForString()))
    .property("building_name", codecOptional(codecForString()))
    .property("building_number", codecOptional(codecForString()))
    .property("district", codecOptional(codecForString()))
    .property("street", codecOptional(codecForString()))
    .property("post_code", codecOptional(codecForString()))
    .property("town", codecOptional(codecForString()))
    .property("town_location", codecOptional(codecForString()))
    .property("address_lines", codecOptional(codecForList(codecForString())))
    .build("Location");

export const codecForMerchantInfo = (): Codec<MerchantInfo> =>
  buildCodecForObject<MerchantInfo>()
    .property("name", codecForString())
    .property("address", codecOptional(codecForLocation()))
    .property("jurisdiction", codecOptional(codecForLocation()))
    .build("MerchantInfo");

export const codecForTax = (): Codec<Tax> =>
  buildCodecForObject<Tax>()
    .property("name", codecForString())
    .property("tax", codecForString())
    .build("Tax");

export const codecForInternationalizedString =
  (): Codec<InternationalizedString> => codecForMap(codecForString());

export const codecForProduct = (): Codec<Product> =>
  buildCodecForObject<Product>()
    .property("product_id", codecOptional(codecForString()))
    .property("description", codecForString())
    .property(
      "description_i18n",
      codecOptional(codecForInternationalizedString()),
    )
    .property("quantity", codecOptional(codecForNumber()))
    .property("unit", codecOptional(codecForString()))
    .property("price", codecOptional(codecForString()))
    .build("Tax");

export const codecForContractTerms = (): Codec<ContractTerms> =>
  buildCodecForObject<ContractTerms>()
    .property("order_id", codecForString())
    .property("fulfillment_url", codecOptional(codecForString()))
    .property("fulfillment_message", codecOptional(codecForString()))
    .property(
      "fulfillment_message_i18n",
      codecOptional(codecForInternationalizedString()),
    )
    .property("merchant_base_url", codecForString())
    .property("h_wire", codecForString())
    .property("auto_refund", codecOptional(codecForDuration))
    .property("wire_method", codecForString())
    .property("summary", codecForString())
    .property("summary_i18n", codecOptional(codecForInternationalizedString()))
    .property("nonce", codecForString())
    .property("amount", codecForString())
    .property("auditors", codecForList(codecForAuditorHandle()))
    .property("pay_deadline", codecForTimestamp)
    .property("refund_deadline", codecForTimestamp)
    .property("wire_transfer_deadline", codecForTimestamp)
    .property("timestamp", codecForTimestamp)
    .property("delivery_location", codecOptional(codecForLocation()))
    .property("delivery_date", codecOptional(codecForTimestamp))
    .property("max_fee", codecForString())
    .property("max_wire_fee", codecOptional(codecForString()))
    .property("merchant", codecForMerchantInfo())
    .property("merchant_pub", codecForString())
    .property("exchanges", codecForList(codecForExchangeHandle()))
    .property("products", codecOptional(codecForList(codecForProduct())))
    .property("extra", codecForAny())
    .property("minimum_age", codecOptional(codecForNumber()))
    .build("ContractTerms");

export const codecForMerchantRefundPermission =
  (): Codec<MerchantAbortPayRefundDetails> =>
    buildCodecForObject<MerchantAbortPayRefundDetails>()
      .property("refund_amount", codecForAmountString())
      .property("refund_fee", codecForAmountString())
      .property("coin_pub", codecForString())
      .property("rtransaction_id", codecForNumber())
      .property("exchange_http_status", codecForNumber())
      .property("exchange_code", codecOptional(codecForNumber()))
      .property("exchange_reply", codecOptional(codecForAny()))
      .property("exchange_sig", codecOptional(codecForString()))
      .property("exchange_pub", codecOptional(codecForString()))
      .build("MerchantRefundPermission");

export const codecForMerchantRefundResponse =
  (): Codec<MerchantRefundResponse> =>
    buildCodecForObject<MerchantRefundResponse>()
      .property("merchant_pub", codecForString())
      .property("h_contract_terms", codecForString())
      .property("refunds", codecForList(codecForMerchantRefundPermission()))
      .build("MerchantRefundResponse");

export const codecForBlindSigWrapperV2 = (): Codec<MerchantBlindSigWrapperV2> =>
  buildCodecForObject<MerchantBlindSigWrapperV2>()
    .property("blind_sig", codecForBlindedDenominationSignature())
    .build("MerchantBlindSigWrapperV2");

export const codecForMerchantTipResponseV2 = (): Codec<MerchantTipResponseV2> =>
  buildCodecForObject<MerchantTipResponseV2>()
    .property("blind_sigs", codecForList(codecForBlindSigWrapperV2()))
    .build("MerchantTipResponseV2");

export const codecForRecoup = (): Codec<Recoup> =>
  buildCodecForObject<Recoup>()
    .property("h_denom_pub", codecForString())
    .build("Recoup");

export const codecForExchangeSigningKey = (): Codec<ExchangeSignKeyJson> =>
  buildCodecForObject<ExchangeSignKeyJson>()
    .property("key", codecForString())
    .property("master_sig", codecForString())
    .property("stamp_end", codecForTimestamp)
    .property("stamp_start", codecForTimestamp)
    .property("stamp_expire", codecForTimestamp)
    .build("ExchangeSignKeyJson");

export const codecForGlobalFees = (): Codec<GlobalFees> =>
  buildCodecForObject<GlobalFees>()
    .property("start_date", codecForTimestamp)
    .property("end_date", codecForTimestamp)
    .property("kyc_fee", codecForAmountString())
    .property("history_fee", codecForAmountString())
    .property("account_fee", codecForAmountString())
    .property("purse_fee", codecForAmountString())
    .property("history_expiration", codecForDuration)
    .property("account_kyc_timeout", codecForDuration)
    .property("purse_account_limit", codecForNumber())
    .property("purse_timeout", codecForDuration)
    .property("master_sig", codecForString())
    .build("GlobalFees");

export const codecForExchangeKeysJson = (): Codec<ExchangeKeysJson> =>
  buildCodecForObject<ExchangeKeysJson>()
    .property("denoms", codecForList(codecForDenomination()))
    .property("master_public_key", codecForString())
    .property("auditors", codecForList(codecForAuditor()))
    .property("list_issue_date", codecForTimestamp)
    .property("recoup", codecOptional(codecForList(codecForRecoup())))
    .property("signkeys", codecForList(codecForExchangeSigningKey()))
    .property("version", codecForString())
    .property("reserve_closing_delay", codecForDuration)
    .property("global_fees", codecForList(codecForGlobalFees()))
    .build("ExchangeKeysJson");

export const codecForWireFeesJson = (): Codec<WireFeesJson> =>
  buildCodecForObject<WireFeesJson>()
    .property("wire_fee", codecForString())
    .property("closing_fee", codecForString())
    .property("wad_fee", codecForString())
    .property("sig", codecForString())
    .property("start_date", codecForTimestamp)
    .property("end_date", codecForTimestamp)
    .build("WireFeesJson");

export const codecForAccountInfo = (): Codec<AccountInfo> =>
  buildCodecForObject<AccountInfo>()
    .property("payto_uri", codecForString())
    .property("master_sig", codecForString())
    .build("AccountInfo");

export const codecForExchangeWireJson = (): Codec<ExchangeWireJson> =>
  buildCodecForObject<ExchangeWireJson>()
    .property("accounts", codecForList(codecForAccountInfo()))
    .property("fees", codecForMap(codecForList(codecForWireFeesJson())))
    .build("ExchangeWireJson");

export const codecForProposal = (): Codec<Proposal> =>
  buildCodecForObject<Proposal>()
    .property("contract_terms", codecForAny())
    .property("sig", codecForString())
    .build("Proposal");

export const codecForCheckPaymentResponse = (): Codec<CheckPaymentResponse> =>
  buildCodecForObject<CheckPaymentResponse>()
    .property("order_status", codecForString())
    .property("refunded", codecOptional(codecForBoolean()))
    .property("refunded_amount", codecOptional(codecForString()))
    .property("contract_terms", codecOptional(codecForAny()))
    .property("taler_pay_uri", codecOptional(codecForString()))
    .property("contract_url", codecOptional(codecForString()))
    .build("CheckPaymentResponse");

export const codecForWithdrawOperationStatusResponse =
  (): Codec<WithdrawOperationStatusResponse> =>
    buildCodecForObject<WithdrawOperationStatusResponse>()
      .property("selection_done", codecForBoolean())
      .property("transfer_done", codecForBoolean())
      .property("aborted", codecForBoolean())
      .property("amount", codecForString())
      .property("sender_wire", codecOptional(codecForString()))
      .property("suggested_exchange", codecOptional(codecForString()))
      .property("confirm_transfer_url", codecOptional(codecForString()))
      .property("wire_types", codecForList(codecForString()))
      .build("WithdrawOperationStatusResponse");

export const codecForTipPickupGetResponse = (): Codec<TipPickupGetResponse> =>
  buildCodecForObject<TipPickupGetResponse>()
    .property("tip_amount", codecForString())
    .property("exchange_url", codecForString())
    .property("expiration", codecForTimestamp)
    .build("TipPickupGetResponse");

export const codecForRecoupConfirmation = (): Codec<RecoupConfirmation> =>
  buildCodecForObject<RecoupConfirmation>()
    .property("reserve_pub", codecOptional(codecForString()))
    .property("old_coin_pub", codecOptional(codecForString()))
    .build("RecoupConfirmation");

export const codecForWithdrawResponse = (): Codec<WithdrawResponse> =>
  buildCodecForObject<WithdrawResponse>()
    .property("ev_sig", codecForBlindedDenominationSignature())
    .build("WithdrawResponse");

export const codecForWithdrawBatchResponse = (): Codec<WithdrawBatchResponse> =>
  buildCodecForObject<WithdrawBatchResponse>()
    .property("ev_sigs", codecForList(codecForWithdrawResponse()))
    .build("WithdrawBatchResponse");

export const codecForMerchantPayResponse = (): Codec<MerchantPayResponse> =>
  buildCodecForObject<MerchantPayResponse>()
    .property("sig", codecForString())
    .build("MerchantPayResponse");

export const codecForExchangeMeltResponse = (): Codec<ExchangeMeltResponse> =>
  buildCodecForObject<ExchangeMeltResponse>()
    .property("exchange_pub", codecForString())
    .property("exchange_sig", codecForString())
    .property("noreveal_index", codecForNumber())
    .property("refresh_base_url", codecOptional(codecForString()))
    .build("ExchangeMeltResponse");

export const codecForExchangeRevealItem = (): Codec<ExchangeRevealItem> =>
  buildCodecForObject<ExchangeRevealItem>()
    .property("ev_sig", codecForBlindedDenominationSignature())
    .build("ExchangeRevealItem");

export const codecForExchangeRevealResponse =
  (): Codec<ExchangeRevealResponse> =>
    buildCodecForObject<ExchangeRevealResponse>()
      .property("ev_sigs", codecForList(codecForExchangeRevealItem()))
      .build("ExchangeRevealResponse");

export const codecForMerchantCoinRefundSuccessStatus =
  (): Codec<MerchantCoinRefundSuccessStatus> =>
    buildCodecForObject<MerchantCoinRefundSuccessStatus>()
      .property("type", codecForConstString("success"))
      .property("coin_pub", codecForString())
      .property("exchange_status", codecForConstNumber(200))
      .property("exchange_sig", codecForString())
      .property("rtransaction_id", codecForNumber())
      .property("refund_amount", codecForString())
      .property("exchange_pub", codecForString())
      .property("execution_time", codecForTimestamp)
      .build("MerchantCoinRefundSuccessStatus");

export const codecForMerchantCoinRefundFailureStatus =
  (): Codec<MerchantCoinRefundFailureStatus> =>
    buildCodecForObject<MerchantCoinRefundFailureStatus>()
      .property("type", codecForConstString("failure"))
      .property("coin_pub", codecForString())
      .property("exchange_status", codecForNumber())
      .property("rtransaction_id", codecForNumber())
      .property("refund_amount", codecForString())
      .property("exchange_code", codecOptional(codecForNumber()))
      .property("exchange_reply", codecOptional(codecForAny()))
      .property("execution_time", codecForTimestamp)
      .build("MerchantCoinRefundFailureStatus");

export const codecForMerchantCoinRefundStatus =
  (): Codec<MerchantCoinRefundStatus> =>
    buildCodecForUnion<MerchantCoinRefundStatus>()
      .discriminateOn("type")
      .alternative("success", codecForMerchantCoinRefundSuccessStatus())
      .alternative("failure", codecForMerchantCoinRefundFailureStatus())
      .build("MerchantCoinRefundStatus");

export const codecForMerchantOrderStatusPaid =
  (): Codec<MerchantOrderStatusPaid> =>
    buildCodecForObject<MerchantOrderStatusPaid>()
      .property("refund_amount", codecForString())
      .property("refund_taken", codecForString())
      .property("refund_pending", codecForBoolean())
      .property("refunded", codecForBoolean())
      .build("MerchantOrderStatusPaid");

export const codecForMerchantOrderRefundPickupResponse =
  (): Codec<MerchantOrderRefundResponse> =>
    buildCodecForObject<MerchantOrderRefundResponse>()
      .property("merchant_pub", codecForString())
      .property("refund_amount", codecForString())
      .property("refunds", codecForList(codecForMerchantCoinRefundStatus()))
      .build("MerchantOrderRefundPickupResponse");

export const codecForMerchantOrderStatusUnpaid =
  (): Codec<MerchantOrderStatusUnpaid> =>
    buildCodecForObject<MerchantOrderStatusUnpaid>()
      .property("taler_pay_uri", codecForString())
      .property("already_paid_order_id", codecOptional(codecForString()))
      .build("MerchantOrderStatusUnpaid");

export interface AbortRequest {
  // hash of the order's contract terms (this is used to authenticate the
  // wallet/customer in case $ORDER_ID is guessable).
  h_contract: string;

  // List of coins the wallet would like to see refunds for.
  // (Should be limited to the coins for which the original
  // payment succeeded, as far as the wallet knows.)
  coins: AbortingCoin[];
}

export interface AbortingCoin {
  // Public key of a coin for which the wallet is requesting an abort-related refund.
  coin_pub: EddsaPublicKeyString;

  // The amount to be refunded (matches the original contribution)
  contribution: AmountString;

  // URL of the exchange this coin was withdrawn from.
  exchange_url: string;
}

export interface AbortResponse {
  // List of refund responses about the coins that the wallet
  // requested an abort for.  In the same order as the 'coins'
  // from the original request.
  // The rtransaction_id is implied to be 0.
  refunds: MerchantAbortPayRefundStatus[];
}

export const codecForMerchantAbortPayRefundSuccessStatus =
  (): Codec<MerchantAbortPayRefundSuccessStatus> =>
    buildCodecForObject<MerchantAbortPayRefundSuccessStatus>()
      .property("exchange_pub", codecForString())
      .property("exchange_sig", codecForString())
      .property("exchange_status", codecForConstNumber(200))
      .property("type", codecForConstString("success"))
      .build("MerchantAbortPayRefundSuccessStatus");

export const codecForMerchantAbortPayRefundFailureStatus =
  (): Codec<MerchantAbortPayRefundFailureStatus> =>
    buildCodecForObject<MerchantAbortPayRefundFailureStatus>()
      .property("exchange_code", codecForNumber())
      .property("exchange_reply", codecForAny())
      .property("exchange_status", codecForNumber())
      .property("type", codecForConstString("failure"))
      .build("MerchantAbortPayRefundFailureStatus");

export const codecForMerchantAbortPayRefundStatus =
  (): Codec<MerchantAbortPayRefundStatus> =>
    buildCodecForUnion<MerchantAbortPayRefundStatus>()
      .discriminateOn("type")
      .alternative("success", codecForMerchantAbortPayRefundSuccessStatus())
      .alternative("failure", codecForMerchantAbortPayRefundFailureStatus())
      .build("MerchantAbortPayRefundStatus");

export const codecForAbortResponse = (): Codec<AbortResponse> =>
  buildCodecForObject<AbortResponse>()
    .property("refunds", codecForList(codecForMerchantAbortPayRefundStatus()))
    .build("AbortResponse");

export type MerchantAbortPayRefundStatus =
  | MerchantAbortPayRefundSuccessStatus
  | MerchantAbortPayRefundFailureStatus;

// Details about why a refund failed.
export interface MerchantAbortPayRefundFailureStatus {
  // Used as tag for the sum type RefundStatus sum type.
  type: "failure";

  // HTTP status of the exchange request, must NOT be 200.
  exchange_status: number;

  // Taler error code from the exchange reply, if available.
  exchange_code?: number;

  // If available, HTTP reply from the exchange.
  exchange_reply?: unknown;
}

// Additional details needed to verify the refund confirmation signature
// (h_contract_terms and merchant_pub) are already known
// to the wallet and thus not included.
export interface MerchantAbortPayRefundSuccessStatus {
  // Used as tag for the sum type MerchantCoinRefundStatus sum type.
  type: "success";

  // HTTP status of the exchange request, 200 (integer) required for refund confirmations.
  exchange_status: 200;

  // the EdDSA :ref:signature (binary-only) with purpose
  // TALER_SIGNATURE_EXCHANGE_CONFIRM_REFUND using a current signing key of the
  // exchange affirming the successful refund
  exchange_sig: string;

  // public EdDSA key of the exchange that was used to generate the signature.
  // Should match one of the exchange's signing keys from /keys.  It is given
  // explicitly as the client might otherwise be confused by clock skew as to
  // which signing key was used.
  exchange_pub: string;
}

export interface TalerConfigResponse {
  name: string;
  version: string;
  currency?: string;
}

export const codecForTalerConfigResponse = (): Codec<TalerConfigResponse> =>
  buildCodecForObject<TalerConfigResponse>()
    .property("name", codecForString())
    .property("version", codecForString())
    .property("currency", codecOptional(codecForString()))
    .build("TalerConfigResponse");

export interface FutureKeysResponse {
  future_denoms: any[];

  future_signkeys: any[];

  master_pub: string;

  denom_secmod_public_key: string;

  // Public key of the signkey security module.
  signkey_secmod_public_key: string;
}

export const codecForKeysManagementResponse = (): Codec<FutureKeysResponse> =>
  buildCodecForObject<FutureKeysResponse>()
    .property("master_pub", codecForString())
    .property("future_signkeys", codecForList(codecForAny()))
    .property("future_denoms", codecForList(codecForAny()))
    .property("denom_secmod_public_key", codecForAny())
    .property("signkey_secmod_public_key", codecForAny())
    .build("FutureKeysResponse");

export interface MerchantConfigResponse {
  currency: string;
  name: string;
  version: string;
}

export const codecForMerchantConfigResponse =
  (): Codec<MerchantConfigResponse> =>
    buildCodecForObject<MerchantConfigResponse>()
      .property("currency", codecForString())
      .property("name", codecForString())
      .property("version", codecForString())
      .build("MerchantConfigResponse");

export enum ExchangeProtocolVersion {
  /**
   * Current version supported by the wallet.
   */
  V12 = 12,
}

export enum MerchantProtocolVersion {
  /**
   * Current version supported by the wallet.
   */
  V3 = 3,
}

export type CoinEnvelope = CoinEnvelopeRsa | CoinEnvelopeCs;

export interface CoinEnvelopeRsa {
  cipher: DenomKeyType.Rsa;
  rsa_blinded_planchet: string;
}

export interface CoinEnvelopeCs {
  cipher: DenomKeyType.ClauseSchnorr;
  // FIXME: add remaining fields
}

export type HashCodeString = string;

export interface ExchangeWithdrawRequest {
  denom_pub_hash: HashCodeString;
  reserve_sig: EddsaSignatureString;
  coin_ev: CoinEnvelope;
}

export interface ExchangeRefreshRevealRequest {
  new_denoms_h: HashCodeString[];
  coin_evs: CoinEnvelope[];
  /**
   * kappa - 1 transfer private keys (ephemeral ECDHE keys).
   */
  transfer_privs: string[];

  transfer_pub: EddsaPublicKeyString;

  link_sigs: EddsaSignatureString[];

  /**
   * Iff the corresponding denomination has support for age restriction,
   * the client MUST provide the original age commitment, i.e. the vector
   * of public keys.
   */
  old_age_commitment?: Edx25519PublicKeyEnc[];
}

export interface DepositSuccess {
  // Optional base URL of the exchange for looking up wire transfers
  // associated with this transaction.  If not given,
  // the base URL is the same as the one used for this request.
  // Can be used if the base URL for /transactions/ differs from that
  // for /coins/, i.e. for load balancing.  Clients SHOULD
  // respect the transaction_base_url if provided.  Any HTTP server
  // belonging to an exchange MUST generate a 307 or 308 redirection
  // to the correct base URL should a client uses the wrong base
  // URL, or if the base URL has changed since the deposit.
  transaction_base_url?: string;

  // timestamp when the deposit was received by the exchange.
  exchange_timestamp: TalerProtocolTimestamp;

  // the EdDSA signature of TALER_DepositConfirmationPS using a current
  // signing key of the exchange affirming the successful
  // deposit and that the exchange will transfer the funds after the refund
  // deadline, or as soon as possible if the refund deadline is zero.
  exchange_sig: string;

  // public EdDSA key of the exchange that was used to
  // generate the signature.
  // Should match one of the exchange's signing keys from /keys.  It is given
  // explicitly as the client might otherwise be confused by clock skew as to
  // which signing key was used.
  exchange_pub: string;
}

export const codecForDepositSuccess = (): Codec<DepositSuccess> =>
  buildCodecForObject<DepositSuccess>()
    .property("exchange_pub", codecForString())
    .property("exchange_sig", codecForString())
    .property("exchange_timestamp", codecForTimestamp)
    .property("transaction_base_url", codecOptional(codecForString()))
    .build("DepositSuccess");

export interface PurseDeposit {
  /**
   * Amount to be deposited, can be a fraction of the
   * coin's total value.
   */
  amount: AmountString;

  /**
   * Hash of denomination RSA key with which the coin is signed.
   */
  denom_pub_hash: HashCodeString;

  /**
   * Exchange's unblinded RSA signature of the coin.
   */
  ub_sig: UnblindedSignature;

  /**
   * Age commitment for the coin, if the denomination is age-restricted.
   */
  age_commitment?: string[];

  /**
   * Attestation for the minimum age, if the denomination is age-restricted.
   */
  attest?: string;

  /**
   * Signature over TALER_PurseDepositSignaturePS
   * of purpose TALER_SIGNATURE_WALLET_PURSE_DEPOSIT
   * made by the customer with the
   * coin's private key.
   */
  coin_sig: EddsaSignatureString;

  /**
   * Public key of the coin being deposited into the purse.
   */
  coin_pub: EddsaPublicKeyString;
}

export interface ExchangePurseMergeRequest {
  // payto://-URI of the account the purse is to be merged into.
  // Must be of the form: 'payto://taler/$EXCHANGE_URL/$RESERVE_PUB'.
  payto_uri: string;

  // EdDSA signature of the account/reserve affirming the merge
  // over a TALER_AccountMergeSignaturePS.
  // Must be of purpose TALER_SIGNATURE_ACCOUNT_MERGE
  reserve_sig: EddsaSignatureString;

  // EdDSA signature of the purse private key affirming the merge
  // over a TALER_PurseMergeSignaturePS.
  // Must be of purpose TALER_SIGNATURE_PURSE_MERGE.
  merge_sig: EddsaSignatureString;

  // Client-side timestamp of when the merge request was made.
  merge_timestamp: TalerProtocolTimestamp;
}

export interface ExchangeGetContractResponse {
  purse_pub: string;
  econtract_sig: string;
  econtract: string;
}

export const codecForExchangeGetContractResponse =
  (): Codec<ExchangeGetContractResponse> =>
    buildCodecForObject<ExchangeGetContractResponse>()
      .property("purse_pub", codecForString())
      .property("econtract_sig", codecForString())
      .property("econtract", codecForString())
      .build("ExchangeGetContractResponse");

/**
 * Contract terms between two wallets (as opposed to a merchant and wallet).
 */
export interface PeerContractTerms {
  amount: AmountString;
  summary: string;
  purse_expiration: TalerProtocolTimestamp;
}

export interface EncryptedContract {
  // Encrypted contract.
  econtract: string;

  // Signature over the (encrypted) contract.
  econtract_sig: string;

  // Ephemeral public key for the DH operation to decrypt the encrypted contract.
  contract_pub: string;
}

/**
 * Payload for /reserves/{reserve_pub}/purse
 * endpoint of the exchange.
 */
export interface ExchangeReservePurseRequest {
  /**
   * Minimum amount that must be credited to the reserve, that is
   * the total value of the purse minus the deposit fees.
   * If the deposit fees are lower, the contribution to the
   * reserve can be higher!
   */
  purse_value: AmountString;

  // Minimum age required for all coins deposited into the purse.
  min_age: number;

  // Purse fee the reserve owner is willing to pay
  // for the purse creation. Optional, if not present
  // the purse is to be created from the purse quota
  // of the reserve.
  purse_fee: AmountString;

  // Optional encrypted contract, in case the buyer is
  // proposing the contract and thus establishing the
  // purse with the payment.
  econtract?: EncryptedContract;

  // EdDSA public key used to approve merges of this purse.
  merge_pub: EddsaPublicKeyString;

  // EdDSA signature of the purse private key affirming the merge
  // over a TALER_PurseMergeSignaturePS.
  // Must be of purpose TALER_SIGNATURE_PURSE_MERGE.
  merge_sig: EddsaSignatureString;

  // EdDSA signature of the account/reserve affirming the merge.
  // Must be of purpose TALER_SIGNATURE_WALLET_ACCOUNT_MERGE
  reserve_sig: EddsaSignatureString;

  // Purse public key.
  purse_pub: EddsaPublicKeyString;

  // EdDSA signature of the purse over
  // TALER_PurseRequestSignaturePS of
  // purpose TALER_SIGNATURE_PURSE_REQUEST
  // confirming that the
  // above details hold for this purse.
  purse_sig: EddsaSignatureString;

  // SHA-512 hash of the contact of the purse.
  h_contract_terms: HashCodeString;

  // Client-side timestamp of when the merge request was made.
  merge_timestamp: TalerProtocolTimestamp;

  // Indicative time by which the purse should expire
  // if it has not been paid.
  purse_expiration: TalerProtocolTimestamp;
}

export interface ExchangePurseDeposits {
  // Array of coins to deposit into the purse.
  deposits: PurseDeposit[];
}
