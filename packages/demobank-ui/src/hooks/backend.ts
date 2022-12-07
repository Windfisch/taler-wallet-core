import { hooks } from "@gnu-taler/web-util/lib/index.browser";
import { StateUpdater } from "preact/hooks";


/**
 * Has the information to reach and
 * authenticate at the bank's backend.
 */
export interface BackendStateType {
  url?: string;
  username?: string;
  password?: string;
}

/**
 * Return getters and setters for
 * login credentials and backend's
 * base URL.
 */
type BackendStateTypeOpt = BackendStateType | undefined;
export function useBackendState(
  state?: BackendStateType,
): [BackendStateTypeOpt, StateUpdater<BackendStateTypeOpt>] {
  const ret = hooks.useLocalStorage("backend-state", JSON.stringify(state));
  const retObj: BackendStateTypeOpt = ret[0] ? JSON.parse(ret[0]) : ret[0];
  const retSetter: StateUpdater<BackendStateTypeOpt> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);
    ret[1](newVal);
  };
  return [retObj, retSetter];
}
