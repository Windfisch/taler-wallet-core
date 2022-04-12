/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  AmountString,
  TalerProtocolTimestamp,
} from "@gnu-taler/taler-util";

export interface EscrowConfigurationResponse {
  // Protocol identifier, clarifies that this is an Anastasis provider.
  name: "anastasis";

  // libtool-style representation of the Exchange protocol version, see
  // https://www.gnu.org/software/libtool/manual/html_node/Versioning.html#Versioning
  // The format is "current:revision:age".
  version: string;

  // Currency in which this provider processes payments.
  currency: string;

  // Supported authorization methods.
  methods: AuthorizationMethodConfig[];

  // Maximum policy upload size supported.
  storage_limit_in_megabytes: number;

  // Payment required to maintain an account to store policy documents for a year.
  // Users can pay more, in which case the storage time will go up proportionally.
  annual_fee: AmountString;

  // Payment required to upload truth.  To be paid per upload.
  truth_upload_fee: AmountString;

  // Limit on the liability that the provider is offering with
  // respect to the services provided.
  liability_limit: AmountString;

  // Salt value with 128 bits of entropy.
  // Different providers
  // will use different high-entropy salt values. The resulting
  // **provider salt** is then used in various operations to ensure
  // cryptographic operations differ by provider.  A provider must
  // never change its salt value.
  server_salt: string;

  business_name: string;
}

export interface AuthorizationMethodConfig {
  // Name of the authorization method.
  type: string;

  // Fee for accessing key share using this method.
  cost: AmountString;
}

export interface TruthUploadRequest {
  // Contains the information of an interface EncryptedKeyShare, but simply
  // as one binary block (in Crockford Base32 encoding for JSON).
  key_share_data: string;

  // Key share method, i.e. "security question", "SMS", "e-mail", ...
  type: string;

  // Variable-size truth. After decryption,
  // this contains the ground truth, i.e. H(challenge answer),
  // phone number, e-mail address, picture, fingerprint, ...
  // **base32 encoded**.
  //
  // The nonce of the HKDF for this encryption must include the
  // string "ECT".
  encrypted_truth: string; //bytearray

  // MIME type of truth, i.e. text/ascii, image/jpeg, etc.
  truth_mime?: string;

  // For how many years from now would the client like us to
  // store the truth?
  storage_duration_years: number;
}

export interface IbanExternalAuthResponse {
  method: "iban";
  answer_code: number;
  details: {
    challenge_amount: AmountString;
    credit_iban: string;
    business_name: string;
    wire_transfer_subject: string;
  };
}

export interface RecoveryMetaResponse {
  /**
   * Version numbers as a string (!) are used as keys.
   */
  [version: string]: RecoveryMetaDataItem;
}

export interface RecoveryMetaDataItem {
  // The meta value can be NULL if the document
  // exists but no meta data was provided.
  meta?: string;

  // Server-time indicative of when the recovery
  // document was uploaded.
  upload_time: TalerProtocolTimestamp;
}
