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
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { StateUpdater, useEffect, useState } from "preact/hooks";

export function useLocalStorage(
  key: string,
  initialValue?: string,
): [string | undefined, StateUpdater<string | undefined>] {
  const [storedValue, setStoredValue] = useState<string | undefined>(
    (): string | undefined => {
      return typeof window !== "undefined"
        ? window.localStorage.getItem(key) || initialValue
        : initialValue;
    },
  );

  useEffect(() => {
    const listener = buildListenerForKey(key, (newValue) => {
      setStoredValue(newValue ?? initialValue)
    })
    window.addEventListener('storage', listener)
    return () => {
      window.removeEventListener('storage', listener)
    }
  }, [])

  const setValue = (
    value?: string | ((val?: string) => string | undefined),
  ): void => {
    setStoredValue((p) => {
      const toStore = value instanceof Function ? value(p) : value;
      if (typeof window !== "undefined") {
        if (!toStore) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, toStore);
        }
      }
      return toStore;
    });
  };

  return [storedValue, setValue];
}

function buildListenerForKey(key: string, onUpdate: (newValue: string | undefined) => void): () => void {
  return function listenKeyChange() {
    const value = window.localStorage.getItem(key)
    onUpdate(value ?? undefined)
  }
}

//TODO: merge with the above function
export function useNotNullLocalStorage(
  key: string,
  initialValue: string,
): [string, StateUpdater<string>, boolean] {
  const [storedValue, setStoredValue] = useState<string>((): string => {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(key) || initialValue
      : initialValue;
  });


  useEffect(() => {
    const listener = buildListenerForKey(key, (newValue) => {
      setStoredValue(newValue ?? initialValue)
    })
    window.localStorage.addEventListener('storage', listener)
    return () => {
      window.localStorage.removeEventListener('storage', listener)
    }
  })

  const setValue = (value: string | ((val: string) => string)): void => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    if (typeof window !== "undefined") {
      if (!valueToStore) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, valueToStore);
      }
    }
  };

  const isSaved = window.localStorage.getItem(key) !== null;
  return [storedValue, setValue, isSaved];
}
