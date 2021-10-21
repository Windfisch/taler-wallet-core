import {
  AmountString,
  buildSigPS,
  bytesToString,
  Codec,
  codecForAny,
  decodeCrock,
  eddsaSign,
  encodeCrock,
  getRandomBytes,
  hash,
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
  ActionArgsSelectChallenge,
  ActionArgsSolveChallengeRequest,
  AuthenticationProviderStatus,
  AuthenticationProviderStatusOk,
  AuthMethod,
  BackupStates,
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
  TruthKey,
  TruthUuid,
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

const { fetch, Request, Response, Headers } = fetchPonyfill({});

export * from "./reducer-types.js";

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

function getCountries(continent: string): CountryInfo[] {
  return anastasisData.countriesList.countries.filter(
    (x) => x.continent === continent,
  );
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

async function backupSelectCountry(
  state: ReducerStateBackup,
  countryCode: string,
  currencies: string[],
): Promise<ReducerStateError | ReducerStateBackupUserAttributesCollecting> {
  const country = anastasisData.countriesList.countries.find(
    (x) => x.code === countryCode,
  );
  if (!country) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: "invalid country selected",
    };
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
    ...state,
    backup_state: BackupStates.UserAttributesCollecting,
    selected_country: countryCode,
    currencies,
    required_attributes: ra,
    authentication_providers: providers,
  };
}

async function recoverySelectCountry(
  state: ReducerStateRecovery,
  countryCode: string,
  currencies: string[],
): Promise<ReducerStateError | ReducerStateRecovery> {
  const country = anastasisData.countriesList.countries.find(
    (x) => x.code === countryCode,
  );
  if (!country) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
      hint: "invalid country selected",
    };
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
    ...state,
    recovery_state: RecoveryStates.UserAttributesCollecting,
    selected_country: countryCode,
    currencies,
    required_attributes: ra,
    authentication_providers: providers,
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
  attributes: Record<string, string>,
): Promise<ReducerStateBackup> {
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

interface PolicySelectionResult {
  policies: Policy[];
  policy_providers: PolicyProvider[];
}

type MethodSelection = number[];

function enumerateSelections(n: number, m: number): MethodSelection[] {
  const selections: MethodSelection[] = [];
  const a = new Array(n);
  const sel = (i: number) => {
    if (i === n) {
      selections.push([...a]);
      return;
    }
    const start = i == 0 ? 0 : a[i - 1] + 1;
    for (let j = start; j < m; j++) {
      a[i] = j;
      sel(i + 1);
    }
  };
  sel(0);
  return selections;
}

/**
 * Provider information used during provider/method mapping.
 */
interface ProviderInfo {
  url: string;
  methodCost: Record<string, AmountString>;
}

/**
 * Assign providers to a method selection.
 */
function assignProviders(
  methods: AuthMethod[],
  providers: ProviderInfo[],
  methodSelection: number[],
): Policy | undefined {
  const selectedProviders: string[] = [];
  for (const mi of methodSelection) {
    const m = methods[mi];
    let found = false;
    for (const prov of providers) {
      if (prov.methodCost[m.type]) {
        selectedProviders.push(prov.url);
        found = true;
        break;
      }
    }
    if (!found) {
      /* No provider found for this method */
      return undefined;
    }
  }
  return {
    methods: methodSelection.map((x, i) => {
      return {
        authentication_method: x,
        provider: selectedProviders[i],
      };
    }),
  };
}

function suggestPolicies(
  methods: AuthMethod[],
  providers: ProviderInfo[],
): PolicySelectionResult {
  const numMethods = methods.length;
  if (numMethods === 0) {
    throw Error("no methods");
  }
  let numSel: number;
  if (numMethods <= 2) {
    numSel = numMethods;
  } else if (numMethods <= 4) {
    numSel = numMethods - 1;
  } else if (numMethods <= 6) {
    numSel = numMethods - 2;
  } else if (numMethods == 7) {
    numSel = numMethods - 3;
  } else {
    numSel = 4;
  }
  const policies: Policy[] = [];
  const selections = enumerateSelections(numSel, numMethods);
  console.log("selections", selections);
  for (const sel of selections) {
    const p = assignProviders(methods, providers, sel);
    if (p) {
      policies.push(p);
    }
  }
  return {
    policies,
    policy_providers: providers.map((x) => ({
      provider_url: x.url,
    })),
  };
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
  console.log("recovery document", rd);
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
    console.log(
      "encrypted key share len",
      decodeCrock(encryptedKeyShare).length,
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
        hint: "could not upload policy",
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

  console.log("policy UUIDs", policyUuids);

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
        hint: "could not upload policy",
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
    console.log("rd", rd);
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
      console.log("providers", newProviderStatus);
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

async function solveChallenge(
  state: ReducerStateRecovery,
  ta: ActionArgsSolveChallengeRequest,
): Promise<ReducerStateRecovery | ReducerStateError> {
  const recDoc: RecoveryDocument = state.verbatim_recovery_document!;
  const truth = recDoc.escrow_methods.find(
    (x) => x.uuid === state.selected_challenge_uuid,
  );
  if (!truth) {
    throw "truth for challenge not found";
  }

  const url = new URL(`/truth/${truth.uuid}`, truth.url);

  // FIXME: This isn't correct for non-question truth responses.
  url.searchParams.set(
    "response",
    await secureAnswerHash(ta.answer, truth.uuid, truth.truth_salt),
  );

  const resp = await fetch(url.href, {
    headers: {
      "Anastasis-Truth-Decryption-Key": truth.truth_key,
    },
  });

  console.log(resp);

  if (resp.status !== 200) {
    return {
      code: TalerErrorCode.ANASTASIS_TRUTH_CHALLENGE_FAILED,
      hint: "got non-200 response",
      http_status: resp.status,
    } as ReducerStateError;
  }

  const answerSalt = truth.escrow_type === "question" ? ta.answer : undefined;

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

  const challengeFeedback = {
    ...state.challenge_feedback,
    [truth.uuid]: {
      state: "solved",
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

async function recoveryEnterUserAttributes(
  state: ReducerStateRecovery,
  attributes: Record<string, string>,
): Promise<ReducerStateRecovery | ReducerStateError> {
  // FIXME: validate attributes
  const st: ReducerStateRecovery = {
    ...state,
    identity_attributes: attributes,
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

  const url = new URL(`/truth/${truth.uuid}`, truth.url);

  const resp = await fetch(url.href, {
    headers: {
      "Anastasis-Truth-Decryption-Key": truth.truth_key,
    },
  });

  console.log(resp);

  return {
    ...state,
    recovery_state: RecoveryStates.ChallengeSolving,
    selected_challenge_uuid: ta.uuid,
  };
}

export async function reduceAction(
  state: ReducerState,
  action: string,
  args: any,
): Promise<ReducerState> {
  console.log(`ts reducer: handling action ${action}`);
  if (state.backup_state === BackupStates.ContinentSelecting) {
    if (action === "select_continent") {
      const continent: string = args.continent;
      if (typeof continent !== "string") {
        return {
          code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
          hint: "continent required",
        };
      }
      return {
        ...state,
        backup_state: BackupStates.CountrySelecting,
        countries: getCountries(continent),
        selected_continent: continent,
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }
  if (state.backup_state === BackupStates.CountrySelecting) {
    if (action === "back") {
      return {
        ...state,
        backup_state: BackupStates.ContinentSelecting,
        countries: undefined,
      };
    } else if (action === "select_country") {
      const countryCode = args.country_code;
      if (typeof countryCode !== "string") {
        return {
          code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
          hint: "country_code required",
        };
      }
      const currencies = args.currencies;
      return backupSelectCountry(state, countryCode, currencies);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }
  if (state.backup_state === BackupStates.UserAttributesCollecting) {
    if (action === "back") {
      return {
        ...state,
        backup_state: BackupStates.CountrySelecting,
      };
    } else if (action === "enter_user_attributes") {
      const ta = args as ActionArgEnterUserAttributes;
      return backupEnterUserAttributes(state, ta.identity_attributes);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }
  if (state.backup_state === BackupStates.AuthenticationsEditing) {
    if (action === "back") {
      return {
        ...state,
        backup_state: BackupStates.UserAttributesCollecting,
      };
    } else if (action === "add_authentication") {
      const ta = args as ActionArgAddAuthentication;
      return {
        ...state,
        authentication_methods: [
          ...(state.authentication_methods ?? []),
          ta.authentication_method,
        ],
      };
    } else if (action === "delete_authentication") {
      const ta = args as ActionArgDeleteAuthentication;
      const m = state.authentication_methods ?? [];
      m.splice(ta.authentication_method, 1);
      return {
        ...state,
        authentication_methods: m,
      };
    } else if (action === "next") {
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
      console.log("policies", pol);
      return {
        ...state,
        backup_state: BackupStates.PoliciesReviewing,
        ...pol,
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }
  if (state.backup_state === BackupStates.PoliciesReviewing) {
    if (action === "back") {
      return {
        ...state,
        backup_state: BackupStates.AuthenticationsEditing,
      };
    } else if (action === "delete_policy") {
      const ta = args as ActionArgDeletePolicy;
      const policies = [...(state.policies ?? [])];
      policies.splice(ta.policy_index, 1);
      return {
        ...state,
        policies,
      };
    } else if (action === "next") {
      return {
        ...state,
        backup_state: BackupStates.SecretEditing,
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }
  if (state.backup_state === BackupStates.SecretEditing) {
    if (action === "back") {
      return {
        ...state,
        backup_state: BackupStates.PoliciesReviewing,
      };
    } else if (action === "enter_secret_name") {
      const ta = args as ActionArgEnterSecretName;
      return {
        ...state,
        secret_name: ta.name,
      };
    } else if (action === "enter_secret") {
      const ta = args as ActionArgEnterSecret;
      return {
        ...state,
        expiration: ta.expiration,
        core_secret: {
          mime: ta.secret.mime ?? "text/plain",
          value: ta.secret.value,
        },
      };
    } else if (action === "next") {
      return uploadSecret(state);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }
  if (state.backup_state === BackupStates.BackupFinished) {
    if (action === "back") {
      return {
        ...state,
        backup_state: BackupStates.SecretEditing,
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.ContinentSelecting) {
    if (action === "select_continent") {
      const continent: string = args.continent;
      if (typeof continent !== "string") {
        return {
          code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
          hint: "continent required",
        };
      }
      return {
        ...state,
        recovery_state: RecoveryStates.CountrySelecting,
        countries: getCountries(continent),
        selected_continent: continent,
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.CountrySelecting) {
    if (action === "back") {
      return {
        ...state,
        recovery_state: RecoveryStates.ContinentSelecting,
        countries: undefined,
      };
    } else if (action === "select_country") {
      const countryCode = args.country_code;
      if (typeof countryCode !== "string") {
        return {
          code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
          hint: "country_code required",
        };
      }
      const currencies = args.currencies;
      return recoverySelectCountry(state, countryCode, currencies);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.UserAttributesCollecting) {
    if (action === "back") {
      return {
        ...state,
        recovery_state: RecoveryStates.CountrySelecting,
      };
    } else if (action === "enter_user_attributes") {
      const ta = args as ActionArgEnterUserAttributes;
      return recoveryEnterUserAttributes(state, ta.identity_attributes);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.SecretSelecting) {
    if (action === "back") {
      return {
        ...state,
        recovery_state: RecoveryStates.UserAttributesCollecting,
      };
    } else if (action === "next") {
      return {
        ...state,
        recovery_state: RecoveryStates.ChallengeSelecting,
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.ChallengeSelecting) {
    if (action === "select_challenge") {
      const ta: ActionArgsSelectChallenge = args;
      return selectChallenge(state, ta);
    } else if (action === "back") {
      return {
        ...state,
        recovery_state: RecoveryStates.SecretSelecting,
      };
    } else if (action === "next") {
      const s2 = await tryRecoverSecret(state);
      if (s2.recovery_state === RecoveryStates.RecoveryFinished) {
        return s2;
      }
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: "Not enough challenges solved",
      };
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.ChallengeSolving) {
    if (action === "back") {
      const ta: ActionArgsSelectChallenge = args;
      return {
        ...state,
        selected_challenge_uuid: undefined,
        recovery_state: RecoveryStates.ChallengeSelecting,
      };
    } else if (action === "solve_challenge") {
      const ta: ActionArgsSolveChallengeRequest = args;
      return solveChallenge(state, ta);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  if (state.recovery_state === RecoveryStates.RecoveryFinished) {
    if (action === "back") {
      const ta: ActionArgsSelectChallenge = args;
      return {
        ...state,
        selected_challenge_uuid: undefined,
        recovery_state: RecoveryStates.ChallengeSelecting,
      };
    } else if (action === "solve_challenge") {
      const ta: ActionArgsSolveChallengeRequest = args;
      return solveChallenge(state, ta);
    } else {
      return {
        code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
        hint: `Unsupported action '${action}'`,
      };
    }
  }

  return {
    code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
    hint: "Reducer action invalid",
  };
}
