/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { useLocalStorage } from "@gnu-taler/web-util/lib/index.browser";

/**
 * Has the information to reach and
 * authenticate at the bank's backend.
 */
export type BackendState = LoggedIn | LoggedOut;

export interface BackendInfo {
  url: string;
  username: string;
  password: string;
}

interface LoggedIn extends BackendInfo {
  status: "loggedIn";
}
interface LoggedOut {
  status: "loggedOut";
}

export const defaultState: BackendState = { status: "loggedOut" };

export interface BackendStateHandler {
  state: BackendState;
  clear(): void;
  save(info: BackendInfo): void;
}
/**
 * Return getters and setters for
 * login credentials and backend's
 * base URL.
 */
export function useBackendState(): BackendStateHandler {
  const [value, update] = useLocalStorage(
    "backend-state",
    JSON.stringify(defaultState),
  );
  // const parsed = value !== undefined ? JSON.parse(value) : value;
  let parsed;
  try {
    parsed = JSON.parse(value!);
  } catch {
    parsed = undefined;
  }
  const state: BackendState = !parsed?.status ? defaultState : parsed;

  return {
    state,
    clear() {
      update(JSON.stringify(defaultState));
    },
    save(info) {
      const nextState: BackendState = { status: "loggedIn", ...info };
      update(JSON.stringify(nextState));
    },
  };
}
