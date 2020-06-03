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
 * All types here should be "@Checkable".
 *
 * Even though the rest of the wallet uses camelCase for fields, use snake_case
 * here, since that's the convention for the Taler JSON+HTTP API.
 */

/**
 * Imports.
 */

import {
  makeCodecForObject,
  codecForString,
  makeCodecForList,
  makeCodecOptional,
  codecForAny,
  codecForNumber,
  codecForBoolean,
  makeCodecForMap,
  Codec,
} from "../util/codec";
import {
  Timestamp,
  codecForTimestamp,
  Duration,
  codecForDuration,
} from "../util/time";

/**
 * Denomination as found in the /keys response from the exchange.
 */
export class Denomination {
  /**
   * Value of one coin of the denomination.
   */
  value: string;

  /**
   * Public signing key of the denomination.
   */
  denom_pub: string;

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
  stamp_start: Timestamp;

  /**
   * End date for withdrawing.
   */
  stamp_expire_withdraw: Timestamp;

  /**
   * Expiration date after which the exchange can forget about
   * the currency.
   */
  stamp_expire_legal: Timestamp;

  /**
   * Date after which the coins of this denomination can't be
   * deposited anymore.
   */
  stamp_expire_deposit: Timestamp;

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
export class Auditor {
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

/**
 * Request that we send to the exchange to get a payback.
 */
export interface RecoupRequest {
  /**
   * Hashed enomination public key of the coin we want to get
   * paid back.
   */
  denom_pub_hash: string;

  /**
   * Signature over the coin public key by the denomination.
   */
  denom_sig: string;

  /**
   * Coin public key of the coin we want to refund.
   */
  coin_pub: string;

  /**
   * Blinding key that was used during withdraw,
   * used to prove that we were actually withdrawing the coin.
   */
  coin_blind_key_secret: string;

  /**
   * Signature made by the coin, authorizing the payback.
   */
  coin_sig: string;

  /**
   * Was the coin refreshed (and thus the recoup should go to the old coin)?
   */
  refreshed: boolean;
}

/**
 * Response that we get from the exchange for a payback request.
 */
export class RecoupConfirmation {
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
   */
  ub_sig: string;
  /**
   * The denomination public key associated with this coin.
   */
  denom_pub: string;
  /**
   * The amount that is subtracted from this coin with this payment.
   */
  contribution: string;

  /**
   * URL of the exchange this coin was withdrawn from.
   */
  exchange_url: string;
}

/**
 * Information about an exchange as stored inside a
 * merchant's contract terms.
 */
export class ExchangeHandle {
  /**
   * Master public signing key of the exchange.
   */
  master_pub: string;

  /**
   * Base URL of the exchange.
   */
  url: string;
}

export class AuditorHandle {
  /**
   * Official name of the auditor.
   */
  name: string;

  /**
   * Master public signing key of the auditor.
   */
  master_pub: string;

  /**
   * Base URL of the auditor.
   */
  url: string;
}

export interface MerchantInfo {
  name: string;
  jurisdiction: string | undefined;
  address: string | undefined;
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
  delivery_date?: Timestamp;

  // where to deliver this product. This may be an URL for online delivery
  // (i.e. 'http://example.com/download' or 'mailto:customer@example.com'),
  // or a location label defined inside the proposition's 'locations'.
  // The presence of a colon (':') indicates the use of an URL.
  delivery_location?: string;
}

/**
 * Contract terms from a merchant.
 */
export class ContractTerms {
  /**
   * Hash of the merchant's wire details.
   */
  h_wire: string;

  /**
   * Hash of the merchant's wire details.
   */
  auto_refund?: Duration;

  /**
   * Wire method the merchant wants to use.
   */
  wire_method: string;

  /**
   * Human-readable short summary of the contract.
   */
  summary: string;

  summary_i18n?: { [lang_tag: string]: string };

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
  pay_deadline: Timestamp;

  /**
   * Delivery locations.
   */
  locations: any;

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
  refund_deadline: Timestamp;

  /**
   * Deadline for the wire transfer.
   */
  wire_transfer_deadline: Timestamp;

  /**
   * Time when the contract was generated by the merchant.
   */
  timestamp: Timestamp;

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
  fulfillment_url: string;

  /**
   * Share of the wire fee that must be settled with one payment.
   */
  wire_fee_amortization?: number;

  /**
   * Maximum wire fee that the merchant agrees to pay for.
   */
  max_wire_fee?: string;

  /**
   * Extra data, interpreted by the mechant only.
   */
  extra: any;
}

/**
 * Payment body sent to the merchant's /pay.
 */
export interface PayReq {
  /**
   * Coins with signature.
   */
  coins: CoinDepositPermission[];

  /**
   * The merchant public key, used to uniquely
   * identify the merchant instance.
   */
  merchant_pub: string;

  /**
   * Order ID that's being payed for.
   */
  order_id: string;

  /**
   * Mode for /pay.
   */
  mode: "pay" | "abort-refund";
}

/**
 * Refund permission in the format that the merchant gives it to us.
 */
export class MerchantRefundDetails {
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
export class MerchantRefundResponse {
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
  refunds: MerchantRefundDetails[];
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
  coin_ev: string;
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
 * schema validation with "@Checkable".
 */
export class ReserveSigSingleton {
  /**
   * Reserve signature.
   */
  reserve_sig: string;
}

/**
 * Response of the merchant
 * to the TipPickupRequest.
 */
export class TipResponse {
  /**
   * Public key of the reserve
   */
  reserve_pub: string;

  /**
   * The order of the signatures matches the planchets list.
   */
  reserve_sigs: ReserveSigSingleton[];
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
  stamp_start: Timestamp;
  stamp_expire: Timestamp;
  stamp_end: Timestamp;
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
  denoms: Denomination[];

  /**
   * The exchange's master public key.
   */
  master_public_key: string;

  /**
   * The list of auditors (partially) auditing the exchange.
   */
  auditors: Auditor[];

  /**
   * Timestamp when this response was issued.
   */
  list_issue_date: Timestamp;

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
}

/**
 * Wire fees as anounced by the exchange.
 */
export class WireFeesJson {
  /**
   * Cost of a wire transfer.
   */
  wire_fee: string;

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
  start_date: Timestamp;

  /**
   * Data after which the fee doesn't apply anymore.
   */
  end_date: Timestamp;
}

export class AccountInfo {
  payto_uri: string;
  master_sig: string;
}

export class ExchangeWireJson {
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
  paid: boolean;
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
  extra: any;

  amount: string;

  amount_left: string;

  exchange_url: string;

  stamp_expire: Timestamp;

  stamp_created: Timestamp;
}

export class WithdrawResponse {
  ev_sig: string;
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
    denom_pub: string;
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
     * Remaining value on the coin, to the knowledge of
     * the wallet.
     */
    remaining_value: string;
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
    /**
     * Is the coin suspended?
     * Suspended coins are not considered for payments.
     */
    coin_suspended: boolean;
  }>;
}

export type AmountString = string;
export type Base32String = string;
export type EddsaSignatureString = string;
export type EddsaPublicKeyString = string;
export type CoinPublicKeyString = string;

export const codecForDenomination = (): Codec<Denomination> =>
  makeCodecForObject<Denomination>()
    .property("value", codecForString)
    .property("denom_pub", codecForString)
    .property("fee_withdraw", codecForString)
    .property("fee_deposit", codecForString)
    .property("fee_refresh", codecForString)
    .property("fee_refund", codecForString)
    .property("stamp_start", codecForTimestamp)
    .property("stamp_expire_withdraw", codecForTimestamp)
    .property("stamp_expire_legal", codecForTimestamp)
    .property("stamp_expire_deposit", codecForTimestamp)
    .property("master_sig", codecForString)
    .build("Denomination");

export const codecForAuditorDenomSig = (): Codec<AuditorDenomSig> =>
  makeCodecForObject<AuditorDenomSig>()
    .property("denom_pub_h", codecForString)
    .property("auditor_sig", codecForString)
    .build("AuditorDenomSig");

export const codecForAuditor = (): Codec<Auditor> =>
  makeCodecForObject<Auditor>()
    .property("auditor_pub", codecForString)
    .property("auditor_url", codecForString)
    .property("denomination_keys", makeCodecForList(codecForAuditorDenomSig()))
    .build("Auditor");

export const codecForExchangeHandle = (): Codec<ExchangeHandle> =>
  makeCodecForObject<ExchangeHandle>()
    .property("master_pub", codecForString)
    .property("url", codecForString)
    .build("ExchangeHandle");

export const codecForAuditorHandle = (): Codec<AuditorHandle> =>
  makeCodecForObject<AuditorHandle>()
    .property("name", codecForString)
    .property("master_pub", codecForString)
    .property("url", codecForString)
    .build("AuditorHandle");

export const codecForMerchantInfo = (): Codec<MerchantInfo> =>
  makeCodecForObject<MerchantInfo>()
    .property("name", codecForString)
    .property("address", makeCodecOptional(codecForString))
    .property("jurisdiction", makeCodecOptional(codecForString))
    .build("MerchantInfo");

export const codecForTax = (): Codec<Tax> =>
  makeCodecForObject<Tax>()
    .property("name", codecForString)
    .property("tax", codecForString)
    .build("Tax");

export const codecForI18n = (): Codec<{ [lang_tag: string]: string }> =>
  makeCodecForMap(codecForString);

export const codecForProduct = (): Codec<Product> =>
  makeCodecForObject<Product>()
    .property("product_id", makeCodecOptional(codecForString))
    .property("description", codecForString)
    .property("description_i18n", makeCodecOptional(codecForI18n()))
    .property("quantity", makeCodecOptional(codecForNumber))
    .property("unit", makeCodecOptional(codecForString))
    .property("price", makeCodecOptional(codecForString))
    .property("delivery_date", makeCodecOptional(codecForTimestamp))
    .property("delivery_location", makeCodecOptional(codecForString))
    .build("Tax");

export const codecForContractTerms = (): Codec<ContractTerms> =>
  makeCodecForObject<ContractTerms>()
    .property("order_id", codecForString)
    .property("fulfillment_url", codecForString)
    .property("merchant_base_url", codecForString)
    .property("h_wire", codecForString)
    .property("auto_refund", makeCodecOptional(codecForDuration))
    .property("wire_method", codecForString)
    .property("summary", codecForString)
    .property("summary_i18n", makeCodecOptional(codecForI18n()))
    .property("nonce", codecForString)
    .property("amount", codecForString)
    .property("auditors", makeCodecForList(codecForAuditorHandle()))
    .property("pay_deadline", codecForTimestamp)
    .property("refund_deadline", codecForTimestamp)
    .property("wire_transfer_deadline", codecForTimestamp)
    .property("timestamp", codecForTimestamp)
    .property("locations", codecForAny)
    .property("max_fee", codecForString)
    .property("max_wire_fee", makeCodecOptional(codecForString))
    .property("merchant", codecForMerchantInfo())
    .property("merchant_pub", codecForString)
    .property("exchanges", makeCodecForList(codecForExchangeHandle()))
    .property(
      "products",
      makeCodecOptional(makeCodecForList(codecForProduct())),
    )
    .property("extra", codecForAny)
    .build("ContractTerms");

export const codecForMerchantRefundPermission = (): Codec<
  MerchantRefundDetails
> =>
  makeCodecForObject<MerchantRefundDetails>()
    .property("refund_amount", codecForString)
    .property("refund_fee", codecForString)
    .property("coin_pub", codecForString)
    .property("rtransaction_id", codecForNumber)
    .property("exchange_http_status", codecForNumber)
    .property("exchange_code", makeCodecOptional(codecForNumber))
    .property("exchange_reply", makeCodecOptional(codecForAny))
    .property("exchange_sig", makeCodecOptional(codecForString))
    .property("exchange_pub", makeCodecOptional(codecForString))
    .build("MerchantRefundPermission");

export const codecForMerchantRefundResponse = (): Codec<
  MerchantRefundResponse
> =>
  makeCodecForObject<MerchantRefundResponse>()
    .property("merchant_pub", codecForString)
    .property("h_contract_terms", codecForString)
    .property("refunds", makeCodecForList(codecForMerchantRefundPermission()))
    .build("MerchantRefundResponse");

export const codecForReserveSigSingleton = (): Codec<ReserveSigSingleton> =>
  makeCodecForObject<ReserveSigSingleton>()
    .property("reserve_sig", codecForString)
    .build("ReserveSigSingleton");

export const codecForTipResponse = (): Codec<TipResponse> =>
  makeCodecForObject<TipResponse>()
    .property("reserve_pub", codecForString)
    .property("reserve_sigs", makeCodecForList(codecForReserveSigSingleton()))
    .build("TipResponse");

export const codecForRecoup = (): Codec<Recoup> =>
  makeCodecForObject<Recoup>()
    .property("h_denom_pub", codecForString)
    .build("Recoup");

export const codecForExchangeSigningKey = (): Codec<ExchangeSignKeyJson> =>
  makeCodecForObject<ExchangeSignKeyJson>()
    .property("key", codecForString)
    .property("master_sig", codecForString)
    .property("stamp_end", codecForTimestamp)
    .property("stamp_start", codecForTimestamp)
    .property("stamp_expire", codecForTimestamp)
    .build("ExchangeSignKeyJson");

export const codecForExchangeKeysJson = (): Codec<ExchangeKeysJson> =>
  makeCodecForObject<ExchangeKeysJson>()
    .property("denoms", makeCodecForList(codecForDenomination()))
    .property("master_public_key", codecForString)
    .property("auditors", makeCodecForList(codecForAuditor()))
    .property("list_issue_date", codecForTimestamp)
    .property("recoup", makeCodecOptional(makeCodecForList(codecForRecoup())))
    .property("signkeys", makeCodecForList(codecForExchangeSigningKey()))
    .property("version", codecForString)
    .build("KeysJson");

export const codecForWireFeesJson = (): Codec<WireFeesJson> =>
  makeCodecForObject<WireFeesJson>()
    .property("wire_fee", codecForString)
    .property("closing_fee", codecForString)
    .property("sig", codecForString)
    .property("start_date", codecForTimestamp)
    .property("end_date", codecForTimestamp)
    .build("WireFeesJson");

export const codecForAccountInfo = (): Codec<AccountInfo> =>
  makeCodecForObject<AccountInfo>()
    .property("payto_uri", codecForString)
    .property("master_sig", codecForString)
    .build("AccountInfo");

export const codecForExchangeWireJson = (): Codec<ExchangeWireJson> =>
  makeCodecForObject<ExchangeWireJson>()
    .property("accounts", makeCodecForList(codecForAccountInfo()))
    .property("fees", makeCodecForMap(makeCodecForList(codecForWireFeesJson())))
    .build("ExchangeWireJson");

export const codecForProposal = (): Codec<Proposal> =>
  makeCodecForObject<Proposal>()
    .property("contract_terms", codecForAny)
    .property("sig", codecForString)
    .build("Proposal");

export const codecForCheckPaymentResponse = (): Codec<CheckPaymentResponse> =>
  makeCodecForObject<CheckPaymentResponse>()
    .property("paid", codecForBoolean)
    .property("refunded", makeCodecOptional(codecForBoolean))
    .property("refunded_amount", makeCodecOptional(codecForString))
    .property("contract_terms", makeCodecOptional(codecForAny))
    .property("taler_pay_uri", makeCodecOptional(codecForString))
    .property("contract_url", makeCodecOptional(codecForString))
    .build("CheckPaymentResponse");

export const codecForWithdrawOperationStatusResponse = (): Codec<
  WithdrawOperationStatusResponse
> =>
  makeCodecForObject<WithdrawOperationStatusResponse>()
    .property("selection_done", codecForBoolean)
    .property("transfer_done", codecForBoolean)
    .property("amount", codecForString)
    .property("sender_wire", makeCodecOptional(codecForString))
    .property("suggested_exchange", makeCodecOptional(codecForString))
    .property("confirm_transfer_url", makeCodecOptional(codecForString))
    .property("wire_types", makeCodecForList(codecForString))
    .build("WithdrawOperationStatusResponse");

export const codecForTipPickupGetResponse = (): Codec<TipPickupGetResponse> =>
  makeCodecForObject<TipPickupGetResponse>()
    .property("extra", codecForAny)
    .property("amount", codecForString)
    .property("amount_left", codecForString)
    .property("exchange_url", codecForString)
    .property("stamp_expire", codecForTimestamp)
    .property("stamp_created", codecForTimestamp)
    .build("TipPickupGetResponse");

export const codecForRecoupConfirmation = (): Codec<RecoupConfirmation> =>
  makeCodecForObject<RecoupConfirmation>()
    .property("reserve_pub", makeCodecOptional(codecForString))
    .property("old_coin_pub", makeCodecOptional(codecForString))
    .build("RecoupConfirmation");

export const codecForWithdrawResponse = (): Codec<WithdrawResponse> =>
  makeCodecForObject<WithdrawResponse>()
    .property("ev_sig", codecForString)
    .build("WithdrawResponse");
