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
  AmountJson,
  Amounts,
  DepositGroupFees,
  KnownBankAccountsInfo,
  parsePaytoUri,
  PaytoUri,
  stringifyPaytoUri
} from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { wxApi } from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { amount: amountStr, currency: currencyStr, onCancel, onSuccess }: Props,
  api: typeof wxApi,
): State {
  const parsed = amountStr === undefined ? undefined : Amounts.parse(amountStr);
  const currency = parsed !== undefined ? parsed.currency : currencyStr;

  const hook = useAsyncAsHook(async () => {
    const { balances } = await api.wallet.call(WalletApiOperation.GetBalances, {});
    const { accounts } = await api.wallet.call(WalletApiOperation.ListKnownBankAccounts, {
      currency
    });

    return { accounts, balances };
  });

  const initialValue =
    parsed !== undefined ? Amounts.stringifyValue(parsed) : "0";
  // const [accountIdx, setAccountIdx] = useState<number>(0);
  const [amount, setAmount] = useState(initialValue);

  const [selectedAccount, setSelectedAccount] = useState<
    PaytoUri | undefined
  >();

  const [fee, setFee] = useState<DepositGroupFees | undefined>(undefined);
  const [addingAccount, setAddingAccount] = useState(false);

  if (!currency) {
    return {
      status: "amount-or-currency-error",
      error: undefined,
    };
  }

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
  const { accounts, balances } = hook.response;

  const parsedAmount = Amounts.parse(`${currency}:${amount}`);

  if (addingAccount) {
    return {
      status: "adding-account",
      error: undefined,
      currency,
      onAccountAdded: (p: string) => {
        updateAccountFromList(p);
        setAddingAccount(false);
        hook.retry();
      },
      onCancel: () => {
        setAddingAccount(false);
      },
    };
  }

  const bs = balances.filter((b) => b.available.startsWith(currency));
  const balance =
    bs.length > 0
      ? Amounts.parseOrThrow(bs[0].available)
      : Amounts.getZero(currency);

  if (Amounts.isZero(balance)) {
    return {
      status: "no-enough-balance",
      error: undefined,
      currency,
    };
  }

  if (accounts.length === 0) {
    return {
      status: "no-accounts",
      error: undefined,
      currency,
      onAddAccount: {
        onClick: async () => {
          setAddingAccount(true);
        },
      },
    };
  }

  const accountMap = createLabelsForBankAccount(accounts);
  accountMap[""] = "Select one account...";

  async function updateAccountFromList(accountStr: string): Promise<void> {
    // const newSelected = !accountMap[accountStr] ? undefined : accountMap[accountStr];
    // if (!newSelected) return;
    const uri = !accountStr ? undefined : parsePaytoUri(accountStr);
    if (uri && parsedAmount) {
      try {
        const result = await getFeeForAmount(uri, parsedAmount, api);
        setSelectedAccount(uri);
        setFee(result);
      } catch (e) {
        console.error(e)
        setSelectedAccount(uri);
        setFee(undefined);
      }
    }
  }

  async function updateAmount(numStr: string): Promise<void> {
    const parsed = Amounts.parse(`${currency}:${numStr}`);
    if (parsed && selectedAccount) {
      try {
        const result = await getFeeForAmount(selectedAccount, parsed, api);
        setAmount(numStr);
        setFee(result);
      } catch (e) {
        console.error(e)
        setAmount(numStr);
        setFee(undefined);
      }
    }
  }

  const totalFee =
    fee !== undefined
      ? Amounts.sum([fee.wire, fee.coin, fee.refresh]).amount
      : Amounts.getZero(currency);

  const totalToDeposit =
    parsedAmount && fee !== undefined
      ? Amounts.sub(parsedAmount, totalFee).amount
      : Amounts.getZero(currency);

  const isDirty = amount !== initialValue;
  const amountError = !isDirty
    ? undefined
    : !parsedAmount
      ? "Invalid amount"
      : Amounts.cmp(balance, parsedAmount) === -1
        ? `Too much, your current balance is ${Amounts.stringifyValue(balance)}`
        : undefined;

  const unableToDeposit =
    !parsedAmount || //no amount specified
    selectedAccount === undefined || //no account selected
    Amounts.isZero(totalToDeposit) || //deposit may be zero because of fee
    fee === undefined || //no fee calculated yet
    amountError !== undefined; //amount field may be invalid

  async function doSend(): Promise<void> {
    if (!selectedAccount || !parsedAmount || !currency) return;

    const depositPaytoUri = `payto://${selectedAccount.targetType}/${selectedAccount.targetPath}`;
    const amount = Amounts.stringify(parsedAmount);
    await api.wallet.call(WalletApiOperation.CreateDepositGroup, {
      amount, depositPaytoUri
    })
    onSuccess(currency);
  }

  return {
    status: "ready",
    error: undefined,
    currency,
    amount: {
      value: String(amount),
      onInput: updateAmount,
      error: amountError,
    },
    onAddAccount: {
      onClick: async () => {
        setAddingAccount(true);
      },
    },
    account: {
      list: accountMap,
      value: !selectedAccount ? "" : stringifyPaytoUri(selectedAccount),
      onChange: updateAccountFromList,
    },
    selectedAccount,
    cancelHandler: {
      onClick: async () => {
        onCancel(currency);
      },
    },
    depositHandler: {
      onClick: unableToDeposit ? undefined : doSend,
    },
    totalFee,
    totalToDeposit,
    // currentAccount,
    // parsedAmount,
  };
}

async function getFeeForAmount(
  p: PaytoUri,
  a: AmountJson,
  api: typeof wxApi,
): Promise<DepositGroupFees> {
  const depositPaytoUri = `payto://${p.targetType}/${p.targetPath}`;
  const amount = Amounts.stringify(a);
  return await api.wallet.call(WalletApiOperation.GetFeeForDeposit, {
    amount, depositPaytoUri
  })
}

export function labelForAccountType(id: string) {
  switch (id) {
    case "":
      return "Choose one";
    case "x-taler-bank":
      return "Taler Bank";
    case "bitcoin":
      return "Bitcoin";
    case "iban":
      return "IBAN";
    default:
      return id;
  }
}

export function createLabelsForBankAccount(
  knownBankAccounts: Array<KnownBankAccountsInfo>,
): { [value: string]: string } {
  const initialList: Record<string, string> = {};
  if (!knownBankAccounts.length) return initialList;
  return knownBankAccounts.reduce((prev, cur, i) => {
    prev[stringifyPaytoUri(cur.uri)] = cur.alias;
    return prev;
  }, initialList);
}
