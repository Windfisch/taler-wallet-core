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

import { AmountJson, Amounts, DepositGroupFees, PaytoUri } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { SelectList } from "../components/SelectList.js";
import {
  ErrorText,
  Input,
  InputWithLabel,
  SubTitle,
  WarningBox,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import {
  ButtonHandler,
  SelectFieldHandler,
  TextFieldHandler,
} from "../mui/handlers.js";
import * as wxApi from "../wxApi.js";

interface Props {
  amount: string;
  onCancel: (currency: string) => void;
  onSuccess: (currency: string) => void;
}
export function DepositPage({ amount, onCancel, onSuccess }: Props): VNode {
  const state = useComponentState(amount, onCancel, onSuccess, wxApi);

  return <View state={state} />;
}

interface ViewProps {
  state: State;
}

type State = Loading | NoBalanceState | NoAccountsState | DepositState;

interface Loading {
  status: "loading";
  hook: HookError | undefined;
}

interface NoBalanceState {
  status: "no-balance";
}
interface NoAccountsState {
  status: "no-accounts";
  cancelHandler: ButtonHandler;
}
interface DepositState {
  status: "ready";
  currency: string;
  amount: TextFieldHandler;
  account: SelectFieldHandler;
  totalFee: AmountJson;
  totalToDeposit: AmountJson;
  // currentAccount: PaytoUri;
  // parsedAmount: AmountJson | undefined;
  cancelHandler: ButtonHandler;
  depositHandler: ButtonHandler;
}

async function getFeeForAmount(
  p: PaytoUri,
  a: AmountJson,
  api: typeof wxApi,
): Promise<DepositGroupFees> {
  const account = `payto://${p.targetType}/${p.targetPath}`;
  const amount = Amounts.stringify(a);
  return await api.getFeeForDeposit(account, amount);
}

export function useComponentState(
  amountOrCurrency: string,
  onCancel: (currency: string) => void,
  onSuccess: (currency: string) => void,
  api: typeof wxApi,
): State {
  const parsed = Amounts.parse(amountOrCurrency);
  const currency = parsed !== undefined ? parsed.currency : amountOrCurrency;

  const hook = useAsyncAsHook(async () => {
    const { balances } = await api.getBalance();
    const { accounts: accountMap } = await api.listKnownBankAccounts(currency);
    const accounts = Object.values(accountMap);
    const defaultSelectedAccount =
      accounts.length > 0 ? accounts[0] : undefined;
    return { accounts, balances, defaultSelectedAccount };
  });

  const initialValue =
    parsed !== undefined ? Amounts.stringifyValue(parsed) : "0";
  const [accountIdx, setAccountIdx] = useState(0);
  const [amount, setAmount] = useState(initialValue);

  const [selectedAccount, setSelectedAccount] = useState<
    PaytoUri | undefined
  >();

  const parsedAmount = Amounts.parse(`${currency}:${amount}`);

  const [fee, setFee] = useState<DepositGroupFees | undefined>(undefined);

  if (!hook || hook.hasError) {
    return {
      status: "loading",
      hook,
    };
  }

  const { accounts, balances, defaultSelectedAccount } = hook.response;
  const currentAccount = selectedAccount ?? defaultSelectedAccount;

  const bs = balances.filter((b) => b.available.startsWith(currency));
  const balance =
    bs.length > 0
      ? Amounts.parseOrThrow(bs[0].available)
      : Amounts.getZero(currency);

  if (Amounts.isZero(balance)) {
    return {
      status: "no-balance",
    };
  }

  if (!currentAccount) {
    return {
      status: "no-accounts",
      cancelHandler: {
        onClick: async () => {
          onCancel(currency);
        },
      },
    };
  }
  const accountMap = createLabelsForBankAccount(accounts);

  async function updateAccount(accountStr: string): Promise<void> {
    const idx = parseInt(accountStr, 10);
    const newSelected = accounts.length > idx ? accounts[idx] : undefined;
    if (accountIdx === idx || !newSelected) return;

    if (!parsedAmount) {
      setAccountIdx(idx);
      setSelectedAccount(newSelected);
    } else {
      const result = await getFeeForAmount(newSelected, parsedAmount, api);
      setAccountIdx(idx);
      setSelectedAccount(newSelected);
      setFee(result);
    }
  }

  async function updateAmount(numStr: string): Promise<void> {
    // const num = parseFloat(numStr);
    // const newAmount = Number.isNaN(num) ? 0 : num;
    if (amount === numStr || !currentAccount) return;
    const parsed = Amounts.parse(`${currency}:${numStr}`);
    if (!parsed) {
      setAmount(numStr);
    } else {
      const result = await getFeeForAmount(currentAccount, parsed, api);
      setAmount(numStr);
      setFee(result);
    }
  }

  const totalFee =
    fee !== undefined
      ? Amounts.sum([fee.wire, fee.coin, fee.refresh]).amount
      : Amounts.getZero(currency);

  const totalToDeposit = parsedAmount
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
    !parsedAmount ||
    Amounts.isZero(totalToDeposit) ||
    fee === undefined ||
    amountError !== undefined;

  async function doSend(): Promise<void> {
    if (!currentAccount || !parsedAmount) return;

    const account = `payto://${currentAccount.targetType}/${currentAccount.targetPath}`;
    const amount = Amounts.stringify(parsedAmount);
    await api.createDepositGroup(account, amount);
    onSuccess(currency);
  }

  return {
    status: "ready",
    currency,
    amount: {
      value: String(amount),
      onInput: updateAmount,
      error: amountError,
    },
    account: {
      list: accountMap,
      value: String(accountIdx),
      onChange: updateAccount,
    },
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

export function View({ state }: ViewProps): VNode {
  const { i18n } = useTranslationContext();

  if (state === undefined) return <Loading />;

  if (state.status === "loading") {
    if (!state.hook) return <Loading />;
    return (
      <LoadingError
        title={<i18n.Translate>Could not load deposit balance</i18n.Translate>}
        error={state.hook}
      />
    );
  }

  if (state.status === "no-balance") {
    return (
      <div>
        <i18n.Translate>no balance</i18n.Translate>
      </div>
    );
  }
  if (state.status === "no-accounts") {
    return (
      <Fragment>
        <WarningBox>
          <p>
            <i18n.Translate>
              There is no known bank account to send money to
            </i18n.Translate>
          </p>
        </WarningBox>
        <footer>
          <Button
            variant="contained"
            color="secondary"
            onClick={state.cancelHandler.onClick}
          >
            <i18n.Translate>Cancel</i18n.Translate>
          </Button>
        </footer>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <SubTitle>
        <i18n.Translate>Send {state.currency} to your account</i18n.Translate>
      </SubTitle>
      <section>
        <Input>
          <SelectList
            label={<i18n.Translate>Bank account IBAN number</i18n.Translate>}
            list={state.account.list}
            name="account"
            value={state.account.value}
            onChange={state.account.onChange}
          />
        </Input>
        <InputWithLabel invalid={!!state.amount.error}>
          <label>
            <i18n.Translate>Amount</i18n.Translate>
          </label>
          <div>
            <span>{state.currency}</span>
            <input
              type="number"
              value={state.amount.value}
              onInput={(e) => state.amount.onInput(e.currentTarget.value)}
            />
          </div>
          {state.amount.error && <ErrorText>{state.amount.error}</ErrorText>}
        </InputWithLabel>
        {
          <Fragment>
            <InputWithLabel>
              <label>
                <i18n.Translate>Deposit fee</i18n.Translate>
              </label>
              <div>
                <span>{state.currency}</span>
                <input
                  type="number"
                  disabled
                  value={Amounts.stringifyValue(state.totalFee)}
                />
              </div>
            </InputWithLabel>

            <InputWithLabel>
              <label>
                <i18n.Translate>Total deposit</i18n.Translate>
              </label>
              <div>
                <span>{state.currency}</span>
                <input
                  type="number"
                  disabled
                  value={Amounts.stringifyValue(state.totalToDeposit)}
                />
              </div>
            </InputWithLabel>
          </Fragment>
        }
      </section>
      <footer>
        <Button
          variant="contained"
          color="secondary"
          onClick={state.cancelHandler.onClick}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {!state.depositHandler.onClick ? (
          <Button variant="contained" disabled>
            <i18n.Translate>Deposit</i18n.Translate>
          </Button>
        ) : (
          <Button variant="contained" onClick={state.depositHandler.onClick}>
            <i18n.Translate>
              Deposit&nbsp;{Amounts.stringifyValue(state.totalToDeposit)}{" "}
              {state.currency}
            </i18n.Translate>
          </Button>
        )}
      </footer>
    </Fragment>
  );
}

export function createLabelsForBankAccount(
  knownBankAccounts: Array<PaytoUri>,
): {
  [label: number]: string;
} {
  if (!knownBankAccounts) return {};
  return knownBankAccounts.reduce((prev, cur, i) => {
    let label = cur.targetPath;
    if (cur.isKnown) {
      switch (cur.targetType) {
        case "x-taler-bank": {
          label = cur.account;
          break;
        }
        case "iban": {
          label = cur.iban;
          break;
        }
      }
    }
    return {
      ...prev,
      [i]: label,
    };
  }, {} as { [label: number]: string });
}
