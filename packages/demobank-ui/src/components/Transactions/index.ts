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

import { Loading } from "../Loading.js";
import { HookError, utils } from "@gnu-taler/web-util/lib/index.browser";
// import { compose, StateViewMap } from "../../utils/index.js";
// import { wxApi } from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { LoadingUriView, ReadyView } from "./views.js";
import { AbsoluteTime, AmountJson } from "@gnu-taler/taler-util";

export interface Props {
  pageNumber: number;
  accountLabel: string;
  balanceValue?: string;
}

export type State = State.Loading | State.LoadingUriError | State.Ready;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "loading-error";
    error: HookError;
  }

  export interface BaseInfo {
    error: undefined;
  }
  export interface Ready extends BaseInfo {
    status: "ready";
    error: undefined;
    transactions: Transaction[];
  }
}

export interface Transaction {
  negative: boolean;
  counterpart: string;
  when: AbsoluteTime;
  amount: AmountJson;
  subject: string;
}

const viewMapping: utils.StateViewMap<State> = {
  loading: Loading,
  "loading-error": LoadingUriView,
  ready: ReadyView,
};

export const Transactions = utils.compose(
  (p: Props) => useComponentState(p),
  viewMapping,
);
