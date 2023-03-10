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
  buildCodecForObject,
  buildCodecForUnion,
  Codec,
  codecForAmountString,
  codecForAny,
  codecForConstString,
  codecForNumber,
  codecForString,
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
  provider_salt: string;

  /**
   * Human-readable business name of the provider.
   */
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

export type ChallengeInstructionMessage =
  | FileChallengeInstructionMessage
  | IbanChallengeInstructionMessage
  | PinChallengeInstructionMessage;

export interface IbanChallengeInstructionMessage {
  // What kind of challenge is this?
  challenge_type: "IBAN_WIRE";

  wire_details: {
    // How much should be wired?
    challenge_amount: AmountString;

    // What is the target IBAN?
    credit_iban: string;

    // What is the receiver name?
    business_name: string;

    // What is the expected wire transfer subject?
    wire_transfer_subject: string;

    // What is the numeric code (also part of the
    // wire transfer subject) to be hashed when
    // solving the challenge?
    answer_code: number;

    // Hint about the origin account that must be used.
    debit_account_hint: string;
  };
}

export interface PinChallengeInstructionMessage {
  // What kind of challenge is this?
  challenge_type: "TAN_SENT";

  // Where was the PIN code sent? Note that this
  // address will most likely have been obscured
  // to improve privacy.
  tan_address_hint: string;
}

export interface FileChallengeInstructionMessage {
  // What kind of challenge is this?
  challenge_type: "FILE_WRITTEN";

  // Name of the file where the PIN code was written.
  filename: string;
}

export const codecForFileChallengeInstructionMessage =
  (): Codec<FileChallengeInstructionMessage> =>
    buildCodecForObject<FileChallengeInstructionMessage>()
      .property("challenge_type", codecForConstString("FILE_WRITTEN"))
      .property("filename", codecForString())
      .build("FileChallengeInstructionMessage");

export const codecForPinChallengeInstructionMessage =
  (): Codec<PinChallengeInstructionMessage> =>
    buildCodecForObject<PinChallengeInstructionMessage>()
      .property("challenge_type", codecForConstString("TAN_SENT"))
      .property("tan_address_hint", codecForString())
      .build("PinChallengeInstructionMessage");

export const codecForIbanChallengeInstructionMessage =
  (): Codec<IbanChallengeInstructionMessage> =>
    buildCodecForObject<IbanChallengeInstructionMessage>()
      .property("challenge_type", codecForConstString("IBAN_WIRE"))
      .property("wire_details", codecForAny())
      .build("IbanChallengeInstructionMessage");

export const codecForChallengeInstructionMessage =
  (): Codec<ChallengeInstructionMessage> =>
    buildCodecForUnion<ChallengeInstructionMessage>()
      .discriminateOn("challenge_type")
      .alternative("FILE_WRITTEN", codecForFileChallengeInstructionMessage())
      .alternative("IBAN_WIRE", codecForIbanChallengeInstructionMessage())
      .alternative("TAN_SENT", codecForPinChallengeInstructionMessage())
      .build("ChallengeInstructionMessage");
