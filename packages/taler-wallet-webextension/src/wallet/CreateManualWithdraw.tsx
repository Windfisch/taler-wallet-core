import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage";
import { ButtonPrimary, Input, InputWithLabel, LightText, WalletBox } from "../components/styled";

export interface Props {
  error: string | undefined;
  currency: string | undefined;
  initialExchange?: string;
  initialAmount?: string;
  onExchangeChange: (exchange: string) => void;
  onCreate: (exchangeBaseUrl: string, amount: AmountJson) => Promise<void>;
}

export function CreateManualWithdraw({ onExchangeChange, initialExchange, initialAmount, error, currency, onCreate }: Props): VNode {
  const [exchange, setExchange] = useState(initialExchange || "");
  const [amount, setAmount] = useState(initialAmount || "");
  const parsedAmount = Amounts.parse(`${currency}:${amount}`)

  let timeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (timeout) window.clearTimeout(timeout.current)
    timeout.current = window.setTimeout(async () => {
      onExchangeChange(exchange)
    }, 1000);
  }, [exchange])


  return (
    <WalletBox>
      <section>
        <ErrorMessage title={error && "Can't create the reserve"} description={error} />
        <h2>Manual Withdrawal</h2>
        <LightText>Choose a exchange to create a reserve and then fill the reserve to withdraw the coins</LightText>
        <p>
          <Input invalid={!!exchange && !currency}>
            <label>Exchange</label>
            <input type="text" placeholder="https://" value={exchange} onChange={(e) => setExchange(e.currentTarget.value)} />
            <small>http://exchange.taler:8081</small>
          </Input>
          {currency && <InputWithLabel invalid={!!amount && !parsedAmount}>
            <label>Amount</label>
            <div>
              <div>{currency}</div>
              <input type="number" style={{ paddingLeft: `${currency.length}em` }} value={amount} onChange={e => setAmount(e.currentTarget.value)} />
            </div>
          </InputWithLabel>}
        </p>
      </section>
      <footer>
        <div />
        <ButtonPrimary disabled={!parsedAmount || !exchange} onClick={() => onCreate(exchange, parsedAmount!)}>Create</ButtonPrimary>
      </footer>
    </WalletBox>
  );
}
