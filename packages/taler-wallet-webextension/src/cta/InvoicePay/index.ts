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
  AbsoluteTime,
  AmountJson,
  PreparePayResult,
  TalerErrorDetail,
} from "@gnu-taler/taler-util";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { LoadingUriView, ReadyView } from "./views.js";

export interface Props {
  talerPayPullUri: string;
  onClose: () => Promise<void>;
  goToWalletManualWithdraw: (amount?: string) => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.NoEnoughBalance
  | State.NoBalanceForCurrency
  | State.Ready;

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
    uri: string;
    cancel: ButtonHandler;
    amount: AmountJson;
    goToWalletManualWithdraw: (currency: string) => Promise<void>;
    summary: string | undefined;
    expiration: AbsoluteTime | undefined;
    operationError?: TalerErrorDetail;
    payStatus: PreparePayResult;
  }

  export interface NoBalanceForCurrency extends BaseInfo {
    status: "no-balance-for-currency";
    balance: undefined;
  }
  export interface NoEnoughBalance extends BaseInfo {
    status: "no-enough-balance";
    balance: AmountJson;
  }

  export interface Ready extends BaseInfo {
    status: "ready";
    error: undefined;
    balance: AmountJson;
    accept: ButtonHandler;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-uri": LoadingUriView,
  "no-balance-for-currency": ReadyView,
  "no-enough-balance": ReadyView,
  ready: ReadyView,
};

export const InvoicePayPage = compose(
  "InvoicePayPage",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);
