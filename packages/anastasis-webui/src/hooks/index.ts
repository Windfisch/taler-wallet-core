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

import { StateUpdater } from "preact/hooks";
import { useLocalStorage, useNotNullLocalStorage } from "./useLocalStorage.js";

export type ValueOrFunction<T> = T | ((p: T) => T);

const calculateRootPath = () => {
  const rootPath =
    typeof window !== undefined
      ? window.location.origin + window.location.pathname
      : "/";
  return rootPath;
};

export function useBackendURL(
  url?: string,
): [string, boolean, StateUpdater<string>, () => void] {
  const [value, setter] = useNotNullLocalStorage(
    "backend-url",
    url || calculateRootPath(),
  );
  const [triedToLog, setTriedToLog] = useLocalStorage("tried-login");

  const checkedSetter = (v: ValueOrFunction<string>) => {
    setTriedToLog("yes");
    return setter((p) => (v instanceof Function ? v(p) : v).replace(/\/$/, ""));
  };

  const resetBackend = () => {
    setTriedToLog(undefined);
  };
  return [value, !!triedToLog, checkedSetter, resetBackend];
}

export function useBackendDefaultToken(): [
  string | undefined,
  StateUpdater<string | undefined>,
] {
  return useLocalStorage("backend-token");
}

export function useBackendInstanceToken(
  id: string,
): [string | undefined, StateUpdater<string | undefined>] {
  const [token, setToken] = useLocalStorage(`backend-token-${id}`);
  const [defaultToken, defaultSetToken] = useBackendDefaultToken();

  // instance named 'default' use the default token
  if (id === "default") {
    return [defaultToken, defaultSetToken];
  }

  return [token, setToken];
}