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

import { AmountJson, PaytoUri } from "@gnu-taler/taler-util";
import { Loading } from "../../components/Loading.js";
import { HookError } from "../../hooks/useAsyncAsHook.js";
import {
  AmountFieldHandler,
  ButtonHandler,
  SelectFieldHandler
} from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import { ManageAccountPage } from "../ManageAccount/index.js";
import { useComponentState } from "./state.js";
import {
  AmountOrCurrencyErrorView,
  LoadingErrorView,
  NoAccountToDepositView,
  NoEnoughBalanceView,
  ReadyView
} from "./views.js";

export interface Props {
  amount?: string;
  currency?: string;
  onCancel: (currency: string) => void;
  onSuccess: (currency: string) => void;
}

export type State =
  | State.Loading
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
    status: "manage-account";
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

    currentAccount: PaytoUri;
    totalFee: AmountJson;
    totalToDeposit: AmountJson;

    amount: AmountFieldHandler;
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
  "manage-account": ManageAccountPage,
  ready: ReadyView,
};

export const DepositPage = compose(
  "DepositPage",
  (p: Props) => useComponentState(p),
  viewMapping,
);
