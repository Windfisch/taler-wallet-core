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

import { Amounts } from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { assertUnreachable, RecursiveState } from "../../utils/index.js";
import { wxApi } from "../../wxApi.js";
import { Contact, Props, State } from "./index.js";

export function useComponentState(
  props: Props,
  api: typeof wxApi,
): RecursiveState<State> {
  const parsedInitialAmount = !props.amount
    ? undefined
    : Amounts.parse(props.amount);

  // const initialCurrency = parsedInitialAmount?.currency;

  const [amount, setAmount] = useState(
    !parsedInitialAmount ? undefined : parsedInitialAmount,
  );

  //FIXME: get this information from wallet
  // eslint-disable-next-line no-constant-condition
  const previous: Contact[] = true
    ? []
    : [
      {
        name: "International Bank",
        icon_type: 'bank',
        description: "account ending with 3454",
      },
      {
        name: "Max",
        icon_type: 'bank',
        description: "account ending with 3454",
      },
      {
        name: "Alex",
        icon_type: 'bank',
        description: "account ending with 3454",
      },
    ];

  if (!amount) {
    return () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const hook = useAsyncAsHook(() =>
        api.wallet.call(WalletApiOperation.ListExchanges, {}),
      );

      if (!hook) {
        return {
          status: "loading",
          error: undefined,
        };
      }
      if (hook.hasError) {
        return {
          status: "loading-error",
          error: hook,
        };
      }
      const currencies: Record<string, string> = {};
      hook.response.exchanges.forEach((e) => {
        if (e.currency) {
          currencies[e.currency] = e.currency;
        }
      });
      currencies[""] = "Select a currency";

      return {
        status: "select-currency",
        error: undefined,
        onCurrencySelected: (c: string) => {
          setAmount(Amounts.zeroOfCurrency(c));
        },
        currencies,
      };
    };
  }

  const currencyAndAmount = Amounts.stringify(amount);
  const invalid = Amounts.isZero(amount);

  switch (props.type) {
    case "send":
      return {
        status: "ready",
        error: undefined,
        previous,
        selectCurrency: {
          onClick: async () => {
            setAmount(undefined);
          },
        },
        goToBank: {
          onClick: invalid
            ? undefined
            : async () => {
              props.goToWalletBankDeposit(currencyAndAmount);
            },
        },
        goToWallet: {
          onClick: invalid
            ? undefined
            : async () => {
              props.goToWalletWalletSend(currencyAndAmount);
            },
        },
        amountHandler: {
          onInput: async (s) => setAmount(s),
          value: amount,
        },
        type: props.type,
      };
    case "get":
      return {
        status: "ready",
        error: undefined,
        previous,
        selectCurrency: {
          onClick: async () => {
            setAmount(undefined);
          },
        },
        goToBank: {
          onClick: invalid
            ? undefined
            : async () => {
              props.goToWalletManualWithdraw(currencyAndAmount);
            },
        },
        goToWallet: {
          onClick: invalid
            ? undefined
            : async () => {
              props.goToWalletWalletInvoice(currencyAndAmount);
            },
        },
        amountHandler: {
          onInput: async (s) => setAmount(s),
          value: amount,
        },
        type: props.type,
      };
    default:
      assertUnreachable(props);
  }
}
