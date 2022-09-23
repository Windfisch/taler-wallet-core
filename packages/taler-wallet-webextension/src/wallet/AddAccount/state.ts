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

import { parsePaytoUri, stringifyPaytoUri } from "@gnu-taler/taler-util";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState({ currency, onAccountAdded, onCancel }: Props, api: typeof wxApi): State {
  const hook = useAsyncAsHook(async () => {
    const { accounts } = await api.listKnownBankAccounts(currency);
    return { accounts };
  });

  const [payto, setPayto] = useState("")
  const [alias, setAlias] = useState("")
  const [type, setType] = useState("")


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
    }
  }

  const accountType: Record<string, string> = {
    "": "Choose one account",
    "iban": "IBAN",
    "bitcoin": "Bitcoin",
    "x-taler-bank": "Taler Bank"
  }
  const uri = parsePaytoUri(payto)
  const found = hook.response.accounts.findIndex(a => stringifyPaytoUri(a.uri) === payto) !== -1

  async function addAccount(): Promise<void> {
    if (!uri || found) return;

    await api.addKnownBankAccounts(uri, currency, alias)
    onAccountAdded(payto)
  }

  const paytoUriError = payto === "" ? undefined
    : !uri ? "the uri is not ok"
      : found ? "that account is already present"
        : undefined

  const unableToAdd = !type || !alias || paytoUriError

  return {
    status: "ready",
    error: undefined,
    currency,
    accountType: {
      list: accountType,
      value: type,
      onChange: async (v) => {
        setType(v)
      }
    },
    alias: {
      value: alias,
      onInput: async (v) => {
        setAlias(v)
      },
    },
    uri: {
      value: payto,
      error: paytoUriError,
      onInput: async (v) => {
        setPayto(v)
      }
    },
    onAccountAdded: {
      onClick: unableToAdd ? undefined : addAccount
    },
    onCancel: {
      onClick: async () => onCancel()
    }
  };
}
