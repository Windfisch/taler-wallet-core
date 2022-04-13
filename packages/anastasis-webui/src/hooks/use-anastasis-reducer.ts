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
 * Imports.
 */
import { TalerErrorCode } from "@gnu-taler/taler-util";
import {
  AggregatedPolicyMetaInfo,
  BackupStates,
  discoverPolicies,
  DiscoveryCursor,
  getBackupStartState,
  getRecoveryStartState,
  mergeDiscoveryAggregate,
  RecoveryStates,
  reduceAction,
  ReducerState,
} from "@gnu-taler/anastasis-core";
import { useState } from "preact/hooks";

const reducerBaseUrl = "http://localhost:5000/";
const remoteReducer = false;

interface AnastasisState {
  reducerState: ReducerState | undefined;
  currentError: any;
  discoveryState: DiscoveryUiState;
}

async function getBackupStartStateRemote(): Promise<ReducerState> {
  let resp: Response;

  try {
    resp = await fetch(new URL("start-backup", reducerBaseUrl).href);
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      message: `Network request to remote reducer ${reducerBaseUrl} failed`,
    } as any;
  }
  try {
    return await resp.json();
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      message: `Could not parse response from reducer`,
    } as any;
  }
}

async function getRecoveryStartStateRemote(): Promise<ReducerState> {
  let resp: Response;
  try {
    resp = await fetch(new URL("start-recovery", reducerBaseUrl).href);
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      message: `Network request to remote reducer ${reducerBaseUrl} failed`,
    } as any;
  }
  try {
    return await resp.json();
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      message: `Could not parse response from reducer`,
    } as any;
  }
}

async function reduceStateRemote(
  state: any,
  action: string,
  args: any,
): Promise<ReducerState> {
  let resp: Response;
  try {
    resp = await fetch(new URL("action", reducerBaseUrl).href, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        state,
        action,
        arguments: args,
      }),
    });
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      message: `Network request to remote reducer ${reducerBaseUrl} failed`,
    } as any;
  }
  try {
    return await resp.json();
  } catch (e) {
    return {
      code: TalerErrorCode.ANASTASIS_REDUCER_NETWORK_FAILED,
      message: `Could not parse response from reducer`,
    } as any;
  }
}

export interface ReducerTransactionHandle {
  transactionState: ReducerState;
  transition(action: string, args: any): Promise<ReducerState>;
}

/**
 * UI-relevant state of the policy discovery process.
 */
export interface DiscoveryUiState {
  state: "none" | "active" | "finished";

  aggregatedPolicies?: AggregatedPolicyMetaInfo[];

  cursor?: DiscoveryCursor;
}

export interface AnastasisReducerApi {
  currentReducerState: ReducerState | undefined;
  currentError: any;
  discoveryState: DiscoveryUiState;
  dismissError: () => void;
  startBackup: () => void;
  startRecover: () => void;
  reset: () => void;
  back: () => Promise<void>;
  transition(action: string, args: any): Promise<void>;
  exportState: () => string;
  importState: (s: string) => void;
  discoverStart(): Promise<void>;
  discoverMore(): Promise<void>;
  /**
   * Run multiple reducer steps in a transaction without
   * affecting the UI-visible transition state in-between.
   */
  runTransaction(
    f: (h: ReducerTransactionHandle) => Promise<void>,
  ): Promise<void>;
}

function storageGet(key: string): string | null {
  if (typeof localStorage === "object") {
    return localStorage.getItem(key);
  }
  return null;
}

function storageSet(key: string, value: any): void {
  if (typeof localStorage === "object") {
    return localStorage.setItem(key, value);
  }
}

function getStateFromStorage(): any {
  let state: any;
  try {
    const s = storageGet("anastasisReducerState");
    if (s === "undefined") {
      state = undefined;
    } else if (s) {
      console.log("restoring state from", s);
      state = JSON.parse(s);
    }
  } catch (e) {
    console.log(e);
  }
  return state ?? undefined;
}

export function useAnastasisReducer(): AnastasisReducerApi {
  const [anastasisState, setAnastasisStateInternal] = useState<AnastasisState>(
    () => ({
      reducerState: getStateFromStorage(),
      currentError: undefined,
      discoveryState: {
        state: "none",
      },
    }),
  );

  const setAnastasisState = (newState: AnastasisState) => {
    try {
      storageSet(
        "anastasisReducerState",
        JSON.stringify(newState.reducerState),
      );
    } catch (e) {
      console.log(e);
    }
    setAnastasisStateInternal(newState);
  };

  async function doTransition(action: string, args: any): Promise<void> {
    console.log("reducing with", action, args);
    let s: ReducerState;
    if (remoteReducer) {
      s = await reduceStateRemote(anastasisState.reducerState, action, args);
    } else {
      s = await reduceAction(anastasisState.reducerState!, action, args);
    }
    console.log("got response from reducer", s);
    if (s.reducer_type === "error") {
      console.log("response is an error");
      setAnastasisState({ ...anastasisState, currentError: s });
    } else {
      console.log("response is a new state");
      setAnastasisState({
        ...anastasisState,
        currentError: undefined,
        reducerState: s,
      });
    }
  }

  return {
    currentReducerState: anastasisState.reducerState,
    currentError: anastasisState.currentError,
    discoveryState: anastasisState.discoveryState,
    async startBackup() {
      let s: ReducerState;
      if (remoteReducer) {
        s = await getBackupStartStateRemote();
      } else {
        s = await getBackupStartState();
      }
      if (s.reducer_type === "error") {
        setAnastasisState({
          ...anastasisState,
          currentError: s,
        });
      } else {
        setAnastasisState({
          ...anastasisState,
          currentError: undefined,
          reducerState: s,
        });
      }
    },
    exportState() {
      const state = getStateFromStorage();
      return JSON.stringify(state);
    },
    importState(s: string) {
      try {
        const state = JSON.parse(s);
        setAnastasisState({
          reducerState: state,
          currentError: undefined,
          discoveryState: {
            state: "none",
          },
        });
      } catch (e) {
        throw Error("could not restore the state");
      }
    },
    async discoverStart(): Promise<void> {
      const res = await discoverPolicies(this.currentReducerState!, undefined);
      const aggregatedPolicies = mergeDiscoveryAggregate(res.policies, []);
      setAnastasisState({
        ...anastasisState,
        discoveryState: {
          state: "finished",
          aggregatedPolicies,
          cursor: res.cursor,
        },
      });
    },
    async discoverMore(): Promise<void> {},
    async startRecover() {
      let s: ReducerState;
      if (remoteReducer) {
        s = await getRecoveryStartStateRemote();
      } else {
        s = await getRecoveryStartState();
      }
      if (s.reducer_type === "error") {
        setAnastasisState({
          ...anastasisState,
          currentError: s,
        });
      } else {
        setAnastasisState({
          ...anastasisState,
          currentError: undefined,
          reducerState: s,
        });
      }
    },
    transition(action: string, args: any) {
      return doTransition(action, args);
    },
    async back() {
      const reducerState = anastasisState.reducerState;
      if (!reducerState) {
        return;
      }
      if (
        (reducerState.reducer_type === "backup" &&
          reducerState.backup_state === BackupStates.ContinentSelecting) ||
        (reducerState.reducer_type === "recovery" &&
          reducerState.recovery_state === RecoveryStates.ContinentSelecting)
      ) {
        setAnastasisState({
          ...anastasisState,
          currentError: undefined,
          reducerState: undefined,
        });
      } else {
        await doTransition("back", {});
      }
    },
    dismissError() {
      setAnastasisState({ ...anastasisState, currentError: undefined });
    },
    reset() {
      setAnastasisState({
        ...anastasisState,
        currentError: undefined,
        reducerState: undefined,
      });
    },
    async runTransaction(f) {
      const txHandle = new ReducerTxImpl(anastasisState.reducerState!);
      try {
        await f(txHandle);
      } catch (e) {
        console.log("exception during reducer transaction", e);
      }
      const s = txHandle.transactionState;
      console.log("transaction finished, new state", s);
      if (s.reducer_type === "error") {
        setAnastasisState({
          ...anastasisState,
          currentError: txHandle.transactionState,
        });
      } else {
        setAnastasisState({
          ...anastasisState,
          reducerState: txHandle.transactionState,
          currentError: undefined,
        });
      }
    },
  };
}

class ReducerTxImpl implements ReducerTransactionHandle {
  constructor(public transactionState: ReducerState) {}
  async transition(action: string, args: any): Promise<ReducerState> {
    let s: ReducerState;
    if (remoteReducer) {
      s = await reduceStateRemote(this.transactionState, action, args);
    } else {
      s = await reduceAction(this.transactionState, action, args);
    }
    console.log("making transition in transaction", action);
    this.transactionState = s;
    // Abort transaction as soon as we transition into an error state.
    if (this.transactionState.reducer_type === "error") {
      throw Error("transition resulted in error");
    }
    return this.transactionState;
  }
}
