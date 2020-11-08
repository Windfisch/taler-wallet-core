/*
  This file is part of GNU Taler
  Copyright (C) 2012-2020 Taler Systems SA

  GNU Taler is free software: you can redistribute it and/or modify it
  under the terms of the GNU Lesser General Public License as published
  by the Free Software Foundation, either version 3 of the License,
  or (at your option) any later version.

  GNU Taler is distributed in the hope that it will be useful, but
  WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.

  SPDX-License-Identifier: LGPL3.0-or-later

  Note: the LGPL does not apply to all components of GNU Taler,
  but it does apply to this file.
 */

export enum TalerErrorCode {


  /**
   * Special code to indicate success (no error).
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  NONE = 0,

  /**
   * A non-integer error code was returned in the JSON response.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  INVALID = 1,

  /**
   * The response we got from the server was not even in JSON format.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_INVALID_RESPONSE = 10,

  /**
   * An operation timed out.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_TIMEOUT = 11,

  /**
   * The version string given does not follow the expected CURRENT:REVISION:AGE Format.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_VERSION_MALFORMED = 12,

  /**
   * The service responded with a reply that was in JSON but did not satsify the protocol. Note that invalid cryptographic signatures should have signature-specific error codes.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_REPLY_MALFORMED = 13,

  /**
   * The HTTP method used is invalid for this endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_METHOD_NOT_ALLOWED (405).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_METHOD_INVALID = 20,

  /**
   * There is no endpoint defined for the URL provided by the client.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_ENDPOINT_UNKNOWN = 21,

  /**
   * The JSON in the client's request was malformed (generic parse error).
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_JSON_INVALID = 22,

  /**
   * The payto:// URI provided by the client is malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_PAYTO_URI_MALFORMED = 24,

  /**
   * A required parameter in the request was missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_PARAMETER_MISSING = 25,

  /**
   * A parameter in the request was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_PARAMETER_MALFORMED = 26,

  /**
   * The currencies involved in the operation do not match.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_CURRENCY_MISMATCH = 30,

  /**
   * The URI is longer than the longest URI the HTTP server is willing to parse.
   * Returned with an HTTP status code of #MHD_HTTP_URI_TOO_LONG (414).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_URI_TOO_LONG = 31,

  /**
   * The body is too large to be permissible for the endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_PAYLOAD_TOO_LARGE (413).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_UPLOAD_EXCEEDS_LIMIT = 32,

  /**
   * The service failed initialize its connection to the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_SETUP_FAILED = 50,

  /**
   * The service encountered an error event to just start the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_START_FAILED = 51,

  /**
   * The service failed to store information in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_STORE_FAILED = 52,

  /**
   * The service failed to fetch information from its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_FETCH_FAILED = 53,

  /**
   * The service encountered an error event to commit the database transaction (hard, unrecoverable error).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_COMMIT_FAILED = 54,

  /**
   * The service encountered an error event to commit the database transaction, even after repeatedly retrying it there was always a conflicting transaction. (This indicates a repeated serialization error; should only happen if some client maliciously tries to create conflicting concurrent transactions.)
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_SOFT_FAILURE = 55,

  /**
   * The service's database is inconsistent and violates service-internal invariants.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_DB_INVARIANT_FAILURE = 56,

  /**
   * The HTTP server experienced an internal invariant failure (bug).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_INTERNAL_INVARIANT_FAILURE = 60,

  /**
   * The service could not compute a cryptographic hash over some JSON value.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_FAILED_COMPUTE_JSON_HASH = 61,

  /**
   * The HTTP server had insufficient memory to parse the request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_PARSER_OUT_OF_MEMORY = 70,

  /**
   * The HTTP server failed to allocate memory.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_ALLOCATION_FAILURE = 71,

  /**
   * The HTTP server failed to allocate memory for building JSON reply.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GENERIC_JSON_ALLOCATION_FAILURE = 72,

  /**
   * Exchange is badly configured and thus cannot operate.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_BAD_CONFIGURATION = 1000,

  /**
   * Operation specified unknown for this endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_OPERATION_UNKNOWN = 1001,

  /**
   * The number of segments included in the URI does not match the number of segments expected by the endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_WRONG_NUMBER_OF_SEGMENTS = 1002,

  /**
   * The same coin was already used with a different denomination previously.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_COIN_CONFLICTING_DENOMINATION_KEY = 1003,

  /**
   * The public key of given to a "/coins/" endpoint of the exchange was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_COINS_INVALID_COIN_PUB = 1004,

  /**
   * The exchange is not aware of the denomination key the wallet requested for the operation.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_DENOMINATION_KEY_UNKNOWN = 1005,

  /**
   * The signature of the denomination key over the coin is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DENOMINATION_SIGNATURE_INVALID = 1006,

  /**
   * The exchange failed to perform the operation as it could not find the private keys. This is a problem with the exchange setup, not with the client's request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_KEYS_MISSING = 1007,

  /**
   * Validity period of the denomination lies in the future.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_DENOMINATION_VALIDITY_IN_FUTURE = 1008,

  /**
   * Denomination key of the coin is past its expiration time for the requested operation.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_GENERIC_DENOMINATION_EXPIRED = 1009,

  /**
   * The exchange did not find information about the specified transaction in the database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_NOT_FOUND = 1100,

  /**
   * The wire hash of given to a "/deposits/" handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_INVALID_H_WIRE = 1101,

  /**
   * The merchant key of given to a "/deposits/" handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_INVALID_MERCHANT_PUB = 1102,

  /**
   * The hash of the contract terms given to a "/deposits/" handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_INVALID_H_CONTRACT_TERMS = 1103,

  /**
   * The coin public key of given to a "/deposits/" handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_INVALID_COIN_PUB = 1104,

  /**
   * The signature returned by the exchange in a /deposits/ request was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_INVALID_SIGNATURE_BY_EXCHANGE = 1105,

  /**
   * The signature of the merchant is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSITS_GET_MERCHANT_SIGNATURE_INVALID = 1106,

  /**
   * The given reserve does not have sufficient funds to admit the requested withdraw operation at this time.  The response includes the current "balance" of the reserve as well as the transaction "history" that lead to this balance.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_INSUFFICIENT_FUNDS = 1150,

  /**
   * The exchange has no information about the "reserve_pub" that was given.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_RESERVE_UNKNOWN = 1151,

  /**
   * The amount to withdraw together with the fee exceeds the numeric range for Taler amounts.  This is not a client failure, as the coin value and fees come from the exchange's configuration.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_AMOUNT_FEE_OVERFLOW = 1152,

  /**
   * The exchange failed to create the signature using the denomination key.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_SIGNATURE_FAILED = 1153,

  /**
   * The signature of the reserve is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_RESERVE_SIGNATURE_INVALID = 1154,

  /**
   * When computing the reserve history, we ended up with a negative overall balance, which should be impossible.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_HISTORY_ERROR_INSUFFICIENT_FUNDS = 1155,

  /**
   * Withdraw period of the coin to be withdrawn is in the past.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_VALIDITY_IN_PAST = 1157,

  /**
   * Withdraw period of the coin to be withdrawn is in the past.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_DENOMINATION_KEY_LOST = 1158,

  /**
   * The client failed to unblind the blind signature.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WITHDRAW_UNBLIND_FAILURE = 1159,

  /**
   * The respective coin did not have sufficient residual value for the /deposit operation (i.e. due to double spending). The "history" in the response provides the transaction history of the coin proving this fact.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_INSUFFICIENT_FUNDS = 1200,

  /**
   * The signature made by the coin over the deposit permission is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_COIN_SIGNATURE_INVALID = 1205,

  /**
   * The stated value of the coin after the deposit fee is subtracted would be negative.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_NEGATIVE_VALUE_AFTER_FEE = 1207,

  /**
   * The stated refund deadline is after the wire deadline.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_REFUND_DEADLINE_AFTER_WIRE_DEADLINE = 1208,

  /**
   * The exchange failed to canonicalize and hash the given wire format. For example, the merchant failed to provide the "salt" or a valid payto:// URI in the wire details.  Note that while the exchange will do some basic sanity checking on the wire details, it cannot warrant that the banking system will ultimately be able to route to the specified address, even if this check passed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_INVALID_WIRE_FORMAT_JSON = 1210,

  /**
   * The hash of the given wire address does not match the wire hash specified in the proposal data.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_INVALID_WIRE_FORMAT_CONTRACT_HASH_CONFLICT = 1211,

  /**
   * The signature provided by the exchange is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_DEPOSIT_INVALID_SIGNATURE_BY_EXCHANGE = 1221,

  /**
   * The reserve status was requested using a unknown key.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_RESERVES_GET_STATUS_UNKNOWN = 1250,

  /**
   * The respective coin did not have sufficient residual value for the /refresh/melt operation.  The "history" in this response provdes the "residual_value" of the coin, which may be less than its "original_value".
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_INSUFFICIENT_FUNDS = 1300,

  /**
   * The exchange had an internal error reconstructing the transaction history of the coin that was being melted.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_COIN_HISTORY_COMPUTATION_FAILED = 1301,

  /**
   * The exchange encountered melt fees exceeding the melted coin's contribution.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_FEES_EXCEED_CONTRIBUTION = 1302,

  /**
   * The signature made with the coin to be melted is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_COIN_SIGNATURE_INVALID = 1303,

  /**
   * The exchange failed to obtain the transaction history of the given coin from the database while generating an insufficient funds errors.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_HISTORY_DB_ERROR_INSUFFICIENT_FUNDS = 1304,

  /**
   * The denomination of the given coin has past its expiration date and it is also not a valid zombie (that is, was not refreshed with the fresh coin being subjected to recoup).
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_COIN_EXPIRED_NO_ZOMBIE = 1305,

  /**
   * The signature returned by the exchange in a melt request was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_MELT_INVALID_SIGNATURE_BY_EXCHANGE = 1306,

  /**
   * The provided transfer keys do not match up with the original commitment.  Information about the original commitment is included in the response.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_COMMITMENT_VIOLATION = 1353,

  /**
   * Failed to produce the blinded signatures over the coins to be returned.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_SIGNING_ERROR = 1354,

  /**
   * The exchange is unaware of the refresh session specified in the request.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_SESSION_UNKNOWN = 1355,

  /**
   * The size of the cut-and-choose dimension of the private transfer keys request does not match #TALER_CNC_KAPPA - 1.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_CNC_TRANSFER_ARRAY_SIZE_INVALID = 1356,

  /**
   * The number of coins to be created in refresh exceeds the limits of the exchange. private transfer keys request does not match #TALER_CNC_KAPPA - 1.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_NEW_DENOMS_ARRAY_SIZE_EXCESSIVE = 1357,

  /**
   * The number of envelopes given does not match the number of denomination keys given.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_NEW_DENOMS_ARRAY_SIZE_MISMATCH = 1358,

  /**
   * The exchange encountered a numeric overflow totaling up the cost for the refresh operation.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_COST_CALCULATION_OVERFLOW = 1359,

  /**
   * The exchange's cost calculation shows that the melt amount is below the costs of the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_AMOUNT_INSUFFICIENT = 1360,

  /**
   * The signature made with the coin over the link data is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_LINK_SIGNATURE_INVALID = 1361,

  /**
   * The refresh session hash given to a /refreshes/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_INVALID_RCH = 1362,

  /**
   * Operation specified invalid for this endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFRESHES_REVEAL_OPERATION_INVALID = 1363,

  /**
   * The coin specified in the link request is unknown to the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_LINK_COIN_UNKNOWN = 1400,

  /**
   * The public key of given to a /transfers/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_TRANSFERS_GET_WTID_MALFORMED = 1450,

  /**
   * The exchange did not find information about the specified wire transfer identifier in the database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_TRANSFERS_GET_WTID_NOT_FOUND = 1451,

  /**
   * The exchange did not find information about the wire transfer fees it charged.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_TRANSFERS_GET_WIRE_FEE_NOT_FOUND = 1452,

  /**
   * The exchange found a wire fee that was above the total transfer value (and thus could not have been charged).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_TRANSFERS_GET_WIRE_FEE_INCONSISTENT = 1453,

  /**
   * The exchange knows literally nothing about the coin we were asked to refund. But without a transaction history, we cannot issue a refund. This is kind-of OK, the owner should just refresh it directly without executing the refund.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_COIN_NOT_FOUND = 1500,

  /**
   * We could not process the refund request as the coin's transaction history does not permit the requested refund because then refunds would exceed the deposit amount.  The "history" in the response proves this.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_CONFLICT_DEPOSIT_INSUFFICIENT = 1501,

  /**
   * The exchange knows about the coin we were asked to refund, but not about the specific /deposit operation.  Hence, we cannot issue a refund (as we do not know if this merchant public key is authorized to do a refund).
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_DEPOSIT_NOT_FOUND = 1502,

  /**
   * The exchange can no longer refund the customer/coin as the money was already transferred (paid out) to the merchant. (It should be past the refund deadline.)
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_MERCHANT_ALREADY_PAID = 1503,

  /**
   * The refund fee specified for the request is lower than the refund fee charged by the exchange for the given denomination key of the refunded coin.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_FEE_TOO_LOW = 1504,

  /**
   * The refunded amount is smaller than the refund fee, which would result in a negative refund.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_FEE_ABOVE_AMOUNT = 1505,

  /**
   * The signature of the merchant is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_MERCHANT_SIGNATURE_INVALID = 1506,

  /**
   * Merchant backend failed to create the refund confirmation signature.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_MERCHANT_SIGNING_FAILED = 1507,

  /**
   * The signature returned by the exchange in a refund request was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_INVALID_SIGNATURE_BY_EXCHANGE = 1508,

  /**
   * The failure proof returned by the exchange is incorrect.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_INVALID_FAILURE_PROOF_BY_EXCHANGE = 1509,

  /**
   * Conflicting refund granted before with different amount but same refund transaction ID.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_REFUND_INCONSISTENT_AMOUNT = 1510,

  /**
   * The given coin signature is invalid for the request.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_RECOUP_SIGNATURE_INVALID = 1550,

  /**
   * The exchange could not find the corresponding withdraw operation. The request is denied.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_RECOUP_WITHDRAW_NOT_FOUND = 1551,

  /**
   * The coin's remaining balance is zero.  The request is denied.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_RECOUP_COIN_BALANCE_ZERO = 1552,

  /**
   * The exchange failed to reproduce the coin's blinding.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_RECOUP_BLINDING_FAILED = 1553,

  /**
   * The coin's remaining balance is zero.  The request is denied.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_RECOUP_COIN_BALANCE_NEGATIVE = 1554,

  /**
   * This exchange does not allow clients to request /keys for times other than the current (exchange) time.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_KEYS_TIMETRAVEL_FORBIDDEN = 1600,

  /**
   * A signature in the server's response was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_WIRE_SIGNATURE_INVALID = 1650,

  /**
   * The backend could not find the merchant instance specified in the request.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_INSTANCE_UNKNOWN = 2000,

  /**
   * The start and end-times in the wire fee structure leave a hole. This is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_HOLE_IN_WIRE_FEE_STRUCTURE = 2001,

  /**
   * The reserve key of given to a /reserves/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_RESERVE_PUB_MALFORMED = 2002,

  /**
   * The backend could not locate a required template to generate an HTML reply.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_ACCEPTABLE (406).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_FAILED_TO_LOAD_TEMPLATE = 2003,

  /**
   * The backend could not expand the template to generate an HTML reply.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_FAILED_TO_EXPAND_TEMPLATE = 2004,

  /**
   * The proposal is not known to the backend.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_ORDER_UNKNOWN = 2005,

  /**
   * The order provided to the backend could not be completed, because a product to be completed via inventory data is not actually in our inventory.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_PRODUCT_UNKNOWN = 2006,

  /**
   * The tip ID is unknown.  This could happen if the tip has expired.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_TIP_ID_UNKNOWN = 2007,

  /**
   * The contract obtained from the merchant backend was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_DB_CONTRACT_CONTENT_INVALID = 2008,

  /**
   * The order we found does not match the provided contract hash.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_CONTRACT_HASH_DOES_NOT_MATCH_ORDER = 2009,

  /**
   * The exchange failed to provide a valid response to the merchant's /keys request.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_GATEWAY (502).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_EXCHANGE_KEYS_FAILURE = 2010,

  /**
   * The exchange failed to respond to the merchant on time.
   * Returned with an HTTP status code of #MHD_HTTP_GATEWAY_TIMEOUT (504).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_EXCHANGE_TIMEOUT = 2011,

  /**
   * The merchant failed to talk to the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_EXCHANGE_CONNECT_FAILURE = 2012,

  /**
   * The exchange returned a maformed response.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_GATEWAY (502).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_EXCHANGE_REPLY_MALFORMED = 2013,

  /**
   * The exchange returned an unexpected response status.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_GATEWAY (502).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GENERIC_EXCHANGE_UNEXPECTED_STATUS = 2014,

  /**
   * The exchange failed to provide a valid answer to the tracking request, thus those details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_OK (200).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GET_ORDERS_EXCHANGE_TRACKING_FAILURE = 2100,

  /**
   * The merchant backend failed to construct the request for tracking to the exchange, thus tracking details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GET_ORDERS_ID_EXCHANGE_REQUEST_FAILURE = 2103,

  /**
   * The merchant backend failed trying to contact the exchange for tracking details, thus those details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GET_ORDERS_ID_EXCHANGE_LOOKUP_START_FAILURE = 2104,

  /**
   * The token used to authenticate the client is invalid for this order.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GET_ORDERS_ID_INVALID_TOKEN = 2105,

  /**
   * The exchange responded saying that funds were insufficient (for example, due to double-spending).
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_INSUFFICIENT_FUNDS = 2150,

  /**
   * The denomination key used for payment is not listed among the denomination keys of the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_DENOMINATION_KEY_NOT_FOUND = 2151,

  /**
   * The denomination key used for payment is not audited by an auditor approved by the merchant.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_DENOMINATION_KEY_AUDITOR_FAILURE = 2152,

  /**
   * There was an integer overflow totaling up the amounts or deposit fees in the payment.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_AMOUNT_OVERFLOW = 2153,

  /**
   * The deposit fees exceed the total value of the payment.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_FEES_EXCEED_PAYMENT = 2154,

  /**
   * After considering deposit and wire fees, the payment is insufficient to satisfy the required amount for the contract.  The client should revisit the logic used to calculate fees it must cover.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_ACCEPTABLE (406).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_INSUFFICIENT_DUE_TO_FEES = 2155,

  /**
   * Even if we do not consider deposit and wire fees, the payment is insufficient to satisfy the required amount for the contract.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_ACCEPTABLE (406).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_PAYMENT_INSUFFICIENT = 2156,

  /**
   * The signature over the contract of one of the coins was invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_COIN_SIGNATURE_INVALID = 2157,

  /**
   * When we tried to find information about the exchange to issue the deposit, we failed.  This usually only happens if the merchant backend is somehow unable to get its own HTTP client logic to work.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_EXCHANGE_LOOKUP_FAILED = 2158,

  /**
   * The refund deadline in the contract is after the transfer deadline.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_REFUND_DEADLINE_PAST_WIRE_TRANSFER_DEADLINE = 2159,

  /**
   * The payment is too late, the offer has expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_OFFER_EXPIRED = 2161,

  /**
   * The "merchant" field is missing in the proposal data. This is an internal error as the proposal is from the merchant's own database at this point.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_MERCHANT_FIELD_MISSING = 2162,

  /**
   * Failed to locate merchant's account information matching the wire hash given in the proposal.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_WIRE_HASH_UNKNOWN = 2163,

  /**
   * The deposit time for the denomination has expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_DENOMINATION_DEPOSIT_EXPIRED = 2165,

  /**
   * The exchange of the deposited coin charges a wire fee that could not be added to the total (total amount too high).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_EXCHANGE_WIRE_FEE_ADDITION_FAILED = 2166,

  /**
   * The contract was not fully paid because of refunds. Note that clients MAY treat this as paid if, for example, contracts must be executed despite of refunds.
   * Returned with an HTTP status code of #MHD_HTTP_PAYMENT_REQUIRED (402).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_REFUNDED = 2167,

  /**
   * According to our database, we have refunded more than we were paid (which should not be possible).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_REFUNDS_EXCEED_PAYMENTS = 2168,

  /**
   * Legacy stuff. Remove me with protocol v1.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEAD_QQQ_PAY_MERCHANT_POST_ORDERS_ID_ABORT_REFUND_REFUSED_PAYMENT_COMPLETE = 2169,

  /**
   * The payment failed at the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_GATEWAY (502).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAY_EXCHANGE_FAILED = 2170,

  /**
   * The contract hash does not match the given order ID.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAID_CONTRACT_HASH_MISMATCH = 2200,

  /**
   * The signature of the merchant is not valid for the given contract hash.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_PAID_COIN_SIGNATURE_INVALID = 2201,

  /**
   * The merchant failed to send the exchange the refund request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_ABORT_EXCHANGE_REFUND_FAILED = 2251,

  /**
   * The merchant failed to find the exchange to process the lookup.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_ABORT_EXCHANGE_LOOKUP_FAILED = 2252,

  /**
   * The merchant could not find the contract.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_ABORT_CONTRACT_NOT_FOUND = 2253,

  /**
   * The payment was already completed and thus cannot be aborted anymore.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_ABORT_REFUND_REFUSED_PAYMENT_COMPLETE = 2254,

  /**
   * The hash provided by the wallet does not match the order.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_ABORT_CONTRACT_HASH_MISSMATCH = 2255,

  /**
   * The array of coins cannot be empty.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_ABORT_COINS_ARRAY_EMPTY = 2256,

  /**
   * We could not claim the order because the backend is unaware of it.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_CLAIM_NOT_FOUND = 2300,

  /**
   * We could not claim the order because someone else claimed it first.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_CLAIM_ALREADY_CLAIMED = 2301,

  /**
   * The client-side experienced an internal failure.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_CLAIM_CLIENT_INTERNAL_FAILURE = 2302,

  /**
   * The backend failed to sign the refund request.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_POST_ORDERS_ID_REFUND_SIGNATURE_FAILED = 2350,

  /**
   * The client failed to unblind the signature returned by the merchant.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_TIP_PICKUP_UNBLIND_FAILURE = 2400,

  /**
   * The exchange returned a failure code for the withdraw operation.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_GATEWAY (502).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_TIP_PICKUP_EXCHANGE_ERROR = 2403,

  /**
   * The merchant failed to add up the amounts to compute the pick up value.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_TIP_PICKUP_SUMMATION_FAILED = 2404,

  /**
   * The tip expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_TIP_PICKUP_HAS_EXPIRED = 2405,

  /**
   * The requested withdraw amount exceeds the amount remaining to be picked up.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_TIP_PICKUP_AMOUNT_EXCEEDS_TIP_REMAINING = 2406,

  /**
   * The merchant did not find the specified denomination key in the exchange's key set.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_TIP_PICKUP_DENOMINATION_UNKNOWN = 2407,

  /**
   * The backend lacks a wire transfer method configuration option for the given instance. Thus, this instance is unavailable (not findable for creating new orders).
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_INSTANCE_CONFIGURATION_LACKS_WIRE = 2500,

  /**
   * The proposal had no timestamp and the backend failed to obtain the local time. Likely to be an internal error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_NO_LOCALTIME = 2501,

  /**
   * The order provided to the backend could not be parsed, some required fields were missing or ill-formed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_PROPOSAL_PARSE_ERROR = 2502,

  /**
   * The backend encountered an error: the proposal already exists.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_ALREADY_EXISTS = 2503,

  /**
   * One of the paths to forget is malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_PATCH_ORDERS_ID_FORGET_PATH_SYNTAX_INCORRECT = 2510,

  /**
   * One of the paths to forget was not marked as forgettable.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_PATCH_ORDERS_ID_FORGET_PATH_NOT_FORGETTABLE = 2511,

  /**
   * The order provided to the backend could not be deleted, our offer is still valid and awaiting payment.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_DELETE_ORDERS_AWAITING_PAYMENT = 2520,

  /**
   * The amount to be refunded is inconsistent: either is lower than the previous amount being awarded, or it is too big to be paid back. In this second case, the fault stays on the business dept. side.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_ID_REFUND_INCONSISTENT_AMOUNT = 2530,

  /**
   * The frontend gave an unpaid order id to issue the refund to.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_ID_REFUND_ORDER_UNPAID = 2531,

  /**
   * The refund delay was set to 0 and thus no refunds are allowed for this order.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_ORDERS_ID_REFUND_NOT_ALLOWED_BY_CONTRACT = 2532,

  /**
   * We internally failed to execute the /track/transfer request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TRANSFERS_REQUEST_ERROR = 2551,

  /**
   * The exchange gave conflicting information about a coin which has been wire transferred.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TRANSFERS_CONFLICTING_REPORTS = 2553,

  /**
   * The exchange charged a different wire fee than what it originally advertised, and it is higher.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_GATEWAY (502).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TRANSFERS_BAD_WIRE_FEE = 2554,

  /**
   * We did not find the account that the transfer was made to.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TRANSFERS_ACCOUNT_NOT_FOUND = 2555,

  /**
   * The merchant backend cannot create an instance under the given identifier as one already exists. Use PATCH to modify the existing entry.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_INSTANCES_ALREADY_EXISTS = 2600,

  /**
   * The product ID exists.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_PRODUCTS_CONFLICT_PRODUCT_EXISTS = 2650,

  /**
   * The update would have reduced the total amount of product lost, which is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_PATCH_PRODUCTS_TOTAL_LOST_REDUCED = 2660,

  /**
   * The update would have mean that more stocks were lost than what remains from total inventory after sales, which is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_PATCH_PRODUCTS_TOTAL_LOST_EXCEEDS_STOCKS = 2661,

  /**
   * The update would have reduced the total amount of product in stock, which is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_PATCH_PRODUCTS_TOTAL_STOCKED_REDUCED = 2662,

  /**
   * The lock request is for more products than we have left (unlocked) in stock.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_PRODUCTS_LOCK_INSUFFICIENT_STOCKS = 2670,

  /**
   * The deletion request is for a product that is locked.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_DELETE_PRODUCTS_CONFLICTING_LOCK = 2680,

  /**
   * The requested wire method is not supported by the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_RESERVES_UNSUPPORTED_WIRE_METHOD = 2700,

  /**
   * The reserve could not be deleted because it is unknown.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_DELETE_RESERVES_NO_SUCH_RESERVE = 2710,

  /**
   * The reserve that was used to fund the tips has expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TIP_AUTHORIZE_RESERVE_EXPIRED = 2750,

  /**
   * The reserve that was used to fund the tips was not found in the DB.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TIP_AUTHORIZE_RESERVE_UNKNOWN = 2751,

  /**
   * The backend knows the instance that was supposed to support the tip, and it was configured for tipping. However, the funds remaining are insufficient to cover the tip, and the merchant should top up the reserve.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TIP_AUTHORIZE_INSUFFICIENT_FUNDS = 2752,

  /**
   * The backend failed to find a reserve needed to authorize the tip.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_POST_TIP_AUTHORIZE_RESERVE_NOT_FOUND = 2753,

  /**
   * The merchant backend encountered a failure in computing the deposit total.
   * Returned with an HTTP status code of #MHD_HTTP_OK (200).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_GET_ORDERS_ID_AMOUNT_ARITHMETIC_FAILURE = 2800,

  /**
   * The signature from the exchange on the deposit confirmation is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  AUDITOR_DEPOSIT_CONFIRMATION_SIGNATURE_INVALID = 3100,

  /**
   * Wire transfer attempted with credit and debit party being the same bank account.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_SAME_ACCOUNT = 5101,

  /**
   * Wire transfer impossible, due to financial limitation of the party that attempted the payment.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_UNALLOWED_DEBIT = 5102,

  /**
   * Negative number was used (as value and/or fraction) to initiate a Amount object.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_NEGATIVE_NUMBER_AMOUNT = 5103,

  /**
   * A number too big was used (as value and/or fraction) to initiate a amount object.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_NUMBER_TOO_BIG = 5104,

  /**
   * Could not login for the requested operation.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_LOGIN_FAILED = 5105,

  /**
   * The bank account referenced in the requested operation was not found. Returned along "400 Not found".
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_UNKNOWN_ACCOUNT = 5106,

  /**
   * The transaction referenced in the requested operation (typically a reject operation), was not found.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_TRANSACTION_NOT_FOUND = 5107,

  /**
   * Bank received a malformed amount string.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_BAD_FORMAT_AMOUNT = 5108,

  /**
   * The client does not own the account credited by the transaction which is to be rejected, so it has no rights do reject it.  To be returned along HTTP 403 Forbidden.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_REJECT_NO_RIGHTS = 5109,

  /**
   * This error code is returned when no known exception types captured the exception, and comes along with a 500 Internal Server Error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_UNMANAGED_EXCEPTION = 5110,

  /**
   * This error code is used for all those exceptions that do not really need a specific error code to return to the client, but need to signal the middleware that the bank is not responding with 500 Internal Server Error.  Used for example when a client is trying to register with a unavailable username.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_SOFT_EXCEPTION = 5111,

  /**
   * The request UID for a request to transfer funds has already been used, but with different details for the transfer.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_TRANSFER_REQUEST_UID_REUSED = 5112,

  /**
   * The withdrawal operation already has a reserve selected.  The current request conflicts with the existing selection.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_WITHDRAWAL_OPERATION_RESERVE_SELECTION_CONFLICT = 5113,

  /**
   * The sync service failed find the account in its database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_ACCOUNT_UNKNOWN = 6100,

  /**
   * The SHA-512 hash provided in the If-None-Match header is malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_IF_NONE_MATCH = 6101,

  /**
   * The SHA-512 hash provided in the If-Match header is malformed or missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_IF_MATCH = 6102,

  /**
   * The signature provided in the "Sync-Signature" header is malformed or missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_SYNC_SIGNATURE = 6103,

  /**
   * The signature provided in the "Sync-Signature" header does not match the account, old or new Etags.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_INVALID_SIGNATURE = 6104,

  /**
   * The "Content-length" field for the upload is not a number.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_MALFORMED_CONTENT_LENGTH = 6105,

  /**
   * The "Content-length" field for the upload is too big based on the server's terms of service.
   * Returned with an HTTP status code of #MHD_HTTP_PAYLOAD_TOO_LARGE (413).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_EXCESSIVE_CONTENT_LENGTH = 6106,

  /**
   * The server is out of memory to handle the upload. Trying again later may succeed.
   * Returned with an HTTP status code of #MHD_HTTP_PAYLOAD_TOO_LARGE (413).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_OUT_OF_MEMORY_ON_CONTENT_LENGTH = 6107,

  /**
   * The uploaded data does not match the Etag.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_INVALID_UPLOAD = 6108,

  /**
   * HTTP server experienced a timeout while awaiting promised payment.
   * Returned with an HTTP status code of #MHD_HTTP_REQUEST_TIMEOUT (408).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_GENERIC_TIMEOUT = 6109,

  /**
   * Sync could not setup the payment request with its own backend.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_CREATE_BACKEND_ERROR = 6110,

  /**
   * The sync service failed find the backup to be updated in its database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PREVIOUS_BACKUP_UNKNOWN = 6111,

  /**
   * The "Content-length" field for the upload is missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_MISSING_CONTENT_LENGTH = 6112,

  /**
   * The wallet does not implement a version of the exchange protocol that is compatible with the protocol version of the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_IMPLEMENTED (501).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_EXCHANGE_PROTOCOL_VERSION_INCOMPATIBLE = 7000,

  /**
   * The wallet encountered an unexpected exception.  This is likely a bug in the wallet implementation.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_UNEXPECTED_EXCEPTION = 7001,

  /**
   * The wallet received a response from a server, but the response can't be parsed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_RECEIVED_MALFORMED_RESPONSE = 7002,

  /**
   * The wallet tried to make a network request, but it received no response.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_NETWORK_ERROR = 7003,

  /**
   * The wallet tried to make a network request, but it was throttled.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_HTTP_REQUEST_THROTTLED = 7004,

  /**
   * The wallet made a request to a service, but received an error response it does not know how to handle.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_UNEXPECTED_REQUEST_ERROR = 7005,

  /**
   * The denominations offered by the exchange are insufficient.  Likely the exchange is badly configured or not maintained.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_EXCHANGE_DENOMINATIONS_INSUFFICIENT = 7006,

  /**
   * The wallet does not support the operation requested by a client.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_CORE_API_OPERATION_UNKNOWN = 7007,

  /**
   * The given taler://pay URI is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_INVALID_TALER_PAY_URI = 7008,

  /**
   * The signature on a coin by the exchange's denomination key is invalid after unblinding it.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_EXCHANGE_COIN_SIGNATURE_INVALID = 7009,

  /**
   * The exchange does not know about the reserve (yet), and thus withdrawal can't progress.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_EXCHANGE_WITHDRAW_RESERVE_UNKNOWN_AT_EXCHANGE = 7010,

  /**
   * The wallet core service is not available.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_CORE_NOT_AVAILABLE = 7011,

  /**
   * The bank has aborted a withdrawal operation, and thus a withdrawal can't complete.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_WITHDRAWAL_OPERATION_ABORTED_BY_BANK = 7012,

  /**
   * An HTTP request made by the wallet timed out.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_HTTP_REQUEST_GENERIC_TIMEOUT = 7013,

  /**
   * The order has already been claimed by another wallet.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_ORDER_ALREADY_CLAIMED = 7014,

  /**
   * A group of withdrawal operations (typically for the same reserve at the same exchange) has errors and will be tried again later.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_WITHDRAWAL_GROUP_INCOMPLETE = 7015,

  /**
   * The signature on a coin by the exchange's denomination key (obtained through the merchant via tipping) is invalid after unblinding it.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_TIPPING_COIN_SIGNATURE_INVALID = 7016,

  /**
   * The wallet does not implement a version of the bank integration API that is compatible with the version offered by the bank.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION_INCOMPATIBLE = 7017,

  /**
   * The wallet processed a taler://pay URI, but the merchant base URL in the downloaded contract terms does not match the merchant base URL derived from the URI.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_CONTRACT_TERMS_BASE_URL_MISMATCH = 7018,

  /**
   * The merchant's signature on the contract terms is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_CONTRACT_TERMS_SIGNATURE_INVALID = 7019,

  /**
   * The given action is invalid for the current state of the reducer.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ANASTASIS_REDUCER_ACTION_INVALID = 8000,

  /**
   * End of error code range.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  END = 9999,

}
