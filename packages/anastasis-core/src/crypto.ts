import { argon2id } from "hash-wasm";

async function userIdentifierDerive(
  idData: any,
  serverSalt: string,
): Promise<string> {
  throw Error("not implemented");
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
