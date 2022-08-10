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
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler, SelectFieldHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import {
  Props as TermsOfServiceSectionProps
} from "../TermsOfServiceSection.js";
import { useComponentState } from "./state.js";
import { AcceptedView, IgnoredView, LoadingUriView, ReadyView } from "./views.js";



export interface Props {
  talerTipUri?: string;
  cancel: () => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.Ignored
  | State.Accepted
  | State.Ready
  | State.Ignored;

export namespace State {

  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "loading-uri";
    error: HookError;
  }

  export interface BaseInfo {
    merchantBaseUrl: string;
    amount: AmountJson;
    exchangeBaseUrl: string;
    error: undefined;
  }

  export interface Ignored extends BaseInfo {
    status: "ignored";
  }

  export interface Accepted extends BaseInfo {
    status: "accepted";
  }
  export interface Ready extends BaseInfo {
    status: "ready";
    accept: ButtonHandler;
    cancel: () => Promise<void>;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-uri": LoadingUriView,
  "accepted": AcceptedView,
  "ignored": IgnoredView,
  "ready": ReadyView,
};

export const TipPage = compose("Tip", (p: Props) => useComponentState(p, wxApi), viewMapping)
