import { useState } from "preact/hooks";

export type ReducerState =
  | ReducerStateBackup
  | ReducerStateRecovery
  | ReducerStateError;

export interface ReducerStateBackup {
  recovery_state: undefined;
  backup_state: BackupStates;
  code: undefined;
  continents: any;
  countries: any;
  authentication_providers: any;
  authentication_methods?: AuthMethod[];
  required_attributes: any;
  secret_name?: string;
  policies?: {
    methods: {
      authentication_method: number;
      provider: string;
    }[];
  }[];
  success_details: {
    [provider_url: string]: {
      policy_version: number;
    };
  };
  payments?: string[];
  policy_payment_requests?: {
    payto: string;
    provider: string;
  }[];
}

export interface AuthMethod {
  type: string;
  instructions: string;
  challenge: string;
}

export interface ReducerStateRecovery {
  backup_state: undefined;
  recovery_state: RecoveryStates;
  code: undefined;

  continents: any;
  countries: any;
  required_attributes: any;
}

export interface ReducerStateError {
  backup_state: undefined;
  recovery_state: undefined;
  code: number;
}

interface AnastasisState {
  reducerState: ReducerState | undefined;
  currentError: any;
}

export enum BackupStates {
  ContinentSelecting = "CONTINENT_SELECTING",
  CountrySelecting = "COUNTRY_SELECTING",
  UserAttributesCollecting = "USER_ATTRIBUTES_COLLECTING",
  AuthenticationsEditing = "AUTHENTICATIONS_EDITING",
  PoliciesReviewing = "POLICIES_REVIEWING",
  SecretEditing = "SECRET_EDITING",
  TruthsPaying = "TRUTHS_PAYING",
  PoliciesPaying = "POLICIES_PAYING",
  BackupFinished = "BACKUP_FINISHED",
}

export enum RecoveryStates {
  ContinentSelecting = "CONTINENT_SELECTING",
  CountrySelecting = "COUNTRY_SELECTING",
  UserAttributesCollecting = "USER_ATTRIBUTES_COLLECTING",
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

export interface ReducerTransactionHandle {
  transactionState: ReducerState;
  transition(action: string, args: any): Promise<ReducerState>;
}

export interface AnastasisReducerApi {
  currentReducerState: ReducerState | undefined;
  currentError: any;
  dismissError: () => void;
  startBackup: () => void;
  startRecover: () => void;
  reset: () => void;
  back: () => void;
  transition(action: string, args: any): void;
  /**
   * Run multiple reducer steps in a transaction without
   * affecting the UI-visible transition state in-between.
   */
  runTransaction(f: (h: ReducerTransactionHandle) => Promise<void>): void;
}

function restoreState(): any {
  let state: any;
  try {
    let s = localStorage.getItem("anastasisReducerState");
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
      reducerState: restoreState(),
      currentError: undefined,
    }),
  );

  const setAnastasisState = (newState: AnastasisState) => {
    try {
      localStorage.setItem(
        "anastasisReducerState",
        JSON.stringify(newState.reducerState),
      );
    } catch (e) {
      console.log(e);
    }
    setAnastasisStateInternal(newState);
  };

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
      const reducerState = anastasisState.reducerState;
      if (!reducerState) {
        return;
      }
      if (
        reducerState.backup_state === BackupStates.ContinentSelecting ||
        reducerState.recovery_state === RecoveryStates.ContinentSelecting
      ) {
        setAnastasisState({
          ...anastasisState,
          currentError: undefined,
          reducerState: undefined,
        });
      } else {
        doTransition("back", {});
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
    runTransaction(f) {
      async function run() {
        const txHandle = new ReducerTxImpl(anastasisState.reducerState!);
        try {
          await f(txHandle);
        } catch (e) {
          console.log("exception during reducer transaction", e);
        }
        const s = txHandle.transactionState;
        console.log("transaction finished, new state", s);
        if (s.code !== undefined) {
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
      }
      run();
    },
  };
}

class ReducerTxImpl implements ReducerTransactionHandle {
  constructor(public transactionState: ReducerState) {}
  async transition(action: string, args: any): Promise<ReducerState> {
    console.log("making transition in transaction", action);
    this.transactionState = await reduceState(
      this.transactionState,
      action,
      args,
    );
    // Abort transaction as soon as we transition into an error state.
    if (this.transactionState.code !== undefined) {
      throw Error("transition resulted in error");
    }
    return this.transactionState;
  }
}
