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
import { VNode, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage";
import {
  ButtonPrimary,
  Input,
  InputWithLabel,
  LightText,
  WalletBox,
} from "../components/styled";

export interface Props {
  error: string | undefined;
  currency: string | undefined;
  initialExchange?: string;
  initialAmount?: string;
  onExchangeChange: (exchange: string) => void;
  onCreate: (exchangeBaseUrl: string, amount: AmountJson) => Promise<void>;
}

export function CreateManualWithdraw({
  onExchangeChange,
  initialExchange,
  initialAmount,
  error,
  currency,
  onCreate,
}: Props): VNode {
  const [exchange, setExchange] = useState(initialExchange || "");
  const [amount, setAmount] = useState(initialAmount || "");
  const parsedAmount = Amounts.parse(`${currency}:${amount}`);

  let timeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timeout) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(async () => {
      onExchangeChange(exchange);
    }, 1000);
  }, [exchange]);

  return (
    <WalletBox>
      <section>
        <ErrorMessage
          title={error && "Can't create the reserve"}
          description={error}
        />
        <h2>Manual Withdrawal</h2>
        <LightText>
          Choose a exchange to create a reserve and then fill the reserve to
          withdraw the coins
        </LightText>
        <p>
          <Input invalid={!!exchange && !currency}>
            <label>Exchange</label>
            <input
              type="text"
              placeholder="https://"
              value={exchange}
              onChange={(e) => setExchange(e.currentTarget.value)}
            />
            <small>http://exchange.taler:8081</small>
          </Input>
          {currency && (
            <InputWithLabel invalid={!!amount && !parsedAmount}>
              <label>Amount</label>
              <div>
                <div>{currency}</div>
                <input
                  type="number"
                  style={{ paddingLeft: `${currency.length}em` }}
                  value={amount}
                  onChange={(e) => setAmount(e.currentTarget.value)}
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
          Create
        </ButtonPrimary>
      </footer>
    </WalletBox>
  );
}
