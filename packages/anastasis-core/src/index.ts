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
  j2s,
  Logger,
  stringToBytes,
  TalerErrorCode,
  TalerSignaturePurpose,
  Timestamp,
} from "@gnu-taler/taler-util";
import { anastasisData } from "./anastasis-data.js";
import {
  EscrowConfigurationResponse,
  TruthUploadRequest,
} from "./provider-types.js";
import {
  ActionArgAddAuthentication,
  ActionArgDeleteAuthentication,
  ActionArgDeletePolicy,
  ActionArgEnterSecret,
  ActionArgEnterSecretName,
  ActionArgEnterUserAttributes,
  ActionArgsAddPolicy,
  ActionArgSelectContinent,
  ActionArgSelectCountry,
  ActionArgsSelectChallenge,
  ActionArgsSolveChallengeRequest,
  ActionArgsUpdateExpiration,
  AuthenticationProviderStatus,
  AuthenticationProviderStatusOk,
  AuthMethod,
  BackupStates,
  codecForActionArgEnterUserAttributes,
  codecForActionArgsAddPolicy,
  codecForActionArgSelectChallenge,
  codecForActionArgSelectContinent,
  codecForActionArgSelectCountry,
  codecForActionArgsUpdateExpiration,
  ContinentInfo,
  CountryInfo,
  MethodSpec,
  Policy,
  PolicyProvider,
  RecoveryInformation,
  RecoveryInternalData,
  RecoveryStates,
  ReducerState,
  ReducerStateBackup,
  ReducerStateBackupUserAttributesCollecting,
  ReducerStateError,
  ReducerStateRecovery,
  SuccessDetails,
  UserAttributeSpec,
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
} from "./crypto.js";
import { unzlibSync, zlibSync } from "fflate";
import { EscrowMethod, RecoveryDocument } from "./recovery-document-types.js";
import { ProviderInfo, suggestPolicies } from "./policy-suggestion.js";
import { ChallengeFeedback, ChallengeFeedbackStatus } from "./challenge-feedback-types.js";

const { fetch } = fetchPonyfill({});

export * from "./reducer-types.js";
export * as validators from "./validators.js";

const logger = new Logger("anastasis-core:index.ts");

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
      hint: "continent not found",
    });
  }
  return countries;
}

export async function getBackupStartState(): Promise<ReducerStateBackup> {
  return {
    backup_state: BackupStates.ContinentSelecting,
    continents: getContinents(),
  };
}

export async function getRecoveryStartState(): Promise<ReducerStateRecovery> {
  return {
    recovery_state: RecoveryStates.ContinentSelecting,
    continents: getContinents(),
  };
}

async function selectCountry(
  selectedContinent: string,
  args: ActionArgSelectCountry,
): Promise<Partial<ReducerStateBackup> & Partial<ReducerStateRecovery>> {
  const countryCode = args.country_code;
  const currencies = args.currencies;
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

  const providers: { [x: string]: {} } = {};
  for (const prov of anastasisData.providersList.anastasis_provider) {
    if (currencies.includes(prov.currency)) {
      providers[prov.url] = {};
    }
  }

  const ra = (anastasisData.countryDetails as any)[countryCode]
    .required_attributes;

  return {
    selected_country: countryCode,
    currencies,
    required_attributes: ra,
    authentication_providers: providers,
  };
}

async function backupSelectCountry(
  state: ReducerStateBackup,
  args: ActionArgSelectCountry,
): Promise<ReducerStateError | ReducerStateBackup> {
  return {
    ...state,
    ...(await selectCountry(state.selected_continent!, args)),
    backup_state: BackupStates.UserAttributesCollecting,
  };
}

async function recoverySelectCountry(
  state: ReducerStateRecovery,
  args: ActionArgSelectCountry,
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
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: "request to provider failed",
    };
  }
  if (resp.status !== 200) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: "unexpected status",
      http_status: resp.status,
    };
  }
  try {
    const jsonResp: EscrowConfigurationResponse = await resp.json();
    return {
      http_status: 200,
      annual_fee: jsonResp.annual_fee,
      business_name: jsonResp.business_name,
      currency: jsonResp.currency,
      liability_limit: jsonResp.liability_limit,
      methods: jsonResp.methods.map((x) => ({
        type: x.type,
        usage_fee: x.cost,
      })),
      salt: jsonResp.server_salt,
      storage_limit_in_megabytes: jsonResp.storage_limit_in_megabytes,
      truth_upload_fee: jsonResp.truth_upload_fee,
    } as AuthenticationProviderStatusOk;
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      hint: "provider did not return JSON",
    };
  }
}

async function backupEnterUserAttributes(
  state: ReducerStateBackup,
  args: ActionArgEnterUserAttributes,
): Promise<ReducerStateBackup> {
  const attributes = args.identity_attributes;
  const providerUrls = Object.keys(state.authentication_providers ?? {});
  const newProviders = state.authentication_providers ?? {};
  for (const url of providerUrls) {
    newProviders[url] = await getProviderInfo(url);
  }
  const newState = {
    ...state,
    backup_state: BackupStates.AuthenticationsEditing,
    authentication_providers: newProviders,
    identity_attributes: attributes,
  };
  return newState;
}

/**
 * Truth data as stored in the reducer.
 */
interface TruthMetaData {
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
  truth_salt: string;
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
      return authMethod.challenge;
    default:
      throw Error("unknown auth type");
  }
}

/**
 * Compress the recovery document and add a size header.
 */
async function compressRecoveryDoc(rd: any): Promise<Uint8Array> {
  logger.info(`recovery document: ${j2s(rd)}`);
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

async function uploadSecret(
  state: ReducerStateBackup,
): Promise<ReducerStateBackup | ReducerStateError> {
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
          truth_salt: encodeCrock(getRandomBytes(16)),
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

  const uidMap: Record<string, UserIdentifier> = {};
  for (const prov of state.policy_providers!) {
    const provider = state.authentication_providers![
      prov.provider_url
    ] as AuthenticationProviderStatusOk;
    uidMap[prov.provider_url] = await userIdentifierDerive(
      state.identity_attributes!,
      provider.salt,
    );
  }

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
    const truthValue = await getTruthValue(authMethod, tm.uuid, tm.truth_salt);
    const encryptedTruth = await encryptTruth(
      tm.nonce,
      tm.truth_key,
      truthValue,
    );
    const uid = uidMap[meth.provider];
    const encryptedKeyShare = await encryptKeyshare(
      tm.key_share,
      uid,
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
    const resp = await fetch(new URL(`truth/${tm.uuid}`, meth.provider).href, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(tur),
    });

    if (resp.status !== 204) {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
        hint: `could not upload truth (HTTP status ${resp.status})`,
      };
    }

    escrowMethods.push({
      escrow_type: authMethod.type,
      instructions: authMethod.instructions,
      provider_salt: provider.salt,
      truth_salt: tm.truth_salt,
      truth_key: tm.truth_key,
      url: meth.provider,
      uuid: tm.uuid,
    });
  }

  // FIXME: We need to store the truth metadata in
  // the state, since it's possible that we'll run into
  // a provider that requests a payment.

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

  const successDetails: SuccessDetails = {};

  for (const prov of state.policy_providers!) {
    const uid = uidMap[prov.provider_url];
    const acctKeypair = accountKeypairDerive(uid);
    const zippedDoc = await compressRecoveryDoc(rd);
    const encRecoveryDoc = await encryptRecoveryDocument(
      uid,
      encodeCrock(zippedDoc),
    );
    const bodyHash = hash(decodeCrock(encRecoveryDoc));
    const sigPS = buildSigPS(TalerSignaturePurpose.ANASTASIS_POLICY_UPLOAD)
      .put(bodyHash)
      .build();
    const sig = eddsaSign(sigPS, decodeCrock(acctKeypair.priv));
    const resp = await fetch(
      new URL(`policy/${acctKeypair.pub}`, prov.provider_url).href,
      {
        method: "POST",
        headers: {
          "Anastasis-Policy-Signature": encodeCrock(sig),
          "If-None-Match": encodeCrock(bodyHash),
        },
        body: decodeCrock(encRecoveryDoc),
      },
    );
    if (resp.status !== 204) {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
        hint: `could not upload policy (http status ${resp.status})`,
      };
    }
    let policyVersion = 0;
    let policyExpiration: Timestamp = { t_ms: 0 };
    try {
      policyVersion = Number(resp.headers.get("Anastasis-Version") ?? "0");
    } catch (e) {}
    try {
      policyExpiration = {
        t_ms:
          1000 * Number(resp.headers.get("Anastasis-Policy-Expiration") ?? "0"),
      };
    } catch (e) {}
    successDetails[prov.provider_url] = {
      policy_version: policyVersion,
      policy_expiration: policyExpiration,
    };
  }

  return {
    ...state,
    core_secret: undefined,
    backup_state: BackupStates.BackupFinished,
    success_details: successDetails,
  };
}

/**
 * Download policy based on current user attributes and selected
 * version in the state.
 */
async function downloadPolicy(
  state: ReducerStateRecovery,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const providerUrls = Object.keys(state.authentication_providers ?? {});
  let foundRecoveryInfo: RecoveryInternalData | undefined = undefined;
  let recoveryDoc: RecoveryDocument | undefined = undefined;
  const newProviderStatus: { [url: string]: AuthenticationProviderStatusOk } =
    {};
  const userAttributes = state.identity_attributes!;
  // FIXME:  Shouldn't we also store the status of bad providers?
  for (const url of providerUrls) {
    const pi = await getProviderInfo(url);
    if ("error_code" in pi || !("http_status" in pi)) {
      // Could not even get /config of the provider
      continue;
    }
    newProviderStatus[url] = pi;
  }
  for (const url of providerUrls) {
    const pi = newProviderStatus[url];
    if (!pi) {
      continue;
    }
    const userId = await userIdentifierDerive(userAttributes, pi.salt);
    const acctKeypair = accountKeypairDerive(userId);
    const resp = await fetch(new URL(`policy/${acctKeypair.pub}`, url).href);
    if (resp.status !== 200) {
      continue;
    }
    const body = await resp.arrayBuffer();
    const bodyDecrypted = await decryptRecoveryDocument(
      userId,
      encodeCrock(body),
    );
    const rd: RecoveryDocument = await uncompressRecoveryDoc(
      decodeCrock(bodyDecrypted),
    );
    let policyVersion = 0;
    try {
      policyVersion = Number(resp.headers.get("Anastasis-Version") ?? "0");
    } catch (e) {}
    foundRecoveryInfo = {
      provider_url: url,
      secret_name: rd.secret_name ?? "<unknown>",
      version: policyVersion,
    };
    recoveryDoc = rd;
    break;
  }
  if (!foundRecoveryInfo || !recoveryDoc) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_POLICY_LOOKUP_FAILED,
      hint: "No backups found at any provider for your identity information.",
    };
  }
  const recoveryInfo: RecoveryInformation = {
    challenges: recoveryDoc.escrow_methods.map((x) => {
      const prov = newProviderStatus[x.url] as AuthenticationProviderStatusOk;
      return {
        cost: prov.methods.find((m) => m.type === x.escrow_type)?.usage_fee!,
        instructions: x.instructions,
        type: x.escrow_type,
        uuid: x.uuid,
      };
    }),
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
    recovery_state: RecoveryStates.SecretSelecting,
    recovery_document: foundRecoveryInfo,
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
 * Request a truth, optionally with a challenge solution
 * provided by the user.
 */
async function requestTruth(
  state: ReducerStateRecovery,
  truth: EscrowMethod,
  solveRequest?: ActionArgsSolveChallengeRequest,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const url = new URL(`/truth/${truth.uuid}`, truth.url);

  if (solveRequest) {
    // FIXME: This isn't correct for non-question truth responses.
    url.searchParams.set(
      "response",
      await secureAnswerHash(solveRequest.answer, truth.uuid, truth.truth_salt),
    );
  }

  const resp = await fetch(url.href, {
    headers: {
      "Anastasis-Truth-Decryption-Key": truth.truth_key,
    },
  });

  if (resp.status === HttpStatusCode.Ok) {
    const answerSalt =
      solveRequest && truth.escrow_type === "question"
        ? solveRequest.answer
        : undefined;

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
    return {
      ...state,
      recovery_state: RecoveryStates.ChallengeSolving,
      challenge_feedback: {
        ...state.challenge_feedback,
        [truth.uuid]: {
          state: ChallengeFeedbackStatus.Message,
          message: "Challenge should be solved",
        },
      },
    };
  }

  return {
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
  args: ActionArgEnterUserAttributes,
): Promise<ReducerStateRecovery | ReducerStateError> {
  // FIXME: validate attributes
  const st: ReducerStateRecovery = {
    ...state,
    identity_attributes: args.identity_attributes,
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

  return requestTruth({ ...state, selected_challenge_uuid: ta.uuid }, truth);
}

async function backupSelectContinent(
  state: ReducerStateBackup,
  args: ActionArgSelectContinent,
): Promise<ReducerStateBackup | ReducerStateError> {
  const countries = getCountries(args.continent);
  if (countries.length <= 0) {
    return {
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
  args: ActionArgSelectContinent,
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

interface Transition<S, T> {
  [x: string]: TransitionImpl<S, T>;
}

function transition<S, T>(
  action: string,
  argCodec: Codec<T>,
  handler: (s: S, args: T) => Promise<S | ReducerStateError>,
): Transition<S, T> {
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
): Transition<ReducerStateBackup, void> {
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
): Transition<ReducerStateRecovery, void> {
  return {
    [action]: {
      argCodec: codecForAny(),
      handler: async (s, a) => ({ ...s, recovery_state: st }),
    },
  };
}

async function addAuthentication(
  state: ReducerStateBackup,
  args: ActionArgAddAuthentication,
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
  args: ActionArgDeleteAuthentication,
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
  args: ActionArgDeletePolicy,
): Promise<ReducerStateBackup> {
  const policies = [...(state.policies ?? [])];
  policies.splice(args.policy_index, 1);
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
    if ("error_code" in prov) {
      continue;
    }
    if (!("http_status" in prov && prov.http_status === 200)) {
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
  const coveredProviders = new Set<string>();
  const addFee = (x: AmountLike) => {
    x = Amounts.jsonifyAmount(x);
    feePerCurrency[x.currency] = Amounts.add(
      feePerCurrency[x.currency] ?? Amounts.getZero(x.currency),
      x,
    ).amount;
  };
  const years = Duration.toIntegerYears(Duration.getRemaining(expiration));
  logger.info(`computing fees for ${years} years`);
  for (const x of state.policies ?? []) {
    for (const m of x.methods) {
      const prov = state.authentication_providers![
        m.provider
      ] as AuthenticationProviderStatusOk;
      const authMethod = state.authentication_methods![m.authentication_method];
      if (!coveredProviders.has(m.provider)) {
        const annualFee = Amounts.mult(prov.annual_fee, years).amount;
        logger.info(`adding annual fee ${Amounts.stringify(annualFee)}`);
        addFee(annualFee);
        coveredProviders.add(m.provider);
      }
      for (const pm of prov.methods) {
        if (pm.type === authMethod.type) {
          addFee(pm.usage_fee);
          break;
        }
      }
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
  args: ActionArgEnterSecret,
): Promise<ReducerStateBackup | ReducerStateError> {
  return updateUploadFees({
    ...state,
    expiration: args.expiration,
    core_secret: {
      mime: args.secret.mime ?? "text/plain",
      value: args.secret.value,
    },
  });
}

async function nextFromChallengeSelecting(
  state: ReducerStateRecovery,
  args: void,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const s2 = await tryRecoverSecret(state);
  if (s2.recovery_state === RecoveryStates.RecoveryFinished) {
    return s2;
  }
  return {
    code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
    hint: "Not enough challenges solved",
  };
}

async function enterSecretName(
  state: ReducerStateBackup,
  args: ActionArgEnterSecretName,
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

const backupTransitions: Record<
  BackupStates,
  Transition<ReducerStateBackup, any>
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
      codecForActionArgEnterUserAttributes(),
      backupEnterUserAttributes,
    ),
  },
  [BackupStates.AuthenticationsEditing]: {
    ...transitionBackupJump("back", BackupStates.UserAttributesCollecting),
    ...transition("add_authentication", codecForAny(), addAuthentication),
    ...transition("delete_authentication", codecForAny(), deleteAuthentication),
    ...transition("next", codecForAny(), nextFromAuthenticationsEditing),
  },
  [BackupStates.PoliciesReviewing]: {
    ...transitionBackupJump("back", BackupStates.AuthenticationsEditing),
    ...transitionBackupJump("next", BackupStates.SecretEditing),
    ...transition("add_policy", codecForActionArgsAddPolicy(), addPolicy),
    ...transition("delete_policy", codecForAny(), deletePolicy),
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
  [BackupStates.PoliciesPaying]: {},
  [BackupStates.TruthsPaying]: {},
  [BackupStates.PoliciesPaying]: {},
  [BackupStates.BackupFinished]: {
    ...transitionBackupJump("back", BackupStates.SecretEditing),
  },
};

const recoveryTransitions: Record<
  RecoveryStates,
  Transition<ReducerStateRecovery, any>
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
      codecForActionArgEnterUserAttributes(),
      recoveryEnterUserAttributes,
    ),
  },
  [RecoveryStates.SecretSelecting]: {
    ...transitionRecoveryJump("back", RecoveryStates.UserAttributesCollecting),
    ...transitionRecoveryJump("next", RecoveryStates.ChallengeSelecting),
  },
  [RecoveryStates.ChallengeSelecting]: {
    ...transitionRecoveryJump("back", RecoveryStates.SecretSelecting),
    ...transition(
      "select_challenge",
      codecForActionArgSelectChallenge(),
      selectChallenge,
    ),
    ...transition("next", codecForAny(), nextFromChallengeSelecting),
  },
  [RecoveryStates.ChallengeSolving]: {
    ...transitionRecoveryJump("back", RecoveryStates.ChallengeSelecting),
    ...transition("solve_challenge", codecForAny(), solveChallenge),
  },
  [RecoveryStates.ChallengePaying]: {},
  [RecoveryStates.RecoveryFinished]: {},
};

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
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: `Invalid state (needs backup_state or recovery_state)`,
    };
  }
  if (!h) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: `Unsupported action '${action}' in state '${stateName}'`,
    };
  }
  let parsedArgs: any;
  try {
    parsedArgs = h.argCodec.decode(args);
  } catch (e: any) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_INPUT_INVALID,
      hint: "argument validation failed",
      message: e.toString(),
    };
  }
  try {
    return await h.handler(state, parsedArgs);
  } catch (e) {
    logger.error("action handler failed");
    if (e instanceof ReducerError) {
      return e.errorJson;
    }
    throw e;
  }
}
