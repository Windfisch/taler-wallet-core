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
 * Type and schema definitions for the base taler protocol.
 *
 * All types here should be "@Checkable".
 *
 * Even though the rest of the wallet uses camelCase for fields, use snake_case
 * here, since that's the convention for the Taler JSON+HTTP API.
 */

/**
 * Imports.
 */
import { AmountJson } from "./amounts";
import { Checkable } from "./checkable";


/**
 * Denomination as found in the /keys response from the exchange.
 */
@Checkable.Class()
export class Denomination {
  /**
   * Value of one coin of the denomination.
   */
  @Checkable.Value(() => AmountJson)
  value: AmountJson;

  /**
   * Public signing key of the denomination.
   */
  @Checkable.String
  denom_pub: string;

  /**
   * Fee for withdrawing.
   */
  @Checkable.Value(() => AmountJson)
  fee_withdraw: AmountJson;

  /**
   * Fee for depositing.
   */
  @Checkable.Value(() => AmountJson)
  fee_deposit: AmountJson;

  /**
   * Fee for refreshing.
   */
  @Checkable.Value(() => AmountJson)
  fee_refresh: AmountJson;

  /**
   * Fee for refunding.
   */
  @Checkable.Value(() => AmountJson)
  fee_refund: AmountJson;

  /**
   * Start date from which withdraw is allowed.
   */
  @Checkable.String
  stamp_start: string;

  /**
   * End date for withdrawing.
   */
  @Checkable.String
  stamp_expire_withdraw: string;

  /**
   * Expiration date after which the exchange can forget about
   * the currency.
   */
  @Checkable.String
  stamp_expire_legal: string;

  /**
   * Date after which the coins of this denomination can't be
   * deposited anymore.
   */
  @Checkable.String
  stamp_expire_deposit: string;

  /**
   * Signature over the denomination information by the exchange's master
   * signing key.
   */
  @Checkable.String
  master_sig: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => Denomination;
}


/**
 * Signature by the auditor that a particular denomination key is audited.
 */
@Checkable.Class()
export class AuditorDenomSig {
  /**
   * Denomination public key's hash.
   */
  @Checkable.String
  denom_pub_h: string;

  /**
   * The signature.
   */
  @Checkable.String
  auditor_sig: string;
}


/**
 * Auditor information as given by the exchange in /keys.
 */
@Checkable.Class()
export class Auditor {
  /**
   * Auditor's public key.
   */
  @Checkable.String
  auditor_pub: string;

  /**
   * Base URL of the auditor.
   */
  @Checkable.String
  auditor_url: string;

  /**
   * List of signatures for denominations by the auditor.
   */
  @Checkable.List(Checkable.Value(() => AuditorDenomSig))
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
@Checkable.Class()
export class PaybackConfirmation {
  /**
   * public key of the reserve that will receive the payback.
   */
  @Checkable.String
  reserve_pub: string;

  /**
   * How much will the exchange pay back (needed by wallet in
   * case coin was partially spent and wallet got restored from backup)
   */
  @Checkable.Value(() => AmountJson)
  amount: AmountJson;

  /**
   * Time by which the exchange received the /payback request.
   */
  @Checkable.String
  timestamp: string;

  /**
   * the EdDSA signature of TALER_PaybackConfirmationPS using a current
   * signing key of the exchange affirming the successful
   * payback request, and that the exchange promises to transfer the funds
   * by the date specified (this allows the exchange delaying the transfer
   * a bit to aggregate additional payback requests into a larger one).
   */
  @Checkable.String
  exchange_sig: string;

  /**
   * Public EdDSA key of the exchange that was used to generate the signature.
   * Should match one of the exchange's signing keys from /keys.  It is given
   * explicitly as the client might otherwise be confused by clock skew as to
   * which signing key was used.
   */
  @Checkable.String
  exchange_pub: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => PaybackConfirmation;
}


/**
 * Deposit permission for a single coin.
 */
export interface CoinPaySig {
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
  contribution: AmountJson;

  /**
   * URL of the exchange this coin was withdrawn from.
   */
  exchange_url: string;
}


/**
 * Information about an exchange as stored inside a
 * merchant's contract terms.
 */
@Checkable.Class()
export class ExchangeHandle {
  /**
   * Master public signing key of the exchange.
   */
  @Checkable.String
  master_pub: string;

  /**
   * Base URL of the exchange.
   */
  @Checkable.String
  url: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ExchangeHandle;
}


/**
 * Contract terms from a merchant.
 */
@Checkable.Class({validate: true})
export class ContractTerms {
  static validate(x: ContractTerms) {
    if (x.exchanges.length === 0) {
      throw Error("no exchanges in contract terms");
    }
  }

  /**
   * Hash of the merchant's wire details.
   */
  @Checkable.String
  H_wire: string;

  /**
   * Wire method the merchant wants to use.
   */
  @Checkable.String
  wire_method: string;

  /**
   * Human-readable short summary of the contract.
   */
  @Checkable.Optional(Checkable.String)
  summary?: string;

  /**
   * Nonce used to ensure freshness.
   */
  @Checkable.Optional(Checkable.String)
  nonce?: string;

  /**
   * Total amount payable.
   */
  @Checkable.Value(() => AmountJson)
  amount: AmountJson;

  /**
   * Auditors accepted by the merchant.
   */
  @Checkable.List(Checkable.AnyObject)
  auditors: any[];

  /**
   * Deadline to pay for the contract.
   */
  @Checkable.Optional(Checkable.String)
  pay_deadline: string;

  /**
   * Delivery locations.
   */
  @Checkable.Any
  locations: any;

  /**
   * Maximum deposit fee covered by the merchant.
   */
  @Checkable.Value(() => AmountJson)
  max_fee: AmountJson;

  /**
   * Information about the merchant.
   */
  @Checkable.Any
  merchant: any;

  /**
   * Public key of the merchant.
   */
  @Checkable.String
  merchant_pub: string;

  /**
   * List of accepted exchanges.
   */
  @Checkable.List(Checkable.Value(() => ExchangeHandle))
  exchanges: ExchangeHandle[];

  /**
   * Products that are sold in this contract.
   */
  @Checkable.List(Checkable.AnyObject)
  products: any[];

  /**
   * Deadline for refunds.
   */
  @Checkable.String
  refund_deadline: string;

  /**
   * Time when the contract was generated by the merchant.
   */
  @Checkable.String
  timestamp: string;

  /**
   * Order id to uniquely identify the purchase within
   * one merchant instance.
   */
  @Checkable.String
  order_id: string;

  /**
   * URL to post the payment to.
   */
  @Checkable.String
  pay_url: string;

  /**
   * Fulfillment URL to view the product or
   * delivery status.
   */
  @Checkable.String
  fulfillment_url: string;

  /**
   * Share of the wire fee that must be settled with one payment.
   */
  @Checkable.Optional(Checkable.Number)
  wire_fee_amortization?: number;

  /**
   * Maximum wire fee that the merchant agrees to pay for.
   */
  @Checkable.Optional(Checkable.Value(() => AmountJson))
  max_wire_fee?: AmountJson;

  /**
   * Extra data, interpreted by the mechant only.
   */
  @Checkable.Any
  extra: any;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ContractTerms;
}


/**
 * Payment body sent to the merchant's /pay.
 */
export interface PayReq {
  /**
   * Coins with signature.
   */
  coins: CoinPaySig[];

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
   * Mode for /pay (pay or refund)
   */
  mode: string;
}


/**
 * Refund permission in the format that the merchant gives it to us.
 */
@Checkable.Class()
export class MerchantRefundPermission {
  /**
   * Amount to be refunded.
   */
  @Checkable.Value(() => AmountJson)
  refund_amount: AmountJson;

  /**
   * Fee for the refund.
   */
  @Checkable.Value(() => AmountJson)
  refund_fee: AmountJson;

  /**
   * Public key of the coin being refunded.
   */
  @Checkable.String
  coin_pub: string;

  /**
   * Refund transaction ID between merchant and exchange.
   */
  @Checkable.Number
  rtransaction_id: number;

  /**
   * Signature made by the merchant over the refund permission.
   */
  @Checkable.String
  merchant_sig: string;

  /**
   * Create a MerchantRefundPermission from untyped JSON.
   */
  static checked: (obj: any) => MerchantRefundPermission;
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
  refund_amount: AmountJson;

  /**
   * Refund fee associated with the given coin.
   * must be smaller than the refund amount.
   */
  refund_fee: AmountJson;

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
@Checkable.Class()
export class MerchantRefundResponse {
  /**
   * Public key of the merchant
   */
  @Checkable.String
  merchant_pub: string;

  /**
   * Contract terms hash of the contract that
   * is being refunded.
   */
  @Checkable.String
  h_contract_terms: string;

  /**
   * The signed refund permissions, to be sent to the exchange.
   */
  @Checkable.List(Checkable.Value(() => MerchantRefundPermission))
  refund_permissions: MerchantRefundPermission[];

  /**
   * Create a MerchantRefundReponse from untyped JSON.
   */
  static checked: (obj: any) => MerchantRefundResponse;
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
@Checkable.Class()
export class ReserveSigSingleton {
  /**
   * Reserve signature.
   */
  @Checkable.String
  reserve_sig: string;

  /**
   * Create a ReserveSigSingleton from untyped JSON.
   */
  static checked: (obj: any) => ReserveSigSingleton;
}

/**
 * Response of the merchant
 * to the TipPickupRequest.
 */
@Checkable.Class()
export class TipResponse {
  /**
   * Public key of the reserve
   */
  @Checkable.String
  reserve_pub: string;

  /**
   * The order of the signatures matches the planchets list.
   */
  @Checkable.List(Checkable.Value(() => ReserveSigSingleton))
  reserve_sigs: ReserveSigSingleton[];

  /**
   * Create a TipResponse from untyped JSON.
   */
  static checked: (obj: any) => TipResponse;
}

/**
 * Token containing all the information for the wallet
 * to process a tip.  Given by the merchant to the wallet.
 */
@Checkable.Class()
export class TipToken {
  /**
   * Expiration for the tip.
   */
  @Checkable.String
  expiration: string;

  /**
   * URL of the exchange that the tip can be withdrawn from.
   */
  @Checkable.String
  exchange_url: string;

  /**
   * Merchant's URL to pick up the tip.
   */
  @Checkable.String
  pickup_url: string;

  /**
   * Merchant-chosen tip identifier.
   */
  @Checkable.String
  tip_id: string;

  /**
   * Amount of tip.
   */
  @Checkable.Value(() => AmountJson)
  amount: AmountJson;

  /**
   * URL to navigate after finishing tip processing.
   */
  @Checkable.String
  next_url: string;

  /**
   * Create a TipToken from untyped JSON.
   * Validates the schema and throws on error.
   */
  static checked: (obj: any) => TipToken;
}


/**
 * Element of the payback list that the
 * exchange gives us in /keys.
 */
@Checkable.Class()
export class Payback {
  /**
   * The hash of the denomination public key for which the payback is offered.
   */
  @Checkable.String
  h_denom_pub: string;
}


/**
 * Structure that the exchange gives us in /keys.
 */
@Checkable.Class({extra: true})
export class KeysJson {
  /**
   * List of offered denominations.
   */
  @Checkable.List(Checkable.Value(() => Denomination))
  denoms: Denomination[];

  /**
   * The exchange's master public key.
   */
  @Checkable.String
  master_public_key: string;

  /**
   * The list of auditors (partially) auditing the exchange.
   */
  @Checkable.List(Checkable.Value(() => Auditor))
  auditors: Auditor[];

  /**
   * Timestamp when this response was issued.
   */
  @Checkable.String
  list_issue_date: string;

  /**
   * List of paybacks for compromised denominations.
   */
  @Checkable.Optional(Checkable.List(Checkable.Value(() => Payback)))
  payback?: Payback[];

  /**
   * Short-lived signing keys used to sign online
   * responses.
   */
  @Checkable.Any
  signkeys: any;

  /**
   * Protocol version.
   */
  @Checkable.Optional(Checkable.String)
  version?: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => KeysJson;
}


/**
 * Wire fees as anounced by the exchange.
 */
@Checkable.Class()
export class WireFeesJson {
  /**
   * Cost of a wire transfer.
   */
  @Checkable.Value(() => AmountJson)
  wire_fee: AmountJson;

  /**
   * Cost of clising a reserve.
   */
  @Checkable.Value(() => AmountJson)
  closing_fee: AmountJson;

  /**
   * Signature made with the exchange's master key.
   */
  @Checkable.String
  sig: string;

  /**
   * Date from which the fee applies.
   */
  @Checkable.String
  start_date: string;

  /**
   * Data after which the fee doesn't apply anymore.
   */
  @Checkable.String
  end_date: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => WireFeesJson;
}


/**
 * Information about wire transfer methods supported
 * by the exchange.
 */
@Checkable.Class({extra: true})
export class WireDetailJson {
  /**
   * Name of the wire transfer method.
   */
  @Checkable.String
  type: string;

  /**
   * Fees associated with the wire transfer method.
   */
  @Checkable.List(Checkable.Value(() => WireFeesJson))
  fees: WireFeesJson[];

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => WireDetailJson;
}


/**
 * Wire detail, arbitrary object that must at least
 * contain a "type" key.
 */
export type WireDetail = object & { type: string };

/**
 * Type guard for wire details.
 */
export function isWireDetail(x: any): x is WireDetail {
  return x && typeof x === "object" && typeof x.type === "string";
}

/**
 * Proposal returned from the contract URL.
 */
@Checkable.Class({extra: true})
export class Proposal {
  @Checkable.Value(() => ContractTerms)
  contract_terms: ContractTerms;

  @Checkable.String
  sig: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => Proposal;
}
