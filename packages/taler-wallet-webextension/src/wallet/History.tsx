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
  Amounts,
  Balance,
  NotificationType,
  Transaction,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading";
import {
  ButtonBoxPrimary,
  ButtonBoxWarning,
  ButtonPrimary,
  DateSeparator,
  ErrorBox,
  NiceSelect,
  WarningBox,
} from "../components/styled";
import { Time } from "../components/Time";
import { TransactionItem } from "../components/TransactionItem";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

interface Props {
  currency?: string;
  goToWalletDeposit: (currency: string) => void;
  goToWalletManualWithdraw: (currency?: string) => void;
}
export function HistoryPage({
  currency,
  goToWalletManualWithdraw,
  goToWalletDeposit,
}: Props): VNode {
  const balance = useAsyncAsHook(wxApi.getBalance);
  const balanceWithoutError = balance?.hasError
    ? []
    : balance?.response.balances || [];

  const transactionQuery = useAsyncAsHook(wxApi.getTransactions, [
    NotificationType.WithdrawGroupFinished,
  ]);

  if (!transactionQuery || !balance) {
    return <Loading />;
  }

  if (transactionQuery.hasError) {
    return (
      <Fragment>
        <ErrorBox>{transactionQuery.message}</ErrorBox>
        <p>There was an error loading the transactions.</p>
      </Fragment>
    );
  }

  return (
    <HistoryView
      balances={balanceWithoutError}
      defaultCurrency={currency}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
      goToWalletDeposit={goToWalletDeposit}
      transactions={[...transactionQuery.response.transactions].reverse()}
    />
  );
}

const term = 1000 * 60 * 60 * 24;
function normalizeToDay(x: number): number {
  return Math.round(x / term) * term;
}

export function HistoryView({
  defaultCurrency,
  transactions,
  balances,
  goToWalletManualWithdraw,
  goToWalletDeposit,
}: {
  goToWalletDeposit: (currency: string) => void;
  goToWalletManualWithdraw: (currency?: string) => void;
  defaultCurrency?: string;
  transactions: Transaction[];
  balances: Balance[];
}): VNode {
  const currencies = balances.map((b) => b.available.split(":")[0]);

  const defaultCurrencyIndex = currencies.findIndex(
    (c) => c === defaultCurrency,
  );
  const [currencyIndex, setCurrencyIndex] = useState(
    defaultCurrencyIndex === -1 ? 0 : defaultCurrencyIndex,
  );
  const selectedCurrency =
    currencies.length > 0 ? currencies[currencyIndex] : undefined;

  const currencyAmount = balances[currencyIndex]
    ? Amounts.jsonifyAmount(balances[currencyIndex].available)
    : undefined;

  const byDate = transactions
    .filter((t) => t.amountRaw.split(":")[0] === selectedCurrency)
    .reduce((rv, x) => {
      const theDate =
        x.timestamp.t_ms === "never" ? 0 : normalizeToDay(x.timestamp.t_ms);
      if (theDate) {
        (rv[theDate] = rv[theDate] || []).push(x);
      }

      return rv;
    }, {} as { [x: string]: Transaction[] });
  const datesWithTransaction = Object.keys(byDate);

  const multiCurrency = balances.length > 1;

  if (balances.length === 0 || !selectedCurrency) {
    return (
      <WarningBox>
        <p>
          You have <b>no balance</b>. Withdraw some founds into your wallet
        </p>
        <ButtonBoxWarning onClick={() => goToWalletManualWithdraw()}>
          Withdraw
        </ButtonBoxWarning>
      </WarningBox>
    );
  }
  return (
    <Fragment>
      <section>
        <p
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {currencies.length === 1 ? (
            <div style={{ fontSize: "large" }}>{selectedCurrency}</div>
          ) : (
            <NiceSelect>
              <select
                value={currencyIndex}
                onChange={(e) => {
                  setCurrencyIndex(Number(e.currentTarget.value));
                }}
              >
                {currencies.map((currency, index) => {
                  return (
                    <option value={index} key={currency}>
                      {currency}
                    </option>
                  );
                })}
              </select>
            </NiceSelect>
          )}
          {currencyAmount && (
            <h2 style={{ margin: 0 }}>
              {Amounts.stringifyValue(currencyAmount)}
            </h2>
          )}
        </p>
        <div style={{ marginLeft: "auto", width: "fit-content" }}>
          <ButtonPrimary
            onClick={() => goToWalletManualWithdraw(selectedCurrency)}
          >
            Withdraw
          </ButtonPrimary>
          {currencyAmount && Amounts.isNonZero(currencyAmount) && (
            <ButtonBoxPrimary
              onClick={() => goToWalletDeposit(selectedCurrency)}
            >
              Deposit
            </ButtonBoxPrimary>
          )}
        </div>
      </section>
      {datesWithTransaction.length === 0 ? (
        <section>There is no history for this currency</section>
      ) : (
        <section>
          {datesWithTransaction.map((d, i) => {
            return (
              <Fragment key={i}>
                <DateSeparator>
                  <Time
                    timestamp={{ t_ms: Number.parseInt(d, 10) }}
                    format="dd MMMM yyyy"
                  />
                </DateSeparator>
                {byDate[d].map((tx, i) => (
                  <TransactionItem
                    key={i}
                    tx={tx}
                    multiCurrency={multiCurrency}
                  />
                ))}
              </Fragment>
            );
          })}
        </section>
      )}
    </Fragment>
  );
}
