import {
  AmountString,
  buildSigPS,
  bytesToString,
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
  AuthenticationProviderStatus,
  AuthenticationProviderStatusOk,
  AuthMethod,
  BackupStates,
  ContinentInfo,
  CountryInfo,
  MethodSpec,
  Policy,
  PolicyProvider,
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
} from "./crypto.js";
import { zlibSync } from "fflate";

const { fetch, Request, Response, Headers } = fetchPonyfill({});

export * from "./reducer-types.js";

interface RecoveryDocument {
  // Human-readable name of the secret
  secret_name?: string;

  // Encrypted core secret.
  encrypted_core_secret: string; // bytearray of undefined length

  // List of escrow providers and selected authentication method.
  escrow_methods: EscrowMethod[];

  // List of possible decryption policies.
  policies: DecryptionPolicy[];
}

interface DecryptionPolicy {
  // Salt included to encrypt master key share when
  // using this decryption policy.
  salt: string;

  /**
   * Master key, AES-encrypted with key derived from
   * salt and keyshares revealed by the following list of
   * escrow methods identified by UUID.
   */
  master_key: string;

  /**
   * List of escrow methods identified by their UUID.
   */
  uuids: string[];
}

interface EscrowMethod {
  /**
   * URL of the escrow provider (including possibly this Anastasis server).
   */
  url: string;

  /**
   * Type of the escrow method (e.g. security question, SMS etc.).
   */
  escrow_type: string;

  // UUID of the escrow method.
  // 16 bytes base32-crock encoded.
  uuid: TruthUuid;

  // Key used to encrypt the Truth this EscrowMethod is related to.
  // Client has to provide this key to the server when using /truth/.
  truth_key: TruthKey;

  /**
   * Salt to hash the security question answer if applicable.
   */
  truth_salt: TruthSalt;

  // Salt from the provider to derive the user ID
  // at this provider.
  provider_salt: string;

  // The instructions to give to the user (i.e. the security question
  // if this is challenge-response).
  instructions: string;
}

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
      return encodeCrock(stringToBytes(authMethod.type));
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
  console.log("plain doc length", docBytes.length);
  const sizeHeaderBuf = new ArrayBuffer(4);
  const dvbuf = new DataView(sizeHeaderBuf);
  dvbuf.setUint32(0, docBytes.length, false);
  const zippedDoc = zlibSync(docBytes);
  return typedArrayConcat([new Uint8Array(sizeHeaderBuf), zippedDoc]);
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
      if (truthMetadataMap[truthReference]) {
        continue;
      }
      const keyShare = encodeCrock(getRandomBytes(32));
      keyShares.push(keyShare);
      const tm: TruthMetaData = {
        key_share: keyShare,
        nonce: encodeCrock(getRandomBytes(24)),
        truth_salt: encodeCrock(getRandomBytes(16)),
        truth_key: encodeCrock(getRandomBytes(64)),
        uuid: encodeCrock(getRandomBytes(32)),
        pol_method_index: methIndex,
        policy_index: policyIndex,
      };
      methUuids.push(tm.uuid);
      truthMetadataMap[truthReference] = tm;
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
    console.log("zipped doc", zippedDoc);
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
  return {
    code: TalerErrorCode.ANASTASIS_REDUCER_ACTION_INVALID,
    hint: "Reducer action invalid",
  };
}
