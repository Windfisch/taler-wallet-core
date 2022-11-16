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

import { AmountJson, ExchangeListItem } from "@gnu-taler/taler-util";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { State as SelectExchangeState } from "../../hooks/useSelectedExchange.js";
import { ButtonHandler, SelectFieldHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import { wxApi } from "../../wxApi.js";
import {
  useComponentStateFromParams,
  useComponentStateFromURI,
} from "./state.js";

import { ExchangeSelectionPage } from "../../wallet/ExchangeSelection/index.js";
import { NoExchangesView } from "../../wallet/ExchangeSelection/views.js";
import { LoadingInfoView, LoadingUriView, SuccessView } from "./views.js";

export interface PropsFromURI {
  talerWithdrawUri: string | undefined;
  cancel: () => Promise<void>;
  onSuccess: (txid: string) => Promise<void>;
}

export interface PropsFromParams {
  amount: string;
  cancel: () => Promise<void>;
  onSuccess: (txid: string) => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.LoadingInfoError
  | SelectExchangeState.NoExchange
  | SelectExchangeState.Selecting
  | State.Success;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }
  export interface LoadingUriError {
    status: "uri-error";
    error: HookError;
  }
  export interface LoadingInfoError {
    status: "amount-error";
    error: HookError;
  }

  export type Success = {
    status: "success";
    error: undefined;

    currentExchange: ExchangeListItem;

    chosenAmount: AmountJson;
    withdrawalFee: AmountJson;
    toBeReceived: AmountJson;

    doWithdrawal: ButtonHandler;
    doSelectExchange: ButtonHandler;

    ageRestriction?: SelectFieldHandler;

    talerWithdrawUri?: string;
    cancel: () => Promise<void>;
    onTosUpdate: () => void;
  };
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "uri-error": LoadingUriView,
  "amount-error": LoadingInfoView,
  "no-exchange": NoExchangesView,
  "selecting-exchange": ExchangeSelectionPage,
  success: SuccessView,
};

export const WithdrawPageFromURI = compose(
  "WithdrawPageFromURI",
  (p: PropsFromURI) => useComponentStateFromURI(p, wxApi),
  viewMapping,
);
export const WithdrawPageFromParams = compose(
  "WithdrawPageFromParams",
  (p: PropsFromParams) => useComponentStateFromParams(p, wxApi),
  viewMapping,
);
