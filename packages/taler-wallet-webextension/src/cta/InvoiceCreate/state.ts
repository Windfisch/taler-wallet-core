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

/* eslint-disable react-hooks/rules-of-hooks */
import { Amounts, TalerErrorDetail } from "@gnu-taler/taler-util";
import { TalerError, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { useSelectedExchange } from "../../hooks/useSelectedExchange.js";
import { wxApi } from "../../wxApi.js";
import { Props, State } from "./index.js";

type RecursiveState<S extends object> = S | (() => RecursiveState<S>);

export function useComponentState(
  { amount: amountStr, onClose, onSuccess }: Props,
  api: typeof wxApi,
): RecursiveState<State> {
  const amount = Amounts.parseOrThrow(amountStr);

  const hook = useAsyncAsHook(() => api.wallet.call(WalletApiOperation.ListExchanges, {}));

  if (!hook) {
    return {
      status: "loading",
      error: undefined,
    };
  }
  if (hook.hasError) {
    return {
      status: "loading-uri",
      error: hook,
    };
  }

  const exchangeList = hook.response.exchanges;

  return () => {
    const [subject, setSubject] = useState("");

    const [operationError, setOperationError] = useState<
      TalerErrorDetail | undefined
    >(undefined);

    const selectedExchange = useSelectedExchange({
      currency: amount.currency,
      defaultExchange: undefined,
      list: exchangeList,
    });

    if (selectedExchange.status !== "ready") {
      return selectedExchange;
    }

    const exchange = selectedExchange.selected;

    async function accept(): Promise<void> {
      try {
        const resp = await api.wallet.call(WalletApiOperation.InitiatePeerPullPayment, {
          amount: Amounts.stringify(amount),
          exchangeBaseUrl: exchange.exchangeBaseUrl,
          partialContractTerms: {
            summary: subject,
          },
        });

        onSuccess(resp.transactionId);
      } catch (e) {
        if (e instanceof TalerError) {
          setOperationError(e.errorDetail);
        }
        console.error(e);
        throw Error("error trying to accept");
      }
    }

    return {
      status: "ready",
      subject: {
        error: !subject ? "cant be empty" : undefined,
        value: subject,
        onInput: async (e) => setSubject(e),
      },
      doSelectExchange: selectedExchange.doSelect,
      invalid: !subject || Amounts.isZero(amount),
      exchangeUrl: exchange.exchangeBaseUrl,
      create: {
        onClick: accept,
      },
      cancel: {
        onClick: onClose,
      },
      chosenAmount: amount,
      toBeReceived: amount,
      error: undefined,
      operationError,
    };
  };
}
