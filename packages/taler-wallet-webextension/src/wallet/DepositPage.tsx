/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
*/

import {
  AmountJson,
  Amounts,
  AmountString,
  Balance,
  PaytoUri,
} from "@gnu-taler/taler-util";
import { DepositFee } from "@gnu-taler/taler-wallet-core/src/operations/deposits";
import { saturate } from "polished";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import { SelectList } from "../components/SelectList";
import {
  Button,
  ButtonBoxWarning,
  ButtonPrimary,
  ErrorText,
  Input,
  InputWithLabel,
  WarningBox,
} from "../components/styled";
import { useTranslationContext } from "../context/translation";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";
import { SelectFieldHandler, TextFieldHandler } from "./CreateManualWithdraw";

interface Props {
  currency: string;
  onCancel: (currency: string) => void;
  onSuccess: (currency: string) => void;
}
export function DepositPage({ currency, onCancel, onSuccess }: Props): VNode {
  const state = useAsyncAsHook(async () => {
    const { balances } = await wxApi.getBalance();
    const { accounts } = await wxApi.listKnownBankAccounts(currency);
    return { accounts, balances };
  });

  const { i18n } = useTranslationContext();

  async function doSend(p: PaytoUri, a: AmountJson): Promise<void> {
    const account = `payto://${p.targetType}/${p.targetPath}`;
    const amount = Amounts.stringify(a);
    await wxApi.createDepositGroup(account, amount);
    onSuccess(currency);
  }

  async function getFeeForAmount(
    p: PaytoUri,
    a: AmountJson,
  ): Promise<DepositFee> {
    const account = `payto://${p.targetType}/${p.targetPath}`;
    const amount = Amounts.stringify(a);
    return await wxApi.getFeeForDeposit(account, amount);
  }

  if (state === undefined) return <Loading />;

  if (state.hasError) {
    return (
      <LoadingError
        title={<i18n.Translate>Could not load deposit balance</i18n.Translate>}
        error={state}
      />
    );
  }

  return (
    <View
      onCancel={() => onCancel(currency)}
      currency={currency}
      accounts={state.response.accounts}
      balances={state.response.balances}
      onSend={doSend}
      onCalculateFee={getFeeForAmount}
    />
  );
}

interface ViewProps {
  accounts: Array<PaytoUri>;
  currency: string;
  balances: Balance[];
  onCancel: () => void;
  onSend: (account: PaytoUri, amount: AmountJson) => Promise<void>;
  onCalculateFee: (
    account: PaytoUri,
    amount: AmountJson,
  ) => Promise<DepositFee>;
}

type State = NoBalanceState | NoAccountsState | DepositState;

interface NoBalanceState {
  status: "no-balance";
}
interface NoAccountsState {
  status: "no-accounts";
}
interface DepositState {
  status: "deposit";
  amount: TextFieldHandler;
  account: SelectFieldHandler;
  totalFee: AmountJson;
  totalToDeposit: AmountJson;
  unableToDeposit: boolean;
  selectedAccount: PaytoUri;
  parsedAmount: AmountJson | undefined;
}

export function useComponentState(
  currency: string,
  accounts: PaytoUri[],
  balances: Balance[],
  onCalculateFee: (
    account: PaytoUri,
    amount: AmountJson,
  ) => Promise<DepositFee>,
): State {
  const accountMap = createLabelsForBankAccount(accounts);
  const [accountIdx, setAccountIdx] = useState(0);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [fee, setFee] = useState<DepositFee | undefined>(undefined);
  function updateAmount(num: number | undefined) {
    setAmount(num);
    setFee(undefined);
  }

  const selectedAmountSTR: AmountString = `${currency}:${amount}`;
  const totalFee =
    fee !== undefined
      ? Amounts.sum([fee.wire, fee.coin, fee.refresh]).amount
      : Amounts.getZero(currency);

  const selectedAccount = accounts.length ? accounts[accountIdx] : undefined;

  const parsedAmount =
    amount === undefined ? undefined : Amounts.parse(selectedAmountSTR);

  useEffect(() => {
    if (selectedAccount === undefined || parsedAmount === undefined) return;
    onCalculateFee(selectedAccount, parsedAmount).then((result) => {
      setFee(result);
    });
  }, [amount]);

  const bs = balances.filter((b) => b.available.startsWith(currency));
  const balance =
    bs.length > 0
      ? Amounts.parseOrThrow(bs[0].available)
      : Amounts.getZero(currency);

  const isDirty = amount !== 0;
  const amountError = !isDirty
    ? undefined
    : !parsedAmount
    ? "Invalid amount"
    : Amounts.cmp(balance, parsedAmount) === -1
    ? `Too much, your current balance is ${Amounts.stringifyValue(balance)}`
    : undefined;

  const totalToDeposit = parsedAmount
    ? Amounts.sub(parsedAmount, totalFee).amount
    : Amounts.getZero(currency);

  const unableToDeposit =
    Amounts.isZero(totalToDeposit) ||
    fee === undefined ||
    amountError !== undefined;

  if (Amounts.isZero(balance)) {
    return {
      status: "no-balance",
    };
  }

  if (!accounts || !accounts.length || !selectedAccount) {
    return {
      status: "no-accounts",
    };
  }

  return {
    status: "deposit",
    amount: {
      value: String(amount),
      onInput: (e) => {
        const num = parseFloat(e);
        if (!Number.isNaN(num)) {
          updateAmount(num);
        } else {
          updateAmount(undefined);
          setFee(undefined);
        }
      },
      error: amountError,
    },
    account: {
      list: accountMap,
      value: String(accountIdx),
      onChange: (s) => setAccountIdx(parseInt(s, 10)),
    },
    totalFee,
    totalToDeposit,
    unableToDeposit,
    selectedAccount,
    parsedAmount,
  };
}

export function View({
  onCancel,
  currency,
  accounts,
  balances,
  onSend,
  onCalculateFee,
}: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  const state = useComponentState(currency, accounts, balances, onCalculateFee);

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
          <ButtonBoxWarning>
            <i18n.Translate>Withdraw</i18n.Translate>
          </ButtonBoxWarning>
        </WarningBox>
        <footer>
          <Button onClick={onCancel}>
            <i18n.Translate>Cancel</i18n.Translate>
          </Button>
        </footer>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <h2>
        <i18n.Translate>Send {currency} to your account</i18n.Translate>
      </h2>
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
            <span>{currency}</span>
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
                <span>{currency}</span>
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
                <span>{currency}</span>
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
        <Button onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {state.unableToDeposit ? (
          <ButtonPrimary disabled>
            <i18n.Translate>Deposit</i18n.Translate>
          </ButtonPrimary>
        ) : (
          <ButtonPrimary
            onClick={() => onSend(state.selectedAccount, state.parsedAmount!)}
          >
            <i18n.Translate>
              Deposit {Amounts.stringifyValue(state.totalToDeposit)} {currency}
            </i18n.Translate>
          </ButtonPrimary>
        )}
      </footer>
    </Fragment>
  );
}

function createLabelsForBankAccount(knownBankAccounts: Array<PaytoUri>): {
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
