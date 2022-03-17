/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage";
import { SelectList } from "../components/SelectList";
import {
  BoldLight,
  ButtonPrimary,
  Centered,
  Input,
  InputWithLabel,
  LightText,
  LinkPrimary,
} from "../components/styled";
import { useTranslationContext } from "../context/translation";
import { Pages } from "../NavigationBar";

export interface Props {
  error: string | undefined;
  initialAmount?: string;
  exchangeList: Record<string, string>;
  onCreate: (exchangeBaseUrl: string, amount: AmountJson) => Promise<void>;
  initialCurrency?: string;
}

export function useComponentState(
  exchangeList: Record<string, string>,
  initialAmount: string | undefined,
  initialCurrency: string | undefined,
) {
  const exchangeSelectList = Object.keys(exchangeList);
  const currencySelectList = Object.values(exchangeList);
  const exchangeMap = exchangeSelectList.reduce(
    (p, c) => ({ ...p, [c]: `${c} (${exchangeList[c]})` }),
    {} as Record<string, string>,
  );
  const currencyMap = currencySelectList.reduce(
    (p, c) => ({ ...p, [c]: c }),
    {} as Record<string, string>,
  );

  const foundExchangeForCurrency = exchangeSelectList.findIndex(
    (e) => exchangeList[e] === initialCurrency,
  );

  const initialExchange =
    foundExchangeForCurrency !== -1
      ? exchangeSelectList[foundExchangeForCurrency]
      : exchangeSelectList.length > 0
      ? exchangeSelectList[0]
      : undefined;

  const [exchange, setExchange] = useState(initialExchange || "");
  const [currency, setCurrency] = useState(
    initialExchange ? exchangeList[initialExchange] : "",
  );

  const [amount, setAmount] = useState(initialAmount || "");
  const parsedAmount = Amounts.parse(`${currency}:${amount}`);

  function changeExchange(exchange: string): void {
    setExchange(exchange);
    setCurrency(exchangeList[exchange]);
  }

  function changeCurrency(currency: string): void {
    setCurrency(currency);
    const found = Object.entries(exchangeList).find((e) => e[1] === currency);

    if (found) {
      setExchange(found[0]);
    } else {
      setExchange("");
    }
  }
  return {
    initialExchange,
    currency: {
      list: currencyMap,
      value: currency,
      onChange: changeCurrency,
    },
    exchange: {
      list: exchangeMap,
      value: exchange,
      onChange: changeExchange,
    },
    amount: {
      value: amount,
      onInput: (e: string) => setAmount(e),
    },
    parsedAmount,
  };
}

interface InputHandler {
  value: string;
  onInput: (s: string) => void;
}

interface SelectInputHandler {
  list: Record<string, string>;
  value: string;
  onChange: (s: string) => void;
}

export function CreateManualWithdraw({
  initialAmount,
  exchangeList,
  error,
  initialCurrency,
  onCreate,
}: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useComponentState(exchangeList, initialAmount, initialCurrency);

  if (!state.initialExchange) {
    return (
      <section>
        <h2>
          <i18n.Translate>Manual Withdrawal</i18n.Translate>
        </h2>
        <LightText>
          <i18n.Translate>
            Choose a exchange from where the coins will be withdrawn. The
            exchange will send the coins to this wallet after receiving a wire
            transfer with the correct subject.
          </i18n.Translate>
        </LightText>
        <Centered style={{ marginTop: 100 }}>
          <BoldLight>
            <i18n.Translate>No exchange configured</i18n.Translate>
          </BoldLight>
          <LinkPrimary
            href={Pages.settings_exchange_add}
            style={{ marginLeft: "auto" }}
          >
            <i18n.Translate>Add Exchange</i18n.Translate>
          </LinkPrimary>
        </Centered>
      </section>
    );
  }

  return (
    <Fragment>
      <section>
        {error && (
          <ErrorMessage
            title={<i18n.Translate>Can't create the reserve</i18n.Translate>}
            description={error}
          />
        )}
        <h2>
          <i18n.Translate>Manual Withdrawal</i18n.Translate>
        </h2>
        <LightText>
          <i18n.Translate>
            Choose a exchange from where the coins will be withdrawn. The
            exchange will send the coins to this wallet after receiving a wire
            transfer with the correct subject.
          </i18n.Translate>
        </LightText>
        <p>
          <Input>
            <SelectList
              label={<i18n.Translate>Currency</i18n.Translate>}
              name="currency"
              {...state.currency}
            />
          </Input>
          <Input>
            <SelectList
              label={<i18n.Translate>Exchange</i18n.Translate>}
              name="exchange"
              {...state.exchange}
            />
          </Input>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <LinkPrimary
              href={Pages.settings_exchange_add}
              style={{ marginLeft: "auto" }}
            >
              <i18n.Translate>Add Exchange</i18n.Translate>
            </LinkPrimary>
          </div>
          {state.currency.value && (
            <InputWithLabel
              invalid={!!state.amount.value && !state.parsedAmount}
            >
              <label>
                <i18n.Translate>Amount</i18n.Translate>
              </label>
              <div>
                <span>{state.currency.value}</span>
                <input
                  type="number"
                  value={state.amount.value}
                  onInput={(e) => state.amount.onInput(e.currentTarget.value)}
                />
              </div>
            </InputWithLabel>
          )}
        </p>
      </section>
      <footer>
        <div />
        <ButtonPrimary
          disabled={!state.parsedAmount || !state.exchange.value}
          onClick={() => onCreate(state.exchange.value, state.parsedAmount!)}
        >
          <i18n.Translate>Start withdrawal</i18n.Translate>
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
