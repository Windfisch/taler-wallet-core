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

/**
 * Imports.
 */
import {
  AmountJson,
  AmountLike,
  Amounts,
  AmountString,
  buildSigPS,
  bytesToString,
  Codec,
  codecForAny,
  decodeCrock,
  Duration,
  eddsaSign,
  encodeCrock,
  getRandomBytes,
  hash,
  HttpStatusCode,
  Logger,
  parsePayUri,
  stringToBytes,
  TalerErrorCode,
  TalerProtocolTimestamp,
  TalerSignaturePurpose,
  AbsoluteTime,
  URL,
  j2s,
} from "@gnu-taler/taler-util";
import { anastasisData } from "./anastasis-data.js";
import {
  codecForChallengeInstructionMessage,
  EscrowConfigurationResponse,
  RecoveryMetaResponse,
  TruthUploadRequest,
} from "./provider-types.js";
import {
  ActionArgsAddAuthentication,
  ActionArgsDeleteAuthentication,
  ActionArgsDeletePolicy,
  ActionArgsEnterSecret,
  ActionArgsEnterSecretName,
  ActionArgsEnterUserAttributes,
  ActionArgsAddPolicy,
  ActionArgsSelectContinent,
  ActionArgsSelectCountry,
  ActionArgsSelectChallenge,
  ActionArgsSolveChallengeRequest,
  ActionArgsUpdateExpiration,
  AuthenticationProviderStatus,
  AuthenticationProviderStatusOk,
  AuthMethod,
  BackupStates,
  codecForActionArgsEnterUserAttributes,
  codecForActionArgsAddPolicy,
  codecForActionArgsSelectChallenge,
  codecForActionArgSelectContinent,
  codecForActionArgSelectCountry,
  codecForActionArgsUpdateExpiration,
  ContinentInfo,
  CountryInfo,
  RecoveryInformation,
  RecoveryInternalData,
  RecoveryStates,
  ReducerState,
  ReducerStateBackup,
  ReducerStateError,
  ReducerStateRecovery,
  SuccessDetails,
  codecForActionArgsChangeVersion,
  ActionArgsChangeVersion,
  TruthMetaData,
  ActionArgsUpdatePolicy,
  ActionArgsAddProvider,
  ActionArgsDeleteProvider,
  DiscoveryCursor,
  DiscoveryResult,
  PolicyMetaInfo,
  ChallengeInfo,
  AggregatedPolicyMetaInfo,
  AuthenticationProviderStatusMap,
} from "./reducer-types.js";
import fetchPonyfill from "fetch-ponyfill";
import {
  accountKeypairDerive,
  asOpaque,
  coreSecretEncrypt,
  encryptKeyshare,
  encryptRecoveryDocument,
  encryptTruth,
  OpaqueData,
  PolicyKey,
  policyKeyDerive,
  PolicySalt,
  TruthSalt,
  secureAnswerHash,
  UserIdentifier,
  userIdentifierDerive,
  typedArrayConcat,
  decryptRecoveryDocument,
  decryptKeyShare,
  KeyShare,
  coreSecretRecover,
  pinAnswerHash,
  decryptPolicyMetadata,
  encryptPolicyMetadata,
} from "./crypto.js";
import { unzlibSync, zlibSync } from "fflate";
import {
  ChallengeType,
  EscrowMethod,
  RecoveryDocument,
} from "./recovery-document-types.js";
import { ProviderInfo, suggestPolicies } from "./policy-suggestion.js";
import {
  ChallengeFeedback,
  ChallengeFeedbackStatus,
} from "./challenge-feedback-types.js";

const { fetch } = fetchPonyfill({});

export * from "./reducer-types.js";
export * as validators from "./validators.js";
export * from "./challenge-feedback-types.js";

const logger = new Logger("anastasis-core:index.ts");

const ANASTASIS_HTTP_HEADER_POLICY_META_DATA = "Anastasis-Policy-Meta-Data";

function getContinents(): ContinentInfo[] {
  const continentSet = new Set<string>();
  const continents: ContinentInfo[] = [];
  for (const country of anastasisData.countriesList.countries) {
    if (continentSet.has(country.continent)) {
      continue;
    }
    continentSet.add(country.continent);
    continents.push({
      ...{ name_i18n: country.continent_i18n },
      name: country.continent,
    });
  }
  return continents;
}

interface ErrorDetails {
  code: TalerErrorCode;
  message?: string;
  hint?: string;
}

export class ReducerError extends Error {
  constructor(public errorJson: ErrorDetails) {
    super(
      errorJson.message ??
        errorJson.hint ??
        `${TalerErrorCode[errorJson.code]}`,
    );

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ReducerError.prototype);
  }
}

/**
 * Get countries for a continent, abort with ReducerError
 * exception when continent doesn't exist.
 */
function getCountries(continent: string): CountryInfo[] {
  const countries = anastasisData.countriesList.countries.filter(
    (x) => x.continent === continent,
  );
  if (countries.length <= 0) {
    throw new ReducerError({
      code: TalerErrorCode.ANASTASIS_REDUCER_INPUT_INVALID,
      hint: `continent ${continent} not found`,
    });
  }
  return countries;
}

export async function getBackupStartState(): Promise<ReducerStateBackup> {
  return {
    reducer_type: "backup",
    backup_state: BackupStates.ContinentSelecting,
    continents: getContinents(),
  };
}

export async function getRecoveryStartState(): Promise<ReducerStateRecovery> {
  return {
    reducer_type: "recovery",
    recovery_state: RecoveryStates.ContinentSelecting,
    continents: getContinents(),
  };
}

async function selectCountry(
  selectedContinent: string,
  args: ActionArgsSelectCountry,
): Promise<Partial<ReducerStateBackup> & Partial<ReducerStateRecovery>> {
  const countryCode = args.country_code;
  const country = anastasisData.countriesList.countries.find(
    (x) => x.code === countryCode,
  );
  if (!country) {
    throw new ReducerError({
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: "invalid country selected",
    });
  }

  if (country.continent !== selectedContinent) {
    throw new ReducerError({
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: "selected country is not in selected continent",
    });
  }

  const providers: { [x: string]: AuthenticationProviderStatus } = {};
  for (const prov of anastasisData.providersList.anastasis_provider) {
    let shouldAdd =
      country.code === prov.restricted ||
      (country.code !== "xx" && !prov.restricted);
    if (shouldAdd) {
      providers[prov.url] = {
        status: "not-contacted",
      };
    }
  }

  const ra = (anastasisData.countryDetails as any)[countryCode]
    .required_attributes;

  return {
    selected_country: countryCode,
    required_attributes: ra,
    authentication_providers: providers,
  };
}

async function backupSelectCountry(
  state: ReducerStateBackup,
  args: ActionArgsSelectCountry,
): Promise<ReducerStateError | ReducerStateBackup> {
  return {
    ...state,
    ...(await selectCountry(state.selected_continent!, args)),
    backup_state: BackupStates.UserAttributesCollecting,
  };
}

async function recoverySelectCountry(
  state: ReducerStateRecovery,
  args: ActionArgsSelectCountry,
): Promise<ReducerStateError | ReducerStateRecovery> {
  return {
    ...state,
    recovery_state: RecoveryStates.UserAttributesCollecting,
    ...(await selectCountry(state.selected_continent!, args)),
  };
}

async function getProviderInfo(
  providerBaseUrl: string,
): Promise<AuthenticationProviderStatus> {
  // FIXME: Use a reasonable timeout here.
  let resp: Response;
  try {
    resp = await fetch(new URL("config", providerBaseUrl).href);
  } catch (e) {
    return {
      status: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: "request to provider failed",
    };
  }
  if (resp.status !== 200) {
    return {
      status: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: "unexpected status",
      http_status: resp.status,
    };
  }
  try {
    const jsonResp: EscrowConfigurationResponse = await resp.json();
    if (!jsonResp.provider_salt) {
      return {
        status: "error",
        code: TalerErrorCode.ANASTASIS_REDUCER_PROVIDER_CONFIG_FAILED,
        hint: "provider did not have provider salt",
      };
    }
    return {
      status: "ok",
      http_status: 200,
      annual_fee: jsonResp.annual_fee,
      business_name: jsonResp.business_name,
      currency: jsonResp.currency,
      liability_limit: jsonResp.liability_limit,
      methods: jsonResp.methods.map((x) => ({
        type: x.type,
        usage_fee: x.cost,
      })),
      provider_salt: jsonResp.provider_salt,
      storage_limit_in_megabytes: jsonResp.storage_limit_in_megabytes,
      truth_upload_fee: jsonResp.truth_upload_fee,
    };
  } catch (e) {
    return {
      status: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: "provider did not return JSON",
    };
  }
}

async function backupEnterUserAttributes(
  state: ReducerStateBackup,
  args: ActionArgsEnterUserAttributes,
): Promise<ReducerStateBackup> {
  const attributes = args.identity_attributes;
  const newState = {
    ...state,
    backup_state: BackupStates.AuthenticationsEditing,
    identity_attributes: attributes,
  };
  return newState;
}

async function getTruthValue(
  authMethod: AuthMethod,
  truthUuid: string,
  questionSalt: TruthSalt,
): Promise<OpaqueData> {
  switch (authMethod.type) {
    case "question": {
      return asOpaque(
        await secureAnswerHash(
          bytesToString(decodeCrock(authMethod.challenge)),
          truthUuid,
          questionSalt,
        ),
      );
    }
    case "sms":
    case "email":
    case "totp":
    case "iban":
    case "post":
      return authMethod.challenge;
    default:
      throw Error(`unknown auth type '${authMethod.type}'`);
  }
}

/**
 * Compress the recovery document and add a size header.
 */
async function compressRecoveryDoc(rd: any): Promise<Uint8Array> {
  const docBytes = stringToBytes(JSON.stringify(rd));
  const sizeHeaderBuf = new ArrayBuffer(4);
  const dvbuf = new DataView(sizeHeaderBuf);
  dvbuf.setUint32(0, docBytes.length, false);
  const zippedDoc = zlibSync(docBytes);
  return typedArrayConcat([new Uint8Array(sizeHeaderBuf), zippedDoc]);
}

async function uncompressRecoveryDoc(zippedRd: Uint8Array): Promise<any> {
  const header = zippedRd.slice(0, 4);
  const data = zippedRd.slice(4);
  const res = unzlibSync(data);
  return JSON.parse(bytesToString(res));
}

/**
 * Prepare the recovery document and truth metadata based
 * on the selected policies.
 */
async function prepareRecoveryData(
  state: ReducerStateBackup,
): Promise<ReducerStateBackup> {
  const policies = state.policies!;
  const secretName = state.secret_name!;
  const coreSecret: OpaqueData = encodeCrock(
    stringToBytes(JSON.stringify(state.core_secret!)),
  );

  // Truth key is `${methodIndex}/${providerUrl}`
  const truthMetadataMap: Record<string, TruthMetaData> = {};

  const policyKeys: PolicyKey[] = [];
  const policySalts: PolicySalt[] = [];
  // truth UUIDs for every policy.
  const policyUuids: string[][] = [];

  for (let policyIndex = 0; policyIndex < policies.length; policyIndex++) {
    const pol = policies[policyIndex];
    const policySalt = encodeCrock(getRandomBytes(64));
    const keyShares: string[] = [];
    const methUuids: string[] = [];
    for (let methIndex = 0; methIndex < pol.methods.length; methIndex++) {
      const meth = pol.methods[methIndex];
      const truthReference = `${meth.authentication_method}:${meth.provider}`;
      let tm = truthMetadataMap[truthReference];
      if (!tm) {
        tm = {
          key_share: encodeCrock(getRandomBytes(32)),
          nonce: encodeCrock(getRandomBytes(24)),
          master_salt: encodeCrock(getRandomBytes(16)),
          truth_key: encodeCrock(getRandomBytes(64)),
          uuid: encodeCrock(getRandomBytes(32)),
          pol_method_index: methIndex,
          policy_index: policyIndex,
        };
        truthMetadataMap[truthReference] = tm;
      }
      keyShares.push(tm.key_share);
      methUuids.push(tm.uuid);
    }
    const policyKey = await policyKeyDerive(keyShares, policySalt);
    policyUuids.push(methUuids);
    policyKeys.push(policyKey);
    policySalts.push(policySalt);
  }

  const csr = await coreSecretEncrypt(policyKeys, coreSecret);

  const escrowMethods: EscrowMethod[] = [];

  for (const truthKey of Object.keys(truthMetadataMap)) {
    const tm = truthMetadataMap[truthKey];
    const pol = state.policies![tm.policy_index];
    const meth = pol.methods[tm.pol_method_index];
    const authMethod =
      state.authentication_methods![meth.authentication_method];
    const provider = state.authentication_providers![
      meth.provider
    ] as AuthenticationProviderStatusOk;
    escrowMethods.push({
      escrow_type: authMethod.type as any,
      instructions: authMethod.instructions,
      provider_salt: provider.provider_salt,
      question_salt: tm.master_salt,
      truth_key: tm.truth_key,
      url: meth.provider,
      uuid: tm.uuid,
    });
  }

  const rd: RecoveryDocument = {
    secret_name: secretName,
    encrypted_core_secret: csr.encCoreSecret,
    escrow_methods: escrowMethods,
    policies: policies.map((x, i) => {
      return {
        master_key: csr.encMasterKeys[i],
        uuids: policyUuids[i],
        salt: policySalts[i],
      };
    }),
  };

  return {
    ...state,
    recovery_data: {
      recovery_document: rd,
      truth_metadata: truthMetadataMap,
    },
  };
}

async function uploadSecret(
  state: ReducerStateBackup,
): Promise<ReducerStateBackup | ReducerStateError> {
  if (!state.recovery_data) {
    state = await prepareRecoveryData(state);
  }

  const recoveryData = state.recovery_data;
  if (!recoveryData) {
    throw Error("invariant failed");
  }

  const truthMetadataMap = recoveryData.truth_metadata;
  const rd = recoveryData.recovery_document;

  const truthPayUris: string[] = [];
  const truthPaySecrets: Record<string, string> = {};

  const userIdCache: Record<string, UserIdentifier> = {};
  const getUserIdCaching = async (providerUrl: string) => {
    let userId = userIdCache[providerUrl];
    if (!userId) {
      const provider = state.authentication_providers![
        providerUrl
      ] as AuthenticationProviderStatusOk;
      userId = userIdCache[providerUrl] = await userIdentifierDerive(
        state.identity_attributes!,
        provider.provider_salt,
      );
    }
    return userId;
  };
  for (const truthKey of Object.keys(truthMetadataMap)) {
    const tm = truthMetadataMap[truthKey];
    const pol = state.policies![tm.policy_index];
    const meth = pol.methods[tm.pol_method_index];
    const authMethod =
      state.authentication_methods![meth.authentication_method];
    const truthValue = await getTruthValue(authMethod, tm.uuid, tm.master_salt);
    const encryptedTruth = await encryptTruth(
      tm.nonce,
      tm.truth_key,
      truthValue,
    );
    logger.info(`uploading truth to ${meth.provider}`);
    const userId = await getUserIdCaching(meth.provider);
    const encryptedKeyShare = await encryptKeyshare(
      tm.key_share,
      userId,
      authMethod.type === "question"
        ? bytesToString(decodeCrock(authMethod.challenge))
        : undefined,
    );
    const tur: TruthUploadRequest = {
      encrypted_truth: encryptedTruth,
      key_share_data: encryptedKeyShare,
      storage_duration_years: 5 /* FIXME */,
      type: authMethod.type,
      truth_mime: authMethod.mime_type,
    };
    const reqUrl = new URL(`truth/${tm.uuid}`, meth.provider);
    const paySecret = (state.truth_upload_payment_secrets ?? {})[meth.provider];
    if (paySecret) {
      // FIXME: Get this from the params
      reqUrl.searchParams.set("timeout_ms", "500");
    }
    const resp = await fetch(reqUrl.href, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(paySecret
          ? {
              "Anastasis-Payment-Identifier": paySecret,
            }
          : {}),
      },
      body: JSON.stringify(tur),
    });

    if (resp.status === HttpStatusCode.NoContent) {
      continue;
    }
    if (resp.status === HttpStatusCode.PaymentRequired) {
      const talerPayUri = resp.headers.get("Taler");
      if (!talerPayUri) {
        return {
          reducer_type: "error",
          code: TalerErrorCode.ANASTASIS_REDUCER_BACKEND_FAILURE,
          hint: `payment requested, but no taler://pay URI given`,
        };
      }
      truthPayUris.push(talerPayUri);
      const parsedUri = parsePayUri(talerPayUri);
      if (!parsedUri) {
        return {
          reducer_type: "error",
          code: TalerErrorCode.ANASTASIS_REDUCER_BACKEND_FAILURE,
          hint: `payment requested, but no taler://pay URI given`,
        };
      }
      truthPaySecrets[meth.provider] = parsedUri.orderId;
      continue;
    }
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: `could not upload truth (HTTP status ${resp.status})`,
    };
  }

  if (truthPayUris.length > 0) {
    return {
      ...state,
      backup_state: BackupStates.TruthsPaying,
      truth_upload_payment_secrets: truthPaySecrets,
      payments: truthPayUris,
    };
  }

  const successDetails: SuccessDetails = {};

  const policyPayUris: string[] = [];
  const policyPayUriMap: Record<string, string> = {};
  //const policyPaySecrets: Record<string, string> = {};

  for (const prov of state.policy_providers!) {
    const userId = await getUserIdCaching(prov.provider_url);
    const acctKeypair = accountKeypairDerive(userId);
    const zippedDoc = await compressRecoveryDoc(rd);
    const recoveryDocHash = encodeCrock(hash(zippedDoc));
    const encRecoveryDoc = await encryptRecoveryDocument(
      userId,
      encodeCrock(zippedDoc),
    );
    const bodyHash = hash(decodeCrock(encRecoveryDoc));
    const sigPS = buildSigPS(TalerSignaturePurpose.ANASTASIS_POLICY_UPLOAD)
      .put(bodyHash)
      .build();
    const sig = eddsaSign(sigPS, decodeCrock(acctKeypair.priv));
    const metadataEnc = await encryptPolicyMetadata(userId, {
      policy_hash: recoveryDocHash,
      secret_name: state.secret_name ?? "<unnamed secret>",
    });
    const talerPayUri = state.policy_payment_requests?.find(
      (x) => x.provider === prov.provider_url,
    )?.payto;
    let paySecret: string | undefined;
    if (talerPayUri) {
      paySecret = parsePayUri(talerPayUri)!.orderId;
    }
    const reqUrl = new URL(`policy/${acctKeypair.pub}`, prov.provider_url);
    if (paySecret) {
      // FIXME: Get this from the params
      reqUrl.searchParams.set("timeout_ms", "500");
    }
    logger.info(`uploading policy to ${prov.provider_url}`);
    const resp = await fetch(reqUrl.href, {
      method: "POST",
      headers: {
        "Anastasis-Policy-Signature": encodeCrock(sig),
        "If-None-Match": encodeCrock(bodyHash),
        [ANASTASIS_HTTP_HEADER_POLICY_META_DATA]: metadataEnc,
        ...(paySecret
          ? {
              "Anastasis-Payment-Identifier": paySecret,
            }
          : {}),
      },
      body: decodeCrock(encRecoveryDoc),
    });
    logger.info(`got response for policy upload (http status ${resp.status})`);
    if (resp.status === HttpStatusCode.NoContent) {
      let policyVersion = 0;
      let policyExpiration: TalerProtocolTimestamp = { t_s: 0 };
      try {
        policyVersion = Number(resp.headers.get("Anastasis-Version") ?? "0");
      } catch (e) {}
      try {
        policyExpiration = {
          t_s: Number(resp.headers.get("Anastasis-Policy-Expiration") ?? "0"),
        };
      } catch (e) {}
      successDetails[prov.provider_url] = {
        policy_version: policyVersion,
        policy_expiration: policyExpiration,
      };
      continue;
    }
    if (resp.status === HttpStatusCode.PaymentRequired) {
      const talerPayUri = resp.headers.get("Taler");
      if (!talerPayUri) {
        return {
          reducer_type: "error",
          code: TalerErrorCode.ANASTASIS_REDUCER_BACKEND_FAILURE,
          hint: `payment requested, but no taler://pay URI given`,
        };
      }
      policyPayUris.push(talerPayUri);
      const parsedUri = parsePayUri(talerPayUri);
      if (!parsedUri) {
        return {
          reducer_type: "error",
          code: TalerErrorCode.ANASTASIS_REDUCER_BACKEND_FAILURE,
          hint: `payment requested, but no taler://pay URI given`,
        };
      }
      policyPayUriMap[prov.provider_url] = talerPayUri;
      continue;
    }
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: `could not upload policy (http status ${resp.status})`,
    };
  }

  if (policyPayUris.length > 0) {
    return {
      ...state,
      backup_state: BackupStates.PoliciesPaying,
      payments: policyPayUris,
      policy_payment_requests: Object.keys(policyPayUriMap).map((x) => {
        return {
          payto: policyPayUriMap[x],
          provider: x,
        };
      }),
    };
  }

  logger.info("backup finished");

  return {
    ...state,
    core_secret: undefined,
    backup_state: BackupStates.BackupFinished,
    success_details: successDetails,
    payments: undefined,
  };
}

interface PolicyDownloadResult {
  recoveryDoc: RecoveryDocument;
  recoveryData: RecoveryInternalData;
}

async function downloadPolicyFromProvider(
  state: ReducerStateRecovery,
  providerUrl: string,
  version: number,
): Promise<PolicyDownloadResult | undefined> {
  logger.info(`trying to download policy from ${providerUrl}`);
  const userAttributes = state.identity_attributes!;
  let pi = state.authentication_providers?.[providerUrl];
  if (!pi || pi.status !== "ok") {
    // FIXME: this one blocks!
    logger.info(`fetching provider info for ${providerUrl}`);
    pi = await getProviderInfo(providerUrl);
  }
  logger.info(`new provider status is ${pi.status}`);
  if (pi.status !== "ok") {
    return undefined;
  }
  const userId = await userIdentifierDerive(userAttributes, pi.provider_salt);
  const acctKeypair = accountKeypairDerive(userId);
  const reqUrl = new URL(`policy/${acctKeypair.pub}`, providerUrl);
  reqUrl.searchParams.set("version", `${version}`);
  const resp = await fetch(reqUrl.href);
  if (resp.status !== 200) {
    logger.info(
      `Could not download policy from provider ${providerUrl}, status ${resp.status}`,
    );
    return undefined;
  }
  const body = await resp.arrayBuffer();
  const bodyDecrypted = await decryptRecoveryDocument(
    userId,
    encodeCrock(body),
  );
  const rd: RecoveryDocument = await uncompressRecoveryDoc(
    decodeCrock(bodyDecrypted),
  );
  // FIXME: Not clear why we do this, since we always have an explicit version by now.
  let policyVersion = 0;
  try {
    policyVersion = Number(resp.headers.get("Anastasis-Version") ?? "0");
  } catch (e) {
    logger.warn("Could not read policy version header");
    policyVersion = version;
  }
  return {
    recoveryDoc: rd,
    recoveryData: {
      provider_url: providerUrl,
      secret_name: rd.secret_name ?? "<unknown>",
      version: policyVersion,
    },
  };
}

/**
 * Download policy based on current user attributes and selected
 * version in the state.
 */
async function downloadPolicy(
  state: ReducerStateRecovery,
): Promise<ReducerStateRecovery | ReducerStateError> {
  logger.info("downloading policy");
  if (!state.selected_version) {
    throw Error("invalid state");
  }
  let policyDownloadResult: PolicyDownloadResult | undefined = undefined;
  // FIXME: Do this concurrently/asynchronously so that one slow provider doesn't block us.
  for (const prov of state.selected_version.providers) {
    const res = await downloadPolicyFromProvider(state, prov.url, prov.version);
    if (res) {
      policyDownloadResult = res;
      break;
    }
  }
  if (!policyDownloadResult) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_POLICY_LOOKUP_FAILED,
      hint: "No backups found at any provider for your identity information.",
    };
  }

  const challenges: ChallengeInfo[] = [];
  const recoveryDoc = policyDownloadResult.recoveryDoc;

  for (const x of recoveryDoc.escrow_methods) {
    challenges.push({
      instructions: x.instructions,
      type: x.escrow_type,
      uuid: x.uuid,
    });
  }

  const recoveryInfo: RecoveryInformation = {
    challenges,
    policies: recoveryDoc.policies.map((x) => {
      return x.uuids.map((m) => {
        return {
          uuid: m,
        };
      });
    }),
  };
  return {
    ...state,
    recovery_state: RecoveryStates.ChallengeSelecting,
    recovery_document: policyDownloadResult.recoveryData,
    recovery_information: recoveryInfo,
    verbatim_recovery_document: recoveryDoc,
  };
}

/**
 * Try to reconstruct the secret from the available shares.
 *
 * Returns the state unmodified if not enough key shares are available yet.
 */
async function tryRecoverSecret(
  state: ReducerStateRecovery,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const rd = state.verbatim_recovery_document!;
  for (const p of rd.policies) {
    const keyShares: KeyShare[] = [];
    let missing = false;
    for (const truthUuid of p.uuids) {
      const ks = (state.recovered_key_shares ?? {})[truthUuid];
      if (!ks) {
        missing = true;
        break;
      }
      keyShares.push(ks);
    }

    if (missing) {
      continue;
    }

    const policyKey = await policyKeyDerive(keyShares, p.salt);
    const coreSecretBytes = await coreSecretRecover({
      encryptedCoreSecret: rd.encrypted_core_secret,
      encryptedMasterKey: p.master_key,
      policyKey,
    });

    return {
      ...state,
      recovery_state: RecoveryStates.RecoveryFinished,
      selected_challenge_uuid: undefined,
      core_secret: JSON.parse(bytesToString(decodeCrock(coreSecretBytes))),
    };
  }
  return { ...state };
}

/**
 * Re-check the status of challenges that are solved asynchronously.
 */
async function pollChallenges(
  state: ReducerStateRecovery,
  args: void,
): Promise<ReducerStateRecovery | ReducerStateError> {
  for (const truthUuid in state.challenge_feedback) {
    if (state.recovery_state === RecoveryStates.RecoveryFinished) {
      break;
    }
    const feedback = state.challenge_feedback[truthUuid];
    const truth = state.verbatim_recovery_document!.escrow_methods.find(
      (x) => x.uuid === truthUuid,
    );
    if (!truth) {
      logger.warn(
        "truth for challenge feedback entry not found in recovery document",
      );
      continue;
    }
    if (feedback.state === ChallengeFeedbackStatus.IbanInstructions) {
      const s2 = await requestTruth(state, truth, {
        pin: feedback.answer_code,
      });
      if (s2.reducer_type === "recovery") {
        state = s2;
      }
    }
  }
  return state;
}

async function getResponseHash(
  truth: EscrowMethod,
  solveRequest: ActionArgsSolveChallengeRequest,
): Promise<string> {
  let respHash: string;
  switch (truth.escrow_type) {
    case ChallengeType.Question: {
      if ("answer" in solveRequest) {
        respHash = await secureAnswerHash(
          solveRequest.answer,
          truth.uuid,
          truth.question_salt,
        );
      } else {
        throw Error("unsupported answer request");
      }
      break;
    }
    case ChallengeType.Email:
    case ChallengeType.Sms:
    case ChallengeType.Post:
    case ChallengeType.Iban:
    case ChallengeType.Totp: {
      if ("answer" in solveRequest) {
        const s = solveRequest.answer.trim().replace(/^A-/, "");
        let pin: number;
        try {
          pin = Number.parseInt(s);
        } catch (e) {
          throw Error("invalid pin format");
        }
        respHash = await pinAnswerHash(pin);
      } else if ("pin" in solveRequest) {
        respHash = await pinAnswerHash(solveRequest.pin);
      } else {
        throw Error("unsupported answer request");
      }
      break;
    }
    default:
      throw Error(`unsupported challenge type "${truth.escrow_type}""`);
  }
  return respHash;
}

/**
 * Request a truth, optionally with a challenge solution
 * provided by the user.
 */
async function requestTruth(
  state: ReducerStateRecovery,
  truth: EscrowMethod,
  solveRequest: ActionArgsSolveChallengeRequest,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const url = new URL(`/truth/${truth.uuid}/solve`, truth.url);

  const hresp = await getResponseHash(truth, solveRequest);

  let resp: Response;

  try {
    resp = await fetch(url.href, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        truth_decryption_key: truth.truth_key,
        h_response: hresp,
      }),
    });
  } catch (e) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_TRUTH_CHALLENGE_FAILED,
      hint: "network error",
    } as ReducerStateError;
  }

  logger.info(
    `got POST /truth/.../solve response from ${truth.url}, http status ${resp.status}`,
  );

  if (resp.status === HttpStatusCode.Ok) {
    let answerSalt: string | undefined = undefined;
    if (
      solveRequest &&
      truth.escrow_type === "question" &&
      "answer" in solveRequest
    ) {
      answerSalt = solveRequest.answer;
    }

    const userId = await userIdentifierDerive(
      state.identity_attributes,
      truth.provider_salt,
    );

    const respBody = new Uint8Array(await resp.arrayBuffer());
    const keyShare = await decryptKeyShare(
      encodeCrock(respBody),
      userId,
      answerSalt,
    );

    const recoveredKeyShares = {
      ...(state.recovered_key_shares ?? {}),
      [truth.uuid]: keyShare,
    };

    const challengeFeedback: { [x: string]: ChallengeFeedback } = {
      ...state.challenge_feedback,
      [truth.uuid]: {
        state: ChallengeFeedbackStatus.Solved,
      },
    };

    const newState: ReducerStateRecovery = {
      ...state,
      recovery_state: RecoveryStates.ChallengeSelecting,
      challenge_feedback: challengeFeedback,
      recovered_key_shares: recoveredKeyShares,
    };

    return tryRecoverSecret(newState);
  }

  if (resp.status === HttpStatusCode.Forbidden) {
    const challengeFeedback: { [x: string]: ChallengeFeedback } = {
      ...state.challenge_feedback,
      [truth.uuid]: {
        state: ChallengeFeedbackStatus.IncorrectAnswer,
      },
    };
    return {
      ...state,
      challenge_feedback: challengeFeedback,
    };
  }

  return {
    reducer_type: "error",
    code: TalerErrorCode.ANASTASIS_TRUTH_CHALLENGE_FAILED,
    hint: "got unexpected /truth/ response status",
    http_status: resp.status,
  } as ReducerStateError;
}

async function solveChallenge(
  state: ReducerStateRecovery,
  ta: ActionArgsSolveChallengeRequest,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const recDoc: RecoveryDocument = state.verbatim_recovery_document!;
  const truth = recDoc.escrow_methods.find(
    (x) => x.uuid === state.selected_challenge_uuid,
  );
  if (!truth) {
    throw Error("truth for challenge not found");
  }

  return requestTruth(state, truth, ta);
}

async function recoveryEnterUserAttributes(
  state: ReducerStateRecovery,
  args: ActionArgsEnterUserAttributes,
): Promise<ReducerStateRecovery | ReducerStateError> {
  // FIXME: validate attributes
  const st: ReducerStateRecovery = {
    ...state,
    recovery_state: RecoveryStates.SecretSelecting,
    identity_attributes: args.identity_attributes,
  };
  return st;
}

async function changeVersion(
  state: ReducerStateRecovery,
  args: ActionArgsChangeVersion,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const st: ReducerStateRecovery = {
    ...state,
    selected_version: args,
  };
  return downloadPolicy(st);
}

async function selectChallenge(
  state: ReducerStateRecovery,
  ta: ActionArgsSelectChallenge,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const recDoc: RecoveryDocument = state.verbatim_recovery_document!;
  const truth = recDoc.escrow_methods.find((x) => x.uuid === ta.uuid);
  if (!truth) {
    throw "truth for challenge not found";
  }

  const url = new URL(`/truth/${truth.uuid}/challenge`, truth.url);

  const newFeedback = { ...state.challenge_feedback };
  delete newFeedback[truth.uuid];

  switch (truth.escrow_type) {
    case ChallengeType.Question:
    case ChallengeType.Totp: {
      return {
        ...state,
        recovery_state: RecoveryStates.ChallengeSolving,
        selected_challenge_uuid: truth.uuid,
        challenge_feedback: newFeedback,
      };
    }
  }

  let resp: Response;

  try {
    resp = await fetch(url.href, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        truth_decryption_key: truth.truth_key,
      }),
    });
  } catch (e) {
    const feedback: ChallengeFeedback = {
      state: ChallengeFeedbackStatus.ServerFailure,
      http_status: 0,
    };
    return {
      ...state,
      recovery_state: RecoveryStates.ChallengeSelecting,
      selected_challenge_uuid: truth.uuid,
      challenge_feedback: {
        ...state.challenge_feedback,
        [truth.uuid]: feedback,
      },
    };
  }

  logger.info(
    `got GET /truth/.../challenge response from ${truth.url}, http status ${resp.status}`,
  );

  if (resp.status === HttpStatusCode.Ok) {
    const respBodyJson = await resp.json();
    logger.info(`validating ${j2s(respBodyJson)}`);
    const instr = codecForChallengeInstructionMessage().decode(respBodyJson);
    let feedback: ChallengeFeedback;
    switch (instr.challenge_type) {
      case "FILE_WRITTEN": {
        feedback = {
          state: ChallengeFeedbackStatus.CodeInFile,
          display_hint: "TAN code is in file (for debugging)",
          filename: instr.filename,
        };
        break;
      }
      case "IBAN_WIRE": {
        feedback = {
          state: ChallengeFeedbackStatus.IbanInstructions,
          answer_code: instr.wire_details.answer_code,
          target_business_name: instr.wire_details.business_name,
          challenge_amount: instr.wire_details.challenge_amount,
          target_iban: instr.wire_details.credit_iban,
          wire_transfer_subject: instr.wire_details.wire_transfer_subject,
        };
        break;
      }
      case "TAN_SENT": {
        feedback = {
          state: ChallengeFeedbackStatus.CodeSent,
          address_hint: instr.tan_address_hint,
          display_hint: "Code sent to address",
        };
      }
    }
    return {
      ...state,
      recovery_state: RecoveryStates.ChallengeSolving,
      selected_challenge_uuid: truth.uuid,
      challenge_feedback: {
        ...state.challenge_feedback,
        [truth.uuid]: feedback,
      },
    };
  }

  // FIXME: look at more error codes in response

  return {
    reducer_type: "error",
    code: TalerErrorCode.ANASTASIS_TRUTH_CHALLENGE_FAILED,
    hint: `got unexpected /truth/.../challenge response status (${resp.status})`,
    http_status: resp.status,
  } as ReducerStateError;
}

async function backupSelectContinent(
  state: ReducerStateBackup,
  args: ActionArgsSelectContinent,
): Promise<ReducerStateBackup | ReducerStateError> {
  const countries = getCountries(args.continent);
  if (countries.length <= 0) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_INPUT_INVALID,
      hint: "continent not found",
    };
  }
  return {
    ...state,
    backup_state: BackupStates.CountrySelecting,
    countries,
    selected_continent: args.continent,
  };
}

async function recoverySelectContinent(
  state: ReducerStateRecovery,
  args: ActionArgsSelectContinent,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const countries = getCountries(args.continent);
  return {
    ...state,
    recovery_state: RecoveryStates.CountrySelecting,
    countries,
    selected_continent: args.continent,
  };
}

interface TransitionImpl<S, T> {
  argCodec: Codec<T>;
  handler: (s: S, args: T) => Promise<S | ReducerStateError>;
}

interface Transition<S> {
  [x: string]: TransitionImpl<S, any>;
}

function transition<S, T>(
  action: string,
  argCodec: Codec<T>,
  handler: (s: S, args: T) => Promise<S | ReducerStateError>,
): Transition<S> {
  return {
    [action]: {
      argCodec,
      handler,
    },
  };
}

function transitionBackupJump(
  action: string,
  st: BackupStates,
): Transition<ReducerStateBackup> {
  return {
    [action]: {
      argCodec: codecForAny(),
      handler: async (s, a) => ({ ...s, backup_state: st }),
    },
  };
}

function transitionRecoveryJump(
  action: string,
  st: RecoveryStates,
): Transition<ReducerStateRecovery> {
  return {
    [action]: {
      argCodec: codecForAny(),
      handler: async (s, a) => ({ ...s, recovery_state: st }),
    },
  };
}

async function addProviderBackup(
  state: ReducerStateBackup,
  args: ActionArgsAddProvider,
): Promise<ReducerStateBackup> {
  const info = await getProviderInfo(args.provider_url);
  return {
    ...state,
    authentication_providers: {
      ...(state.authentication_providers ?? {}),
      [args.provider_url]: info,
    },
  };
}

async function deleteProviderBackup(
  state: ReducerStateBackup,
  args: ActionArgsDeleteProvider,
): Promise<ReducerStateBackup> {
  const authentication_providers = {
    ...(state.authentication_providers ?? {}),
  };
  delete authentication_providers[args.provider_url];
  return {
    ...state,
    authentication_providers,
  };
}

async function addProviderRecovery(
  state: ReducerStateRecovery,
  args: ActionArgsAddProvider,
): Promise<ReducerStateRecovery> {
  const info = await getProviderInfo(args.provider_url);
  return {
    ...state,
    authentication_providers: {
      ...(state.authentication_providers ?? {}),
      [args.provider_url]: info,
    },
  };
}

async function deleteProviderRecovery(
  state: ReducerStateRecovery,
  args: ActionArgsDeleteProvider,
): Promise<ReducerStateRecovery> {
  const authentication_providers = {
    ...(state.authentication_providers ?? {}),
  };
  delete authentication_providers[args.provider_url];
  return {
    ...state,
    authentication_providers,
  };
}

async function addAuthentication(
  state: ReducerStateBackup,
  args: ActionArgsAddAuthentication,
): Promise<ReducerStateBackup> {
  return {
    ...state,
    authentication_methods: [
      ...(state.authentication_methods ?? []),
      args.authentication_method,
    ],
  };
}

async function deleteAuthentication(
  state: ReducerStateBackup,
  args: ActionArgsDeleteAuthentication,
): Promise<ReducerStateBackup> {
  const m = state.authentication_methods ?? [];
  m.splice(args.authentication_method, 1);
  return {
    ...state,
    authentication_methods: m,
  };
}

async function deletePolicy(
  state: ReducerStateBackup,
  args: ActionArgsDeletePolicy,
): Promise<ReducerStateBackup> {
  const policies = [...(state.policies ?? [])];
  policies.splice(args.policy_index, 1);
  return {
    ...state,
    policies,
  };
}

async function updatePolicy(
  state: ReducerStateBackup,
  args: ActionArgsUpdatePolicy,
): Promise<ReducerStateBackup> {
  const policies = [...(state.policies ?? [])];
  policies[args.policy_index] = { methods: args.policy };
  return {
    ...state,
    policies,
  };
}

async function addPolicy(
  state: ReducerStateBackup,
  args: ActionArgsAddPolicy,
): Promise<ReducerStateBackup> {
  return {
    ...state,
    policies: [
      ...(state.policies ?? []),
      {
        methods: args.policy,
      },
    ],
  };
}

async function nextFromAuthenticationsEditing(
  state: ReducerStateBackup,
  args: {},
): Promise<ReducerStateBackup | ReducerStateError> {
  const methods = state.authentication_methods ?? [];
  const providers: ProviderInfo[] = [];
  for (const provUrl of Object.keys(state.authentication_providers ?? {})) {
    const prov = state.authentication_providers![provUrl];
    if (prov.status !== "ok") {
      continue;
    }
    const methodCost: Record<string, AmountString> = {};
    for (const meth of prov.methods) {
      methodCost[meth.type] = meth.usage_fee;
    }
    providers.push({
      methodCost,
      url: provUrl,
    });
  }
  const pol = suggestPolicies(methods, providers);
  if (pol.policies.length === 0) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      detail:
        "Unable to suggest any policies.  Check if providers are available and reachable.",
    };
  }
  return {
    ...state,
    backup_state: BackupStates.PoliciesReviewing,
    ...pol,
  };
}

async function updateUploadFees(
  state: ReducerStateBackup,
): Promise<ReducerStateBackup | ReducerStateError> {
  const expiration = state.expiration;
  if (!expiration) {
    return { ...state };
  }
  logger.info("updating upload fees");
  const feePerCurrency: Record<string, AmountJson> = {};
  const addFee = (x: AmountLike) => {
    x = Amounts.jsonifyAmount(x);
    feePerCurrency[x.currency] = Amounts.add(
      feePerCurrency[x.currency] ?? Amounts.zeroOfAmount(x),
      x,
    ).amount;
  };
  const expirationTime = AbsoluteTime.fromTimestamp(expiration);
  const years = Duration.toIntegerYears(Duration.getRemaining(expirationTime));
  logger.info(`computing fees for ${years} years`);
  // For now, we compute fees for *all* available providers.
  for (const provUrl in state.authentication_providers ?? {}) {
    const prov = state.authentication_providers![provUrl];
    if ("annual_fee" in prov) {
      const annualFee = Amounts.mult(prov.annual_fee, years).amount;
      logger.info(`adding annual fee ${Amounts.stringify(annualFee)}`);
      addFee(annualFee);
    }
  }
  const coveredProvTruth = new Set<string>();
  for (const x of state.policies ?? []) {
    for (const m of x.methods) {
      const prov = state.authentication_providers![
        m.provider
      ] as AuthenticationProviderStatusOk;
      const authMethod = state.authentication_methods![m.authentication_method];
      const key = `${m.authentication_method}@${m.provider}`;
      if (coveredProvTruth.has(key)) {
        continue;
      }
      logger.info(
        `adding cost for auth method ${authMethod.challenge} / "${authMethod.instructions}" at ${m.provider}`,
      );
      coveredProvTruth.add(key);
      addFee(prov.truth_upload_fee);
    }
  }
  return {
    ...state,
    upload_fees: Object.values(feePerCurrency).map((x) => ({
      fee: Amounts.stringify(x),
    })),
  };
}

async function enterSecret(
  state: ReducerStateBackup,
  args: ActionArgsEnterSecret,
): Promise<ReducerStateBackup | ReducerStateError> {
  return updateUploadFees({
    ...state,
    expiration: args.expiration,
    core_secret: {
      mime: args.secret.mime ?? "text/plain",
      value: args.secret.value,
      filename: args.secret.filename,
    },
    // A new secret invalidates the existing recovery data.
    recovery_data: undefined,
  });
}

async function nextFromChallengeSelecting(
  state: ReducerStateRecovery,
  args: void,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const s2 = await tryRecoverSecret(state);
  if (
    s2.reducer_type === "recovery" &&
    s2.recovery_state === RecoveryStates.RecoveryFinished
  ) {
    return s2;
  }
  return {
    reducer_type: "error",
    code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
    hint: "Not enough challenges solved",
  };
}

async function syncOneProviderRecoveryTransition(
  state: ReducerStateRecovery,
  args: void,
): Promise<ReducerStateRecovery | ReducerStateError> {
  // FIXME: Should we not add this when we obtain the recovery document?
  const escrowMethods = state.verbatim_recovery_document?.escrow_methods ?? [];
  if (escrowMethods.length === 0) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: "Can't sync, no escrow methods in recovery doc.",
    };
  }
  for (const x of escrowMethods) {
    const pi = state.authentication_providers?.[x.url];
    if (pi?.status === "ok") {
      logger.info(`provider ${x.url} is synced`);
      continue;
    }
    const newPi = await getProviderInfo(x.url);
    return {
      ...state,
      authentication_providers: {
        ...state.authentication_providers,
        [x.url]: newPi,
      },
    };
  }

  for (const [provUrl, pi] of Object.entries(
    state.authentication_providers ?? {},
  )) {
    if (
      pi.status === "ok" ||
      pi.status === "disabled" ||
      pi.status === "error"
    ) {
      continue;
    }
    const newPi = await getProviderInfo(provUrl);
    return {
      ...state,
      authentication_providers: {
        ...state.authentication_providers,
        [provUrl]: newPi,
      },
    };
  }
  return {
    reducer_type: "error",
    code: TalerErrorCode.ANASTASIS_REDUCER_PROVIDERS_ALREADY_SYNCED,
    hint: "all providers are already synced",
  };
}

async function syncOneProviderBackupTransition(
  state: ReducerStateBackup,
  args: void,
): Promise<ReducerStateBackup | ReducerStateError> {
  for (const [provUrl, pi] of Object.entries(
    state.authentication_providers ?? {},
  )) {
    if (
      pi.status === "ok" ||
      pi.status === "disabled" ||
      pi.status === "error"
    ) {
      continue;
    }
    const newPi = await getProviderInfo(provUrl);
    return {
      ...state,
      authentication_providers: {
        ...state.authentication_providers,
        [provUrl]: newPi,
      },
    };
  }
  return {
    reducer_type: "error",
    code: TalerErrorCode.ANASTASIS_REDUCER_PROVIDERS_ALREADY_SYNCED,
    hint: "all providers are already synced",
  };
}

async function enterSecretName(
  state: ReducerStateBackup,
  args: ActionArgsEnterSecretName,
): Promise<ReducerStateBackup | ReducerStateError> {
  return {
    ...state,
    secret_name: args.name,
  };
}

async function updateSecretExpiration(
  state: ReducerStateBackup,
  args: ActionArgsUpdateExpiration,
): Promise<ReducerStateBackup | ReducerStateError> {
  return updateUploadFees({
    ...state,
    expiration: args.expiration,
  });
}

export function mergeDiscoveryAggregate(
  newPolicies: PolicyMetaInfo[],
  oldAgg: AggregatedPolicyMetaInfo[],
): AggregatedPolicyMetaInfo[] {
  const aggregatedPolicies: AggregatedPolicyMetaInfo[] = [...oldAgg] ?? [];
  const polHashToIndex: Record<string, number> = {};
  for (const pol of newPolicies) {
    const oldIndex = polHashToIndex[pol.policy_hash];
    if (oldIndex != null) {
      aggregatedPolicies[oldIndex].providers.push({
        url: pol.provider_url,
        version: pol.version,
      });
    } else {
      aggregatedPolicies.push({
        attribute_mask: pol.attribute_mask,
        policy_hash: pol.policy_hash,
        providers: [
          {
            url: pol.provider_url,
            version: pol.version,
          },
        ],
        secret_name: pol.secret_name,
      });
      polHashToIndex[pol.policy_hash] = aggregatedPolicies.length - 1;
    }
  }
  return aggregatedPolicies;
}

const backupTransitions: Record<
  BackupStates,
  Transition<ReducerStateBackup>
> = {
  [BackupStates.ContinentSelecting]: {
    ...transition(
      "select_continent",
      codecForActionArgSelectContinent(),
      backupSelectContinent,
    ),
  },
  [BackupStates.CountrySelecting]: {
    ...transitionBackupJump("back", BackupStates.ContinentSelecting),
    ...transition(
      "select_country",
      codecForActionArgSelectCountry(),
      backupSelectCountry,
    ),
    ...transition(
      "select_continent",
      codecForActionArgSelectContinent(),
      backupSelectContinent,
    ),
  },
  [BackupStates.UserAttributesCollecting]: {
    ...transitionBackupJump("back", BackupStates.CountrySelecting),
    ...transition(
      "enter_user_attributes",
      codecForActionArgsEnterUserAttributes(),
      backupEnterUserAttributes,
    ),
    ...transition(
      "sync_providers",
      codecForAny(),
      syncOneProviderBackupTransition,
    ),
  },
  [BackupStates.AuthenticationsEditing]: {
    ...transitionBackupJump("back", BackupStates.UserAttributesCollecting),
    ...transition("add_authentication", codecForAny(), addAuthentication),
    ...transition("delete_authentication", codecForAny(), deleteAuthentication),
    ...transition("add_provider", codecForAny(), addProviderBackup),
    ...transition("delete_provider", codecForAny(), deleteProviderBackup),
    ...transition(
      "sync_providers",
      codecForAny(),
      syncOneProviderBackupTransition,
    ),
    ...transition("next", codecForAny(), nextFromAuthenticationsEditing),
  },
  [BackupStates.PoliciesReviewing]: {
    ...transitionBackupJump("back", BackupStates.AuthenticationsEditing),
    ...transitionBackupJump("next", BackupStates.SecretEditing),
    ...transition("add_policy", codecForActionArgsAddPolicy(), addPolicy),
    ...transition("delete_policy", codecForAny(), deletePolicy),
    ...transition("update_policy", codecForAny(), updatePolicy),
  },
  [BackupStates.SecretEditing]: {
    ...transitionBackupJump("back", BackupStates.PoliciesReviewing),
    ...transition("next", codecForAny(), uploadSecret),
    ...transition("enter_secret", codecForAny(), enterSecret),
    ...transition(
      "update_expiration",
      codecForActionArgsUpdateExpiration(),
      updateSecretExpiration,
    ),
    ...transition("enter_secret_name", codecForAny(), enterSecretName),
  },
  [BackupStates.PoliciesPaying]: {
    ...transitionBackupJump("back", BackupStates.SecretEditing),
    ...transition("pay", codecForAny(), uploadSecret),
  },
  [BackupStates.TruthsPaying]: {
    ...transitionBackupJump("back", BackupStates.SecretEditing),
    ...transition("pay", codecForAny(), uploadSecret),
  },
  [BackupStates.BackupFinished]: {
    ...transitionBackupJump("back", BackupStates.SecretEditing),
  },
};

const recoveryTransitions: Record<
  RecoveryStates,
  Transition<ReducerStateRecovery>
> = {
  [RecoveryStates.ContinentSelecting]: {
    ...transition(
      "select_continent",
      codecForActionArgSelectContinent(),
      recoverySelectContinent,
    ),
  },
  [RecoveryStates.CountrySelecting]: {
    ...transitionRecoveryJump("back", RecoveryStates.ContinentSelecting),
    ...transition(
      "select_country",
      codecForActionArgSelectCountry(),
      recoverySelectCountry,
    ),
    ...transition(
      "select_continent",
      codecForActionArgSelectContinent(),
      recoverySelectContinent,
    ),
  },
  [RecoveryStates.UserAttributesCollecting]: {
    ...transitionRecoveryJump("back", RecoveryStates.CountrySelecting),
    ...transition(
      "enter_user_attributes",
      codecForActionArgsEnterUserAttributes(),
      recoveryEnterUserAttributes,
    ),
  },
  [RecoveryStates.SecretSelecting]: {
    ...transitionRecoveryJump("back", RecoveryStates.UserAttributesCollecting),
    ...transitionRecoveryJump("next", RecoveryStates.ChallengeSelecting),
    ...transition("add_provider", codecForAny(), addProviderRecovery),
    ...transition("delete_provider", codecForAny(), deleteProviderRecovery),
    ...transition(
      "select_version",
      codecForActionArgsChangeVersion(),
      changeVersion,
    ),
  },
  [RecoveryStates.ChallengeSelecting]: {
    ...transitionRecoveryJump("back", RecoveryStates.SecretSelecting),
    ...transition(
      "select_challenge",
      codecForActionArgsSelectChallenge(),
      selectChallenge,
    ),
    ...transition("poll", codecForAny(), pollChallenges),
    ...transition("next", codecForAny(), nextFromChallengeSelecting),
    ...transition(
      "sync_providers",
      codecForAny(),
      syncOneProviderRecoveryTransition,
    ),
  },
  [RecoveryStates.ChallengeSolving]: {
    ...transitionRecoveryJump("back", RecoveryStates.ChallengeSelecting),
    ...transition("solve_challenge", codecForAny(), solveChallenge),
  },
  [RecoveryStates.ChallengePaying]: {},
  [RecoveryStates.RecoveryFinished]: {
    ...transitionRecoveryJump("back", RecoveryStates.ChallengeSelecting),
  },
};

export async function discoverPolicies(
  state: ReducerState,
  cursor?: DiscoveryCursor,
): Promise<DiscoveryResult> {
  if (state.reducer_type !== "recovery") {
    throw Error("can only discover providers in recovery state");
  }

  const policies: PolicyMetaInfo[] = [];

  const providerUrls = Object.keys(state.authentication_providers || {});
  // FIXME: Do we need to re-contact providers here / check if they're disabled?
  // FIXME: Do this concurrently and take the first.  Otherwise, one provider might block for a long time.

  for (const providerUrl of providerUrls) {
    const providerInfo = await getProviderInfo(providerUrl);
    if (providerInfo.status !== "ok") {
      continue;
    }
    const userId = await userIdentifierDerive(
      state.identity_attributes!,
      providerInfo.provider_salt,
    );
    const acctKeypair = accountKeypairDerive(userId);
    const reqUrl = new URL(`policy/${acctKeypair.pub}/meta`, providerUrl);
    const resp = await fetch(reqUrl.href);
    if (resp.status !== 200) {
      logger.warn(`Could not fetch policy metadate from ${reqUrl.href}`);
      continue;
    }
    const respJson: RecoveryMetaResponse = await resp.json();
    const versions = Object.keys(respJson);
    for (const version of versions) {
      const item = respJson[version];
      if (!item.meta) {
        continue;
      }
      const metaData = await decryptPolicyMetadata(userId, item.meta!);
      policies.push({
        attribute_mask: 0,
        provider_url: providerUrl,
        server_time: item.upload_time,
        version: Number.parseInt(version, 10),
        secret_name: metaData.secret_name,
        policy_hash: metaData.policy_hash,
      });
    }
  }
  return {
    policies,
    cursor: undefined,
  };
}

export async function reduceAction(
  state: ReducerState,
  action: string,
  args: any,
): Promise<ReducerState> {
  let h: TransitionImpl<any, any>;
  let stateName: string;
  if ("backup_state" in state && state.backup_state) {
    stateName = state.backup_state;
    h = backupTransitions[state.backup_state][action];
  } else if ("recovery_state" in state && state.recovery_state) {
    stateName = state.recovery_state;
    h = recoveryTransitions[state.recovery_state][action];
  } else {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: `Invalid state (needs backup_state or recovery_state)`,
    };
  }
  if (!h) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: `Unsupported action '${action}' in state '${stateName}'`,
    };
  }
  let parsedArgs: any;
  try {
    parsedArgs = h.argCodec.decode(args);
  } catch (e: any) {
    return {
      reducer_type: "error",
      code: TalerErrorCode.ANASTASIS_REDUCER_INPUT_INVALID,
      hint: "argument validation failed",
      detail: e.toString(),
    };
  }
  try {
    return await h.handler(state, parsedArgs);
  } catch (e: any) {
    logger.error("action handler failed");
    logger.error(`${e?.stack ?? e}`);
    if (e instanceof ReducerError) {
      return {
        reducer_type: "error",
        ...e.errorJson,
      };
    }
    throw e;
  }
}

/**
 * Update provider status of providers that we still need to contact.
 *
 * Returns updates as soon as new information about at least one provider
 * is found.
 *
 * Returns an empty object if provider information is complete.
 *
 * FIXME: Also pass a cancellation token.
 */
export async function completeProviderStatus(
  providerMap: AuthenticationProviderStatusMap,
): Promise<AuthenticationProviderStatusMap> {
  const updateTasks: Promise<[string, AuthenticationProviderStatus]>[] = [];
  for (const [provUrl, pi] of Object.entries(providerMap)) {
    switch (pi.status) {
      case "ok":
      case "error":
      case "disabled":
      default:
        continue;
      case "not-contacted":
        updateTasks.push(
          (async () => {
            return [provUrl, await getProviderInfo(provUrl)];
          })(),
        );
    }
  }

  if (updateTasks.length === 0) {
    return {};
  }

  const [firstUrl, firstStatus] = await Promise.race(updateTasks);
  return {
    [firstUrl]: firstStatus,
  };
}
