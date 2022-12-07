import { hooks } from "@gnu-taler/web-util/lib/index.browser";

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
  const [value, update] = hooks.useLocalStorage(
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
