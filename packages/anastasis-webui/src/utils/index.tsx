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
import {
  AuthenticationProviderStatusError,
  AuthenticationProviderStatusOk,
  BackupStates,
  RecoveryStates,
  ReducerState,
  ReducerStateRecovery,
} from "@gnu-taler/anastasis-core";
import { ComponentChildren, FunctionalComponent, h, VNode } from "preact";
import { AnastasisProvider } from "../context/anastasis.js";

const noop = async (): Promise<void> => {
  return;
};

export function createExampleWithoutAnastasis<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props> | (() => Partial<Props>),
): ComponentChildren {
  //FIXME: props are evaluated on build time
  // in some cases we want to evaluated the props on render time so we can get some relative timestamp
  // check how we can build evaluatedProps in render time
  const evaluatedProps = typeof props === "function" ? props() : props;
  const Render = (args: any): VNode => h(Component, args);
  Render.args = evaluatedProps;
  return Render;
}

export function createExample<Props>(
  Component: FunctionalComponent<Props>,
  currentReducerState?: ReducerState,
  props?: Partial<Props>,
): { (args: Props): VNode } {
  const r = (args: Props): VNode => {
    return (
      <AnastasisProvider
        value={{
          currentReducerState,
          discoverMore: noop,
          discoverStart: noop,
          discoveryState: {
            state: "finished",
          },
          currentError: undefined,
          back: noop,
          dismissError: noop,
          reset: noop,
          runTransaction: noop,
          startBackup: noop,
          startRecover: noop,
          transition: noop,
          exportState: () => {
            return "{}";
          },
          importState: noop,
        }}
      >
        <Component {...(args as any)} />
      </AnastasisProvider>
    );
  };
  r.args = props;
  return r;
}

const base = {
  continents: [
    {
      name: "Europe",
    },
    {
      name: "India",
    },
    {
      name: "Asia",
    },
    {
      name: "North America",
    },
    {
      name: "Testcontinent",
    },
  ],
  countries: [
    {
      code: "xx",
      name: "Testland",
      continent: "Testcontinent",
      continent_i18n: {
        de_DE: "Testkontinent",
      },
      name_i18n: {
        de_DE: "Testlandt",
        de_CH: "Testlandi",
        fr_FR: "Testpais",
        en_UK: "Testland",
      },
      currency: "TESTKUDOS",
      call_code: "+00",
    },
    {
      code: "xy",
      name: "Demoland",
      continent: "Testcontinent",
      continent_i18n: {
        de_DE: "Testkontinent",
      },
      name_i18n: {
        de_DE: "Demolandt",
        de_CH: "Demolandi",
        fr_FR: "Demopais",
        en_UK: "Demoland",
      },
      currency: "KUDOS",
      call_code: "+01",
    },
  ],
  authentication_providers: {
    "http://localhost:8086/": {
      status: "ok",
      http_status: 200,
      annual_fee: "COL:0",
      business_name: "Anastasis Local",
      currency: "COL",
      liability_limit: "COL:10",
      methods: [
        {
          type: "question",
          usage_fee: "COL:0",
        },
        {
          type: "sms",
          usage_fee: "COL:0",
        },
        {
          type: "email",
          usage_fee: "COL:0",
        },
      ],
      provider_salt: "WBMDD76BR1E90YQ5AHBMKPH7GW",
      storage_limit_in_megabytes: 16,
      truth_upload_fee: "COL:0",
    } as AuthenticationProviderStatusOk,
    "https://kudos.demo.anastasis.lu/": {
      status: "ok",
      http_status: 200,
      annual_fee: "COL:0",
      business_name: "Anastasis Kudo",
      currency: "COL",
      liability_limit: "COL:10",
      methods: [
        {
          type: "question",
          usage_fee: "COL:0",
        },
        {
          type: "email",
          usage_fee: "COL:0",
        },
      ],
      provider_salt: "WBMDD76BR1E90YQ5AHBMKPH7GW",
      storage_limit_in_megabytes: 16,
      truth_upload_fee: "COL:0",
    } as AuthenticationProviderStatusOk,
    "https://anastasis.demo.taler.net/": {
      status: "ok",
      http_status: 200,
      annual_fee: "COL:0",
      business_name: "Anastasis Demo",
      currency: "COL",
      liability_limit: "COL:10",
      methods: [
        {
          type: "question",
          usage_fee: "COL:0",
        },
        {
          type: "sms",
          usage_fee: "COL:0",
        },
        {
          type: "totp",
          usage_fee: "COL:0",
        },
      ],
      provider_salt: "WBMDD76BR1E90YQ5AHBMKPH7GW",
      storage_limit_in_megabytes: 16,
      truth_upload_fee: "COL:0",
    } as AuthenticationProviderStatusOk,

    "http://localhost:8087/": {
      status: "error",
      code: 8414,
      hint: "request to provider failed",
    } as AuthenticationProviderStatusError,
    "http://localhost:8088/": {
      status: "error",
      code: 8414,
      hint: "request to provider failed",
    } as AuthenticationProviderStatusError,
    "http://localhost:8089/": {
      status: "error",
      code: 8414,
      hint: "request to provider failed",
    } as AuthenticationProviderStatusError,
  },
} as Partial<ReducerState>;

export const reducerStatesExample = {
  initial: undefined,
  recoverySelectCountry: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.CountrySelecting,
  } as ReducerState,
  recoverySelectContinent: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.ContinentSelecting,
  } as ReducerState,
  secretSelection: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.SecretSelecting,
  } as ReducerState,
  recoveryFinished: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.RecoveryFinished,
  } as ReducerState,
  challengeSelecting: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.ChallengeSelecting,
  } as ReducerState,
  challengeSolving: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.ChallengeSolving,
  } as ReducerStateRecovery,
  challengePaying: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.ChallengePaying,
  } as ReducerState,
  recoveryAttributeEditing: {
    ...base,
    reducer_type: "recovery",
    recovery_state: RecoveryStates.UserAttributesCollecting,
  } as ReducerState,
  backupSelectCountry: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.CountrySelecting,
  } as ReducerState,
  backupSelectContinent: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.ContinentSelecting,
  } as ReducerState,
  secretEdition: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.SecretEditing,
  } as ReducerState,
  policyReview: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.PoliciesReviewing,
  } as ReducerState,
  policyPay: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.PoliciesPaying,
  } as ReducerState,
  backupFinished: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.BackupFinished,
  } as ReducerState,
  authEditing: {
    ...base,
    backup_state: BackupStates.AuthenticationsEditing,
    reducer_type: "backup",
  } as ReducerState,
  backupAttributeEditing: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.UserAttributesCollecting,
  } as ReducerState,
  truthsPaying: {
    ...base,
    reducer_type: "backup",
    backup_state: BackupStates.TruthsPaying,
  } as ReducerState,
};

export type StateFunc<S> = (p: S) => VNode;

export type StateViewMap<StateType extends { status: string }> = {
  [S in StateType as S["status"]]: StateFunc<S>;
};

export function compose<SType extends { status: string }, PType>(
  name: string,
  hook: (p: PType) => SType,
  vs: StateViewMap<SType>,
): (p: PType) => VNode {
  const Component = (p: PType): VNode => {
    const state = hook(p);
    const s = state.status as unknown as SType["status"];
    const c = vs[s] as unknown as StateFunc<SType>;
    return c(state);
  };
  // Component.name = `${name}`;
  return Component;
}
