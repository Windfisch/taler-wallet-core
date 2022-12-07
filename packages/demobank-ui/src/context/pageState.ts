/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { hooks } from "@gnu-taler/web-util/lib/index.browser";
import { ComponentChildren, createContext, h, VNode } from "preact";
import { StateUpdater, useContext } from "preact/hooks";

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

export type Type = {
  pageState: PageStateType;
  pageStateSetter: StateUpdater<PageStateType>;
};
const initial: Type = {
  pageState: {
    isLoggedIn: false,
    isRawPayto: false,
    showPublicHistories: false,
    withdrawalInProgress: false,
  },
  pageStateSetter: () => {
    null;
  },
};
const Context = createContext<Type>(initial);

export const usePageContext = (): Type => useContext(Context);

export const PageStateProvider = ({
  children,
}: {
  children: ComponentChildren;
}): VNode => {
  const [pageState, pageStateSetter] = usePageState();

  return h(Context.Provider, {
    value: { pageState, pageStateSetter },
    children,
  });
};

/**
 * Wrapper providing defaults.
 */
function usePageState(
  state: PageStateType = {
    isLoggedIn: false,
    isRawPayto: false,
    showPublicHistories: false,
    withdrawalInProgress: false,
  },
): [PageStateType, StateUpdater<PageStateType>] {
  const ret = hooks.useNotNullLocalStorage("page-state", JSON.stringify(state));
  const retObj: PageStateType = JSON.parse(ret[0]);

  const retSetter: StateUpdater<PageStateType> = function (val) {
    const newVal =
      val instanceof Function
        ? JSON.stringify(val(retObj))
        : JSON.stringify(val);

    ret[1](newVal);
  };

  //when moving from one page to another
  //clean up the info and error bar
  function removeLatestInfo(val: any): ReturnType<typeof retSetter> {
    const updater = typeof val === "function" ? val : (c: any) => val;
    return retSetter((current: any) => {
      const cleanedCurrent: PageStateType = {
        ...current,
        info: undefined,
        errors: undefined,
        timestamp: new Date().getTime(),
      };
      return updater(cleanedCurrent);
    });
  }

  return [retObj, removeLatestInfo];
}

/**
 * Track page state.
 */
export interface PageStateType {
  isLoggedIn: boolean;
  isRawPayto: boolean;
  showPublicHistories: boolean;
  withdrawalInProgress: boolean;
  error?: {
    description?: string;
    title: string;
    debug?: string;
  };

  info?: string;
  talerWithdrawUri?: string;
  /**
   * Not strictly a presentational value, could
   * be moved in a future "withdrawal state" object.
   */
  withdrawalId?: string;
  timestamp?: number;
}
