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

import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { ToggleHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import { wxApi } from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { TermsState } from "./utils.js";
import {
  ErrorAcceptingView,
  LoadingUriView,
  ShowButtonsAcceptedTosView,
  ShowButtonsNonAcceptedTosView,
  ShowTosContentView,
} from "./views.js";

export interface Props {
  exchangeUrl: string;
  onChange?: (v: boolean) => void;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.ErrorAccepting
  | State.ShowButtonsAccepted
  | State.ShowButtonsNotAccepted
  | State.ShowContent;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "loading-error";
    error: HookError;
  }

  export interface ErrorAccepting {
    status: "error-accepting";
    error: HookError;
  }

  export interface BaseInfo {
    error: undefined;
    terms: TermsState;
  }
  export interface ShowContent extends BaseInfo {
    status: "show-content";
    termsAccepted?: ToggleHandler;
    showingTermsOfService?: ToggleHandler;
  }
  export interface ShowButtonsAccepted extends BaseInfo {
    status: "show-buttons-accepted";
    termsAccepted: ToggleHandler;
    showingTermsOfService: ToggleHandler;
  }
  export interface ShowButtonsNotAccepted extends BaseInfo {
    status: "show-buttons-not-accepted";
    showingTermsOfService: ToggleHandler;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-error": LoadingUriView,
  "show-content": ShowTosContentView,
  "show-buttons-accepted": ShowButtonsAcceptedTosView,
  "show-buttons-not-accepted": ShowButtonsNonAcceptedTosView,
  "error-accepting": ErrorAcceptingView,
};

export const TermsOfService = compose(
  "TermsOfService",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);
