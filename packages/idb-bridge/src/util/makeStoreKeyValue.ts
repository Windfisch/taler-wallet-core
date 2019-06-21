import { Value, Key, KeyPath } from "./types";
import extractKey from "./extractKey";
import { DataError } from "./errors";
import valueToKey from "./valueToKey";
import structuredClone from "./structuredClone";
import injectKey from "./injectKey";

export interface StoreKeyResult {
  updatedKeyGenerator: number;
  key: Key;
  value: Value;
}

export function makeStoreKeyValue(
  value: Value,
  key: Key | undefined,
  currentKeyGenerator: number,
  autoIncrement: boolean,
  keyPath: KeyPath | null,
): StoreKeyResult {
  const haveKey = key !== undefined && key !== null;
  const haveKeyPath = keyPath !== null && keyPath !== undefined;

  // This models a decision table on (haveKey, haveKeyPath, autoIncrement)

  value = structuredClone(value);

  if (haveKey) {
    if (haveKeyPath) {
      // (yes, yes, no)
      // (yes, yes, yes)
      throw new DataError();
    } else {
      if (autoIncrement) {
        // (yes, no, yes)
        key = valueToKey(key)!;
        let updatedKeyGenerator: number;
        if (typeof key !== "number") {
          updatedKeyGenerator = currentKeyGenerator;
        } else {
          updatedKeyGenerator = key;
        }
        return {
          key: key!,
          value: value,
          updatedKeyGenerator,
        };
      } else {
        // (yes, no, no)
        throw new DataError();
      }
    }
  } else {
    if (haveKeyPath) {
      if (autoIncrement) {
        // (no, yes, yes)

        let updatedKeyGenerator: number;
        const maybeInlineKey = extractKey(keyPath!, value);
        if (maybeInlineKey === undefined) {
          value = injectKey(keyPath!, value, currentKeyGenerator);
          key = currentKeyGenerator;
          updatedKeyGenerator = currentKeyGenerator + 1;
        } else if (typeof maybeInlineKey === "number") {
          key = maybeInlineKey;
          if (maybeInlineKey >= currentKeyGenerator) {
            updatedKeyGenerator = maybeInlineKey + 1;
          } else {
            updatedKeyGenerator = currentKeyGenerator;
          }
        } else {
          key = maybeInlineKey;
          updatedKeyGenerator = currentKeyGenerator;
        }
        return {
          key: key,
          value: value,
          updatedKeyGenerator,
        }
      } else {
        // (no, yes, no)
        key = extractKey(keyPath!, value);
        key = valueToKey(key);
        return {
          key: key!,
          value: value,
          updatedKeyGenerator: currentKeyGenerator,
        };
      }
    } else {
      if (autoIncrement) {
        // (no, no, yes)
        return {
          key: currentKeyGenerator,
          value: value,
          updatedKeyGenerator: currentKeyGenerator + 1,
        }
      } else {
        // (no, no, no)
        throw new DataError();
      }
    }
  }
}
