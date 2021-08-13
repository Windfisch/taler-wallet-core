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

import { AmountJson, Amounts, AmountString, Balance, Timestamp, Transaction, TransactionsResponse, TransactionType } from "@gnu-taler/taler-util";
import { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";
import { Pages } from "./popup";


export function HistoryPage(props: any): JSX.Element {
  const [transactions, setTransactions] = useState<
    TransactionsResponse | undefined
  >(undefined);
  const balance = useBalances()
  const balanceWithoutError = balance?.error ? [] : (balance?.response.balances || [])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const res = await wxApi.getTransactions();
      setTransactions(res);
    };
    fetchData();
  }, []);

  if (!transactions) {
    return <div>Loading ...</div>;
  }

  return <HistoryView balances={balanceWithoutError} list={[...transactions.transactions].reverse()} />;
}

function amountToString(c: AmountString) {
  const idx = c.indexOf(':')
  return `${c.substring(idx+1)} ${c.substring(0,idx)}`
}



export function HistoryView({ list, balances }: { list: Transaction[], balances: Balance[] }) {
  return <PopupBox noPadding>
    {balances.length > 0 && <header>
      {balances.length === 1 && <div class="title">
        Balance: <span>{amountToString(balances[0].available)}</span>
      </div>}
      {balances.length > 1 && <div class="title">
        Balance: <ul style={{ margin: 0 }}>
          {balances.map(b => <li>{b.available}</li>)}
        </ul>
      </div>}
    </header>}
    <section>
      {list.slice(0, 3).map((tx, i) => (
        <TransactionItem key={i} tx={tx} />
      ))}
    </section>
    <footer style={{ justifyContent: 'space-around' }}>
      <a style={{ color: 'darkgreen', textDecoration:'none' }} href={Pages.transaction.replace(':tid', 'asd')}>VIEW MORE TRANSACTIONS</a>
    </footer>
  </PopupBox>
}

import imageBank from '../../static/img/ri-bank-line.svg';
import imageShoppingCart from '../../static/img/ri-shopping-cart-line.svg';
import imageRefund from '../../static/img/ri-refund-2-line.svg';
import imageHandHeart from '../../static/img/ri-hand-heart-line.svg';
import imageRefresh from '../../static/img/ri-refresh-line.svg';
import { Column, ExtraLargeText, HistoryRow, PopupBox, Row, RowBorderGray, SmallTextLight } from "../components/styled";
import { useBalances } from "../hooks/useBalances";
import { formatDistance } from "date-fns";

function TransactionItem(props: { tx: Transaction }): JSX.Element {
  const tx = props.tx;
  switch (tx.type) {
    case TransactionType.Withdrawal:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Withdrawal"
          subtitle={`via ${tx.exchangeBaseUrl}`}
          timestamp={tx.timestamp}
          iconPath={imageBank}
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Payment:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title="Payment"
          subtitle={tx.info.summary}
          timestamp={tx.timestamp}
          iconPath={imageShoppingCart}
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Refund:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Refund"
          subtitle={tx.info.summary}
          timestamp={tx.timestamp}
          iconPath={imageRefund}
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Tip:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Tip"
          subtitle={`from ${new URL(tx.merchantBaseUrl).hostname}`}
          timestamp={tx.timestamp}
          iconPath={imageHandHeart}
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Refresh:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Refresh"
          subtitle={`via exchange ${tx.exchangeBaseUrl}`}
          timestamp={tx.timestamp}
          iconPath={imageRefresh}
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Deposit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title="Refresh"
          subtitle={`to ${tx.targetPaytoUri}`}
          timestamp={tx.timestamp}
          iconPath={imageRefresh}
          pending={tx.pending}
        ></TransactionLayout>
      );
  }
}

function TransactionLayout(props: TransactionLayoutProps): JSX.Element {
  const date = new Date(props.timestamp.t_ms);
  const now = new Date();
  const dateStr = formatDistance(date, now, { addSuffix: true })
  return (
    <HistoryRow>
      <img src={props.iconPath} />
      <Column>
        <ExtraLargeText>
          <a href={Pages.transaction.replace(':tid', props.id)}><span>{props.title}</span></a>
          {props.pending ? (
            <span style={{ color: "darkblue" }}> (Pending)</span>
          ) : null}
        </ExtraLargeText>
        <SmallTextLight>{dateStr}</SmallTextLight>

        {/* <div>{props.subtitle}</div> */}
      </Column>
      <TransactionAmount
        pending={props.pending}
        amount={props.amount}
        debitCreditIndicator={props.debitCreditIndicator}
      />
    </HistoryRow>
  );
}

interface TransactionLayoutProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountString | "unknown";
  timestamp: Timestamp;
  title: string;
  id: string;
  subtitle: string;
  iconPath: string;
  pending: boolean;
}

interface TransactionAmountProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountString | "unknown";
  pending: boolean;
}

function TransactionAmount(props: TransactionAmountProps): JSX.Element {
  const [currency, amount] = props.amount.split(":");
  let sign: string;
  switch (props.debitCreditIndicator) {
    case "credit":
      sign = "+";
      break;
    case "debit":
      sign = "-";
      break;
    case "unknown":
      sign = "";
  }
  return (
    <Column style={{
      color:
        props.pending ? "gray" :
          (sign === '+' ? 'darkgreen' :
            (sign === '-' ? 'darkred' :
              undefined))
    }}>
      <ExtraLargeText>
        {sign}
        {amount}
      </ExtraLargeText>
      <div>{currency}</div>
    </Column>
  );
}

