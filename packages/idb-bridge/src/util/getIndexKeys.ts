import { Key, Value, KeyPath } from "./types";
import extractKey from "./extractKey";
import valueToKey from "./valueToKey";

export function getIndexKeys(
  value: Value,
  keyPath: KeyPath,
  multiEntry: boolean,
): Key[] {
  if (multiEntry && Array.isArray(keyPath)) {
    const keys = [];
    for (const subkeyPath of keyPath) {
      const key = extractKey(subkeyPath, value);
      try {
        const k = valueToKey(key);
        keys.push(k);
      } catch {
        // Ignore invalid subkeys
      }
    }
    return keys;
  } else {
    let key = extractKey(keyPath, value);
    return [valueToKey(key)];
  }
}

export default getIndexKeys;
