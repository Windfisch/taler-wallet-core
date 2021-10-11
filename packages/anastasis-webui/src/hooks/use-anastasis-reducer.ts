import { useState } from "preact/hooks";

type ReducerState = any;

interface AnastasisState {
  reducerState: ReducerState | undefined;
  currentError: any;
}

export enum BackupStates {
  ContinentSelecting = "CONTINENT_SELECTING",
  CountrySelecting = "COUNTRY_SELECTING",
}

export enum RecoveryStates {
  ContinentSelecting = "CONTINENT_SELECTING",
  CountrySelecting = "COUNTRY_SELECTING",
}

const reducerBaseUrl = "http://localhost:5000/";

async function getBackupStartState(): Promise<ReducerState> {
  const resp = await fetch(new URL("start-backup", reducerBaseUrl).href);
  return await resp.json();
}

async function getRecoveryStartState(): Promise<ReducerState> {
  const resp = await fetch(new URL("start-recovery", reducerBaseUrl).href);
  return await resp.json();
}

async function reduceState(
  state: any,
  action: string,
  args: any,
): Promise<ReducerState> {
  const resp = await fetch(new URL("action", reducerBaseUrl).href, {
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
  return resp.json();
}

export interface AnastasisReducerApi {
  currentReducerState: ReducerState;
  currentError: any;
  startBackup: () => void;
  startRecover: () => void;
  back: () => void;
  transition(action: string, args: any): void;
}

export function useAnastasisReducer(): AnastasisReducerApi {
  const [anastasisState, setAnastasisState] = useState<AnastasisState>({
    reducerState: undefined,
    currentError: undefined,
  });

  async function doTransition(action: string, args: any) {
    console.log("reducing with", action, args);
    const s = await reduceState(anastasisState.reducerState, action, args);
    console.log("got new state from reducer", s);
    if (s.code) {
      setAnastasisState({ ...anastasisState, currentError: s });
    } else {
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
    async startBackup() {
      const s = await getBackupStartState();
      setAnastasisState({
        ...anastasisState,
        currentError: undefined,
        reducerState: s,
      });
    },
    async startRecover() {
      const s = await getRecoveryStartState();
      setAnastasisState({
        ...anastasisState,
        currentError: undefined,
        reducerState: s,
      });
    },
    transition(action: string, args: any) {
      doTransition(action, args);
    },
    back() {
      if (
        anastasisState.reducerState.backup_state ===
          BackupStates.ContinentSelecting ||
        anastasisState.reducerState.recovery_state ===
          RecoveryStates.ContinentSelecting
      ) {
        setAnastasisState({
          ...anastasisState,
          currentError: undefined,
          reducerState: undefined,
        });
      } else if (
        anastasisState.reducerState.backup_state ===
        BackupStates.CountrySelecting
      ) {
        doTransition("unselect_continent", {});
      } else if (
        anastasisState.reducerState.recovery_state ===
        RecoveryStates.CountrySelecting
      ) {
        doTransition("unselect_continent", {});
      } else {
        doTransition("back", {});
      }
    },
  };
}
