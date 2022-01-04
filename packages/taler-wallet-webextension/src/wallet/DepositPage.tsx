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
} from "@gnu-taler/taler-util";
import { DepositFee } from "@gnu-taler/taler-wallet-core/src/operations/deposits";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Part } from "../components/Part";
import { SelectList } from "../components/SelectList";
import {
  ButtonPrimary,
  ErrorText,
  Input,
  InputWithLabel,
} from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

interface Props {
  currency: string;
}
export function DepositPage({ currency }: Props): VNode {
  const [success, setSuccess] = useState(false);

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
    setSuccess(true);
  }

  async function getFeeForAmount(
    account: string,
    amount: AmountString,
  ): Promise<DepositFee> {
    return await wxApi.getFeeForDeposit(account, amount);
  }

  if (accounts.length === 0) return <div>loading..</div>;
  if (success) return <div>deposit created</div>;
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
  const currency = balance.currency;
  const amountStr: AmountString = `${currency}:${amount}`;

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
    return <div>no balance</div>;
  }
  if (!knownBankAccounts || !knownBankAccounts.length) {
    return <div>there is no known bank account to send money to</div>;
  }
  const parsedAmount =
    amount === undefined ? undefined : Amounts.parse(amountStr);
  const isDirty = amount !== 0;
  const error = !isDirty
    ? undefined
    : !parsedAmount
    ? "Invalid amount"
    : Amounts.cmp(balance, parsedAmount) === -1
    ? `To much, your current balance is ${balance.value}`
    : undefined;

  return (
    <Fragment>
      <h2>Send {currency} to your account</h2>
      <section>
        <Input>
          <SelectList
            label="Bank account IBAN number"
            list={accountMap}
            name="account"
            value={String(accountIdx)}
            onChange={(s) => setAccountIdx(parseInt(s, 10))}
          />
        </Input>
        <InputWithLabel invalid={!!error}>
          <label>Amount to send</label>
          <div>
            <span>{currency}</span>
            <input
              type="number"
              value={amount}
              onInput={(e) => {
                const num = parseFloat(e.currentTarget.value);
                console.log(num);
                if (!Number.isNaN(num)) {
                  setAmount(num);
                } else {
                  setAmount(undefined);
                  setFee(undefined);
                }
              }}
            />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </InputWithLabel>
        {!error && fee && (
          <div style={{ textAlign: "center" }}>
            <Part
              title="Exchange fee"
              text={Amounts.stringify(Amounts.sum([fee.wire, fee.coin]).amount)}
              kind="negative"
            />
            <Part
              title="Change cost"
              text={Amounts.stringify(fee.refresh)}
              kind="negative"
            />
            {parsedAmount && (
              <Part
                title="Total received"
                text={Amounts.stringify(
                  Amounts.sub(
                    parsedAmount,
                    Amounts.sum([fee.wire, fee.coin]).amount,
                  ).amount,
                )}
                kind="positive"
              />
            )}
          </div>
        )}
      </section>
      <footer>
        <div />
        <ButtonPrimary
          disabled={!parsedAmount}
          onClick={() => onSend(accountURI, amountStr)}
        >
          Send
        </ButtonPrimary>
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
