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

import { AmountJson } from "@gnu-taler/taler-util";
import { compose, StateViewMap } from "../../utils/index.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler, SelectFieldHandler } from "../../mui/handlers.js";
import {
  Props as TermsOfServiceSectionProps
} from "../TermsOfServiceSection.js";
import { CompletedView, LoadingExchangeView, LoadingInfoView, LoadingUriView, SuccessView } from "./views.js";
import { useComponentState } from "./state.js";

/**
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author sebasjm
 */

export interface Props {
  talerWithdrawUri: string | undefined;
}

export type State =
  | State.LoadingUri
  | State.LoadingExchange
  | State.LoadingInfoError
  | State.Success
  | State.Completed;

export namespace State {

  export interface LoadingUri {
    status: "loading-uri";
    hook: HookError | undefined;
  }
  export interface LoadingExchange {
    status: "loading-exchange";
    hook: HookError | undefined;
  }
  export interface LoadingInfoError {
    status: "loading-info";
    hook: HookError | undefined;
  }

  export type Completed = {
    status: "completed";
    hook: undefined;
  };

  export type Success = {
    status: "success";
    hook: undefined;

    exchange: SelectFieldHandler;

    editExchange: ButtonHandler;
    cancelEditExchange: ButtonHandler;
    confirmEditExchange: ButtonHandler;

    showExchangeSelection: boolean;
    chosenAmount: AmountJson;
    withdrawalFee: AmountJson;
    toBeReceived: AmountJson;

    doWithdrawal: ButtonHandler;
    tosProps?: TermsOfServiceSectionProps;
    mustAcceptFirst: boolean;

    ageRestriction: SelectFieldHandler;
  };
}

const viewMapping: StateViewMap<State> = {
  "loading-uri": LoadingUriView,
  "loading-exchange": LoadingExchangeView,
  "loading-info": LoadingInfoView,
  completed: CompletedView,
  success: SuccessView,
};

import * as wxApi from "../../wxApi.js";

export const WithdrawPage = compose("Withdraw", (p: Props) => useComponentState(p, wxApi), viewMapping)
