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

import { AmountJson, ConfirmPayResult, PreparePayResult, PreparePayResultAlreadyConfirmed, PreparePayResultInsufficientBalance, PreparePayResultPaymentPossible } from "@gnu-taler/taler-util";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { LoadingUriView, BaseView } from "./views.js";



export interface Props {
  talerPayUri?: string;
  goToWalletManualWithdraw: (currency?: string) => Promise<void>;
  goBack: () => Promise<void>;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.Ready
  | State.NoEnoughBalance
  | State.NoBalanceForCurrency
  | State.Completed
  | State.Confirmed;

export namespace State {

  export interface Loading {
    status: "loading";
    error: undefined;
  }
  export interface LoadingUriError {
    status: "loading-uri";
    error: HookError;
  }

  interface BaseInfo {
    amount: AmountJson;
    uri: string;
    error: undefined;
    goToWalletManualWithdraw: (currency?: string) => Promise<void>;
    goBack: () => Promise<void>;
  }
  export interface NoBalanceForCurrency extends BaseInfo {
    status: "no-balance-for-currency"
    payStatus: PreparePayResult;
    balance: undefined;
  }
  export interface NoEnoughBalance extends BaseInfo {
    status: "no-enough-balance"
    payStatus: PreparePayResult;
    balance: AmountJson;
  }
  export interface Ready extends BaseInfo {
    status: "ready";
    payStatus: PreparePayResultPaymentPossible;
    payHandler: ButtonHandler;
    balance: AmountJson;
  }

  export interface Confirmed extends BaseInfo {
    status: "confirmed";
    payStatus: PreparePayResultAlreadyConfirmed;
    balance: AmountJson;
  }

  export interface Completed extends BaseInfo {
    status: "completed";
    payStatus: PreparePayResult;
    payResult: ConfirmPayResult;
    payHandler: ButtonHandler;
    balance: AmountJson;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-uri": LoadingUriView,
  "no-balance-for-currency": BaseView,
  "no-enough-balance": BaseView,
  confirmed: BaseView,
  completed: BaseView,
  ready: BaseView,
};

export const PaymentPage = compose("Payment", (p: Props) => useComponentState(p, wxApi), viewMapping)
