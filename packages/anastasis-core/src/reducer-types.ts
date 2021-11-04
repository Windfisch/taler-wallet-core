import {
  AmountString,
  buildCodecForObject,
  codecForAny,
  codecForList,
  codecForNumber,
  codecForString,
  codecForTimestamp,
  Timestamp,
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
  currency: string;
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
    policy_expiration: Timestamp;
  };
}

export interface CoreSecret {
  mime: string;
  value: string;
}

export interface ReducerStateBackup {
  recovery_state?: undefined;
  backup_state: BackupStates;
  code?: undefined;
  currencies?: string[];
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
   */
  payments?: string[];

  policy_payment_requests?: {
    payto: string;
    provider: string;
  }[];

  core_secret?: CoreSecret;

  expiration?: Timestamp;

  upload_fees?: { fee: AmountString }[];
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
  recovery_state: RecoveryStates;

  /**
   * Unused in the recovery states.
   */
  backup_state?: undefined;

  /**
   * Unused in the recovery states.
   */
  code?: undefined;

  identity_attributes?: { [n: string]: string };

  continents?: ContinentInfo[];
  countries?: CountryInfo[];

  selected_continent?: string;
  selected_country?: string;
  currencies?: string[];

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

export interface ReducerStateError {
  backup_state?: undefined;
  recovery_state?: undefined;
  code: number;
  hint?: string;
  message?: string;
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

// FIXME: This should be tagged!
export type AuthenticationProviderStatusEmpty = {};

export interface AuthenticationProviderStatusOk {
  annual_fee: string;
  business_name: string;
  currency: string;
  http_status: 200;
  liability_limit: string;
  salt: string;
  storage_limit_in_megabytes: number;
  truth_upload_fee: string;
  methods: MethodSpec[];
}

export interface AuthenticationProviderStatusError {
  http_status: number;
  error_code: number;
}

export type AuthenticationProviderStatus =
  | AuthenticationProviderStatusEmpty
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
  expiration: Timestamp;
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
  currencies: string[];
}

export interface ActionArgsSelectChallenge {
  uuid: string;
}

export type ActionArgsSolveChallengeRequest = SolveChallengeAnswerRequest;

export interface SolveChallengeAnswerRequest {
  answer: string;
}

export interface PolicyMember {
  authentication_method: number;
  provider: string;
}

export interface ActionArgsAddPolicy {
  policy: PolicyMember[];
}

export interface ActionArgsUpdateExpiration {
  expiration: Timestamp;
}

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
    .property("currencies", codecForList(codecForString()))
    .build("ActionArgSelectCountry");
