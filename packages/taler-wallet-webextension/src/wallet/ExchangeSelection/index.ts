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

import { FeeDescription, FeeDescriptionPair, AbsoluteTime, ExchangeFullDetails, OperationMap } from "@gnu-taler/taler-util";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler, SelectFieldHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { ComparingView, LoadingUriView, NoExchangesView, ReadyView } from "./views.js";



export interface Props {
  currency?: string;
  onCancel: () => Promise<void>;
  onSelection: (exchange: string) => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.Ready
  | State.Comparing
  | State.NoExchanges;

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
    exchanges: SelectFieldHandler;
    selected: ExchangeFullDetails;
    error: undefined;
  }

  export interface NoExchanges {
    status: "no-exchanges";
    error: undefined;
  }

  export interface Ready extends BaseInfo {
    status: "ready";
    timeline: OperationMap<FeeDescription[]>;
    onClose: ButtonHandler;
  }

  export interface Comparing extends BaseInfo {
    status: "comparing";
    pairTimeline: OperationMap<FeeDescriptionPair[]>;
    onReset: ButtonHandler;
    onSelect: ButtonHandler;
  }
}


const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-uri": LoadingUriView,
  "comparing": ComparingView,
  "no-exchanges": NoExchangesView,
  "ready": ReadyView,
};

export const ExchangeSelectionPage = compose("ExchangeSelectionPage", (p: Props) => useComponentState(p, wxApi), viewMapping)
