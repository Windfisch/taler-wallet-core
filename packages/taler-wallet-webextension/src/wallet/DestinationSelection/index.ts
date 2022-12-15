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
import { AmountFieldHandler, ButtonHandler } from "../../mui/handlers.js";
import { compose, StateViewMap } from "../../utils/index.js";
import { useComponentState } from "./state.js";
import { LoadingUriView, ReadyView, SelectCurrencyView } from "./views.js";

export type Props = PropsGet | PropsSend;

interface PropsGet {
  type: "get";
  amount?: string;
  goToWalletManualWithdraw: (amount: string) => void;
  goToWalletWalletInvoice: (amount: string) => void;
}
interface PropsSend {
  type: "send";
  amount?: string;
  goToWalletBankDeposit: (amount: string) => void;
  goToWalletWalletSend: (amount: string) => void;
}

export type State =
  | State.Loading
  | State.LoadingUriError
  | State.Ready
  | State.SelectCurrency;

export namespace State {
  export interface Loading {
    status: "loading";
    error: undefined;
  }

  export interface LoadingUriError {
    status: "loading-error";
    error: HookError;
  }

  export interface SelectCurrency {
    status: "select-currency";
    error: undefined;
    currencies: Record<string, string>;
    onCurrencySelected: (currency: string) => void;
  }

  export interface Ready {
    status: "ready";
    error: undefined;
    type: Props["type"];
    selectCurrency: ButtonHandler;
    previous: Contact[];
    goToBank: ButtonHandler;
    goToWallet: ButtonHandler;
    amountHandler: AmountFieldHandler;
  }
}

export type Contact = {
  icon_type: string;
  name: string;
  description: string;
};

const viewMapping: StateViewMap<State> = {
  loading: Loading,
  "loading-error": LoadingUriView,
  "select-currency": SelectCurrencyView,
  ready: ReadyView,
};

export const DestinationSelectionPage = compose(
  "DestinationSelectionPage",
  (p: Props) => useComponentState(p),
  viewMapping,
);
