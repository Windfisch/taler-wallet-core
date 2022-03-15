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
import { LoadingError } from "../components/LoadingError";
import {
  ButtonBoxPrimary,
  ButtonBoxWarning,
  ButtonPrimary,
  CenteredBoldText,
  CenteredText,
  DateSeparator,
  NiceSelect,
  WarningBox,
} from "../components/styled";
import { Time } from "../components/Time";
import { TransactionItem } from "../components/TransactionItem";
import { useTranslationContext } from "../context/translation";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { NoBalanceHelp } from "../popup/NoBalanceHelp";
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
  const { i18n } = useTranslationContext();
  const state = useAsyncAsHook(
    async () => ({
      b: await wxApi.getBalance(),
      tx: await wxApi.getTransactions(),
    }),
    [NotificationType.WithdrawGroupFinished],
  );

  if (!state) {
    return <Loading />;
  }

  if (state.hasError) {
    return (
      <LoadingError
        title={
          <i18n.Translate>
            Could not load the list of transactions
          </i18n.Translate>
        }
        error={state}
      />
    );
  }

  return (
    <HistoryView
      balances={state.response.b.balances}
      defaultCurrency={currency}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
      goToWalletDeposit={goToWalletDeposit}
      transactions={[...state.response.tx.transactions].reverse()}
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
  const { i18n } = useTranslationContext();
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

  if (balances.length === 0 || !selectedCurrency) {
    return (
      <NoBalanceHelp goToWalletManualWithdraw={goToWalletManualWithdraw} />
    );
  }
  return (
    <Fragment>
      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: "fit-content",
              display: "flex",
            }}
          >
            {currencies.length === 1 ? (
              <CenteredText style={{ fontSize: "x-large", margin: 8 }}>
                {selectedCurrency}
              </CenteredText>
            ) : (
              <NiceSelect>
                <select
                  style={{
                    fontSize: "x-large",
                  }}
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
              <CenteredBoldText
                style={{
                  display: "inline-block",
                  fontSize: "x-large",
                  margin: 8,
                }}
              >
                {Amounts.stringifyValue(currencyAmount)}
              </CenteredBoldText>
            )}
          </div>
          <div>
            <ButtonPrimary
              style={{ marginLeft: 0, marginTop: 8 }}
              onClick={() => goToWalletManualWithdraw(selectedCurrency)}
            >
              <i18n.Translate>Withdraw</i18n.Translate>
            </ButtonPrimary>
            {currencyAmount && Amounts.isNonZero(currencyAmount) && (
              <ButtonBoxPrimary
                style={{ marginLeft: 0, marginTop: 8 }}
                onClick={() => goToWalletDeposit(selectedCurrency)}
              >
                <i18n.Translate>Deposit</i18n.Translate>
              </ButtonBoxPrimary>
            )}
          </div>
        </div>
      </section>
      {datesWithTransaction.length === 0 ? (
        <section>
          <i18n.Translate>There is no history for this currency</i18n.Translate>
        </section>
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
                  <TransactionItem key={i} tx={tx} />
                ))}
              </Fragment>
            );
          })}
        </section>
      )}
    </Fragment>
  );
}
