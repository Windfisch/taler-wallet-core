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
  TalerErrorDetail
} from "@gnu-taler/taler-util";
import { SyncTermsOfServiceResponse } from "@gnu-taler/taler-wallet-core";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import {
  ButtonHandler,
  TextFieldHandler,
  ToggleHandler
} from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import { useComponentState } from "./state.js";
import {
  ConfirmProviderView, LoadingUriView,
  SelectProviderView
} from "./views.js";

export interface Props {
  currency: string;
  onBack: () => Promise<void>;
  onComplete: (pid: string) => Promise<void>;
  onPaymentRequired: (uri: string) => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.ConfirmProvider
  | State.SelectProvider;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "loading-error";
    error: HookError;
  }

  export interface ConfirmProvider {
    status: "confirm-provider";
    error: undefined | TalerErrorDetail;
    url: string;
    provider: SyncTermsOfServiceResponse;
    tos: ToggleHandler;
    onCancel: ButtonHandler;
    onAccept: ButtonHandler;
  }

  export interface SelectProvider {
    status: "select-provider";
    url: TextFieldHandler;
    urlOk: boolean;
    name: TextFieldHandler;
    onConfirm: ButtonHandler;
    onCancel: ButtonHandler;
    error: undefined | TalerErrorDetail;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-error": LoadingUriView,
  "select-provider": SelectProviderView,
  "confirm-provider": ConfirmProviderView,
};

export const AddBackupProviderPage = compose(
  "AddBackupProvider",
  (p: Props) => useComponentState(p),
  viewMapping,
);
