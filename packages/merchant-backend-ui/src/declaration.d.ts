/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
*
* @author Sebastian Javier Marchano (sebasjm)
*/


type HashCode = string;
type EddsaPublicKey = string;
type EddsaSignature = string;
type WireTransferIdentifierRawP = string;
type RelativeTime = Duration;
type ImageDataUrl = string;

export interface WithId {
    id: string
}

interface Timestamp {
    // Milliseconds since epoch, or the special
    // value "forever" to represent an event that will
    // never happen.
    t_s: number | "never";
}
interface Duration {
    // Duration in milliseconds or "forever"
    // to represent an infinite duration.
    d_us: number | "forever";
}

interface WithId {
    id: string;
}

type Amount = string;
type UUID = string;
type Integer = number;

export namespace ExchangeBackend {
    interface WireResponse {

        // Master public key of the exchange, must match the key returned in /keys.
        master_public_key: EddsaPublicKey;

        // Array of wire accounts operated by the exchange for
        // incoming wire transfers.
        accounts: WireAccount[];

        // Object mapping names of wire methods (i.e. "sepa" or "x-taler-bank")
        // to wire fees.
        fees: { method: AggregateTransferFee };
    }
    interface WireAccount {
        // payto:// URI identifying the account and wire method
        payto_uri: string;

        // Signature using the exchange's offline key
        // with purpose TALER_SIGNATURE_MASTER_WIRE_DETAILS.
        master_sig: EddsaSignature;
    }
    interface AggregateTransferFee {
        // Per transfer wire transfer fee.
        wire_fee: Amount;

        // Per transfer closing fee.
        closing_fee: Amount;

        // What date (inclusive) does this fee go into effect?
        // The different fees must cover the full time period in which
        // any of the denomination keys are valid without overlap.
        start_date: TalerProtocolTimestamp;

        // What date (exclusive) does this fee stop going into effect?
        // The different fees must cover the full time period in which
        // any of the denomination keys are valid without overlap.
        end_date: TalerProtocolTimestamp;

        // Signature of TALER_MasterWireFeePS with
        // purpose TALER_SIGNATURE_MASTER_WIRE_FEES.
        sig: EddsaSignature;
    }

}
export namespace MerchantBackend {
    interface ErrorDetail {

        // Numeric error code unique to the condition.
        // The other arguments are specific to the error value reported here.
        code: number;

        // Human-readable description of the error, i.e. "missing parameter", "commitment violation", ...
        // Should give a human-readable hint about the error's nature. Optional, may change without notice!
        hint?: string;

        // Optional detail about the specific input value that failed. May change without notice!
        detail?: string;

        // Name of the parameter that was bogus (if applicable).
        parameter?: string;

        // Path to the argument that was bogus (if applicable).
        path?: string;

        // Offset of the argument that was bogus (if applicable).
        offset?: string;

        // Index of the argument that was bogus (if applicable).
        index?: string;

        // Name of the object that was bogus (if applicable).
        object?: string;

        // Name of the currency than was problematic (if applicable).
        currency?: string;

        // Expected type (if applicable).
        type_expected?: string;

        // Type that was provided instead (if applicable).
        type_actual?: string;
    }


    // Delivery location, loosely modeled as a subset of
    // ISO20022's PostalAddress25.
    interface Tax {
        // the name of the tax
        name: string;

        // amount paid in tax
        tax: Amount;
    }

    interface Auditor {
        // official name
        name: string;

        // Auditor's public key
        auditor_pub: EddsaPublicKey;

        // Base URL of the auditor
        url: string;
    }
    interface Exchange {
        // the exchange's base URL
        url: string;

        // master public key of the exchange
        master_pub: EddsaPublicKey;
    }

    interface Product {
        // merchant-internal identifier for the product.
        product_id?: string;

        // Human-readable product description.
        description: string;

        // Map from IETF BCP 47 language tags to localized descriptions
        description_i18n?: { [lang_tag: string]: string };

        // The number of units of the product to deliver to the customer.
        quantity: Integer;

        // The unit in which the product is measured (liters, kilograms, packages, etc.)
        unit: string;

        // The price of the product; this is the total price for quantity times unit of this product.
        price: Amount;

        // An optional base64-encoded product image
        image: ImageDataUrl;

        // a list of taxes paid by the merchant for this product. Can be empty.
        taxes: Tax[];

        // time indicating when this product should be delivered
        delivery_date?: Timestamp;
    }
    interface Merchant {
        // label for a location with the business address of the merchant
        address: Location;

        // the merchant's legal name of business
        name: string;

        // label for a location that denotes the jurisdiction for disputes.
        // Some of the typical fields for a location (such as a street address) may be absent.
        jurisdiction: Location;
    }

    interface VersionResponse {
        // libtool-style representation of the Merchant protocol version, see
        // https://www.gnu.org/software/libtool/manual/html_node/Versioning.html#Versioning
        // The format is "current:revision:age".
        version: string;

        // Name of the protocol.
        name: "taler-merchant";

        // Currency supported by this backend.
        currency: string;

    }
    interface Location {
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
    namespace Instances {

        //POST /private/instances/$INSTANCE/auth
        interface InstanceAuthConfigurationMessage {
            // Type of authentication.
            // "external":  The mechant backend does not do
            //   any authentication checks.  Instead an API
            //   gateway must do the authentication.
            // "token": The merchant checks an auth token.
            //   See "token" for details.
            method: "external" | "token";

            // For method "external", this field is mandatory.
            // The token MUST begin with the string "secret-token:".
            // After the auth token has been set (with method "token"),
            // the value must be provided in a "Authorization: Bearer $token"
            // header.
            token?: string;

        }
        //POST /private/instances
        interface InstanceConfigurationMessage {
            // The URI where the wallet will send coins.  A merchant may have
            // multiple accounts, thus this is an array.  Note that by
            // removing URIs from this list the respective account is set to
            // inactive and thus unavailable for new contracts, but preserved
            // in the database as existing offers and contracts may still refer
            // to it.
            payto_uris: string[];

            // Name of the merchant instance to create (will become $INSTANCE).
            id: string;

            // Merchant name corresponding to this instance.
            name: string;

            // "Authentication" header required to authorize management access the instance.
            // Optional, if not given authentication will be disabled for
            // this instance (hopefully authentication checks are still
            // done by some reverse proxy).
            auth: InstanceAuthConfigurationMessage;

            // The merchant's physical address (to be put into contracts).
            address: Location;

            // The jurisdiction under which the merchant conducts its business
            // (to be put into contracts).
            jurisdiction: Location;

            // Maximum wire fee this instance is willing to pay.
            // Can be overridden by the frontend on a per-order basis.
            default_max_wire_fee: Amount;

            // Default factor for wire fee amortization calculations.
            // Can be overridden by the frontend on a per-order basis.
            default_wire_fee_amortization: Integer;

            // Maximum deposit fee (sum over all coins) this instance is willing to pay.
            // Can be overridden by the frontend on a per-order basis.
            default_max_deposit_fee: Amount;

            //  If the frontend does NOT specify an execution date, how long should
            // we tell the exchange to wait to aggregate transactions before
            // executing the wire transfer?  This delay is added to the current
            // time when we generate the advisory execution time for the exchange.
            default_wire_transfer_delay: RelativeTime;

            // If the frontend does NOT specify a payment deadline, how long should
            // offers we make be valid by default?
            default_pay_delay: RelativeTime;

        }

        // PATCH /private/instances/$INSTANCE
        interface InstanceReconfigurationMessage {
            // The URI where the wallet will send coins.  A merchant may have
            // multiple accounts, thus this is an array.  Note that by
            // removing URIs from this list
            payto_uris: string[];

            // Merchant name corresponding to this instance.
            name: string;

            // The merchant's physical address (to be put into contracts).
            address: Location;

            // The jurisdiction under which the merchant conducts its business
            // (to be put into contracts).
            jurisdiction: Location;

            // Maximum wire fee this instance is willing to pay.
            // Can be overridden by the frontend on a per-order basis.
            default_max_wire_fee: Amount;

            // Default factor for wire fee amortization calculations.
            // Can be overridden by the frontend on a per-order basis.
            default_wire_fee_amortization: Integer;

            // Maximum deposit fee (sum over all coins) this instance is willing to pay.
            // Can be overridden by the frontend on a per-order basis.
            default_max_deposit_fee: Amount;

            //  If the frontend does NOT specify an execution date, how long should
            // we tell the exchange to wait to aggregate transactions before
            // executing the wire transfer?  This delay is added to the current
            // time when we generate the advisory execution time for the exchange.
            default_wire_transfer_delay: RelativeTime;

            // If the frontend does NOT specify a payment deadline, how long should
            // offers we make be valid by default?
            default_pay_delay: RelativeTime;

        }

        //   GET /private/instances
        interface InstancesResponse {
            // List of instances that are present in the backend (see Instance)
            instances: Instance[];
        }

        interface Instance {
            // Merchant name corresponding to this instance.
            name: string;

            deleted?: boolean;

            // Merchant instance this response is about ($INSTANCE)
            id: string;

            // Public key of the merchant/instance, in Crockford Base32 encoding.
            merchant_pub: EddsaPublicKey;

            // List of the payment targets supported by this instance. Clients can
            // specify the desired payment target in /order requests.  Note that
            // front-ends do not have to support wallets selecting payment targets.
            payment_targets: string[];

        }

        //GET /private/instances/$INSTANCE
        interface QueryInstancesResponse {
            // The URI where the wallet will send coins.  A merchant may have
            // multiple accounts, thus this is an array.
            accounts: MerchantAccount[];

            // Merchant name corresponding to this instance.
            name: string;

            // Public key of the merchant/instance, in Crockford Base32 encoding.
            merchant_pub: EddsaPublicKey;

            // The merchant's physical address (to be put into contracts).
            address: Location;

            // The jurisdiction under which the merchant conducts its business
            // (to be put into contracts).
            jurisdiction: Location;

            // Maximum wire fee this instance is willing to pay.
            // Can be overridden by the frontend on a per-order basis.
            default_max_wire_fee: Amount;

            // Default factor for wire fee amortization calculations.
            // Can be overridden by the frontend on a per-order basis.
            default_wire_fee_amortization: Integer;

            // Maximum deposit fee (sum over all coins) this instance is willing to pay.
            // Can be overridden by the frontend on a per-order basis.
            default_max_deposit_fee: Amount;

            //  If the frontend does NOT specify an execution date, how long should
            // we tell the exchange to wait to aggregate transactions before
            // executing the wire transfer?  This delay is added to the current
            // time when we generate the advisory execution time for the exchange.
            default_wire_transfer_delay: RelativeTime;

            // If the frontend does NOT specify a payment deadline, how long should
            // offers we make be valid by default?
            default_pay_delay: RelativeTime;

            // Authentication configuration.
            // Does not contain the token when token auth is configured.
            auth: {
                method: "external" | "token";
            };
        }

        interface MerchantAccount {

            // payto:// URI of the account.
            payto_uri: string;

            // Hash over the wire details (including over the salt)
            h_wire: HashCode;

            // salt used to compute h_wire
            salt: HashCode;

            // true if this account is active,
            // false if it is historic.
            active: boolean;
        }

        //   DELETE /private/instances/$INSTANCE


    }

    namespace Products {
        // POST /private/products
        interface ProductAddDetail {

            // product ID to use.
            product_id: string;

            // Human-readable product description.
            description: string;

            // Map from IETF BCP 47 language tags to localized descriptions
            description_i18n: { [lang_tag: string]: string };

            // unit in which the product is measured (liters, kilograms, packages, etc.)
            unit: string;

            // The price for one unit of the product. Zero is used
            // to imply that this product is not sold separately, or
            // that the price is not fixed, and must be supplied by the
            // front-end.  If non-zero, this price MUST include applicable
            // taxes.
            price: Amount;

            // An optional base64-encoded product image
            image: ImageDataUrl;

            // a list of taxes paid by the merchant for one unit of this product
            taxes: Tax[];

            // Number of units of the product in stock in sum in total,
            // including all existing sales ever. Given in product-specific
            // units.
            // A value of -1 indicates "infinite" (i.e. for "electronic" books).
            total_stock: Integer;

            // Identifies where the product is in stock.
            address: Location;

            // Identifies when we expect the next restocking to happen.
            next_restock?: Timestamp;

        }
        //   PATCH /private/products/$PRODUCT_ID
        interface ProductPatchDetail {

            // Human-readable product description.
            description: string;

            // Map from IETF BCP 47 language tags to localized descriptions
            description_i18n: { [lang_tag: string]: string };

            // unit in which the product is measured (liters, kilograms, packages, etc.)
            unit: string;

            // The price for one unit of the product. Zero is used
            // to imply that this product is not sold separately, or
            // that the price is not fixed, and must be supplied by the
            // front-end.  If non-zero, this price MUST include applicable
            // taxes.
            price: Amount;

            // An optional base64-encoded product image
            image: ImageDataUrl;

            // a list of taxes paid by the merchant for one unit of this product
            taxes: Tax[];

            // Number of units of the product in stock in sum in total,
            // including all existing sales ever. Given in product-specific
            // units.
            // A value of -1 indicates "infinite" (i.e. for "electronic" books).
            total_stock: Integer;

            // Number of units of the product that were lost (spoiled, stolen, etc.)
            total_lost: Integer;

            // Identifies where the product is in stock.
            address: Location;

            // Identifies when we expect the next restocking to happen.
            next_restock?: Timestamp;

        }

        // GET /private/products
        interface InventorySummaryResponse {
            // List of products that are present in the inventory
            products: InventoryEntry[];
        }
        interface InventoryEntry {
            // Product identifier, as found in the product.
            product_id: string;

        }

        // GET /private/products/$PRODUCT_ID
        interface ProductDetail {

            // Human-readable product description.
            description: string;

            // Map from IETF BCP 47 language tags to localized descriptions
            description_i18n: { [lang_tag: string]: string };

            // unit in which the product is measured (liters, kilograms, packages, etc.)
            unit: string;

            // The price for one unit of the product. Zero is used
            // to imply that this product is not sold separately, or
            // that the price is not fixed, and must be supplied by the
            // front-end.  If non-zero, this price MUST include applicable
            // taxes.
            price: Amount;

            // An optional base64-encoded product image
            image: ImageDataUrl;

            // a list of taxes paid by the merchant for one unit of this product
            taxes: Tax[];

            // Number of units of the product in stock in sum in total,
            // including all existing sales ever. Given in product-specific
            // units.
            // A value of -1 indicates "infinite" (i.e. for "electronic" books).
            total_stock: Integer;

            // Number of units of the product that have already been sold.
            total_sold: Integer;

            // Number of units of the product that were lost (spoiled, stolen, etc.)
            total_lost: Integer;

            // Identifies where the product is in stock.
            address: Location;

            // Identifies when we expect the next restocking to happen.
            next_restock?: Timestamp;

        }

        // POST /private/products/$PRODUCT_ID/lock
        interface LockRequest {

            // UUID that identifies the frontend performing the lock
            // It is suggested that clients use a timeflake for this,
            // see https://github.com/anthonynsimon/timeflake
            lock_uuid: UUID;

            // How long does the frontend intend to hold the lock
            duration: RelativeTime;

            // How many units should be locked?
            quantity: Integer;

        }

        //   DELETE /private/products/$PRODUCT_ID

    }

    namespace Orders {

        type MerchantOrderStatusResponse = CheckPaymentPaidResponse |
            CheckPaymentClaimedResponse |
            CheckPaymentUnpaidResponse;
        interface CheckPaymentPaidResponse {
            // The customer paid for this contract.
            order_status: "paid";

            // Was the payment refunded (even partially)?
            refunded: boolean;

            // True if there are any approved refunds that the wallet has
            // not yet obtained.
            refund_pending: boolean;

            // Did the exchange wire us the funds?
            wired: boolean;

            // Total amount the exchange deposited into our bank account
            // for this contract, excluding fees.
            deposit_total: Amount;

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
            refund_amount: Amount;

            // Contract terms.
            contract_terms: ContractTerms;

            // The wire transfer status from the exchange for this order if
            // available, otherwise empty array.
            wire_details: TransactionWireTransfer[];

            // Reports about trouble obtaining wire transfer details,
            // empty array if no trouble were encountered.
            wire_reports: TransactionWireReport[];

            // The refund details for this order.  One entry per
            // refunded coin; empty array if there are no refunds.
            refund_details: RefundDetails[];

            // Status URL, can be used as a redirect target for the browser
            // to show the order QR code / trigger the wallet.
            order_status_url: string;
        }
        interface CheckPaymentClaimedResponse {
            // A wallet claimed the order, but did not yet pay for the contract.
            order_status: "claimed";

            // Contract terms.
            contract_terms: ContractTerms;

        }
        interface CheckPaymentUnpaidResponse {
            // The order was neither claimed nor paid.
            order_status: "unpaid";

            // when was the order created
            creation_time: Timestamp;

            // Order summary text.
            summary: string;

            // Total amount of the order (to be paid by the customer).
            total_amount: Amount;

            // URI that the wallet must process to complete the payment.
            taler_pay_uri: string;

            // Alternative order ID which was paid for already in the same session.
            // Only given if the same product was purchased before in the same session.
            already_paid_order_id?: string;

            // Fulfillment URL of an already paid order. Only given if under this
            // session an already paid order with a fulfillment URL exists.
            already_paid_fulfillment_url?: string;

            // Status URL, can be used as a redirect target for the browser
            // to show the order QR code / trigger the wallet.
            order_status_url: string;

            // We do we NOT return the contract terms here because they may not
            // exist in case the wallet did not yet claim them.
        }
        interface RefundDetails {
            // Reason given for the refund.
            reason: string;

            // When was the refund approved.
            timestamp: Timestamp;

            // Total amount that was refunded (minus a refund fee).
            amount: Amount;
        }
        interface TransactionWireTransfer {
            // Responsible exchange.
            exchange_url: string;

            // 32-byte wire transfer identifier.
            wtid: Base32;

            // Execution time of the wire transfer.
            execution_time: Timestamp;

            // Total amount that has been wire transferred
            // to the merchant.
            amount: Amount;

            // Was this transfer confirmed by the merchant via the
            // POST /transfers API, or is it merely claimed by the exchange?
            confirmed: boolean;
        }
        interface TransactionWireReport {
            // Numerical error code.
            code: number;

            // Human-readable error description.
            hint: string;

            // Numerical error code from the exchange.
            exchange_ec: number;

            // HTTP status code received from the exchange.
            exchange_hc: number;

            // Public key of the coin for which we got the exchange error.
            coin_pub: CoinPublicKey;
        }

        interface OrderHistory {
            // timestamp-sorted array of all orders matching the query.
            // The order of the sorting depends on the sign of delta.
            orders: OrderHistoryEntry[];
        }
        interface OrderHistoryEntry {

            // order ID of the transaction related to this entry.
            order_id: string;

            // row ID of the order in the database
            row_id: number;

            // when the order was created
            timestamp: Timestamp;

            // the amount of money the order is for
            amount: Amount;

            // the summary of the order
            summary: string;

            // whether some part of the order is refundable,
            // that is the refund deadline has not yet expired
            // and the total amount refunded so far is below
            // the value of the original transaction.
            refundable: boolean;

            // whether the order has been paid or not
            paid: boolean;
        }

        interface PostOrderRequest {
            // The order must at least contain the minimal
            // order detail, but can override all
            order: Order;

            // if set, the backend will then set the refund deadline to the current
            // time plus the specified delay.  If it's not set, refunds will not be
            // possible.
            refund_delay?: RelativeTime;

            // specifies the payment target preferred by the client. Can be used
            // to select among the various (active) wire methods supported by the instance.
            payment_target?: string;

            // specifies that some products are to be included in the
            // order from the inventory.  For these inventory management
            // is performed (so the products must be in stock) and
            // details are completed from the product data of the backend.
            inventory_products?: MinimalInventoryProduct[];

            // Specifies a lock identifier that was used to
            // lock a product in the inventory.  Only useful if
            // manage_inventory is set.  Used in case a frontend
            // reserved quantities of the individual products while
            // the shopping card was being built.  Multiple UUIDs can
            // be used in case different UUIDs were used for different
            // products (i.e. in case the user started with multiple
            // shopping sessions that were combined during checkout).
            lock_uuids?: UUID[];

            // Should a token for claiming the order be generated?
            // False can make sense if the ORDER_ID is sufficiently
            // high entropy to prevent adversarial claims (like it is
            // if the backend auto-generates one). Default is 'true'.
            create_token?: boolean;

        }
        type Order = MinimalOrderDetail | ContractTerms;

        interface MinimalOrderDetail {
            // Amount to be paid by the customer
            amount: Amount;

            // Short summary of the order
            summary: string;

            // URL that will show that the order was successful after
            // it has been paid for.  Optional. When POSTing to the
            // merchant, the placeholder "${ORDER_ID}" will be
            // replaced with the actual order ID (useful if the
            // order ID is generated server-side and needs to be
            // in the URL).
            fulfillment_url?: string;
        }

        interface MinimalInventoryProduct {
            // Which product is requested (here mandatory!)
            product_id: string;

            // How many units of the product are requested
            quantity: Integer;
        }
        interface PostOrderResponse {
            // Order ID of the response that was just created
            order_id: string;

            // Token that authorizes the wallet to claim the order.
            // Provided only if "create_token" was set to 'true'
            // in the request.
            token?: ClaimToken;
        }
        interface OutOfStockResponse {

            // Product ID of an out-of-stock item
            product_id: string;

            // Requested quantity
            requested_quantity: Integer;

            // Available quantity (must be below requested_quanitity)
            available_quantity: Integer;

            // When do we expect the product to be again in stock?
            // Optional, not given if unknown.
            restock_expected?: Timestamp;
        }

        interface ForgetRequest {

            // Array of valid JSON paths to forgettable fields in the order's
            // contract terms.
            fields: string[];
        }
        interface RefundRequest {
            // Amount to be refunded
            refund: Amount;

            // Human-readable refund justification
            reason: string;
        }
        interface MerchantRefundResponse {

            // URL (handled by the backend) that the wallet should access to
            // trigger refund processing.
            // taler://refund/...
            taler_refund_uri: string;

            // Contract hash that a client may need to authenticate an
            // HTTP request to obtain the above URI in a wallet-friendly way.
            h_contract: HashCode;
        }

    }

    namespace Tips {

        // GET /private/reserves
        interface TippingReserveStatus {
            // Array of all known reserves (possibly empty!)
            reserves: ReserveStatusEntry[];
        }
        interface ReserveStatusEntry {
            // Public key of the reserve
            reserve_pub: EddsaPublicKey;

            // Timestamp when it was established
            creation_time: Timestamp;

            // Timestamp when it expires
            expiration_time: Timestamp;

            // Initial amount as per reserve creation call
            merchant_initial_amount: Amount;

            // Initial amount as per exchange, 0 if exchange did
            // not confirm reserve creation yet.
            exchange_initial_amount: Amount;

            // Amount picked up so far.
            pickup_amount: Amount;

            // Amount approved for tips that exceeds the pickup_amount.
            committed_amount: Amount;

            // Is this reserve active (false if it was deleted but not purged)
            active: boolean;
        }

        interface ReserveCreateRequest {
            // Amount that the merchant promises to put into the reserve
            initial_balance: Amount;

            // Exchange the merchant intends to use for tipping
            exchange_url: string;

            // Desired wire method, for example "iban" or "x-taler-bank"
            wire_method: string;
        }
        interface ReserveCreateConfirmation {
            // Public key identifying the reserve
            reserve_pub: EddsaPublicKey;

            // Wire account of the exchange where to transfer the funds
            payto_uri: string;
        }
        interface TipCreateRequest {
            // Amount that the customer should be tipped
            amount: Amount;

            // Justification for giving the tip
            justification: string;

            // URL that the user should be directed to after tipping,
            // will be included in the tip_token.
            next_url: string;
        }
        interface TipCreateConfirmation {
            // Unique tip identifier for the tip that was created.
            tip_id: HashCode;

            // taler://tip URI for the tip
            taler_tip_uri: string;

            // URL that will directly trigger processing
            // the tip when the browser is redirected to it
            tip_status_url: string;

            // when does the tip expire
            tip_expiration: Timestamp;
        }

        interface ReserveDetail {
            // Timestamp when it was established.
            creation_time: Timestamp;

            // Timestamp when it expires.
            expiration_time: Timestamp;

            // Initial amount as per reserve creation call.
            merchant_initial_amount: Amount;

            // Initial amount as per exchange, 0 if exchange did
            // not confirm reserve creation yet.
            exchange_initial_amount: Amount;

            // Amount picked up so far.
            pickup_amount: Amount;

            // Amount approved for tips that exceeds the pickup_amount.
            committed_amount: Amount;

            // Array of all tips created by this reserves (possibly empty!).
            // Only present if asked for explicitly.
            tips?: TipStatusEntry[];

            // Is this reserve active (false if it was deleted but not purged)?
            active: boolean;

            // URI to use to fill the reserve, can be NULL
            // if the reserve is inactive or was already filled
            payto_uri: string;

            // URL of the exchange hosting the reserve,
            // NULL if the reserve is inactive
            exchange_url: string;

        }

        interface TipStatusEntry {

            // Unique identifier for the tip.
            tip_id: HashCode;

            // Total amount of the tip that can be withdrawn.
            total_amount: Amount;

            // Human-readable reason for why the tip was granted.
            reason: string;
        }

        interface TipDetails {
            // Amount that we authorized for this tip.
            total_authorized: Amount;

            // Amount that was picked up by the user already.
            total_picked_up: Amount;

            // Human-readable reason given when authorizing the tip.
            reason: string;

            // Timestamp indicating when the tip is set to expire (may be in the past).
            expiration: TalerProtocolTimestamp;

            // Reserve public key from which the tip is funded.
            reserve_pub: EddsaPublicKey;

            // Array showing the pickup operations of the wallet (possibly empty!).
            // Only present if asked for explicitly.
            pickups?: PickupDetail[];
        }
        interface PickupDetail {
            // Unique identifier for the pickup operation.
            pickup_id: HashCode;

            // Number of planchets involved.
            num_planchets: Integer;

            // Total amount requested for this pickup_id.
            requested_amount: Amount;
        }

    }

    namespace Transfers {

        interface TransferList {
            // list of all the transfers that fit the filter that we know
            transfers: TransferDetails[];
        }
        interface TransferDetails {
            // how much was wired to the merchant (minus fees)
            credit_amount: Amount;

            // raw wire transfer identifier identifying the wire transfer (a base32-encoded value)
            wtid: string;

            // target account that received the wire transfer
            payto_uri: string;

            // base URL of the exchange that made the wire transfer
            exchange_url: string;

            // Serial number identifying the transfer in the merchant backend.
            // Used for filgering via offset.
            transfer_serial_id: number;

            // Time of the execution of the wire transfer by the exchange, according to the exchange
            // Only provided if we did get an answer from the exchange.
            execution_time?: Timestamp;

            // True if we checked the exchange's answer and are happy with it.
            // False if we have an answer and are unhappy, missing if we
            // do not have an answer from the exchange.
            verified?: boolean;

            // True if the merchant uses the POST /transfers API to confirm
            // that this wire transfer took place (and it is thus not
            // something merely claimed by the exchange).
            confirmed?: boolean;
        }

        interface TransferInformation {
            // how much was wired to the merchant (minus fees)
            credit_amount: Amount;

            // raw wire transfer identifier identifying the wire transfer (a base32-encoded value)
            wtid: WireTransferIdentifierRawP;

            // target account that received the wire transfer
            payto_uri: string;

            // base URL of the exchange that made the wire transfer
            exchange_url: string;
        }
        interface MerchantTrackTransferResponse {
            // Total amount transferred
            total: Amount;

            // Applicable wire fee that was charged
            wire_fee: Amount;

            // Time of the execution of the wire transfer by the exchange, according to the exchange
            execution_time: Timestamp;

            // details about the deposits
            deposits_sums: MerchantTrackTransferDetail[];
        }
        interface MerchantTrackTransferDetail {
            // Business activity associated with the wire transferred amount
            // deposit_value.
            order_id: string;

            // The total amount the exchange paid back for order_id.
            deposit_value: Amount;

            // applicable fees for the deposit
            deposit_fee: Amount;
        }

        type ExchangeConflictDetails = WireFeeConflictDetails | TrackTransferConflictDetails
        // Note: this is not the full 'proof' of missbehavior, as
        // the bogus message from the exchange with a signature
        // over the 'different' wire fee is missing.
        //
        // This information is NOT provided by the current implementation,
        // because this would be quite expensive to generate and is
        // hardly needed _here_. Once we add automated reports for
        // the Taler auditor, we need to generate this data anyway
        // and should probably return it here as well.
        interface WireFeeConflictDetails {
            // Numerical error code:
            code: "TALER_EC_MERCHANT_PRIVATE_POST_TRANSFERS_BAD_WIRE_FEE";

            // Text describing the issue for humans.
            hint: string;


            // Wire fee (wrongly) charged by the exchange, breaking the
            // contract affirmed by the exchange_sig.
            wire_fee: Amount;

            // Timestamp of the wire transfer
            execution_time: Timestamp;

            // The expected wire fee (as signed by the exchange)
            expected_wire_fee: Amount;

            // Expected closing fee (needed to verify signature)
            expected_closing_fee: Amount;

            // Start date of the expected fee structure
            start_date: Timestamp;

            // End date of the expected fee structure
            end_date: Timestamp;

            // Signature of the exchange affirming the expected fee structure
            master_sig: EddsaSignature;

            // Master public key of the exchange
            master_pub: EddsaPublicKey;
        }
        interface TrackTransferConflictDetails {
            // Numerical error code
            code: "TALER_EC_MERCHANT_PRIVATE_POST_TRANSFERS_CONFLICTING_REPORTS";

            // Text describing the issue for humans.
            hint: string;

            // Offset in the exchange_transfer where the
            // exchange's response fails to match the exchange_deposit_proof.
            conflict_offset: number;

            // The response from the exchange which tells us when the
            // coin was returned to us, except that it does not match
            // the expected value of the coin.
            //
            // This field is NOT provided by the current implementation,
            // because this would be quite expensive to generate and is
            // hardly needed _here_. Once we add automated reports for
            // the Taler auditor, we need to generate this data anyway
            // and should probably return it here as well.
            // exchange_transfer?: TrackTransferResponse;

            // Public key of the exchange used to sign the response to
            // our deposit request.
            deposit_exchange_pub: EddsaPublicKey;

            // Signature of the exchange signing the (conflicting) response.
            // Signs over a struct TALER_DepositConfirmationPS.
            deposit_exchange_sig: EddsaSignature;

            // Hash of the merchant's bank account the wire transfer went to
            h_wire: HashCode;

            // Hash of the contract terms with the conflicting deposit.
            h_contract_terms: HashCode;

            // At what time the exchange received the deposit.  Needed
            // to verify the \exchange_sig\.
            deposit_timestamp: Timestamp;

            // At what time the refund possibility expired (needed to verify exchange_sig).
            refund_deadline: Timestamp;

            // Public key of the coin for which we have conflicting information.
            coin_pub: EddsaPublicKey;

            // Amount the exchange counted the coin for in the transfer.
            amount_with_fee: Amount;

            // Expected value of the coin.
            coin_value: Amount;

            // Expected deposit fee of the coin.
            coin_fee: Amount;

            // Expected deposit fee of the coin.
            deposit_fee: Amount;

        }

        // interface TrackTransferProof {
        //     // signature from the exchange made with purpose
        //     // TALER_SIGNATURE_EXCHANGE_CONFIRM_WIRE_DEPOSIT
        //     exchange_sig: EddsaSignature;

        //     // public EdDSA key of the exchange that was used to generate the signature.
        //     // Should match one of the exchange's signing keys from /keys.  Again given
        //     // explicitly as the client might otherwise be confused by clock skew as to
        //     // which signing key was used.
        //     exchange_pub: EddsaSignature;

        //     // hash of the wire details (identical for all deposits)
        //     // Needed to check the exchange_sig
        //     h_wire: HashCode;
        // }

    }


    interface ContractTerms {
        // Human-readable description of the whole purchase
        summary: string;

        // Map from IETF BCP 47 language tags to localized summaries
        summary_i18n?: { [lang_tag: string]: string };

        // Unique, free-form identifier for the proposal.
        // Must be unique within a merchant instance.
        // For merchants that do not store proposals in their DB
        // before the customer paid for them, the order_id can be used
        // by the frontend to restore a proposal from the information
        // encoded in it (such as a short product identifier and timestamp).
        order_id: string;

        // Total price for the transaction.
        // The exchange will subtract deposit fees from that amount
        // before transferring it to the merchant.
        amount: Amount;

        // The URL for this purchase.  Every time is is visited, the merchant
        // will send back to the customer the same proposal.  Clearly, this URL
        // can be bookmarked and shared by users.
        fulfillment_url?: string;

        // Maximum total deposit fee accepted by the merchant for this contract
        max_fee: Amount;

        // Maximum wire fee accepted by the merchant (customer share to be
        // divided by the 'wire_fee_amortization' factor, and further reduced
        // if deposit fees are below 'max_fee').  Default if missing is zero.
        max_wire_fee: Amount;

        // Over how many customer transactions does the merchant expect to
        // amortize wire fees on average?  If the exchange's wire fee is
        // above 'max_wire_fee', the difference is divided by this number
        // to compute the expected customer's contribution to the wire fee.
        // The customer's contribution may further be reduced by the difference
        // between the 'max_fee' and the sum of the actual deposit fees.
        // Optional, default value if missing is 1.  0 and negative values are
        // invalid and also interpreted as 1.
        wire_fee_amortization: number;

        // List of products that are part of the purchase (see Product).
        products: Product[];

        // Time when this contract was generated
        timestamp: TalerProtocolTimestamp;

        // After this deadline has passed, no refunds will be accepted.
        refund_deadline: TalerProtocolTimestamp;

        // After this deadline, the merchant won't accept payments for the contact
        pay_deadline: TalerProtocolTimestamp;

        // Transfer deadline for the exchange.  Must be in the
        // deposit permissions of coins used to pay for this order.
        wire_transfer_deadline: TalerProtocolTimestamp;

        // Merchant's public key used to sign this proposal; this information
        // is typically added by the backend Note that this can be an ephemeral key.
        merchant_pub: EddsaPublicKey;

        // Base URL of the (public!) merchant backend API.
        // Must be an absolute URL that ends with a slash.
        merchant_base_url: string;

        // More info about the merchant, see below
        merchant: Merchant;

        // The hash of the merchant instance's wire details.
        h_wire: HashCode;

        // Wire transfer method identifier for the wire method associated with h_wire.
        // The wallet may only select exchanges via a matching auditor if the
        // exchange also supports this wire method.
        // The wire transfer fees must be added based on this wire transfer method.
        wire_method: string;

        // Any exchanges audited by these auditors are accepted by the merchant.
        auditors: Auditor[];

        // Exchanges that the merchant accepts even if it does not accept any auditors that audit them.
        exchanges: Exchange[];

        // Delivery location for (all!) products.
        delivery_location?: Location;

        // Time indicating when the order should be delivered.
        // May be overwritten by individual products.
        delivery_date?: TalerProtocolTimestamp;

        // Nonce generated by the wallet and echoed by the merchant
        // in this field when the proposal is generated.
        nonce: string;

        // Specifies for how long the wallet should try to get an
        // automatic refund for the purchase. If this field is
        // present, the wallet should wait for a few seconds after
        // the purchase and then automatically attempt to obtain
        // a refund.  The wallet should probe until "delay"
        // after the payment was successful (i.e. via long polling
        // or via explicit requests with exponential back-off).
        //
        // In particular, if the wallet is offline
        // at that time, it MUST repeat the request until it gets
        // one response from the merchant after the delay has expired.
        // If the refund is granted, the wallet MUST automatically
        // recover the payment.  This is used in case a merchant
        // knows that it might be unable to satisfy the contract and
        // desires for the wallet to attempt to get the refund without any
        // customer interaction.  Note that it is NOT an error if the
        // merchant does not grant a refund.
        auto_refund?: RelativeTime;

        // Extra data that is only interpreted by the merchant frontend.
        // Useful when the merchant needs to store extra information on a
        // contract without storing it separately in their database.
        extra?: any;
    }

}
