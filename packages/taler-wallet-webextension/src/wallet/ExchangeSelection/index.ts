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

import {
  DenomOperationMap,
  ExchangeFullDetails,
  ExchangeListItem,
  FeeDescriptionPair,
} from "@gnu-taler/taler-util";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { State as SelectExchangeState } from "../../hooks/useSelectedExchange.js";
import { ButtonHandler, SelectFieldHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import { wxApi } from "../../wxApi.js";
import { useComponentState } from "./state.js";
import {
  ComparingView,
  ErrorLoadingView,
  NoExchangesView,
  PrivacyContentView,
  ReadyView,
  TosContentView,
} from "./views.js";

export interface Props {
  list: ExchangeListItem[];
  currentExchange: string;
  onCancel: () => Promise<void>;
  onSelection: (exchange: string) => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.Ready
  | State.Comparing
  | State.ShowingTos
  | State.ShowingPrivacy
  | SelectExchangeState.NoExchange;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "error-loading";
    error: HookError;
  }

  export interface BaseInfo {
    exchanges: SelectFieldHandler;
    selected: ExchangeFullDetails;
    error: undefined;
    onShowTerms: ButtonHandler;
    onShowPrivacy: ButtonHandler;
  }

  export interface Ready extends BaseInfo {
    status: "ready";
    onClose: ButtonHandler;
  }

  export interface Comparing extends BaseInfo {
    status: "comparing";
    pairTimeline: DenomOperationMap<FeeDescriptionPair[]>;
    onReset: ButtonHandler;
    onSelect: ButtonHandler;
  }
  export interface ShowingTos {
    status: "showing-tos";
    exchangeUrl: string;
    onClose: ButtonHandler;
  }
  export interface ShowingPrivacy {
    status: "showing-privacy";
    exchangeUrl: string;
    onClose: ButtonHandler;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "error-loading": ErrorLoadingView,
  comparing: ComparingView,
  "no-exchange": NoExchangesView,
  "showing-tos": TosContentView,
  "showing-privacy": PrivacyContentView,
  ready: ReadyView,
};

export const ExchangeSelectionPage = compose(
  "ExchangeSelectionPage",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);
