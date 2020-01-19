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
  typecheckedCodec,
  makeCodecForObject,
  codecForString,
  makeCodecForList,
  makeCodecOptional,
  codecForAny,
  codecForNumber,
  codecForBoolean,
  makeCodecForMap,
} from "../util/codec";
import { Timestamp, codecForTimestamp, Duration, codecForDuration } from "../util/time";

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
export interface PaybackRequest {
  /**
   * Denomination public key of the coin we want to get
   * paid back.
   */
  denom_pub: string;

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
}

/**
 * Response that we get from the exchange for a payback request.
 */
export class RecoupConfirmation {
  /**
   * public key of the reserve that will receive the payback.
   */
  reserve_pub: string;

  /**
   * How much will the exchange pay back (needed by wallet in
   * case coin was partially spent and wallet got restored from backup)
   */
  amount: string;

  /**
   * Time by which the exchange received the /payback request.
   */
  timestamp: Timestamp;

  /**
   * the EdDSA signature of TALER_PaybackConfirmationPS using a current
   * signing key of the exchange affirming the successful
   * payback request, and that the exchange promises to transfer the funds
   * by the date specified (this allows the exchange delaying the transfer
   * a bit to aggregate additional payback requests into a larger one).
   */
  exchange_sig: string;

  /**
   * Public EdDSA key of the exchange that was used to generate the signature.
   * Should match one of the exchange's signing keys from /keys.  It is given
   * explicitly as the client might otherwise be confused by clock skew as to
   * which signing key was used.
   */
  exchange_pub: string;
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
  merchant: any;

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
  products?: any[];

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
export class MerchantRefundPermission {
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
   * Signature made by the merchant over the refund permission.
   */
  merchant_sig: string;
}

/**
 * Refund request sent to the exchange.
 */
export interface RefundRequest {
  /**
   * Amount to be refunded, can be a fraction of the
   * coin's total deposit value (including deposit fee);
   * must be larger than the refund fee.
   */
  refund_amount: string;

  /**
   * Refund fee associated with the given coin.
   * must be smaller than the refund amount.
   */
  refund_fee: string;

  /**
   * SHA-512 hash of the contact of the merchant with the customer.
   */
  h_contract_terms: string;

  /**
   * coin's public key, both ECDHE and EdDSA.
   */
  coin_pub: string;

  /**
   * 64-bit transaction id of the refund transaction between merchant and customer
   */
  rtransaction_id: number;

  /**
   * EdDSA public key of the merchant.
   */
  merchant_pub: string;

  /**
   * EdDSA signature of the merchant affirming the refund.
   */
  merchant_sig: string;
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
  refund_permissions: MerchantRefundPermission[];
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
export class Payback {
  /**
   * The hash of the denomination public key for which the payback is offered.
   */
  h_denom_pub: string;
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
   * List of paybacks for compromised denominations.
   */
  payback?: Payback[];

  /**
   * Short-lived signing keys used to sign online
   * responses.
   */
  signkeys: any;

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

export type AmountString = string;
export type Base32String = string;
export type EddsaSignatureString = string;
export type EddsaPublicKeyString = string;
export type CoinPublicKeyString = string;

export const codecForDenomination = () =>
  typecheckedCodec<Denomination>(
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
      .build("Denomination"),
  );

export const codecForAuditorDenomSig = () =>
  typecheckedCodec<AuditorDenomSig>(
    makeCodecForObject<AuditorDenomSig>()
      .property("denom_pub_h", codecForString)
      .property("auditor_sig", codecForString)
      .build("AuditorDenomSig"),
  );

export const codecForAuditor = () =>
  typecheckedCodec<Auditor>(
    makeCodecForObject<Auditor>()
      .property("auditor_pub", codecForString)
      .property("auditor_url", codecForString)
      .property("denomination_keys", makeCodecForList(codecForAuditorDenomSig()))
      .build("Auditor"),
  );

export const codecForExchangeHandle = () =>
  typecheckedCodec<ExchangeHandle>(
    makeCodecForObject<ExchangeHandle>()
      .property("master_pub", codecForString)
      .property("url", codecForString)
      .build("ExchangeHandle"),
  );

export const codecForAuditorHandle = () =>
  typecheckedCodec<AuditorHandle>(
    makeCodecForObject<AuditorHandle>()
    .property("name", codecForString)
      .property("master_pub", codecForString)
      .property("url", codecForString)
      .build("AuditorHandle"),
  );

export const codecForContractTerms = () =>
  typecheckedCodec<ContractTerms>(
    makeCodecForObject<ContractTerms>()
      .property("order_id", codecForString)
      .property("fulfillment_url", codecForString)
      .property("merchant_base_url", codecForString)
      .property("h_wire", codecForString)
      .property("auto_refund", makeCodecOptional(codecForDuration))
      .property("wire_method", codecForString)
      .property("summary", codecForString)
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
      .property("merchant", codecForAny)
      .property("merchant_pub", codecForString)
      .property("exchanges", makeCodecForList(codecForExchangeHandle()))
      .property("products", makeCodecOptional(makeCodecForList(codecForAny)))
      .property("extra", codecForAny)
      .build("ContractTerms"),
  );

export const codecForMerchantRefundPermission = () =>
  typecheckedCodec<MerchantRefundPermission>(
    makeCodecForObject<MerchantRefundPermission>()
      .property("refund_amount", codecForString)
      .property("refund_fee", codecForString)
      .property("coin_pub", codecForString)
      .property("rtransaction_id", codecForNumber)
      .property("merchant_sig", codecForString)
      .build("MerchantRefundPermission"),
  );

export const codecForMerchantRefundResponse = () =>
  typecheckedCodec<MerchantRefundResponse>(
    makeCodecForObject<MerchantRefundResponse>()
      .property("merchant_pub", codecForString)
      .property("h_contract_terms", codecForString)
      .property(
        "refund_permissions",
        makeCodecForList(codecForMerchantRefundPermission()),
      )
      .build("MerchantRefundResponse"),
  );

export const codecForReserveSigSingleton = () =>
  typecheckedCodec<ReserveSigSingleton>(
    makeCodecForObject<ReserveSigSingleton>()
      .property("reserve_sig", codecForString)
      .build("ReserveSigSingleton"),
  );

export const codecForTipResponse = () =>
  typecheckedCodec<TipResponse>(
    makeCodecForObject<TipResponse>()
      .property("reserve_pub", codecForString)
      .property("reserve_sigs", makeCodecForList(codecForReserveSigSingleton()))
      .build("TipResponse"),
  );

export const codecForPayback = () =>
  typecheckedCodec<Payback>(
    makeCodecForObject<Payback>()
      .property("h_denom_pub", codecForString)
      .build("Payback"),
  );

export const codecForExchangeKeysJson = () =>
  typecheckedCodec<ExchangeKeysJson>(
    makeCodecForObject<ExchangeKeysJson>()
      .property("denoms", makeCodecForList(codecForDenomination()))
      .property("master_public_key", codecForString)
      .property("auditors", makeCodecForList(codecForAuditor()))
      .property("list_issue_date", codecForTimestamp)
      .property("payback", makeCodecOptional(makeCodecForList(codecForPayback())))
      .property("signkeys", codecForAny)
      .property("version", codecForString)
      .build("KeysJson"),
  );


export const codecForWireFeesJson = () =>
  typecheckedCodec<WireFeesJson>(
    makeCodecForObject<WireFeesJson>()
      .property("wire_fee", codecForString)
      .property("closing_fee", codecForString)
      .property("sig", codecForString)
      .property("start_date", codecForTimestamp)
      .property("end_date", codecForTimestamp)
      .build("WireFeesJson"),
  );

export const codecForAccountInfo = () =>
  typecheckedCodec<AccountInfo>(
    makeCodecForObject<AccountInfo>()
      .property("payto_uri", codecForString)
      .property("master_sig", codecForString)
      .build("AccountInfo"),
  );

export const codecForExchangeWireJson = () =>
  typecheckedCodec<ExchangeWireJson>(
    makeCodecForObject<ExchangeWireJson>()
      .property("accounts", makeCodecForList(codecForAccountInfo()))
      .property("fees", makeCodecForMap(makeCodecForList(codecForWireFeesJson())))
      .build("ExchangeWireJson"),
  );

export const codecForProposal = () =>
  typecheckedCodec<Proposal>(
    makeCodecForObject<Proposal>()
      .property("contract_terms", codecForAny)
      .property("sig", codecForString)
      .build("Proposal"),
  );

export const codecForCheckPaymentResponse = () =>
  typecheckedCodec<CheckPaymentResponse>(
    makeCodecForObject<CheckPaymentResponse>()
      .property("paid", codecForBoolean)
      .property("refunded", makeCodecOptional(codecForBoolean))
      .property("refunded_amount", makeCodecOptional(codecForString))
      .property("contract_terms", makeCodecOptional(codecForAny))
      .property("taler_pay_uri", makeCodecOptional(codecForString))
      .property("contract_url", makeCodecOptional(codecForString))
      .build("CheckPaymentResponse"),
  );


export const codecForWithdrawOperationStatusResponse = () =>
  typecheckedCodec<WithdrawOperationStatusResponse>(
    makeCodecForObject<WithdrawOperationStatusResponse>()
      .property("selection_done", codecForBoolean)
      .property("transfer_done", codecForBoolean)
      .property("amount",codecForString)
      .property("sender_wire", makeCodecOptional(codecForString))
      .property("suggested_exchange", makeCodecOptional(codecForString))
      .property("confirm_transfer_url", makeCodecOptional(codecForString))
      .property("wire_types", makeCodecForList(codecForString))
      .build("WithdrawOperationStatusResponse"),
  );

export const codecForTipPickupGetResponse = () =>
  typecheckedCodec<TipPickupGetResponse>(
    makeCodecForObject<TipPickupGetResponse>()
      .property("extra", codecForAny)
      .property("amount", codecForString)
      .property("amount_left", codecForString)
      .property("exchange_url", codecForString)
      .property("stamp_expire", codecForTimestamp)
      .property("stamp_created", codecForTimestamp)
      .build("TipPickupGetResponse"),
  );


export const codecForRecoupConfirmation = () =>
  typecheckedCodec<RecoupConfirmation>(
    makeCodecForObject<RecoupConfirmation>()
      .property("reserve_pub", codecForString)
      .property("amount", codecForString)
      .property("timestamp", codecForTimestamp)
      .property("exchange_sig", codecForString)
      .property("exchange_pub", codecForString)
      .build("RecoupConfirmation"),
  );
