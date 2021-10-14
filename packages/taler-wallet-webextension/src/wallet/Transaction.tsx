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

import { AmountJson, AmountLike, Amounts, i18n, Transaction, TransactionType } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { Fragment, JSX, VNode, h } from "preact";
import { route } from 'preact-router';
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";
import { Pages } from "../NavigationBar";
import emptyImg from "../../static/img/empty.png"
import { Button, ButtonBox, ButtonBoxDestructive, ButtonDestructive, ButtonPrimary, ExtraLargeText, FontIcon, LargeText, ListOfProducts, PopupBox, Row, RowBorderGray, SmallLightText, WalletBox, WarningBox } from "../components/styled";
import { ErrorMessage } from "../components/ErrorMessage";
import { Part } from "../components/Part";

export function TransactionPage({ tid }: { tid: string; }): JSX.Element {
  const [transaction, setTransaction] = useState<
    Transaction | undefined
  >(undefined);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const res = await wxApi.getTransactions();
      const ts = res.transactions.filter(t => t.transactionId === tid);
      if (ts.length === 1) {
        setTransaction(ts[0]);
      } else {
        route(Pages.history);
      }
    };
    fetchData();
  }, []);

  if (!transaction) {
    return <div><i18n.Translate>Loading ...</i18n.Translate></div>;
  }
  return <TransactionView
    transaction={transaction}
    onDelete={() => wxApi.deleteTransaction(tid).then(_ => history.go(-1))}
    onRetry={() => wxApi.retryTransaction(tid).then(_ => history.go(-1))}
    onBack={() => { route(Pages.history) }} />;
}

export interface WalletTransactionProps {
  transaction: Transaction;
  onDelete: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function TransactionView({ transaction, onDelete, onRetry, onBack }: WalletTransactionProps) {

  function TransactionTemplate({ children }: { children: VNode[] }) {
    return <WalletBox>
      <section style={{ padding: 8, textAlign: 'center'}}>
        <ErrorMessage title={transaction?.error?.hint} />
        {transaction.pending && <WarningBox>This transaction is not completed</WarningBox>}
      </section>
      <section>
        <div style={{ textAlign: 'center' }}>
          {children}
        </div>
      </section>
      <footer>
        <ButtonBox onClick={onBack}><i18n.Translate> <FontIcon>&#x2190;</FontIcon> </i18n.Translate></ButtonBox>
        <div>
          {transaction?.error ? <ButtonPrimary onClick={onRetry}><i18n.Translate>retry</i18n.Translate></ButtonPrimary> : null}
          <ButtonBoxDestructive onClick={onDelete}><i18n.Translate>&#x1F5D1;</i18n.Translate></ButtonBoxDestructive>
        </div>
      </footer>
    </WalletBox>
  }

  function amountToString(text: AmountLike) {
    const aj = Amounts.jsonifyAmount(text)
    const amount = Amounts.stringifyValue(aj)
    return `${amount} ${aj.currency}`
  }


  if (transaction.type === TransactionType.Withdrawal) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate>
      <h2>Withdrawal</h2>
      <div>{transaction.timestamp.t_ms === 'never' ? 'never' : format(transaction.timestamp.t_ms, 'dd MMMM yyyy, HH:mm')}</div>
      <br />
      <Part title="Total withdrawn" text={amountToString(transaction.amountEffective)} kind='positive' />
      <Part title="Chosen amount" text={amountToString(transaction.amountRaw)} kind='neutral' />
      <Part title="Exchange fee" text={amountToString(fee)} kind='negative' />
      <Part title="Exchange" text={new URL(transaction.exchangeBaseUrl).hostname} kind='neutral' />
    </TransactionTemplate>
  }

  const showLargePic = () => {

  }

  if (transaction.type === TransactionType.Payment) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountEffective),
      Amounts.parseOrThrow(transaction.amountRaw),
    ).amount

    return <TransactionTemplate>
      <h2>Payment </h2>
      <div>{transaction.timestamp.t_ms === 'never' ? 'never' : format(transaction.timestamp.t_ms, 'dd MMMM yyyy, HH:mm')}</div>
      <br />
      <Part big title="Total paid" text={amountToString(transaction.amountEffective)} kind='negative' />
      <Part big title="Purchase amount" text={amountToString(transaction.amountRaw)} kind='neutral' />
      <Part big title="Fee" text={amountToString(fee)} kind='negative' />
      <Part title="Merchant" text={transaction.info.merchant.name} kind='neutral' />
      <Part title="Purchase" text={transaction.info.summary} kind='neutral' />
      <Part title="Receipt" text={`#${transaction.info.orderId}`} kind='neutral' />

      <div>
        {transaction.info.products && transaction.info.products.length > 0 &&
          <ListOfProducts>
            {transaction.info.products.map((p, k) => <RowBorderGray key={k}>
              <a href="#" onClick={showLargePic}>
                <img src={p.image ? p.image : emptyImg} />
              </a>
              <div>
                {p.quantity && p.quantity > 0 && <SmallLightText>x {p.quantity} {p.unit}</SmallLightText>}
                <div>{p.description}</div>
              </div>
            </RowBorderGray>)}
          </ListOfProducts>
        }
      </div>
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Deposit) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate>
      <h2>Deposit </h2>
      <div>{transaction.timestamp.t_ms === 'never' ? 'never' : format(transaction.timestamp.t_ms, 'dd MMMM yyyy, HH:mm')}</div>
      <br />
      <Part big title="Total deposit" text={amountToString(transaction.amountEffective)} kind='negative' />
      <Part big title="Purchase amount" text={amountToString(transaction.amountRaw)} kind='neutral' />
      <Part big title="Fee" text={amountToString(fee)} kind='negative' />
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Refresh) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate>
      <h2>Refresh</h2>
      <div>{transaction.timestamp.t_ms === 'never' ? 'never' : format(transaction.timestamp.t_ms, 'dd MMMM yyyy, HH:mm')}</div>
      <br />
      <Part big title="Total refresh" text={amountToString(transaction.amountEffective)} kind='negative' />
      <Part big title="Refresh amount" text={amountToString(transaction.amountRaw)} kind='neutral' />
      <Part big title="Fee" text={amountToString(fee)} kind='negative' />
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Tip) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate>
      <h2>Tip</h2>
      <div>{transaction.timestamp.t_ms === 'never' ? 'never' : format(transaction.timestamp.t_ms, 'dd MMMM yyyy, HH:mm')}</div>
      <br />
      <Part big title="Total tip" text={amountToString(transaction.amountEffective)} kind='positive' />
      <Part big title="Received amount" text={amountToString(transaction.amountRaw)} kind='neutral' />
      <Part big title="Fee" text={amountToString(fee)} kind='negative' />
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Refund) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate>
      <h2>Refund</h2>
      <div>{transaction.timestamp.t_ms === 'never' ? 'never' : format(transaction.timestamp.t_ms, 'dd MMMM yyyy, HH:mm')}</div>
      <br />
      <Part big title="Total refund" text={amountToString(transaction.amountEffective)} kind='positive' />
      <Part big title="Refund amount" text={amountToString(transaction.amountRaw)} kind='neutral' />
      <Part big title="Fee" text={amountToString(fee)} kind='negative' />
      <Part title="Merchant" text={transaction.info.merchant.name} kind='neutral' />
      <Part title="Purchase" text={transaction.info.summary} kind='neutral' />
      <Part title="Receipt" text={`#${transaction.info.orderId}`} kind='neutral' />

      <p>
        {transaction.info.summary}
      </p>
      <div>
        {transaction.info.products && transaction.info.products.length > 0 &&
          <ListOfProducts>
            {transaction.info.products.map((p, k) => <RowBorderGray key={k}>
              <a href="#" onClick={showLargePic}>
                <img src={p.image ? p.image : emptyImg} />
              </a>
              <div>
                {p.quantity && p.quantity > 0 && <SmallLightText>x {p.quantity} {p.unit}</SmallLightText>}
                <div>{p.description}</div>
              </div>
            </RowBorderGray>)}
          </ListOfProducts>
        }
      </div>
    </TransactionTemplate>
  }


  return <div></div>
}
