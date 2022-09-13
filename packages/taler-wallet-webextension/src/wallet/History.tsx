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
  Amounts,
  Balance,
  NotificationType,
  Transaction,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import {
  ButtonBoxPrimary,
  CenteredBoldText,
  CenteredText,
  DateSeparator,
  NiceSelect,
} from "../components/styled/index.js";
import { Time } from "../components/Time.js";
import { TransactionItem } from "../components/TransactionItem.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Button } from "../mui/Button.js";
import { NoBalanceHelp } from "../popup/NoBalanceHelp.js";
import * as wxApi from "../wxApi.js";

interface Props {
  currency?: string;
  goToWalletDeposit: (currency: string) => Promise<void>;
  goToWalletManualWithdraw: (currency?: string) => Promise<void>;
}
export function HistoryPage({
  currency,
  goToWalletManualWithdraw,
  goToWalletDeposit,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const state = useAsyncAsHook(async () => ({
    b: await wxApi.getBalance(),
    tx: await wxApi.getTransactions(),
  }));

  useEffect(() => {
    return wxApi.onUpdateNotification(
      [NotificationType.WithdrawGroupFinished],
      () => {
        state?.retry();
      },
    );
  });

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
import DownloadIcon from "../svg/download_24px.svg";
import UploadIcon from "../svg/upload_24px.svg";

export function HistoryView({
  defaultCurrency,
  transactions,
  balances,
  goToWalletManualWithdraw,
  goToWalletDeposit,
}: {
  goToWalletDeposit: (currency: string) => Promise<void>;
  goToWalletManualWithdraw: (currency?: string) => Promise<void>;
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
        x.timestamp.t_s === "never"
          ? 0
          : normalizeToDay(x.timestamp.t_s * 1000);
      if (theDate) {
        (rv[theDate] = rv[theDate] || []).push(x);
      }

      return rv;
    }, {} as { [x: string]: Transaction[] });
  const datesWithTransaction = Object.keys(byDate);

  if (balances.length === 0 || !selectedCurrency) {
    return (
      <NoBalanceHelp
        goToWalletManualWithdraw={{
          onClick: goToWalletManualWithdraw,
        }}
      />
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
                {Amounts.stringifyValue(currencyAmount, 2)}
              </CenteredBoldText>
            )}
          </div>
          <div>
            <Button
              tooltip="Transfer money to the wallet"
              startIcon={DownloadIcon}
              variant="contained"
              onClick={() => goToWalletManualWithdraw(selectedCurrency)}
            >
              <i18n.Translate>Add</i18n.Translate>
            </Button>
            {currencyAmount && Amounts.isNonZero(currencyAmount) && (
              <Button
                tooltip="Transfer money from the wallet"
                startIcon={UploadIcon}
                variant="outlined"
                color="primary"
                onClick={() => goToWalletDeposit(selectedCurrency)}
              >
                <i18n.Translate>Send</i18n.Translate>
              </Button>
            )}
          </div>
        </div>
      </section>
      {datesWithTransaction.length === 0 ? (
        <section>
          <i18n.Translate>
            Your transaction history is empty for this currency.
          </i18n.Translate>
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
