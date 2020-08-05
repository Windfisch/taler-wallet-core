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
 * Test harness for various GNU Taler components.
 * Also provides a fault-injection proxy.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports
 */
import {
  codec,
  talerTypes,
  time,
} from "taler-wallet-core";


export interface PostOrderRequest {
  // The order must at least contain the minimal
  // order detail, but can override all
  order: Partial<talerTypes.ContractTerms>;

  // if set, the backend will then set the refund deadline to the current
  // time plus the specified delay.
  refund_delay?: time.Duration;

  // specifies the payment target preferred by the client. Can be used
  // to select among the various (active) wire methods supported by the instance.
  payment_target?: string;

  // FIXME: some fields are missing

  // Should a token for claiming the order be generated?
  // False can make sense if the ORDER_ID is sufficiently
  // high entropy to prevent adversarial claims (like it is
  // if the backend auto-generates one). Default is 'true'.
  create_token?: boolean;
}

export type ClaimToken = string;

export interface PostOrderResponse {
  order_id: string;
  token?: ClaimToken;
}

export const codecForPostOrderResponse = (): codec.Codec<PostOrderResponse> =>
  codec
    .makeCodecForObject<PostOrderResponse>()
    .property("order_id", codec.codecForString)
    .property("token", codec.makeCodecOptional(codec.codecForString))
    .build("PostOrderResponse");

export const codecForCheckPaymentPaidResponse = (): codec.Codec<
  CheckPaymentPaidResponse
> =>
  codec
    .makeCodecForObject<CheckPaymentPaidResponse>()
    .property("order_status", codec.makeCodecForConstString("paid"))
    .property("refunded", codec.codecForBoolean)
    .property("wired", codec.codecForBoolean)
    .property("deposit_total", codec.codecForString)
    .property("exchange_ec", codec.codecForNumber)
    .property("exchange_hc", codec.codecForNumber)
    .property("refund_amount", codec.codecForString)
    .property("contract_terms", talerTypes.codecForContractTerms())
    // FIXME: specify
    .property("wire_details", codec.codecForAny)
    .property("wire_reports", codec.codecForAny)
    .property("refund_details", codec.codecForAny)
    .build("CheckPaymentPaidResponse");

export const codecForCheckPaymentUnpaidResponse = (): codec.Codec<
  CheckPaymentUnpaidResponse
> =>
  codec
    .makeCodecForObject<CheckPaymentUnpaidResponse>()
    .property("order_status", codec.makeCodecForConstString("unpaid"))
    .property("taler_pay_uri", codec.codecForString)
    .property(
      "already_paid_order_id",
      codec.makeCodecOptional(codec.codecForString),
    )
    .build("CheckPaymentPaidResponse");

export const codecForMerchantOrderPrivateStatusResponse = (): codec.Codec<
  MerchantOrderPrivateStatusResponse
> =>
  codec
    .makeCodecForUnion<MerchantOrderPrivateStatusResponse>()
    .discriminateOn("order_status")
    .alternative("paid", codecForCheckPaymentPaidResponse())
    .alternative("unpaid", codecForCheckPaymentUnpaidResponse())
    .build("MerchantOrderPrivateStatusResponse");

export type MerchantOrderPrivateStatusResponse =
  | CheckPaymentPaidResponse
  | CheckPaymentUnpaidResponse;

export interface CheckPaymentPaidResponse {
  // did the customer pay for this contract
  order_status: "paid";

  // Was the payment refunded (even partially)
  refunded: boolean;

  // Did the exchange wire us the funds
  wired: boolean;

  // Total amount the exchange deposited into our bank account
  // for this contract, excluding fees.
  deposit_total: talerTypes.AmountString;

  // Numeric error code indicating errors the exchange
  // encountered tracking the wire transfer for this purchase (before
  // we even got to specific coin issues).
  // 0 if there were no issues.
  exchange_ec: number;

  // HTTP status code returned by the exchange when we asked for
  // information to track the wire transfer for this purchase.
  // 0 if there were no issues.
  exchange_hc: number;

  // Total amount that was refunded, 0 if refunded is false.
  refund_amount: talerTypes.AmountString;

  // Contract terms
  contract_terms: talerTypes.ContractTerms;

  // Ihe wire transfer status from the exchange for this order if available, otherwise empty array
  wire_details: TransactionWireTransfer[];

  // Reports about trouble obtaining wire transfer details, empty array if no trouble were encountered.
  wire_reports: TransactionWireReport[];

  // The refund details for this order.  One entry per
  // refunded coin; empty array if there are no refunds.
  refund_details: RefundDetails[];
}

export interface CheckPaymentUnpaidResponse {
  order_status: "unpaid";

  // URI that the wallet must process to complete the payment.
  taler_pay_uri: string;

  // Alternative order ID which was paid for already in the same session.
  // Only given if the same product was purchased before in the same session.
  already_paid_order_id?: string;

  // We do we NOT return the contract terms here because they may not
  // exist in case the wallet did not yet claim them.
}

export interface RefundDetails {
  // Reason given for the refund
  reason: string;

  // when was the refund approved
  timestamp: time.Timestamp;

  // Total amount that was refunded (minus a refund fee).
  amount: talerTypes.AmountString;
}

export interface TransactionWireTransfer {
  // Responsible exchange
  exchange_url: string;

  // 32-byte wire transfer identifier
  wtid: string;

  // execution time of the wire transfer
  execution_time: time.Timestamp;

  // Total amount that has been wire transfered
  // to the merchant
  amount: talerTypes.AmountString;

  // Was this transfer confirmed by the merchant via the
  // POST /transfers API, or is it merely claimed by the exchange?
  confirmed: boolean;
}

export interface TransactionWireReport {
  // Numerical error code
  code: number;

  // Human-readable error description
  hint: string;

  // Numerical error code from the exchange.
  exchange_ec: number;

  // HTTP status code received from the exchange.
  exchange_hc: number;

  // Public key of the coin for which we got the exchange error.
  coin_pub: talerTypes.CoinPublicKeyString;
}
