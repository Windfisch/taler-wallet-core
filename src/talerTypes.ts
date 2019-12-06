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
import { Checkable } from "./util/checkable";

import * as Amounts from "./util/amounts";

import { timestampCheck } from "./util/helpers";

/**
 * Denomination as found in the /keys response from the exchange.
 */
@Checkable.Class()
export class Denomination {
  /**
   * Value of one coin of the denomination.
   */
  @Checkable.String(Amounts.check)
  value: string;

  /**
   * Public signing key of the denomination.
   */
  @Checkable.String()
  denom_pub: string;

  /**
   * Fee for withdrawing.
   */
  @Checkable.String(Amounts.check)
  fee_withdraw: string;

  /**
   * Fee for depositing.
   */
  @Checkable.String(Amounts.check)
  fee_deposit: string;

  /**
   * Fee for refreshing.
   */
  @Checkable.String(Amounts.check)
  fee_refresh: string;

  /**
   * Fee for refunding.
   */
  @Checkable.String(Amounts.check)
  fee_refund: string;

  /**
   * Start date from which withdraw is allowed.
   */
  @Checkable.String(timestampCheck)
  stamp_start: string;

  /**
   * End date for withdrawing.
   */
  @Checkable.String(timestampCheck)
  stamp_expire_withdraw: string;

  /**
   * Expiration date after which the exchange can forget about
   * the currency.
   */
  @Checkable.String(timestampCheck)
  stamp_expire_legal: string;

  /**
   * Date after which the coins of this denomination can't be
   * deposited anymore.
   */
  @Checkable.String(timestampCheck)
  stamp_expire_deposit: string;

  /**
   * Signature over the denomination information by the exchange's master
   * signing key.
   */
  @Checkable.String()
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
  @Checkable.String()
  denom_pub_h: string;

  /**
   * The signature.
   */
  @Checkable.String()
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
  @Checkable.String()
  auditor_pub: string;

  /**
   * Base URL of the auditor.
   */
  @Checkable.String()
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
  @Checkable.String()
  reserve_pub: string;

  /**
   * How much will the exchange pay back (needed by wallet in
   * case coin was partially spent and wallet got restored from backup)
   */
  @Checkable.String()
  amount: string;

  /**
   * Time by which the exchange received the /payback request.
   */
  @Checkable.String()
  timestamp: string;

  /**
   * the EdDSA signature of TALER_PaybackConfirmationPS using a current
   * signing key of the exchange affirming the successful
   * payback request, and that the exchange promises to transfer the funds
   * by the date specified (this allows the exchange delaying the transfer
   * a bit to aggregate additional payback requests into a larger one).
   */
  @Checkable.String()
  exchange_sig: string;

  /**
   * Public EdDSA key of the exchange that was used to generate the signature.
   * Should match one of the exchange's signing keys from /keys.  It is given
   * explicitly as the client might otherwise be confused by clock skew as to
   * which signing key was used.
   */
  @Checkable.String()
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
@Checkable.Class()
export class ExchangeHandle {
  /**
   * Master public signing key of the exchange.
   */
  @Checkable.String()
  master_pub: string;

  /**
   * Base URL of the exchange.
   */
  @Checkable.String()
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
@Checkable.Class({ validate: true })
export class ContractTerms {
  static validate(x: ContractTerms) {
    if (x.exchanges.length === 0) {
      throw Error("no exchanges in contract terms");
    }
  }

  /**
   * Hash of the merchant's wire details.
   */
  @Checkable.String()
  H_wire: string;

  /**
   * Hash of the merchant's wire details.
   */
  @Checkable.Optional(Checkable.String())
  auto_refund?: string;

  /**
   * Wire method the merchant wants to use.
   */
  @Checkable.String()
  wire_method: string;

  /**
   * Human-readable short summary of the contract.
   */
  @Checkable.Optional(Checkable.String())
  summary?: string;

  /**
   * Nonce used to ensure freshness.
   */
  @Checkable.Optional(Checkable.String())
  nonce?: string;

  /**
   * Total amount payable.
   */
  @Checkable.String(Amounts.check)
  amount: string;

  /**
   * Auditors accepted by the merchant.
   */
  @Checkable.List(Checkable.AnyObject())
  auditors: any[];

  /**
   * Deadline to pay for the contract.
   */
  @Checkable.Optional(Checkable.String())
  pay_deadline: string;

  /**
   * Delivery locations.
   */
  @Checkable.Any()
  locations: any;

  /**
   * Maximum deposit fee covered by the merchant.
   */
  @Checkable.String(Amounts.check)
  max_fee: string;

  /**
   * Information about the merchant.
   */
  @Checkable.Any()
  merchant: any;

  /**
   * Public key of the merchant.
   */
  @Checkable.String()
  merchant_pub: string;

  /**
   * List of accepted exchanges.
   */
  @Checkable.List(Checkable.Value(() => ExchangeHandle))
  exchanges: ExchangeHandle[];

  /**
   * Products that are sold in this contract.
   */
  @Checkable.List(Checkable.AnyObject())
  products: any[];

  /**
   * Deadline for refunds.
   */
  @Checkable.String(timestampCheck)
  refund_deadline: string;

  /**
   * Deadline for the wire transfer.
   */
  @Checkable.String()
  wire_transfer_deadline: string;

  /**
   * Time when the contract was generated by the merchant.
   */
  @Checkable.String(timestampCheck)
  timestamp: string;

  /**
   * Order id to uniquely identify the purchase within
   * one merchant instance.
   */
  @Checkable.String()
  order_id: string;

  /**
   * Base URL of the merchant's backend.
   */
  @Checkable.String()
  merchant_base_url: string;

  /**
   * Fulfillment URL to view the product or
   * delivery status.
   */
  @Checkable.String()
  fulfillment_url: string;

  /**
   * Share of the wire fee that must be settled with one payment.
   */
  @Checkable.Optional(Checkable.Number())
  wire_fee_amortization?: number;

  /**
   * Maximum wire fee that the merchant agrees to pay for.
   */
  @Checkable.Optional(Checkable.String())
  max_wire_fee?: string;

  /**
   * Extra data, interpreted by the mechant only.
   */
  @Checkable.Any()
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
   * Mode for /pay.
   */
  mode: "pay" | "abort-refund";
}

/**
 * Refund permission in the format that the merchant gives it to us.
 */
@Checkable.Class()
export class MerchantRefundPermission {
  /**
   * Amount to be refunded.
   */
  @Checkable.String(Amounts.check)
  refund_amount: string;

  /**
   * Fee for the refund.
   */
  @Checkable.String(Amounts.check)
  refund_fee: string;

  /**
   * Public key of the coin being refunded.
   */
  @Checkable.String()
  coin_pub: string;

  /**
   * Refund transaction ID between merchant and exchange.
   */
  @Checkable.Number()
  rtransaction_id: number;

  /**
   * Signature made by the merchant over the refund permission.
   */
  @Checkable.String()
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
@Checkable.Class()
export class MerchantRefundResponse {
  /**
   * Public key of the merchant
   */
  @Checkable.String()
  merchant_pub: string;

  /**
   * Contract terms hash of the contract that
   * is being refunded.
   */
  @Checkable.String()
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
  @Checkable.String()
  reserve_sig: string;

  /**
   * Create a ReserveSigSingleton from untyped JSON.
   */
  static checked: (obj: any) => ReserveSigSingleton;
}

/**
 * Response to /reserve/status
 */
@Checkable.Class()
export class ReserveStatus {
  /**
   * Reserve signature.
   */
  @Checkable.String()
  balance: string;

  /**
   * Reserve history, currently not used by the wallet.
   */
  @Checkable.Any()
  history: any;

  /**
   * Create a ReserveSigSingleton from untyped JSON.
   */
  static checked: (obj: any) => ReserveStatus;
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
  @Checkable.String()
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
 * Element of the payback list that the
 * exchange gives us in /keys.
 */
@Checkable.Class()
export class Payback {
  /**
   * The hash of the denomination public key for which the payback is offered.
   */
  @Checkable.String()
  h_denom_pub: string;
}

/**
 * Structure that the exchange gives us in /keys.
 */
@Checkable.Class({ extra: true })
export class KeysJson {
  /**
   * List of offered denominations.
   */
  @Checkable.List(Checkable.Value(() => Denomination))
  denoms: Denomination[];

  /**
   * The exchange's master public key.
   */
  @Checkable.String()
  master_public_key: string;

  /**
   * The list of auditors (partially) auditing the exchange.
   */
  @Checkable.List(Checkable.Value(() => Auditor))
  auditors: Auditor[];

  /**
   * Timestamp when this response was issued.
   */
  @Checkable.String(timestampCheck)
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
  @Checkable.Any()
  signkeys: any;

  /**
   * Protocol version.
   */
  @Checkable.Optional(Checkable.String())
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
  @Checkable.String(Amounts.check)
  wire_fee: string;

  /**
   * Cost of clising a reserve.
   */
  @Checkable.String(Amounts.check)
  closing_fee: string;

  /**
   * Signature made with the exchange's master key.
   */
  @Checkable.String()
  sig: string;

  /**
   * Date from which the fee applies.
   */
  @Checkable.String(timestampCheck)
  start_date: string;

  /**
   * Data after which the fee doesn't apply anymore.
   */
  @Checkable.String(timestampCheck)
  end_date: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => WireFeesJson;
}

@Checkable.Class({ extra: true })
export class AccountInfo {
  @Checkable.String()
  url: string;

  @Checkable.String()
  master_sig: string;
}

@Checkable.Class({ extra: true })
export class ExchangeWireJson {
  @Checkable.Map(
    Checkable.String(),
    Checkable.List(Checkable.Value(() => WireFeesJson)),
  )
  fees: { [methodName: string]: WireFeesJson[] };

  @Checkable.List(Checkable.Value(() => AccountInfo))
  accounts: AccountInfo[];

  static checked: (obj: any) => ExchangeWireJson;
}

/**
 * Wire detail, arbitrary object that must at least
 * contain a "type" key.
 */
export type WireDetail = object & { type: string };

/**
 * Proposal returned from the contract URL.
 */
@Checkable.Class({ extra: true })
export class Proposal {
  /**
   * Contract terms for the propoal.
   */
  @Checkable.Value(() => ContractTerms)
  contract_terms: ContractTerms;

  /**
   * Signature over contract, made by the merchant.  The public key used for signing
   * must be contract_terms.merchant_pub.
   */
  @Checkable.String()
  sig: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => Proposal;
}

/**
 * Response from the internal merchant API.
 */
@Checkable.Class({ extra: true })
export class CheckPaymentResponse {
  @Checkable.Boolean()
  paid: boolean;

  @Checkable.Optional(Checkable.Boolean())
  refunded: boolean | undefined;

  @Checkable.Optional(Checkable.String())
  refunded_amount: string | undefined;

  @Checkable.Optional(Checkable.Value(() => ContractTerms))
  contract_terms: ContractTerms | undefined;

  @Checkable.Optional(Checkable.String())
  taler_pay_uri: string | undefined;

  @Checkable.Optional(Checkable.String())
  contract_url: string | undefined;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => CheckPaymentResponse;
}

/**
 * Response from the bank.
 */
@Checkable.Class({ extra: true })
export class WithdrawOperationStatusResponse {
  @Checkable.Boolean()
  selection_done: boolean;

  @Checkable.Boolean()
  transfer_done: boolean;

  @Checkable.String()
  amount: string;

  @Checkable.Optional(Checkable.String())
  sender_wire?: string;

  @Checkable.Optional(Checkable.String())
  suggested_exchange?: string;

  @Checkable.Optional(Checkable.String())
  confirm_transfer_url?: string;

  @Checkable.List(Checkable.String())
  wire_types: string[];

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => WithdrawOperationStatusResponse;
}

/**
 * Response from the merchant.
 */
@Checkable.Class({ extra: true })
export class TipPickupGetResponse {
  @Checkable.AnyObject()
  extra: any;

  @Checkable.String()
  amount: string;

  @Checkable.String()
  amount_left: string;

  @Checkable.String()
  exchange_url: string;

  @Checkable.String()
  stamp_expire: string;

  @Checkable.String()
  stamp_created: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => TipPickupGetResponse;
}
