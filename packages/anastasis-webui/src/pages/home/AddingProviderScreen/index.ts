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
import { AuthenticationProviderStatus } from "@gnu-taler/anastasis-core";
import InvalidState from "../../../components/InvalidState.js";
import NoReducer from "../../../components/NoReducer.js";
import { Notification } from "../../../components/Notifications.js";
import { compose, StateViewMap } from "../../../utils/index.js";
import useComponentState from "./state.js";
import { WithoutProviderType, WithProviderType } from "./views.js";

export type AuthProvByStatusMap = Record<
  AuthenticationProviderStatus["status"],
  (AuthenticationProviderStatus & { url: string })[]
>

export type State = NoReducer | InvalidState | WithType | WithoutType;

export interface NoReducer {
  status: "no-reducer";
}
export interface InvalidState {
  status: "invalid-state";
}

interface CommonProps {
  addProvider?: () => Promise<void>;
  deleteProvider: (url: string) => Promise<void>;
  authProvidersByStatus: AuthProvByStatusMap;
  error: string | undefined;
  onCancel: () => Promise<void>;
  testing: boolean;
  setProviderURL: (url: string) => Promise<void>;
  providerURL: string;
  errors: string | undefined;
  notifications: Notification[];
}

export interface WithType extends CommonProps {
  status: "with-type";
  providerLabel: string;
}
export interface WithoutType extends CommonProps {
  status: "without-type";
}

const map: StateViewMap<State> = {
  "no-reducer": NoReducer,
  "invalid-state": InvalidState,
  "with-type": WithProviderType,
  "without-type": WithoutProviderType,
};

export default compose("AddingProviderScreen", useComponentState, map)


export async function testProvider(
  url: string,
  expectedMethodType?: string,
): Promise<void> {
  try {
    const response = await fetch(new URL("config", url).href);
    const json = await response.json().catch((d) => ({}));
    if (!("methods" in json) || !Array.isArray(json.methods)) {
      throw Error(
        "This provider doesn't have authentication method. Check the provider URL",
      );
    }
    if (!expectedMethodType) {
      return;
    }
    let found = false;
    for (let i = 0; i < json.methods.length && !found; i++) {
      found = json.methods[i].type === expectedMethodType;
    }
    if (!found) {
      throw Error(
        `This provider does not support authentication method ${expectedMethodType}`,
      );
    }
    return;
  } catch (e) {
    console.log("ERROR testProvider", e);
    const error =
      e instanceof Error
        ? Error(
          `There was an error testing this provider, try another one. ${e.message}`,
        )
        : Error(`There was an error testing this provider, try another one.`);
    throw error;
  }
}
