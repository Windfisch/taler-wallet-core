import {
  canonicalJson,
  decodeCrock,
  encodeCrock,
  stringToBytes,
} from "@gnu-taler/taler-util";
import { argon2id } from "hash-wasm";

export async function userIdentifierDerive(
  idData: any,
  serverSalt: string,
): Promise<string> {
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

// interface Keypair {
//   pub: string;
//   priv: string;
// }

// async function accountKeypairDerive(): Promise<Keypair> {}

// async function secureAnswerHash(
//   answer: string,
//   truthUuid: string,
//   questionSalt: string,
// ): Promise<string> {}
