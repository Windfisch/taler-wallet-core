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
import { AmountOrCurrencyErrorView, LoadingErrorView, NoAccountToDepositView, NoEnoughBalanceView, ReadyView } from "./views.js";
import * as wxApi from "../../wxApi.js";
import { useComponentState } from "./state.js";
import { AmountJson, PaytoUri } from "@gnu-taler/taler-util";
import { ButtonHandler, SelectFieldHandler, TextFieldHandler, ToggleHandler } from "../../mui/handlers.js";
import { AddAccountPage } from "../AddAccount/index.js";

export interface Props {
  amount?: string;
  currency?: string;
  onCancel: (currency: string) => void;
  onSuccess: (currency: string) => void;
}

export type State = State.Loading
  | State.LoadingUriError
  | State.AmountOrCurrencyError
  | State.NoEnoughBalance
  | State.Ready
  | State.NoAccounts
  | State.AddingAccount;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "loading-error";
    error: HookError;
  }

  export interface AddingAccount {
    status: "adding-account";
    error: undefined;
    currency: string;
    onAccountAdded: (p: string) => void;
    onCancel: () => void;
  }

  export interface AmountOrCurrencyError {
    status: "amount-or-currency-error";
    error: undefined;
  }

  export interface BaseInfo {
    error: undefined;
  }

  export interface NoEnoughBalance extends BaseInfo {
    status: "no-enough-balance";
    currency: string;
  }

  export interface NoAccounts extends BaseInfo {
    status: "no-accounts";
    currency: string;
    onAddAccount: ButtonHandler;
  }

  export interface Ready extends BaseInfo {
    status: "ready";
    error: undefined;
    currency: string;

    selectedAccount: PaytoUri | undefined;
    totalFee: AmountJson;
    totalToDeposit: AmountJson;

    amount: TextFieldHandler;
    account: SelectFieldHandler;
    cancelHandler: ButtonHandler;
    depositHandler: ButtonHandler;
    onAddAccount: ButtonHandler;
  }
}

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-error": LoadingErrorView,
  "amount-or-currency-error": AmountOrCurrencyErrorView,
  "no-enough-balance": NoEnoughBalanceView,
  "no-accounts": NoAccountToDepositView,
  "adding-account": AddAccountPage,
  ready: ReadyView,
};

export const DepositPage = compose(
  "DepositPage",
  (p: Props) => useComponentState(p, wxApi),
  viewMapping,
);