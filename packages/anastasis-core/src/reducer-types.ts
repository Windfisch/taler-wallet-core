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
  codecForAny,
  codecForList,
  codecForNumber,
  codecForString,
  codecForTimestamp,
  TalerProtocolTimestamp,
} from "@gnu-taler/taler-util";
import { ChallengeFeedback } from "./challenge-feedback-types.js";
import { KeyShare } from "./crypto.js";
import { RecoveryDocument } from "./recovery-document-types.js";

export type ReducerState =
  | ReducerStateBackup
  | ReducerStateRecovery
  | ReducerStateError;

export interface ContinentInfo {
  name: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  continent: string;
}

export interface Policy {
  methods: {
    authentication_method: number;
    provider: string;
  }[];
}

export interface PolicyProvider {
  provider_url: string;
}

export interface SuccessDetails {
  [provider_url: string]: {
    policy_version: number;
    policy_expiration: TalerProtocolTimestamp;
  };
}

export interface CoreSecret {
  mime: string;
  value: string;
  /**
   * Filename, only set if the secret comes from
   * a file.  Should be set unless the mime type is "text/plain";
   */
  filename?: string;
}

export interface ReducerStateBackup {
  reducer_type: "backup";

  backup_state: BackupStates;

  continents?: ContinentInfo[];

  countries?: CountryInfo[];

  identity_attributes?: { [n: string]: string };

  authentication_providers?: { [url: string]: AuthenticationProviderStatus };

  authentication_methods?: AuthMethod[];

  required_attributes?: UserAttributeSpec[];

  selected_continent?: string;

  selected_country?: string;

  secret_name?: string;

  policies?: Policy[];

  recovery_data?: {
    /**
     * Map from truth key (`${methodIndex}/${providerUrl}`) to
     * the truth metadata.
     */
    truth_metadata: Record<string, TruthMetaData>;
    recovery_document: RecoveryDocument;
  };

  /**
   * Policy providers are providers that we checked to be functional
   * and that are actually used in policies.
   */
  policy_providers?: PolicyProvider[];
  success_details?: SuccessDetails;

  /**
   * Currently requested payments.
   *
   * List of taler://pay URIs.
   *
   * FIXME: There should be more information in this,
   * including the provider and amount.
   */
  payments?: string[];

  /**
   * FIXME: Why is this not a map from provider to payto?
   */
  policy_payment_requests?: {
    /**
     * FIXME: This is not a payto URI, right?!
     */
    payto: string;
    provider: string;
  }[];

  core_secret?: CoreSecret;

  expiration?: TalerProtocolTimestamp;

  upload_fees?: { fee: AmountString }[];

  // FIXME: The payment secrets and pay URIs should
  // probably be consolidated into a single field.
  truth_upload_payment_secrets?: Record<string, string>;
}

export interface AuthMethod {
  type: string;
  instructions: string;
  challenge: string;
  mime_type?: string;
}

export interface ChallengeInfo {
  cost: string;
  instructions: string;
  type: string;
  uuid: string;
}

export interface UserAttributeSpec {
  label: string;
  name: string;
  type: string;
  uuid: string;
  widget: string;
  optional?: boolean;
  "validation-regex": string | undefined;
  "validation-logic": string | undefined;
  autocomplete?: string;
}

export interface RecoveryInternalData {
  secret_name: string;
  provider_url: string;
  version: number;
}

export interface RecoveryInformation {
  challenges: ChallengeInfo[];
  policies: {
    /**
     * UUID of the associated challenge.
     */
    uuid: string;
  }[][];
}

export interface ReducerStateRecovery {
  reducer_type: "recovery";

  recovery_state: RecoveryStates;

  identity_attributes?: { [n: string]: string };

  continents?: ContinentInfo[];
  countries?: CountryInfo[];

  selected_continent?: string;
  selected_country?: string;

  required_attributes?: UserAttributeSpec[];

  /**
   * Recovery information, used by the UI.
   */
  recovery_information?: RecoveryInformation;

  // FIXME: This should really be renamed to recovery_internal_data
  recovery_document?: RecoveryInternalData;

  // FIXME: The C reducer should also use this!
  verbatim_recovery_document?: RecoveryDocument;

  selected_challenge_uuid?: string;

  /**
   * Explicitly selected version by the user.
   */
  selected_version?: SelectedVersionInfo;

  challenge_feedback?: { [uuid: string]: ChallengeFeedback };

  /**
   * Key shares that we managed to recover so far.
   */
  recovered_key_shares?: { [truth_uuid: string]: KeyShare };

  core_secret?: {
    mime: string;
    value: string;
  };

  authentication_providers?: { [url: string]: AuthenticationProviderStatus };
}

/**
 * Truth data as stored in the reducer.
 */
export interface TruthMetaData {
  uuid: string;

  key_share: string;

  policy_index: number;

  pol_method_index: number;

  /**
   * Nonce used for encrypting the truth.
   */
  nonce: string;

  /**
   * Key that the truth (i.e. secret question answer, email address, mobile number, ...)
   * is encrypted with when stored at the provider.
   */
  truth_key: string;

  /**
   * Truth-specific salt.
   */
  master_salt: string;
}

export interface ReducerStateError {
  reducer_type: "error";
  code: number;
  hint?: string;
  detail?: string;
}

export enum BackupStates {
  ContinentSelecting = "CONTINENT_SELECTING",
  CountrySelecting = "COUNTRY_SELECTING",
  UserAttributesCollecting = "USER_ATTRIBUTES_COLLECTING",
  AuthenticationsEditing = "AUTHENTICATIONS_EDITING",
  PoliciesReviewing = "POLICIES_REVIEWING",
  SecretEditing = "SECRET_EDITING",
  TruthsPaying = "TRUTHS_PAYING",
  PoliciesPaying = "POLICIES_PAYING",
  BackupFinished = "BACKUP_FINISHED",
}

export enum RecoveryStates {
  ContinentSelecting = "CONTINENT_SELECTING",
  CountrySelecting = "COUNTRY_SELECTING",
  UserAttributesCollecting = "USER_ATTRIBUTES_COLLECTING",
  SecretSelecting = "SECRET_SELECTING",
  ChallengeSelecting = "CHALLENGE_SELECTING",
  ChallengePaying = "CHALLENGE_PAYING",
  ChallengeSolving = "CHALLENGE_SOLVING",
  RecoveryFinished = "RECOVERY_FINISHED",
}

export interface MethodSpec {
  type: string;
  usage_fee: string;
}

export type AuthenticationProviderStatusNotContacted = {
  status: "not-contacted";
};

export interface AuthenticationProviderStatusOk {
  status: "ok";

  annual_fee: string;
  business_name: string;
  currency: string;
  http_status: 200;
  liability_limit: string;
  provider_salt: string;
  storage_limit_in_megabytes: number;
  truth_upload_fee: string;
  methods: MethodSpec[];
  // FIXME: add timestamp?
}

export interface AuthenticationProviderStatusDisabled {
  status: "disabled";
}

export interface AuthenticationProviderStatusError {
  status: "error";

  http_status?: number;
  code: number;
  hint?: string;
  // FIXME: add timestamp?
}

export type AuthenticationProviderStatus =
  | AuthenticationProviderStatusNotContacted
  | AuthenticationProviderStatusDisabled
  | AuthenticationProviderStatusError
  | AuthenticationProviderStatusOk;

export interface ReducerStateBackupUserAttributesCollecting
  extends ReducerStateBackup {
  backup_state: BackupStates.UserAttributesCollecting;
  selected_country: string;
  currencies: string[];
  required_attributes: UserAttributeSpec[];
  authentication_providers: { [url: string]: AuthenticationProviderStatus };
}

export interface ActionArgsEnterUserAttributes {
  identity_attributes: Record<string, string>;
}

export const codecForActionArgsEnterUserAttributes = () =>
  buildCodecForObject<ActionArgsEnterUserAttributes>()
    .property("identity_attributes", codecForAny())
    .build("ActionArgsEnterUserAttributes");

export interface ActionArgsAddProvider {
  provider_url: string;
}

export interface ActionArgsDeleteProvider {
  provider_url: string;
}

export interface ActionArgsAddAuthentication {
  authentication_method: {
    type: string;
    instructions: string;
    challenge: string;
    mime?: string;
  };
}

export interface ActionArgsDeleteAuthentication {
  authentication_method: number;
}

export interface ActionArgsDeletePolicy {
  policy_index: number;
}

export interface ActionArgsEnterSecretName {
  name: string;
}

export interface ActionArgsEnterSecret {
  secret: {
    value: string;
    mime?: string;
  };
  expiration: TalerProtocolTimestamp;
}

export interface ActionArgsSelectContinent {
  continent: string;
}

export const codecForActionArgSelectContinent = () =>
  buildCodecForObject<ActionArgsSelectContinent>()
    .property("continent", codecForString())
    .build("ActionArgSelectContinent");

export interface ActionArgsSelectCountry {
  country_code: string;
}

export interface ActionArgsSelectChallenge {
  uuid: string;
}

export type ActionArgsSolveChallengeRequest =
  | SolveChallengeAnswerRequest
  | SolveChallengePinRequest
  | SolveChallengeHashRequest;

/**
 * Answer to a challenge.
 *
 * For "question" challenges, this is a string with the answer.
 *
 * For "sms" / "email" / "post" this is a numeric code with optionally
 * the "A-" prefix.
 */
export interface SolveChallengeAnswerRequest {
  answer: string;
}

/**
 * Answer to a challenge that requires a numeric response.
 *
 * XXX: Should be deprecated in favor of just "answer".
 */
export interface SolveChallengePinRequest {
  pin: number;
}

/**
 * Answer to a challenge by directly providing the hash.
 *
 * XXX: When / why is this even used?
 */
export interface SolveChallengeHashRequest {
  /**
   * Base32-crock encoded hash code.
   */
  hash: string;
}

export interface PolicyMember {
  authentication_method: number;
  provider: string;
}

export interface ActionArgsAddPolicy {
  policy: PolicyMember[];
}

export interface ActionArgsUpdateExpiration {
  expiration: TalerProtocolTimestamp;
}

export interface SelectedVersionInfo {
  attribute_mask: number;
  providers: {
    url: string;
    version: number;
  }[];
}

export type ActionArgsChangeVersion = SelectedVersionInfo;

export interface ActionArgsUpdatePolicy {
  policy_index: number;
  policy: PolicyMember[];
}

/**
 * Cursor for a provider discovery process.
 */
export interface DiscoveryCursor {
  position: {
    provider_url: string;
    mask: number;
    max_version?: number;
  }[];
}

export interface PolicyMetaInfo {
  policy_hash: string;
  provider_url: string;
  version: number;
  attribute_mask: number;
  server_time: TalerProtocolTimestamp;
  secret_name?: string;
}

/**
 * Aggregated / de-duplicated policy meta info.
 */
export interface AggregatedPolicyMetaInfo {
  secret_name?: string;
  policy_hash: string;
  attribute_mask: number;
  providers: {
    url: string;
    version: number;
  }[];
}

export interface DiscoveryResult {
  /**
   * Found policies.
   */
  policies: PolicyMetaInfo[];

  /**
   * Cursor that allows getting more results.
   */
  cursor?: DiscoveryCursor;
}

// FIXME: specify schema!
export const codecForActionArgsChangeVersion = codecForAny;

export const codecForPolicyMember = () =>
  buildCodecForObject<PolicyMember>()
    .property("authentication_method", codecForNumber())
    .property("provider", codecForString())
    .build("PolicyMember");

export const codecForActionArgsAddPolicy = () =>
  buildCodecForObject<ActionArgsAddPolicy>()
    .property("policy", codecForList(codecForPolicyMember()))
    .build("ActionArgsAddPolicy");

export const codecForActionArgsUpdateExpiration = () =>
  buildCodecForObject<ActionArgsUpdateExpiration>()
    .property("expiration", codecForTimestamp)
    .build("ActionArgsUpdateExpiration");

export const codecForActionArgsSelectChallenge = () =>
  buildCodecForObject<ActionArgsSelectChallenge>()
    .property("uuid", codecForString())
    .build("ActionArgsSelectChallenge");

export const codecForActionArgSelectCountry = () =>
  buildCodecForObject<ActionArgsSelectCountry>()
    .property("country_code", codecForString())
    .build("ActionArgSelectCountry");
