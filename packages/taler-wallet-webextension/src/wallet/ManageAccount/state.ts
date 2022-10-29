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

import { KnownBankAccountsInfo, parsePaytoUri, stringifyPaytoUri } from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { wxApi } from "../../wxApi.js";
import { AccountByType, Props, State } from "./index.js";

export function useComponentState(
  { currency, onAccountAdded, onCancel }: Props,
  api: typeof wxApi,
): State {
  const hook = useAsyncAsHook(() => api.wallet.call(WalletApiOperation.ListKnownBankAccounts, { currency }));

  const [payto, setPayto] = useState("");
  const [alias, setAlias] = useState("");
  const [type, setType] = useState("");

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

  const accountType: Record<string, string> = {
    "": "Choose one account type",
    iban: "IBAN",
    // bitcoin: "Bitcoin",
    // "x-taler-bank": "Taler Bank",
  };
  const uri = parsePaytoUri(payto);
  const found =
    hook.response.accounts.findIndex(
      (a) => stringifyPaytoUri(a.uri) === payto,
    ) !== -1;

  async function addAccount(): Promise<void> {
    if (!uri || found) return;

    const normalizedPayto = stringifyPaytoUri(uri);
    await api.wallet.call(WalletApiOperation.AddKnownBankAccounts, {
      alias, currency, payto: normalizedPayto
    });
    onAccountAdded(payto);
  }

  const paytoUriError =
    found
      ? "that account is already present"
      : undefined;

  const unableToAdd = !type || !alias || paytoUriError !== undefined || uri === undefined;

  const accountByType: AccountByType = {
    iban: [],
    bitcoin: [],
    "x-taler-bank": [],
  }

  hook.response.accounts.forEach(acc => {
    accountByType[acc.uri.targetType].push(acc)
  });

  async function deleteAccount(account: KnownBankAccountsInfo): Promise<void> {
    const payto = stringifyPaytoUri(account.uri);
    await api.wallet.call(WalletApiOperation.ForgetKnownBankAccounts, {
      payto
    })
    hook?.retry()
  }

  return {
    status: "ready",
    error: undefined,
    currency,
    accountType: {
      list: accountType,
      value: type,
      onChange: async (v) => {
        setType(v);
      },
    },
    alias: {
      value: alias,
      onInput: async (v) => {
        setAlias(v);
      },
    },
    uri: {
      value: payto,
      error: paytoUriError,
      onInput: async (v) => {
        setPayto(v);
      },
    },
    accountByType,
    deleteAccount,
    onAccountAdded: {
      onClick: unableToAdd ? undefined : addAccount,
    },
    onCancel: {
      onClick: async () => onCancel(),
    },
  };
}
