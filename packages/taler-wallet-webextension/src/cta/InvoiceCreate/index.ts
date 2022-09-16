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
import { compose, StateViewMap } from "../../utils/index.js";
import { LoadingUriView, ReadyView } from "./views.js";
import * as wxApi from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { AmountJson, TalerErrorDetail } from "@gnu-taler/taler-util";
import { ButtonHandler, TextFieldHandler } from "../../mui/handlers.js";

export interface Props {
  amount: string;
  onClose: () => Promise<void>;
  onSuccess: (tx: string) => Promise<void>;
}

export type State = State.Loading | State.LoadingUriError | State.Ready;

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
    error: undefined;
    cancel: ButtonHandler;
  }
  export interface Ready extends BaseInfo {
    status: "ready";
    create: ButtonHandler;
    subject: TextFieldHandler;
    toBeReceived: AmountJson;
    chosenAmount: AmountJson;
    exchangeUrl: string;
    invalid: boolean;
    error: undefined;
    operationError?: TalerErrorDetail;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-uri": LoadingUriView,
  ready: ReadyView,
};

export const InvoiceCreatePage = compose(
  "InvoiceCreatePage",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);
