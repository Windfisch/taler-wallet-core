import {
  bytesToString,
  canonicalJson,
  decodeCrock,
  encodeCrock,
  getRandomBytes,
  kdf,
  kdfKw,
  secretbox,
  crypto_sign_keyPair_fromSeed,
  stringToBytes,
} from "@gnu-taler/taler-util";
import { argon2id } from "hash-wasm";

export type Flavor<T, FlavorT> = T & { _flavor?: FlavorT };
export type FlavorP<T, FlavorT, S extends number> = T & {
  _flavor?: FlavorT;
  _size?: S;
};

export type UserIdentifier = Flavor<string, "UserIdentifier">;
export type ServerSalt = Flavor<string, "ServerSalt">;
export type PolicySalt = Flavor<string, "PolicySalt">;
export type PolicyKey = FlavorP<string, "PolicyKey", 64>;
export type KeyShare = Flavor<string, "KeyShare">;
export type EncryptedKeyShare = Flavor<string, "EncryptedKeyShare">;
export type EncryptedTruth = Flavor<string, "EncryptedTruth">;
export type EncryptedCoreSecret = Flavor<string, "EncryptedCoreSecret">;
export type EncryptedMasterKey = Flavor<string, "EncryptedMasterKey">;
export type EddsaPublicKey = Flavor<string, "EddsaPublicKey">;
export type EddsaPrivateKey = Flavor<string, "EddsaPrivateKey">;
/**
 * Truth key, found in the recovery document.
 */
export type TruthKey = Flavor<string, "TruthKey">;
export type EncryptionNonce = Flavor<string, "EncryptionNonce">;
export type OpaqueData = Flavor<string, "OpaqueData">;

const nonceSize = 24;
const masterKeySize = 64;

export async function userIdentifierDerive(
  idData: any,
  serverSalt: ServerSalt,
): Promise<UserIdentifier> {
  const canonIdData = canonicalJson(idData);
  const hashInput = stringToBytes(canonIdData);
  const result = await argon2id({
    hashLength: 64,
    iterations: 3,
    memorySize: 1024 /* kibibytes */,
    parallelism: 1,
    password: hashInput,
    salt: decodeCrock(serverSalt),
    outputType: "binary",
  });
  return encodeCrock(result);
}

export interface AccountKeyPair {
  priv: EddsaPrivateKey;
  pub: EddsaPublicKey;
}

export function accountKeypairDerive(userId: UserIdentifier): AccountKeyPair {
  // FIXME: the KDF invocation looks fishy, but that's what the C code presently does.
  const d = kdfKw({
    outputLength: 32,
    ikm: stringToBytes("ver"),
    salt: decodeCrock(userId),
  });
  // FIXME: This bit twiddling seems wrong/unnecessary.
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;
  const pair = crypto_sign_keyPair_fromSeed(d);
  return {
    priv: encodeCrock(pair.secretKey),
    pub: encodeCrock(pair.publicKey),
  };
}

export async function encryptRecoveryDocument(
  userId: UserIdentifier,
  recoveryDoc: any,
): Promise<OpaqueData> {
  const plaintext = stringToBytes(JSON.stringify(recoveryDoc));
  const nonce = encodeCrock(getRandomBytes(nonceSize));
  return anastasisEncrypt(
    nonce,
    asOpaque(userId),
    encodeCrock(plaintext),
    "erd",
  );
}

function taConcat(chunks: Uint8Array[]): Uint8Array {
  let payloadLen = 0;
  for (const c of chunks) {
    payloadLen += c.byteLength;
  }
  const buf = new ArrayBuffer(payloadLen);
  const u8buf = new Uint8Array(buf);
  let p = 0;
  for (const c of chunks) {
    u8buf.set(c, p);
    p += c.byteLength;
  }
  return u8buf;
}

export async function policyKeyDerive(
  keyShares: KeyShare[],
  policySalt: PolicySalt,
): Promise<PolicyKey> {
  const chunks = keyShares.map((x) => decodeCrock(x));
  const polKey = kdf(
    64,
    taConcat(chunks),
    decodeCrock(policySalt),
    new Uint8Array(0),
  );
  return encodeCrock(polKey);
}

async function deriveKey(
  keySeed: OpaqueData,
  nonce: EncryptionNonce,
  salt: string,
): Promise<Uint8Array> {
  return kdf(32, decodeCrock(keySeed), stringToBytes(salt), decodeCrock(nonce));
}

async function anastasisEncrypt(
  nonce: EncryptionNonce,
  keySeed: OpaqueData,
  plaintext: OpaqueData,
  salt: string,
): Promise<OpaqueData> {
  const key = await deriveKey(keySeed, nonce, salt);
  const nonceBuf = decodeCrock(nonce);
  const cipherText = secretbox(decodeCrock(plaintext), decodeCrock(nonce), key);
  return encodeCrock(taConcat([nonceBuf, cipherText]));
}

const asOpaque = (x: string): OpaqueData => x;
const asEncryptedKeyShare = (x: OpaqueData): EncryptedKeyShare => x as string;
const asEncryptedTruth = (x: OpaqueData): EncryptedTruth => x as string;

export async function encryptKeyshare(
  keyShare: KeyShare,
  userId: UserIdentifier,
  answerSalt?: string,
): Promise<EncryptedKeyShare> {
  const s = answerSalt ?? "eks";
  const nonce = encodeCrock(getRandomBytes(24));
  return asEncryptedKeyShare(
    await anastasisEncrypt(nonce, asOpaque(userId), asOpaque(keyShare), s),
  );
}

export async function encryptTruth(
  nonce: EncryptionNonce,
  truthEncKey: TruthKey,
  truth: OpaqueData,
): Promise<EncryptedTruth> {
  const salt = "ect";
  return asEncryptedTruth(
    await anastasisEncrypt(nonce, asOpaque(truthEncKey), truth, salt),
  );
}

export interface CoreSecretEncResult {
  encCoreSecret: EncryptedCoreSecret;
  encMasterKeys: EncryptedMasterKey[];
}

export async function coreSecretEncrypt(
  policyKeys: PolicyKey[],
  coreSecret: OpaqueData,
): Promise<CoreSecretEncResult> {
  const masterKey = getRandomBytes(masterKeySize);
  const nonce = encodeCrock(getRandomBytes(nonceSize));
  const coreSecretEncSalt = "cse";
  const masterKeyEncSalt = "emk";
  const encCoreSecret = (await anastasisEncrypt(
    nonce,
    encodeCrock(masterKey),
    coreSecret,
    coreSecretEncSalt,
  )) as string;
  const encMasterKeys: EncryptedMasterKey[] = [];
  for (let i = 0; i < policyKeys.length; i++) {
    const polNonce = encodeCrock(getRandomBytes(nonceSize));
    const encMasterKey = await anastasisEncrypt(
      polNonce,
      asOpaque(policyKeys[i]),
      encodeCrock(masterKey),
      masterKeyEncSalt,
    );
    encMasterKeys.push(encMasterKey as string);
  }
  return {
    encCoreSecret,
    encMasterKeys,
  };
}
