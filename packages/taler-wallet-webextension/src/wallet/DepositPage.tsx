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
  PaytoUri,
  i18n,
} from "@gnu-taler/taler-util";
import { DepositFee } from "@gnu-taler/taler-wallet-core/src/operations/deposits";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Loading } from "../components/Loading";
import { SelectList } from "../components/SelectList";
import {
  ButtonBoxWarning,
  ButtonPrimary,
  ErrorText,
  Input,
  InputWithLabel,
  WarningBox,
} from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

interface Props {
  currency: string;
  onSuccess: (currency: string) => void;
}
export function DepositPage({ currency, onSuccess }: Props): VNode {
  const state = useAsyncAsHook(async () => {
    const balance = await wxApi.getBalance();
    const bs = balance.balances.filter((b) => b.available.startsWith(currency));
    const currencyBalance =
      bs.length === 0
        ? Amounts.getZero(currency)
        : Amounts.parseOrThrow(bs[0].available);
    const knownAccounts = await wxApi.listKnownBankAccounts(currency);
    return { accounts: knownAccounts.accounts, currencyBalance };
  });

  const accounts =
    state === undefined ? [] : state.hasError ? [] : state.response.accounts;

  const currencyBalance =
    state === undefined
      ? Amounts.getZero(currency)
      : state.hasError
      ? Amounts.getZero(currency)
      : state.response.currencyBalance;

  async function doSend(account: string, amount: AmountString): Promise<void> {
    await wxApi.createDepositGroup(account, amount);
    onSuccess(currency);
  }

  async function getFeeForAmount(
    account: string,
    amount: AmountString,
  ): Promise<DepositFee> {
    return await wxApi.getFeeForDeposit(account, amount);
  }

  if (accounts.length === 0) return <Loading />;

  return (
    <View
      knownBankAccounts={accounts}
      balance={currencyBalance}
      onSend={doSend}
      onCalculateFee={getFeeForAmount}
    />
  );
}

interface ViewProps {
  knownBankAccounts: Array<PaytoUri>;
  balance: AmountJson;
  onSend: (account: string, amount: AmountString) => Promise<void>;
  onCalculateFee: (
    account: string,
    amount: AmountString,
  ) => Promise<DepositFee>;
}

export function View({
  knownBankAccounts,
  balance,
  onSend,
  onCalculateFee,
}: ViewProps): VNode {
  const accountMap = createLabelsForBankAccount(knownBankAccounts);
  const [accountIdx, setAccountIdx] = useState(0);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [fee, setFee] = useState<DepositFee | undefined>(undefined);
  function updateAmount(num: number | undefined) {
    setAmount(num);
    setFee(undefined);
  }
  const currency = balance.currency;
  const amountStr: AmountString = `${currency}:${amount}`;
  const feeSum =
    fee !== undefined
      ? Amounts.sum([fee.wire, fee.coin, fee.refresh]).amount
      : Amounts.getZero(currency);

  const account = knownBankAccounts.length
    ? knownBankAccounts[accountIdx]
    : undefined;
  const accountURI = !account
    ? ""
    : `payto://${account.targetType}/${account.targetPath}`;

  useEffect(() => {
    if (amount === undefined) return;
    onCalculateFee(accountURI, amountStr).then((result) => {
      setFee(result);
    });
  }, [amount]);

  if (!balance) {
    return (
      <div>
        <i18n.Translate>no balance</i18n.Translate>
      </div>
    );
  }
  if (!knownBankAccounts || !knownBankAccounts.length) {
    return (
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
    );
  }
  const parsedAmount =
    amount === undefined ? undefined : Amounts.parse(amountStr);
  const isDirty = amount !== 0;
  const error = !isDirty
    ? undefined
    : !parsedAmount
    ? "Invalid amount"
    : Amounts.cmp(balance, parsedAmount) === -1
    ? `Too much, your current balance is ${Amounts.stringifyValue(balance)}`
    : undefined;

  const totalToDeposit = parsedAmount
    ? Amounts.sub(parsedAmount, feeSum).amount
    : Amounts.getZero(currency);

  const unableToDeposit =
    Amounts.isZero(totalToDeposit) || fee === undefined || error !== undefined;

  return (
    <Fragment>
      <h2>
        <i18n.Translate>Send {currency} to your account</i18n.Translate>
      </h2>
      <section>
        <Input>
          <SelectList
            label={<i18n.Translate>Bank account IBAN number</i18n.Translate>}
            list={accountMap}
            name="account"
            value={String(accountIdx)}
            onChange={(s) => setAccountIdx(parseInt(s, 10))}
          />
        </Input>
        <InputWithLabel invalid={!!error}>
          <label>
            <i18n.Translate>Amount</i18n.Translate>
          </label>
          <div>
            <span>{currency}</span>
            <input
              type="number"
              value={amount}
              onInput={(e) => {
                const num = parseFloat(e.currentTarget.value);
                if (!Number.isNaN(num)) {
                  updateAmount(num);
                } else {
                  updateAmount(undefined);
                  setFee(undefined);
                }
              }}
            />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
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
                  value={Amounts.stringifyValue(feeSum)}
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
                  value={Amounts.stringifyValue(totalToDeposit)}
                />
              </div>
            </InputWithLabel>
          </Fragment>
        }
      </section>
      <footer>
        <div />
        {unableToDeposit ? (
          <ButtonPrimary disabled>
            <i18n.Translate>Deposit</i18n.Translate>
          </ButtonPrimary>
        ) : (
          <ButtonPrimary onClick={() => onSend(accountURI, amountStr)}>
            <i18n.Translate>
              Deposit {Amounts.stringifyValue(totalToDeposit)} {currency}
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
