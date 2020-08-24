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
   * Special code to indicate no error (or no "code" present).
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  NONE = 0,

  /**
   * Special code to indicate that a non-integer error code was returned in the JSON response.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  INVALID = 1,

  /**
   * The response we got from the server was not even in JSON format.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  INVALID_RESPONSE = 2,

  /**
   * Generic implementation error: this function was not yet implemented.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  NOT_IMPLEMENTED = 3,

  /**
   * Exchange is badly configured and thus cannot operate.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  EXCHANGE_BAD_CONFIGURATION = 4,

  /**
   * Internal assertion error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  INTERNAL_INVARIANT_FAILURE = 5,

  /**
   * Operation timed out.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIMEOUT = 6,

  /**
   * Exchange failed to allocate memory for building JSON reply.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  JSON_ALLOCATION_FAILURE = 7,

  /**
   * HTTP method invalid for this URL.
   * Returned with an HTTP status code of #MHD_HTTP_METHOD_NOT_ALLOWED (405).
   * (A value of 0 indicates that the error is generated client-side).
   */
  METHOD_INVALID = 8,

  /**
   * Operation specified invalid for this endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  OPERATION_INVALID = 9,

  /**
   * There is no endpoint defined for the URL provided by the client.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ENDPOINT_UNKNOWN = 10,

  /**
   * The URI is longer than the longest URI the HTTP server is willing to parse.
   * Returned with an HTTP status code of #MHD_HTTP_URI_TOO_LONG (414).
   * (A value of 0 indicates that the error is generated client-side).
   */
  URI_TOO_LONG = 11,

  /**
   * The number of segments included in the URI does not match the number of segments expected by the endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WRONG_NUMBER_OF_SEGMENTS = 12,

  /**
   * The start and end-times in the wire fee structure leave a hole. This is not allowed. Generated as an error on the client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  HOLE_IN_WIRE_FEE_STRUCTURE = 13,

  /**
   * The version string given does not follow the expected CURRENT:REVISION:AGE Format.  Generated as an error on the client side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  VERSION_MALFORMED = 14,

  /**
   * The client-side experienced an internal failure. Generated as an error on the client side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CLIENT_INTERNAL_FAILURE = 15,

  /**
   * The body is too large to be permissible for the endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_PAYLOAD_TOO_LARGE (413).
   * (A value of 0 indicates that the error is generated client-side).
   */
  UPLOAD_EXCEEDS_LIMIT = 16,

  /**
   * The payto:// URI we got is malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAYTO_MALFORMED = 17,

  /**
   * Operation specified unknown for this endpoint.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  OPERATION_UNKNOWN = 18,

  /**
   * Exchange failed to allocate memory.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ALLOCATION_FAILURE = 19,

  /**
   * The exchange failed to even just initialize its connection to the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DB_SETUP_FAILED = 1001,

  /**
   * The exchange encountered an error event to just start the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DB_START_FAILED = 1002,

  /**
   * The exchange encountered an error event to commit the database transaction (hard, unrecoverable error).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DB_COMMIT_FAILED_HARD = 1003,

  /**
   * The exchange encountered an error event to commit the database transaction, even after repeatedly retrying it there was always a conflicting transaction. (This indicates a repeated serialization error; should only happen if some client maliciously tries to create conflicting concurrent transactions.)
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DB_COMMIT_FAILED_ON_RETRY = 1004,

  /**
   * The exchange had insufficient memory to parse the request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PARSER_OUT_OF_MEMORY = 1005,

  /**
   * The JSON in the client's request to the exchange was malformed. (Generic parse error).
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  JSON_INVALID = 1006,

  /**
   * The JSON in the client's request to the exchange was malformed. Details about the location of the parse error are provided.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  JSON_INVALID_WITH_DETAILS = 1007,

  /**
   * A required parameter in the request to the exchange was missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PARAMETER_MISSING = 1008,

  /**
   * A parameter in the request to the exchange was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PARAMETER_MALFORMED = 1009,

  /**
   * The exchange failed to obtain the transaction history of the given coin from the database while generating an insufficient funds errors. This can happen during /deposit or /recoup requests.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  COIN_HISTORY_DB_ERROR_INSUFFICIENT_FUNDS = 1010,

  /**
   * Internal logic error.  Some server-side function failed that really should not.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  INTERNAL_LOGIC_ERROR = 1011,

  /**
   * The method specified in a payto:// URI is not one we expected.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAYTO_WRONG_METHOD = 1012,

  /**
   * The same coin was already used with a different denomination previously.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  COIN_CONFLICTING_DENOMINATION_KEY = 1013,

  /**
   * We failed to update the database of known coins.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DB_COIN_HISTORY_STORE_ERROR = 1014,

  /**
   * The public key of given to a /coins/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  COINS_INVALID_COIN_PUB = 1050,

  /**
   * The reserve key of given to a /reserves/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVES_INVALID_RESERVE_PUB = 1051,

  /**
   * The public key of given to a /transfers/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_INVALID_WTID = 1052,

  /**
   * The wire hash of given to a /deposits/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_INVALID_H_WIRE = 1053,

  /**
   * The merchant key of given to a /deposits/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_INVALID_MERCHANT_PUB = 1054,

  /**
   * The hash of the contract terms given to a /deposits/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_INVALID_H_CONTRACT_TERMS = 1055,

  /**
   * The coin public key of given to a /deposits/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_INVALID_COIN_PUB = 1056,

  /**
   * The body returned by the exchange for a /deposits/ request was malformed. Error created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_INVALID_BODY_BY_EXCHANGE = 1057,

  /**
   * The signature returned by the exchange in a /deposits/ request was malformed. Error created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_INVALID_SIGNATURE_BY_EXCHANGE = 1058,

  /**
   * The given reserve does not have sufficient funds to admit the requested withdraw operation at this time.  The response includes the current "balance" of the reserve as well as the transaction "history" that lead to this balance.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_INSUFFICIENT_FUNDS = 1100,

  /**
   * The exchange has no information about the "reserve_pub" that was given.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_RESERVE_UNKNOWN = 1101,

  /**
   * The amount to withdraw together with the fee exceeds the numeric range for Taler amounts.  This is not a client failure, as the coin value and fees come from the exchange's configuration.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_AMOUNT_FEE_OVERFLOW = 1102,

  /**
   * All of the deposited amounts into this reserve total up to a value that is too big for the numeric range for Taler amounts. This is not a client failure, as the transaction history comes from the exchange's configuration.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  AMOUNT_DEPOSITS_OVERFLOW = 1103,

  /**
   * For one of the historic withdrawals from this reserve, the exchange could not find the denomination key. This is not a client failure, as the transaction history comes from the exchange's configuration.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_HISTORIC_DENOMINATION_KEY_NOT_FOUND = 1104,

  /**
   * All of the withdrawals from reserve total up to a value that is too big for the numeric range for Taler amounts. This is not a client failure, as the transaction history comes from the exchange's configuration.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_AMOUNT_WITHDRAWALS_OVERFLOW = 1105,

  /**
   * The exchange somehow knows about this reserve, but there seem to have been no wire transfers made.  This is not a client failure, as this is a database consistency issue of the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_RESERVE_WITHOUT_WIRE_TRANSFER = 1106,

  /**
   * The exchange failed to create the signature using the denomination key.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_SIGNATURE_FAILED = 1107,

  /**
   * The exchange failed to store the withdraw operation in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_DB_STORE_ERROR = 1108,

  /**
   * The exchange failed to check against historic withdraw data from database (as part of ensuring the idempotency of the operation).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_DB_FETCH_ERROR = 1109,

  /**
   * The exchange is not aware of the denomination key the wallet requested for the withdrawal.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_DENOMINATION_KEY_NOT_FOUND = 1110,

  /**
   * The signature of the reserve is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_RESERVE_SIGNATURE_INVALID = 1111,

  /**
   * When computing the reserve history, we ended up with a negative overall balance, which should be impossible.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_HISTORY_DB_ERROR_INSUFFICIENT_FUNDS = 1112,

  /**
   * When computing the reserve history, we ended up with a negative overall balance, which should be impossible.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_RESERVE_HISTORY_IMPOSSIBLE = 1113,

  /**
   * Validity period of the coin to be withdrawn is in the future.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_VALIDITY_IN_FUTURE = 1114,

  /**
   * Withdraw period of the coin to be withdrawn is in the past.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_VALIDITY_IN_PAST = 1115,

  /**
   * Withdraw period of the coin to be withdrawn is in the past.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DENOMINATION_KEY_LOST = 1116,

  /**
   * The exchange's database entry with the reserve balance summary is inconsistent with its own history of the reserve.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_RESERVE_BALANCE_CORRUPT = 1117,

  /**
   * The exchange responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_REPLY_MALFORMED = 1118,

  /**
   * The client failed to unblind the blind signature. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WITHDRAW_UNBLIND_FAILURE = 1119,

  /**
   * The exchange failed to obtain the transaction history of the given reserve from the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVE_STATUS_DB_ERROR = 1150,

  /**
   * The reserve status was requested using a unknown key, to be returned with 404 Not Found.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVE_STATUS_UNKNOWN = 1151,

  /**
   * The exchange responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVE_STATUS_REPLY_MALFORMED = 1152,

  /**
   * The respective coin did not have sufficient residual value for the /deposit operation (i.e. due to double spending). The "history" in the response provides the transaction history of the coin proving this fact.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INSUFFICIENT_FUNDS = 1200,

  /**
   * The exchange failed to obtain the transaction history of the given coin from the database (this does not happen merely because the coin is seen by the exchange for the first time).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_HISTORY_DB_ERROR = 1201,

  /**
   * The exchange failed to store the /depost information in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_STORE_DB_ERROR = 1202,

  /**
   * The exchange database is unaware of the denomination key that signed the coin (however, the exchange process is; this is not supposed to happen; it can happen if someone decides to purge the DB behind the back of the exchange process).  Hence the deposit is being refused.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_DB_DENOMINATION_KEY_UNKNOWN = 1203,

  /**
   * The exchange was trying to lookup the denomination key for the purpose of a DEPOSIT operation. However, the denomination key is unavailable for that purpose. This can be because it is entirely unknown to the exchange or not in the validity period for the deposit operation. Hence the deposit is being refused.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_DENOMINATION_KEY_UNKNOWN = 1204,

  /**
   * The signature made by the coin over the deposit permission is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_COIN_SIGNATURE_INVALID = 1205,

  /**
   * The signature of the denomination key over the coin is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_DENOMINATION_SIGNATURE_INVALID = 1206,

  /**
   * The stated value of the coin after the deposit fee is subtracted would be negative.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_NEGATIVE_VALUE_AFTER_FEE = 1207,

  /**
   * The stated refund deadline is after the wire deadline.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_REFUND_DEADLINE_AFTER_WIRE_DEADLINE = 1208,

  /**
   * The exchange does not recognize the validity of or support the given wire format type.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INVALID_WIRE_FORMAT_TYPE = 1209,

  /**
   * The exchange failed to canonicalize and hash the given wire format. For example, the merchant failed to provide the "salt" or a valid payto:// URI in the wire details.  Note that while the exchange will do some basic sanity checking on the wire details, it cannot warrant that the banking system will ultimately be able to route to the specified address, even if this check passed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INVALID_WIRE_FORMAT_JSON = 1210,

  /**
   * The hash of the given wire address does not match the wire hash specified in the proposal data.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INVALID_WIRE_FORMAT_CONTRACT_HASH_CONFLICT = 1211,

  /**
   * The exchange detected that the given account number is invalid for the selected wire format type.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INVALID_WIRE_FORMAT_ACCOUNT_NUMBER = 1213,

  /**
   * Timestamp included in deposit permission is intolerably far off with respect to the clock of the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INVALID_TIMESTAMP = 1218,

  /**
   * Validity period of the denomination key is in the future.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_DENOMINATION_VALIDITY_IN_FUTURE = 1219,

  /**
   * Denomination key of the coin is past the deposit deadline.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_DENOMINATION_EXPIRED = 1220,

  /**
   * The signature provided by the exchange is not valid. Error created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_INVALID_SIGNATURE_BY_EXCHANGE = 1221,

  /**
   * The currency specified for the deposit is different from the currency of the coin.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_CURRENCY_MISMATCH = 1222,

  /**
   * The respective coin did not have sufficient residual value for the /refresh/melt operation.  The "history" in this response provdes the "residual_value" of the coin, which may be less than its "original_value".
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_INSUFFICIENT_FUNDS = 1300,

  /**
   * The respective coin did not have sufficient residual value for the /refresh/melt operation.  The "history" in this response provdes the "residual_value" of the coin, which may be less than its "original_value".
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_DENOMINATION_KEY_NOT_FOUND = 1301,

  /**
   * The exchange had an internal error reconstructing the transaction history of the coin that was being melted.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_COIN_HISTORY_COMPUTATION_FAILED = 1302,

  /**
   * The exchange failed to check against historic melt data from database (as part of ensuring the idempotency of the operation).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_DB_FETCH_ERROR = 1303,

  /**
   * The exchange failed to store session data in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_DB_STORE_SESSION_ERROR = 1304,

  /**
   * The exchange encountered melt fees exceeding the melted coin's contribution.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_FEES_EXCEED_CONTRIBUTION = 1305,

  /**
   * The denomination key signature on the melted coin is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_DENOMINATION_SIGNATURE_INVALID = 1306,

  /**
   * The signature made with the coin to be melted is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_COIN_SIGNATURE_INVALID = 1307,

  /**
   * The exchange failed to obtain the transaction history of the given coin from the database while generating an insufficient funds errors.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_HISTORY_DB_ERROR_INSUFFICIENT_FUNDS = 1308,

  /**
   * The denomination of the given coin has past its expiration date and it is also not a valid zombie (that is, was not refreshed with the fresh coin being subjected to recoup).
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_COIN_EXPIRED_NO_ZOMBIE = 1309,

  /**
   * The signature returned by the exchange in a melt request was malformed. Error created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_INVALID_SIGNATURE_BY_EXCHANGE = 1310,

  /**
   * The currency specified for the melt amount is different from the currency of the coin.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MELT_CURRENCY_MISMATCH = 1311,

  /**
   * The exchange is unaware of the denomination key that was used to sign the melted zombie coin.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFRESH_RECOUP_DENOMINATION_KEY_NOT_FOUND = 1351,

  /**
   * Validity period of the denomination key is in the future.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFRESH_RECOUP_DENOMINATION_VALIDITY_IN_FUTURE = 1352,

  /**
   * Denomination key of the coin is past the deposit deadline.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFRESH_RECOUP_DENOMINATION_EXPIRED = 1353,

  /**
   * Denomination key of the coin is past the deposit deadline.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFRESH_ZOMBIE_DENOMINATION_EXPIRED = 1354,

  /**
   * The provided transfer keys do not match up with the original commitment.  Information about the original commitment is included in the response.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_COMMITMENT_VIOLATION = 1370,

  /**
   * Failed to produce the blinded signatures over the coins to be returned.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_SIGNING_ERROR = 1371,

  /**
   * The exchange is unaware of the refresh session specified in the request.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_SESSION_UNKNOWN = 1372,

  /**
   * The exchange failed to retrieve valid session data from the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_DB_FETCH_SESSION_ERROR = 1373,

  /**
   * The exchange failed to retrieve previously revealed data from the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_DB_FETCH_REVEAL_ERROR = 1374,

  /**
   * The exchange failed to retrieve commitment data from the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_DB_COMMIT_ERROR = 1375,

  /**
   * The size of the cut-and-choose dimension of the private transfer keys request does not match #TALER_CNC_KAPPA - 1.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_CNC_TRANSFER_ARRAY_SIZE_INVALID = 1376,

  /**
   * The number of coins to be created in refresh exceeds the limits of the exchange. private transfer keys request does not match #TALER_CNC_KAPPA - 1.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_NEW_DENOMS_ARRAY_SIZE_EXCESSIVE = 1377,

  /**
   * The number of envelopes given does not match the number of denomination keys given.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_NEW_DENOMS_ARRAY_SIZE_MISMATCH = 1378,

  /**
   * The exchange encountered a numeric overflow totaling up the cost for the refresh operation.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_COST_CALCULATION_OVERFLOW = 1379,

  /**
   * The exchange's cost calculation shows that the melt amount is below the costs of the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_AMOUNT_INSUFFICIENT = 1380,

  /**
   * The exchange is unaware of the denomination key that was requested for one of the fresh coins.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_FRESH_DENOMINATION_KEY_NOT_FOUND = 1381,

  /**
   * The signature made with the coin over the link data is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_LINK_SIGNATURE_INVALID = 1382,

  /**
   * The exchange failed to generate the signature as it could not find the signing key for the denomination.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_KEYS_MISSING = 1383,

  /**
   * The refresh session hash given to a /refreshes/ handler was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_INVALID_RCH = 1384,

  /**
   * The exchange responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REVEAL_REPLY_MALFORMED = 1385,

  /**
   * The coin specified in the link request is unknown to the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  LINK_COIN_UNKNOWN = 1400,

  /**
   * The exchange responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  LINK_REPLY_MALFORMED = 1401,

  /**
   * The exchange knows literally nothing about the coin we were asked to refund. But without a transaction history, we cannot issue a refund. This is kind-of OK, the owner should just refresh it directly without executing the refund.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_COIN_NOT_FOUND = 1500,

  /**
   * We could not process the refund request as the coin's transaction history does not permit the requested refund because then refunds would exceed the deposit amount.  The "history" in the response proves this.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_CONFLICT_DEPOSIT_INSUFFICIENT = 1501,

  /**
   * We could not process the refund request as the same refund transaction ID was already used with a different amount. Retrying with a different refund transaction ID may work. The "history" in the response proves this by providing the conflicting entry.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_INCONSITENT_AMOUNT = 1502,

  /**
   * The exchange knows about the coin we were asked to refund, but not about the specific /deposit operation.  Hence, we cannot issue a refund (as we do not know if this merchant public key is authorized to do a refund).
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_DEPOSIT_NOT_FOUND = 1503,

  /**
   * The currency specified for the refund is different from the currency of the coin.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_CURRENCY_MISMATCH = 1504,

  /**
   * When we tried to check if we already paid out the coin, the exchange's database suddenly disagreed with data it previously provided (internal inconsistency).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_DB_INCONSISTENT = 1505,

  /**
   * The exchange can no longer refund the customer/coin as the money was already transferred (paid out) to the merchant. (It should be past the refund deadline.)
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_MERCHANT_ALREADY_PAID = 1506,

  /**
   * The amount the exchange was asked to refund exceeds (with fees) the total amount of the deposit (including fees).
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_INSUFFICIENT_FUNDS = 1507,

  /**
   * The exchange failed to recover information about the denomination key of the refunded coin (even though it recognizes the key).  Hence it could not check the fee structure.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_DENOMINATION_KEY_NOT_FOUND = 1508,

  /**
   * The refund fee specified for the request is lower than the refund fee charged by the exchange for the given denomination key of the refunded coin.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_FEE_TOO_LOW = 1509,

  /**
   * The exchange failed to store the refund information to its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_STORE_DB_ERROR = 1510,

  /**
   * The refund fee is specified in a different currency than the refund amount.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_FEE_CURRENCY_MISMATCH = 1511,

  /**
   * The refunded amount is smaller than the refund fee, which would result in a negative refund.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_FEE_ABOVE_AMOUNT = 1512,

  /**
   * The signature of the merchant is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_MERCHANT_SIGNATURE_INVALID = 1513,

  /**
   * Merchant backend failed to create the refund confirmation signature.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_MERCHANT_SIGNING_FAILED = 1514,

  /**
   * The signature returned by the exchange in a refund request was malformed. Error created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_INVALID_SIGNATURE_BY_EXCHANGE = 1515,

  /**
   * The failure proof returned by the exchange is incorrect. Error code generated client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_INVALID_FAILURE_PROOF_BY_EXCHANGE = 1516,

  /**
   * The wire format specified in the "sender_account_details" is not understood or not supported by this exchange.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ADMIN_ADD_INCOMING_WIREFORMAT_UNSUPPORTED = 1600,

  /**
   * The currency specified in the "amount" parameter is not supported by this exhange.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ADMIN_ADD_INCOMING_CURRENCY_UNSUPPORTED = 1601,

  /**
   * The exchange failed to store information about the incoming transfer in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ADMIN_ADD_INCOMING_DB_STORE = 1602,

  /**
   * The exchange encountered an error (that is not about not finding the wire transfer) trying to lookup a wire transfer identifier in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_GET_DB_FETCH_FAILED = 1700,

  /**
   * The exchange found internally inconsistent data when resolving a wire transfer identifier in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_GET_DB_INCONSISTENT = 1701,

  /**
   * The exchange did not find information about the specified wire transfer identifier in the database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_GET_WTID_NOT_FOUND = 1702,

  /**
   * The exchange did not find information about the wire transfer fees it charged.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_GET_WIRE_FEE_NOT_FOUND = 1703,

  /**
   * The exchange found a wire fee that was above the total transfer value (and thus could not have been charged).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_GET_WIRE_FEE_INCONSISTENT = 1704,

  /**
   * The exchange responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRANSFERS_GET_REPLY_MALFORMED = 1705,

  /**
   * The exchange found internally inconsistent fee data when resolving a transaction in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_GET_DB_FEE_INCONSISTENT = 1800,

  /**
   * The exchange encountered an error (that is not about not finding the transaction) trying to lookup a transaction in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_GET_DB_FETCH_FAILED = 1801,

  /**
   * The exchange did not find information about the specified transaction in the database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_GET_NOT_FOUND = 1802,

  /**
   * The exchange failed to identify the wire transfer of the transaction (or information about the plan that it was supposed to still happen in the future).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_GET_WTID_RESOLUTION_ERROR = 1803,

  /**
   * The signature of the merchant is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSITS_GET_MERCHANT_SIGNATURE_INVALID = 1804,

  /**
   * The given denomination key is not in the "recoup" set of the exchange right now.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_DENOMINATION_KEY_UNKNOWN = 1850,

  /**
   * The given coin signature is invalid for the request.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_SIGNATURE_INVALID = 1851,

  /**
   * The signature of the denomination key over the coin is not valid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_DENOMINATION_SIGNATURE_INVALID = 1852,

  /**
   * The exchange failed to access its own database about reserves.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_DB_FETCH_FAILED = 1853,

  /**
   * The exchange could not find the corresponding withdraw operation. The request is denied.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_WITHDRAW_NOT_FOUND = 1854,

  /**
   * The exchange obtained an internally inconsistent transaction history for the given coin.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_HISTORY_DB_ERROR = 1855,

  /**
   * The exchange failed to store information about the recoup to be performed in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_DB_PUT_FAILED = 1856,

  /**
   * The coin's remaining balance is zero.  The request is denied.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_COIN_BALANCE_ZERO = 1857,

  /**
   * The exchange failed to reproduce the coin's blinding.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_BLINDING_FAILED = 1858,

  /**
   * The coin's remaining balance is zero.  The request is denied.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_COIN_BALANCE_NEGATIVE = 1859,

  /**
   * Validity period of the denomination key is in the future.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_DENOMINATION_VALIDITY_IN_FUTURE = 1860,

  /**
   * The exchange responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RECOUP_REPLY_MALFORMED = 1861,

  /**
   * The "have" parameter was not a natural number.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  KEYS_HAVE_NOT_NUMERIC = 1900,

  /**
   * We currently cannot find any keys.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  KEYS_MISSING = 1901,

  /**
   * This exchange does not allow clients to request /keys for times other than the current (exchange) time.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  KEYS_TIMETRAVEL_FORBIDDEN = 1902,

  /**
   * The keys response was malformed. This error is generated client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  KEYS_INVALID = 1903,

  /**
   * The backend could not find the merchant instance specified in the request.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  INSTANCE_UNKNOWN = 2000,

  /**
   * The backend lacks a wire transfer method configuration option for the given instance.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_INSTANCE_CONFIGURATION_LACKS_WIRE = 2002,

  /**
   * The backend could not locate a required template to generate an HTML reply.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_ACCEPTABLE (406).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_FAILED_TO_LOAD_TEMPLATE = 2003,

  /**
   * The backend could not expand the template to generate an HTML reply.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_FAILED_TO_EXPAND_TEMPLATE = 2004,

  /**
   * The merchant failed to provide a meaningful response to a /pay request.  This error is created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_MERCHANT_INVALID_RESPONSE = 2100,

  /**
   * The exchange responded saying that funds were insufficient (for example, due to double-spending).
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_INSUFFICIENT_FUNDS = 2101,

  /**
   * The merchant failed to commit the exchanges' response to a /deposit request to its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DB_STORE_PAY_ERROR = 2102,

  /**
   * The specified exchange is not supported/trusted by this merchant.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_REJECTED = 2103,

  /**
   * The denomination key used for payment is not listed among the denomination keys of the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DENOMINATION_KEY_NOT_FOUND = 2104,

  /**
   * The denomination key used for payment is not audited by an auditor approved by the merchant.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DENOMINATION_KEY_AUDITOR_FAILURE = 2105,

  /**
   * There was an integer overflow totaling up the amounts or deposit fees in the payment.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_AMOUNT_OVERFLOW = 2106,

  /**
   * The deposit fees exceed the total value of the payment.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_FEES_EXCEED_PAYMENT = 2107,

  /**
   * After considering deposit and wire fees, the payment is insufficient to satisfy the required amount for the contract.  The client should revisit the logic used to calculate fees it must cover.
   * Returned with an HTTP status code of #MHD_HTTP_ACCEPTED (202).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_PAYMENT_INSUFFICIENT_DUE_TO_FEES = 2108,

  /**
   * Even if we do not consider deposit and wire fees, the payment is insufficient to satisfy the required amount for the contract.
   * Returned with an HTTP status code of #MHD_HTTP_ACCEPTED (202).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_PAYMENT_INSUFFICIENT = 2109,

  /**
   * The signature over the contract of one of the coins was invalid.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_COIN_SIGNATURE_INVALID = 2110,

  /**
   * We failed to contact the exchange for the /pay request.
   * Returned with an HTTP status code of #MHD_HTTP_REQUEST_TIMEOUT (408).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_TIMEOUT = 2111,

  /**
   * When we tried to find information about the exchange to issue the deposit, we failed.  This usually only happens if the merchant backend is somehow unable to get its own HTTP client logic to work.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_LOOKUP_FAILED = 2112,

  /**
   * The refund deadline in the contract is after the transfer deadline.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_REFUND_DEADLINE_PAST_WIRE_TRANSFER_DEADLINE = 2114,

  /**
   * The request fails to provide coins for the payment.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_COINS_ARRAY_EMPTY = 2115,

  /**
   * The merchant failed to fetch the contract terms from the merchant's database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DB_FETCH_PAY_ERROR = 2116,

  /**
   * The merchant failed to fetch the merchant's previous state with respect to transactions from its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DB_FETCH_TRANSACTION_ERROR = 2117,

  /**
   * The merchant failed to store the merchant's state with respect to the transaction in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DB_STORE_TRANSACTION_ERROR = 2119,

  /**
   * The exchange failed to provide a valid response to the merchant's /keys request.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_KEYS_FAILURE = 2120,

  /**
   * The payment is too late, the offer has expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_OFFER_EXPIRED = 2121,

  /**
   * The "merchant" field is missing in the proposal data.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_MERCHANT_FIELD_MISSING = 2122,

  /**
   * Failed computing a hash code (likely server out-of-memory).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_FAILED_COMPUTE_PROPOSAL_HASH = 2123,

  /**
   * Failed to locate merchant's account information matching the wire hash given in the proposal.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_WIRE_HASH_UNKNOWN = 2124,

  /**
   * We got different currencies for the wire fee and the maximum wire fee.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_WIRE_FEE_CURRENCY_MISMATCH = 2125,

  /**
   * The exchange had a failure when trying to process the request, returning a malformed response.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_REPLY_MALFORMED = 2126,

  /**
   * A unknown merchant public key was included in the payment.  That happens typically when the wallet sends the payment to the wrong merchant instance.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_WRONG_INSTANCE = 2127,

  /**
   * The exchange failed to give us a response when we asked for /keys.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_HAS_NO_KEYS = 2128,

  /**
   * The deposit time for the denomination has expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DENOMINATION_DEPOSIT_EXPIRED = 2129,

  /**
   * The proposal is not known to the backend.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_PROPOSAL_NOT_FOUND = 2130,

  /**
   * The exchange of the deposited coin charges a wire fee that could not be added to the total (total amount too high).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_WIRE_FEE_ADDITION_FAILED = 2131,

  /**
   * The contract was not fully paid because of refunds. Note that clients MAY treat this as paid if, for example, contracts must be executed despite of refunds.
   * Returned with an HTTP status code of #MHD_HTTP_PAYMENT_REQUIRED (402).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_REFUNDED = 2132,

  /**
   * According to our database, we have refunded more than we were paid (which should not be possible).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_REFUNDS_EXCEED_PAYMENTS = 2133,

  /**
   * Legacy stuff. Remove me with protocol v1.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_ABORT_REFUND_REFUSED_PAYMENT_COMPLETE = 2134,

  /**
   * The payment failed at the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_EXCHANGE_FAILED = 2135,

  /**
   * The merchant backend couldn't verify the order payment because of a database failure.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAID_DB_ERROR = 2146,

  /**
   * The order is not known.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAID_ORDER_UNKNOWN = 2147,

  /**
   * The contract hash does not match the given order ID.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAID_CONTRACT_HASH_MISMATCH = 2148,

  /**
   * The signature of the merchant is not valid for the given contract hash.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAID_COIN_SIGNATURE_INVALID = 2149,

  /**
   * The merchant failed to contact the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_EXCHANGE_KEYS_FAILURE = 2150,

  /**
   * The merchant failed to send the exchange the refund request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_EXCHANGE_REFUND_FAILED = 2151,

  /**
   * The merchant failed to find the exchange to process the lookup.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_EXCHANGE_LOOKUP_FAILED = 2152,

  /**
   * The merchant failed to store the abort request in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_DB_STORE_ABORT_ERROR = 2153,

  /**
   * The merchant failed to repeatedly serialize the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_DB_STORE_TRANSACTION_ERROR = 2154,

  /**
   * The merchant failed in the lookup part of the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_DB_FETCH_TRANSACTION_ERROR = 2155,

  /**
   * The merchant could not find the contract.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_CONTRACT_NOT_FOUND = 2156,

  /**
   * The payment was already completed and thus cannot be aborted anymore.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_REFUND_REFUSED_PAYMENT_COMPLETE = 2157,

  /**
   * The hash provided by the wallet does not match the order.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_CONTRACT_HASH_MISSMATCH = 2158,

  /**
   * The array of coins cannot be empty.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_COINS_ARRAY_EMPTY = 2159,

  /**
   * The merchant experienced a timeout processing the request.
   * Returned with an HTTP status code of #MHD_HTTP_REQUEST_TIMEOUT (408).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ABORT_EXCHANGE_TIMEOUT = 2160,

  /**
   * The merchant could not find the order.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  FORGET_ORDER_NOT_FOUND = 2180,

  /**
   * One of the paths to forget is malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  FORGET_PATH_SYNTAX_INCORRECT = 2181,

  /**
   * One of the paths to forget was not marked as forgettable.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  FORGET_PATH_NOT_FORGETTABLE = 2182,

  /**
   * Integer overflow with specified timestamp argument detected.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  HISTORY_TIMESTAMP_OVERFLOW = 2200,

  /**
   * Failed to retrieve history from merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  HISTORY_DB_FETCH_ERROR = 2201,

  /**
   * The backend could not find the contract specified in the request.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POLL_PAYMENT_CONTRACT_NOT_FOUND = 2250,

  /**
   * The response provided by the merchant backend was malformed. This error is created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POLL_PAYMENT_REPLY_MALFORMED = 2251,

  /**
   * We failed to contact the exchange for the /track/transaction request.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_EXCHANGE_TIMEOUT = 2300,

  /**
   * We failed to get a valid /keys response from the exchange for the /track/transaction request.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_EXCHANGE_KEYS_FAILURE = 2301,

  /**
   * The backend could not find the transaction specified in the request.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_TRANSACTION_UNKNOWN = 2302,

  /**
   * The backend had a database access error trying to retrieve transaction data from its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_DB_FETCH_TRANSACTION_ERROR = 2303,

  /**
   * The backend had a database access error trying to retrieve payment data from its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_DB_FETCH_PAYMENT_ERROR = 2304,

  /**
   * The backend found no applicable deposits in the database. This is odd, as we know about the transaction, but not about deposits we made for the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_DB_NO_DEPOSITS_ERROR = 2305,

  /**
   * We failed to obtain a wire transfer identifier for one of the coins in the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_COIN_TRACE_ERROR = 2306,

  /**
   * We failed to obtain the full wire transfer identifier for the transfer one of the coins was aggregated into.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_WIRE_TRANSFER_TRACE_ERROR = 2307,

  /**
   * We got conflicting reports from the exhange with respect to which transfers are included in which aggregate.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TRACK_TRANSACTION_CONFLICTING_REPORTS = 2308,

  /**
   * We did failed to retrieve information from our database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_TRANSFERS_DB_FETCH_ERROR = 2350,

  /**
   * We failed to contact the exchange for the /track/transfer request.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_EXCHANGE_TIMEOUT = 2400,

  /**
   * We failed to obtain an acceptable /keys response from the exchange for the /track/transfer request.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_EXCHANGE_KEYS_FAILURE = 2401,

  /**
   * We failed to persist coin wire transfer information in our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_DB_STORE_COIN_ERROR = 2402,

  /**
   * We internally failed to execute the /track/transfer request.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_REQUEST_ERROR = 2403,

  /**
   * We failed to persist wire transfer information in our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_DB_STORE_TRANSFER_ERROR = 2404,

  /**
   * The exchange returned an error from /track/transfer.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_EXCHANGE_ERROR = 2405,

  /**
   * We failed to fetch deposit information from our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_DB_FETCH_DEPOSIT_ERROR = 2406,

  /**
   * We encountered an internal logic error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_DB_INTERNAL_LOGIC_ERROR = 2407,

  /**
   * The exchange gave conflicting information about a coin which has been wire transferred.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_CONFLICTING_REPORTS = 2408,

  /**
   * The merchant backend had problems in creating the JSON response.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_JSON_RESPONSE_ERROR = 2409,

  /**
   * The exchange charged a different wire fee than what it originally advertised, and it is higher.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_JSON_BAD_WIRE_FEE = 2410,

  /**
   * We did not find the account that the transfer was made to.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_ACCOUNT_NOT_FOUND = 2411,

  /**
   * We did failed to store information in our database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_DB_STORE_ERROR = 2412,

  /**
   * We did failed to retrieve information from our database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_TRANSFERS_DB_LOOKUP_ERROR = 2413,

  /**
   * The merchant backend cannot create an instance with the given default max deposit fee or default max wire fee because the fee currencies are incompatible with the merchant's currency in the config.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_INSTANCES_BAD_CURRENCY = 2449,

  /**
   * The merchant backend cannot create an instance under the given identifier as one already exists. Use PATCH to modify the existing entry.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_INSTANCES_ALREADY_EXISTS = 2450,

  /**
   * The merchant backend cannot create an instance because the specified bank accounts are somehow invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_INSTANCES_BAD_PAYTO_URIS = 2451,

  /**
   * The merchant backend cannot create an instance because it failed to start the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_INSTANCES_DB_START_ERROR = 2452,

  /**
   * The merchant backend cannot create an instance because it failed to commit the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  POST_INSTANCES_DB_COMMIT_ERROR = 2453,

  /**
   * The merchant backend cannot delete an instance because it failed to commit the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DELETE_INSTANCES_ID_DB_HARD_FAILURE = 2454,

  /**
   * The merchant backend cannot delete the data because it already does not exist.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DELETE_INSTANCES_ID_NO_SUCH_INSTANCE = 2455,

  /**
   * The merchant backend cannot update an instance because the specified bank accounts are somehow invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PATCH_INSTANCES_BAD_PAYTO_URIS = 2456,

  /**
   * The merchant backend cannot patch an instance because it failed to start the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PATCH_INSTANCES_DB_START_ERROR = 2457,

  /**
   * The merchant backend cannot patch an instance because it failed to commit the database transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PATCH_INSTANCES_DB_COMMIT_ERROR = 2458,

  /**
   * The hash provided in the request of /map/in does not match the contract sent alongside in the same request.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MAP_IN_UNMATCHED_HASH = 2500,

  /**
   * The backend encountered an error while trying to store the h_contract_terms into the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_STORE_DB_ERROR = 2501,

  /**
   * The backend encountered an error while trying to retrieve the proposal data from database.  Likely to be an internal error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_LOOKUP_DB_ERROR = 2502,

  /**
   * The proposal being looked up is not found on this merchant.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_LOOKUP_NOT_FOUND = 2503,

  /**
   * The proposal had no timestamp and the backend failed to obtain the local time. Likely to be an internal error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_NO_LOCALTIME = 2504,

  /**
   * The order provided to the backend could not be parsed, some required fields were missing or ill-formed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_ORDER_PARSE_ERROR = 2505,

  /**
   * The backend encountered an error while trying to find the existing proposal in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_STORE_DB_ERROR_HARD = 2506,

  /**
   * The backend encountered an error while trying to find the existing proposal in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_STORE_DB_ERROR_SOFT = 2507,

  /**
   * The backend encountered an error: the proposal already exists.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_STORE_DB_ERROR_ALREADY_EXISTS = 2508,

  /**
   * The order provided to the backend uses an amount in a currency that does not match the backend's configuration.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_ORDER_BAD_CURRENCY = 2509,

  /**
   * The response provided by the merchant backend was malformed. This error is created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PROPOSAL_REPLY_MALFORMED = 2510,

  /**
   * The order provided to the backend could not be deleted, it is not known.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_DELETE_NO_SUCH_ORDER = 2511,

  /**
   * The order provided to the backend could not be deleted, our offer is still valid and awaiting payment.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_DELETE_AWAITING_PAYMENT = 2512,

  /**
   * The order provided to the backend could not be deleted, due to a database error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_DELETE_DB_HARD_FAILURE = 2513,

  /**
   * The order provided to the backend could not be completed, due to a database error trying to fetch product inventory data.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_LOOKUP_PRODUCT_DB_HARD_FAILURE = 2514,

  /**
   * The order provided to the backend could not be completed, due to a database serialization error (which should be impossible) trying to fetch product inventory data.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_LOOKUP_PRODUCT_DB_SOFT_FAILURE = 2515,

  /**
   * The order provided to the backend could not be completed, because a product to be completed via inventory data is not actually in our inventory.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_LOOKUP_PRODUCT_NOT_FOUND = 2516,

  /**
   * We could not obtain a list of all orders because of a database failure.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_GET_DB_LOOKUP_ERROR = 2517,

  /**
   * We could not claim the order because of a database failure.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_CLAIM_HARD_DB_ERROR = 2518,

  /**
   * We could not claim the order because of a database serialization failure.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_CLAIM_SOFT_DB_ERROR = 2519,

  /**
   * We could not claim the order because the backend is unaware of it.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_CLAIM_NOT_FOUND = 2520,

  /**
   * We could not claim the order because someone else claimed it first.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  ORDERS_ALREADY_CLAIMED = 2521,

  /**
   * The merchant backend failed to lookup the products.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_PRODUCTS_DB_LOOKUP_ERROR = 2550,

  /**
   * The merchant backend failed to start the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_POST_DB_START_ERROR = 2551,

  /**
   * The product ID exists.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_POST_CONFLICT_PRODUCT_EXISTS = 2552,

  /**
   * The merchant backend failed to serialize the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_POST_DB_COMMIT_SOFT_ERROR = 2553,

  /**
   * The merchant backend failed to commit the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_POST_DB_COMMIT_HARD_ERROR = 2554,

  /**
   * The merchant backend failed to commit the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_PATCH_DB_COMMIT_HARD_ERROR = 2555,

  /**
   * The merchant backend did not find the product to be updated.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_PATCH_UNKNOWN_PRODUCT = 2556,

  /**
   * The update would have reduced the total amount of product lost, which is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_PATCH_TOTAL_LOST_REDUCED = 2557,

  /**
   * The update would have mean that more stocks were lost than what remains from total inventory after sales, which is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_PATCH_TOTAL_LOST_EXCEEDS_STOCKS = 2558,

  /**
   * The update would have reduced the total amount of product in stock, which is not allowed.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_PATCH_TOTAL_STOCKED_REDUCED = 2559,

  /**
   * The lock request is for more products than we have left (unlocked) in stock.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_LOCK_INSUFFICIENT_STOCKS = 2560,

  /**
   * The lock request is for an unknown product.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_LOCK_UNKNOWN_PRODUCT = 2561,

  /**
   * The deletion request resulted in a hard database error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_DELETE_DB_HARD_FAILURE = 2562,

  /**
   * The deletion request was for a product unknown to the backend.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_DELETE_NO_SUCH_PRODUCT = 2563,

  /**
   * The deletion request is for a product that is locked.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PRODUCTS_DELETE_CONFLICTING_LOCK = 2564,

  /**
   * The merchant returned a malformed response. Error created client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_LOOKUP_INVALID_RESPONSE = 2600,

  /**
   * The frontend gave an unknown order id to issue the refund to.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_ORDER_ID_UNKNOWN = 2601,

  /**
   * The amount to be refunded is inconsistent: either is lower than the previous amount being awarded, or it is too big to be paid back. In this second case, the fault stays on the business dept. side.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_INCONSISTENT_AMOUNT = 2602,

  /**
   * The backend encountered an error while trying to retrieve the payment data from database.  Likely to be an internal error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_LOOKUP_DB_ERROR = 2603,

  /**
   * The backend encountered an error while trying to retrieve the payment data from database.  Likely to be an internal error.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_MERCHANT_DB_COMMIT_ERROR = 2604,

  /**
   * Payments are stored in a single db transaction; this error indicates that one db operation within that transaction failed.  This might involve storing of coins or other related db operations, like starting/committing the db transaction or marking a contract as paid.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_DB_STORE_PAYMENTS_ERROR = 2605,

  /**
   * The backend failed to sign the refund request.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  PAY_REFUND_SIGNATURE_FAILED = 2606,

  /**
   * The merchant backend is not available of any applicable refund(s) for this order.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_LOOKUP_NO_REFUND = 2607,

  /**
   * The frontend gave an unpaid order id to issue the refund to.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  REFUND_ORDER_ID_UNPAID = 2608,

  /**
   * The requested wire method is not supported by the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVES_POST_UNSUPPORTED_WIRE_METHOD = 2650,

  /**
   * The backend failed to commit the result to the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVES_POST_DB_COMMIT_HARD_ERROR = 2651,

  /**
   * The backend failed to fetch the requested information from the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_RESERVES_DB_LOOKUP_ERROR = 2652,

  /**
   * The backend knows the instance that was supposed to support the tip, but it was not configured for tipping (i.e. has no exchange associated with it).  Likely to be a configuration error.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_INSTANCE_DOES_NOT_TIP = 2701,

  /**
   * The reserve that was used to fund the tips has expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_RESERVE_EXPIRED = 2702,

  /**
   * The reserve that was used to fund the tips was not found in the DB.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_RESERVE_UNKNOWN = 2703,

  /**
   * The backend knows the instance that was supposed to support the tip, and it was configured for tipping. However, the funds remaining are insufficient to cover the tip, and the merchant should top up the reserve.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_INSUFFICIENT_FUNDS = 2704,

  /**
   * The backend had trouble accessing the database to persist information about the tip authorization. Returned with an HTTP status code of internal error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_HARD_ERROR = 2705,

  /**
   * The backend had trouble accessing the database to persist information about the tip authorization. The problem might be fixable by repeating the transaction.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_SOFT_ERROR = 2706,

  /**
   * The backend failed to obtain a reserve status from the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_STATUS_FAILED_EXCHANGE_DOWN = 2707,

  /**
   * The backend got an empty (!) reserve history from the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_FAILED_EMPTY = 2708,

  /**
   * The backend got an invalid reserve history (fails to start with a deposit) from the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_INVALID_NO_DEPOSIT = 2709,

  /**
   * The backend got an 404 response from the exchange when it inquired about the reserve history.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_UNKNOWN_TO_EXCHANGE = 2710,

  /**
   * The backend got a reserve with a currency that does not match the backend's currency.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_CURRENCY_MISMATCH = 2711,

  /**
   * The backend got a reserve history with amounts it cannot process (addition failure in deposits).
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_ARITHMETIC_ISSUE_DEPOSIT = 2712,

  /**
   * The backend got a reserve history with amounts it cannot process (addition failure in withdraw amounts).
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_ARITHMETIC_ISSUE_WITHDRAW = 2713,

  /**
   * The backend got a reserve history with amounts it cannot process (addition failure in closing amounts).
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_ARITHMETIC_ISSUE_CLOSED = 2714,

  /**
   * The backend got a reserve history with inconsistent amounts.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_ARITHMETIC_ISSUE_INCONSISTENT = 2715,

  /**
   * The backend encountered a database error querying tipping reserves.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_DB_ERROR = 2716,

  /**
   * The backend got an unexpected resever history reply from the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_FAILED = 2717,

  /**
   * The backend got a reserve history with amounts it cannot process (addition failure in withdraw amounts).
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_RESERVE_HISTORY_ARITHMETIC_ISSUE_RECOUP = 2718,

  /**
   * The backend knows the instance that was supposed to support the tip, but it was not configured for tipping (i.e. has no exchange associated with it).  Likely to be a configuration error.
   * Returned with an HTTP status code of #MHD_HTTP_PRECONDITION_FAILED (412).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_INSTANCE_DOES_NOT_TIP = 2719,

  /**
   * The tip id is unknown.  This could happen if the tip id is wrong or the tip authorization expired.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_QUERY_TIP_ID_UNKNOWN = 2720,

  /**
   * The reserve could not be deleted due to a database failure.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVES_DELETE_DB_HARD_FAILURE = 2721,

  /**
   * The reserve could not be deleted because it is unknown.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  RESERVES_DELETE_NO_SUCH_RESERVE = 2722,

  /**
   * The backend got an unexpected error trying to lookup reserve details from the backend.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_LOOKUP_RESERVE_DB_FAILURE = 2723,

  /**
   * The backend repeatedly failed to serialize the transaction to authorize the tip.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_SERIALIZATION_FAILURE = 2724,

  /**
   * The backend failed to start the transaction to authorize the tip.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_START_FAILURE = 2725,

  /**
   * The backend failed looking up the reserve needed to authorize the tip.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_LOOKUP_RESERVE_FAILURE = 2726,

  /**
   * The backend failed to find a reserve needed to authorize the tip.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_RESERVE_NOT_FOUND = 2727,

  /**
   * The backend encountered an internal invariant violation.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_RESERVE_INVARIANT_FAILURE = 2728,

  /**
   * The selected exchange expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_RESERVE_EXPIRED = 2729,

  /**
   * The backend failed updating the reserve needed to authorize the tip.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_AUTHORIZE_DB_UPDATE_RESERVE_FAILURE = 2730,

  /**
   * The backend had trouble accessing the database to persist information about enabling tips. Returned with an HTTP status code of internal error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_ENABLE_DB_TRANSACTION_ERROR = 2750,

  /**
   * The tip ID is unknown.  This could happen if the tip has expired.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_TIP_ID_UNKNOWN = 2800,

  /**
   * The amount requested exceeds the remaining tipping balance for this tip ID. Returned with an HTTP status code of "Conflict" (as it conflicts with a previous pickup operation).
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_NO_FUNDS = 2801,

  /**
   * We encountered a DB error, repeating the request may work.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_DB_ERROR_SOFT = 2802,

  /**
   * We encountered a DB error, repeating the request will not help. This is an internal server error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_DB_ERROR_HARD = 2803,

  /**
   * The same pickup ID was already used for picking up a different amount. This points to a very strange internal error as the pickup ID is derived from the denomination key which is tied to a particular amount. Hence this should also be an internal server error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_AMOUNT_CHANGED = 2804,

  /**
   * We failed to contact the exchange to obtain the denomination keys.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_DOWN = 2805,

  /**
   * We contacted the exchange to obtain any denomination keys, but got no valid keys.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_LACKED_KEYS = 2806,

  /**
   * We contacted the exchange to obtain at least one of the denomination keys specified in the request. Returned with a response code "not found" (404).
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_LACKED_KEY = 2807,

  /**
   * We encountered an arithmetic issue totaling up the amount to withdraw.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_AMOUNT_OVERFLOW = 2808,

  /**
   * The number of planchets specified exceeded the limit.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_TOO_MANY_PLANCHETS = 2809,

  /**
   * The merchant failed to initialize the withdraw operation.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_WITHDRAW_FAILED = 2810,

  /**
   * The merchant failed to initialize the withdraw operation.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_WITHDRAW_FAILED_AT_EXCHANGE = 2811,

  /**
   * The client failed to unblind the signature returned by the merchant. Generated client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_UNBLIND_FAILURE = 2812,

  /**
   * Merchant failed to access its database to lookup the tip.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_TIPS_DB_LOOKUP_ERROR = 2813,

  /**
   * Merchant failed find the tip in its database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_TIPS_ID_UNKNOWN = 2814,

  /**
   * The merchant failed to contact the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_CONTACT_EXCHANGE_ERROR = 2815,

  /**
   * The merchant failed to obtain keys from the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_KEYS_ERROR = 2816,

  /**
   * The merchant failed to store data in its own database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_DB_STORE_HARD_ERROR = 2817,

  /**
   * The merchant failed to get a timely response from the exchange.
   * Returned with an HTTP status code of #MHD_HTTP_REQUEST_TIMEOUT (408).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_TIMEOUT = 2818,

  /**
   * The exchange returned a failure code for the withdraw operation.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_EXCHANGE_ERROR = 2819,

  /**
   * The merchant failed to add up the amounts to compute the pick up value.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_SUMMATION_FAILED = 2820,

  /**
   * The tip expired.
   * Returned with an HTTP status code of #MHD_HTTP_GONE (410).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_HAS_EXPIRED = 2821,

  /**
   * The requested withdraw amount exceeds the amount remaining to be picked up.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_AMOUNT_EXCEEDS_TIP_REMAINING = 2822,

  /**
   * The merchant failed to store data in its own database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_DB_STORE_SOFT_ERROR = 2823,

  /**
   * The merchant did not find the specified denomination key in the exchange's key set.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TIP_PICKUP_DENOMINATION_UNKNOWN = 2824,

  /**
   * We failed to fetch contract terms from our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_DB_LOOKUP_ERROR = 2900,

  /**
   * We failed to find the contract terms from our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_ID_UNKNOWN = 2901,

  /**
   * The merchant had a timeout contacting the exchange, thus not providing wire details in the response.
   * Returned with an HTTP status code of #MHD_HTTP_REQUEST_TIMEOUT (408).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_EXCHANGE_TIMEOUT = 2902,

  /**
   * The exchange failed to provide a valid answer to the tracking request, thus those details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_OK (200).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_EXCHANGE_TRACKING_FAILURE = 2903,

  /**
   * The merchant backend failed to persist tracking details in its database, thus those details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_OK (200).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_DB_STORE_TRACKING_FAILURE = 2904,

  /**
   * The merchant backend encountered a failure in computing the deposit total.
   * Returned with an HTTP status code of #MHD_HTTP_OK (200).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_AMOUNT_ARITHMETIC_FAILURE = 2905,

  /**
   * The merchant backend failed trying to contact the exchange for tracking details, thus those details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_FAILED_DEPENDENCY (424).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_EXCHANGE_LOOKUP_FAILURE = 2906,

  /**
   * The merchant backend failed to construct the request for tracking to the exchange, thus tracking details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_EXCHANGE_REQUEST_FAILURE = 2907,

  /**
   * The merchant backend had a database failure trying to find information about the contract of the order.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_DB_FETCH_CONTRACT_TERMS_ERROR = 2908,

  /**
   * The merchant backend could not find an order with the given identifier.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_ORDER_NOT_FOUND = 2909,

  /**
   * The merchant backend could not compute the hash of the proposal.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_FAILED_COMPUTE_PROPOSAL_HASH = 2910,

  /**
   * The merchant backend could not fetch the payment status from its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_DB_FETCH_PAYMENT_STATUS = 2911,

  /**
   * The merchant backend had an error looking up information in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_DB_FETCH_TRANSACTION_ERROR = 2912,

  /**
   * The contract obtained from the merchant backend was malformed.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_CONTRACT_CONTENT_INVALID = 2913,

  /**
   * We failed to contract terms from our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CHECK_PAYMENT_DB_FETCH_CONTRACT_TERMS_ERROR = 2914,

  /**
   * We failed to contract terms from our merchant database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CHECK_PAYMENT_DB_FETCH_ORDER_ERROR = 2915,

  /**
   * The order id we're checking is unknown, likely the frontend did not create the order first.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CHECK_PAYMENT_ORDER_ID_UNKNOWN = 2916,

  /**
   * Failed computing a hash code (likely server out-of-memory).
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CHECK_PAYMENT_FAILED_COMPUTE_PROPOSAL_HASH = 2917,

  /**
   * Signature "session_sig" failed to verify.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CHECK_PAYMENT_SESSION_SIGNATURE_INVALID = 2918,

  /**
   * The order we found does not match the provided contract hash.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDER_WRONG_CONTRACT = 2919,

  /**
   * The response we received from the merchant is malformed. This error is generated client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  CHECK_PAYMENT_RESPONSE_MALFORMED = 2920,

  /**
   * The merchant backend failed trying to contact the exchange for tracking details, thus those details are not in the response.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  GET_ORDERS_EXCHANGE_LOOKUP_START_FAILURE = 2921,

  /**
   * The response we received from the merchant is malformed. This error is generated client-side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_ORDER_GET_REPLY_MALFORMED = 2922,

  /**
   * The token used to authenticate the client is invalid for this order.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_GET_ORDER_INVALID_TOKEN = 2923,

  /**
   * The merchant backup failed to lookup the order status in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_GET_ORDERS_STATUS_DB_LOOKUP_ERROR = 2924,

  /**
   * The merchant backup failed to lookup the contract terms in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_GET_ORDERS_CONTRACT_DB_LOOKUP_ERROR = 2925,

  /**
   * The merchant backup failed to parse the order contract terms.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_GET_ORDERS_PARSE_CONTRACT_ERROR = 2926,

  /**
   * The merchant backup failed to lookup the refunds in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_GET_ORDERS_REFUND_DB_LOOKUP_ERROR = 2927,

  /**
   * The merchant backup failed to lookup filtered orders in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  MERCHANT_PRIVATE_GET_ORDERS_BY_FILTER_DB_LOOKUP_ERROR = 2928,

  /**
   * The signature from the exchange on the deposit confirmation is invalid.  Returned with a "400 Bad Request" status code.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_CONFIRMATION_SIGNATURE_INVALID = 3000,

  /**
   * The auditor had trouble storing the deposit confirmation in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  DEPOSIT_CONFIRMATION_STORE_DB_ERROR = 3001,

  /**
   * The auditor had trouble retrieving the exchange list from its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  LIST_EXCHANGES_DB_ERROR = 3002,

  /**
   * The auditor had trouble storing an exchange in its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  AUDITOR_EXCHANGE_STORE_DB_ERROR = 3003,

  /**
   * The auditor (!) responded with a reply that did not satsify the protocol. This error is not used in the protocol but created client- side.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  AUDITOR_EXCHANGES_REPLY_MALFORMED = 3004,

  /**
   * The exchange failed to compute ECDH.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TEST_ECDH_ERROR = 4000,

  /**
   * The EdDSA test signature is invalid.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TEST_EDDSA_INVALID = 4001,

  /**
   * The exchange failed to compute the EdDSA test signature.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TEST_EDDSA_ERROR = 4002,

  /**
   * The exchange failed to generate an RSA key.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TEST_RSA_GEN_ERROR = 4003,

  /**
   * The exchange failed to compute the public RSA key.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TEST_RSA_PUB_ERROR = 4004,

  /**
   * The exchange failed to compute the RSA signature.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  TEST_RSA_SIGN_ERROR = 4005,

  /**
   * The JSON in the server's response was malformed.  This response is provided with HTTP status code of 0.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SERVER_JSON_INVALID = 5000,

  /**
   * A signature in the server's response was malformed.  This response is provided with HTTP status code of 0.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SERVER_SIGNATURE_INVALID = 5001,

  /**
   * Wire transfer attempted with credit and debit party being the same bank account.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_SAME_ACCOUNT = 5102,

  /**
   * Wire transfer impossible, due to financial limitation of the party that attempted the payment.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_UNALLOWED_DEBIT = 5103,

  /**
   * Arithmetic operation between two amounts of different currency was attempted.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_CURRENCY_MISMATCH = 5104,

  /**
   * At least one GET parameter was either missing or invalid for the requested operation.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_PARAMETER_MISSING_OR_INVALID = 5105,

  /**
   * JSON body sent was invalid for the requested operation.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_JSON_INVALID = 5106,

  /**
   * Negative number was used (as value and/or fraction) to initiate a Amount object.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_NEGATIVE_NUMBER_AMOUNT = 5107,

  /**
   * A number too big was used (as value and/or fraction) to initiate a amount object.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_NUMBER_TOO_BIG = 5108,

  /**
   * Could not login for the requested operation.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_LOGIN_FAILED = 5109,

  /**
   * The bank account referenced in the requested operation was not found. Returned along "400 Not found".
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_UNKNOWN_ACCOUNT = 5110,

  /**
   * The transaction referenced in the requested operation (typically a reject operation), was not found.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_TRANSACTION_NOT_FOUND = 5111,

  /**
   * Bank received a malformed amount string.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_BAD_FORMAT_AMOUNT = 5112,

  /**
   * The client does not own the account credited by the transaction which is to be rejected, so it has no rights do reject it.  To be returned along HTTP 403 Forbidden.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_REJECT_NO_RIGHTS = 5200,

  /**
   * This error code is returned when no known exception types captured the exception, and comes along with a 500 Internal Server Error.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_UNMANAGED_EXCEPTION = 5300,

  /**
   * This error code is used for all those exceptions that do not really need a specific error code to return to the client, but need to signal the middleware that the bank is not responding with 500 Internal Server Error.  Used for example when a client is trying to register with a unavailable username.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_SOFT_EXCEPTION = 5400,

  /**
   * The request UID for a request to transfer funds has already been used, but with different details for the transfer.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_TRANSFER_REQUEST_UID_REUSED = 5500,

  /**
   * The withdrawal operation already has a reserve selected.  The current request conflicts with the existing selection.
   * Returned with an HTTP status code of #MHD_HTTP_CONFLICT (409).
   * (A value of 0 indicates that the error is generated client-side).
   */
  BANK_WITHDRAWAL_OPERATION_RESERVE_SELECTION_CONFLICT = 5600,

  /**
   * The sync service failed to access its database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_DB_FETCH_ERROR = 6000,

  /**
   * The sync service failed find the record in its database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BACKUP_UNKNOWN = 6001,

  /**
   * The sync service failed find the account in its database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_ACCOUNT_UNKNOWN = 6002,

  /**
   * The SHA-512 hash provided in the If-None-Match header is malformed.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_IF_NONE_MATCH = 6003,

  /**
   * The SHA-512 hash provided in the If-Match header is malformed or missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_IF_MATCH = 6004,

  /**
   * The signature provided in the "Sync-Signature" header is malformed or missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_SYNC_SIGNATURE = 6005,

  /**
   * The signature provided in the "Sync-Signature" header does not match the account, old or new Etags.
   * Returned with an HTTP status code of #MHD_HTTP_FORBIDDEN (403).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_INVALID_SIGNATURE = 6007,

  /**
   * The "Content-length" field for the upload is either not a number, or too big, or missing.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_BAD_CONTENT_LENGTH = 6008,

  /**
   * The "Content-length" field for the upload is too big based on the server's terms of service.
   * Returned with an HTTP status code of #MHD_HTTP_PAYLOAD_TOO_LARGE (413).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_EXCESSIVE_CONTENT_LENGTH = 6009,

  /**
   * The server is out of memory to handle the upload. Trying again later may succeed.
   * Returned with an HTTP status code of #MHD_HTTP_PAYLOAD_TOO_LARGE (413).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_OUT_OF_MEMORY_ON_CONTENT_LENGTH = 6010,

  /**
   * The uploaded data does not match the Etag.
   * Returned with an HTTP status code of #MHD_HTTP_BAD_REQUEST (400).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_INVALID_UPLOAD = 6011,

  /**
   * We failed to check for existing upload data in the database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_DATABASE_FETCH_ERROR = 6012,

  /**
   * HTTP server was being shutdown while this operation was pending.
   * Returned with an HTTP status code of #MHD_HTTP_SERVICE_UNAVAILABLE (503).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_SHUTDOWN = 6013,

  /**
   * HTTP server experienced a timeout while awaiting promised payment.
   * Returned with an HTTP status code of #MHD_HTTP_REQUEST_TIMEOUT (408).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_TIMEOUT = 6014,

  /**
   * Sync could not store order data in its own database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_CREATE_DB_ERROR = 6015,

  /**
   * Sync could not store payment confirmation in its own database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_CONFIRM_DB_ERROR = 6016,

  /**
   * Sync could not fetch information about possible existing orders from its own database.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_CHECK_ORDER_DB_ERROR = 6017,

  /**
   * Sync could not setup the payment request with its own backend.
   * Returned with an HTTP status code of #MHD_HTTP_INTERNAL_SERVER_ERROR (500).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PAYMENT_CREATE_BACKEND_ERROR = 6018,

  /**
   * The sync service failed find the backup to be updated in its database.
   * Returned with an HTTP status code of #MHD_HTTP_NOT_FOUND (404).
   * (A value of 0 indicates that the error is generated client-side).
   */
  SYNC_PREVIOUS_BACKUP_UNKNOWN = 6019,

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
  WALLET_WITHDRAW_RESERVE_UNKNOWN_AT_EXCHANGE = 7010,

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
  WALLET_HTTP_REQUEST_TIMEOUT = 7013,

  /**
   * The order has already been claimed by another wallet.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  WALLET_ORDER_ALREADY_CLAIMED = 7014,

  /**
   * End of error code range.
   * Returned with an HTTP status code of #MHD_HTTP_UNINITIALIZED (0).
   * (A value of 0 indicates that the error is generated client-side).
   */
  END = 9999,

}
