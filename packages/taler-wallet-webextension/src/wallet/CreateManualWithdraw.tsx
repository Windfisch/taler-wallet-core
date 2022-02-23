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

import { AmountJson, Amounts, i18n, Translate } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage";
import { SelectList } from "../components/SelectList";
import {
  BoldLight,
  ButtonPrimary,
  ButtonSuccess,
  Centered,
  Input,
  InputWithLabel,
  LightText,
  LinkPrimary,
} from "../components/styled";

export interface Props {
  error: string | undefined;
  initialAmount?: string;
  exchangeList: Record<string, string>;
  onCreate: (exchangeBaseUrl: string, amount: AmountJson) => Promise<void>;
  onAddExchange: () => void;
  initialCurrency?: string;
}

export function CreateManualWithdraw({
  initialAmount,
  exchangeList,
  error,
  initialCurrency,
  onCreate,
  onAddExchange,
}: Props): VNode {
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
      : "";

  const [exchange, setExchange] = useState(initialExchange || "");
  const [currency, setCurrency] = useState(exchangeList[initialExchange] ?? "");

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

  if (!initialExchange) {
    return (
      <section>
        <h2>
          <Translate>Manual Withdrawal</Translate>
        </h2>
        <LightText>
          <Translate>
            Choose a exchange from where the coins will be withdrawn. The
            exchange will send the coins to this wallet after receiving a wire
            transfer with the correct subject.
          </Translate>
        </LightText>
        <Centered style={{ marginTop: 100 }}>
          <BoldLight>
            <Translate>No exchange configured</Translate>
          </BoldLight>
          <ButtonSuccess onClick={onAddExchange}>
            <Translate>Add exchange</Translate>
          </ButtonSuccess>
        </Centered>
      </section>
    );
  }

  return (
    <Fragment>
      <section>
        {error && (
          <ErrorMessage
            title={<Translate>Can't create the reserve</Translate>}
            description={error}
          />
        )}
        <h2>
          <Translate>Manual Withdrawal</Translate>
        </h2>
        <LightText>
          <Translate>
            Choose a exchange from where the coins will be withdrawn. The
            exchange will send the coins to this wallet after receiving a wire
            transfer with the correct subject.
          </Translate>
        </LightText>
        <p>
          <Input>
            <SelectList
              label={<Translate>Currency</Translate>}
              list={currencyMap}
              name="currency"
              value={currency}
              onChange={changeCurrency}
            />
          </Input>
          <Input>
            <SelectList
              label={<Translate>Exchange</Translate>}
              list={exchangeMap}
              name="currency"
              value={exchange}
              onChange={changeExchange}
            />
          </Input>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <LinkPrimary onClick={onAddExchange} style={{ marginLeft: "auto" }}>
              <Translate>Add Exchange</Translate>
            </LinkPrimary>
          </div>
          {currency && (
            <InputWithLabel invalid={!!amount && !parsedAmount}>
              <label>
                <Translate>Amount</Translate>
              </label>
              <div>
                <span>{currency}</span>
                <input
                  type="number"
                  value={amount}
                  onInput={(e) => setAmount(e.currentTarget.value)}
                />
              </div>
            </InputWithLabel>
          )}
        </p>
      </section>
      <footer>
        <div />
        <ButtonPrimary
          disabled={!parsedAmount || !exchange}
          onClick={() => onCreate(exchange, parsedAmount!)}
        >
          <Translate>Start withdrawal</Translate>
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
