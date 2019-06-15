import { KeyPath, Value, Key } from "./types";
import canInjectKey from "./canInjectKey";
import { DataError } from "./errors";
import structuredClone from "./structuredClone";

export function injectKey(keyPath: KeyPath, value: Value, key: Key): Value {
  if (Array.isArray(keyPath)) {
    // tslint:disable-next-line max-line-length
    throw new Error(
      "The key paths used in this section are always strings and never sequences, since it is not possible to create a object store which has a key generator and also has a key path that is a sequence.",
    );
  }

  const identifiers = keyPath.split(".");
  if (identifiers.length === 0) {
    throw new Error("Assert: identifiers is not empty");
  }

  const lastIdentifier = identifiers.pop();

  if (lastIdentifier === null || lastIdentifier === undefined) {
    throw Error();
  }

  for (const identifier of identifiers) {
    if (typeof value !== "object" && !Array.isArray(value)) {
      return false;
    }

    const hop = value.hasOwnProperty(identifier);
    if (!hop) {
      return true;
    }

    value = value[identifier];
  }

  if (!(typeof value === "object" || Array.isArray(value))) {
    throw new Error("can't inject key");
  }

  const newValue = structuredClone(value);
  newValue[lastIdentifier] = structuredClone(key);

  return newValue;
}

export default injectKey;