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

import { AmountJson, Amounts, i18n, Transaction, TransactionType } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { Fragment, JSX, VNode, h } from "preact";
import { route } from 'preact-router';
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";
import { Pages } from "../NavigationBar";
import emptyImg from "../../static/img/empty.png"
import { Button, ButtonDestructive, ButtonPrimary, ListOfProducts, PopupBox, Row, RowBorderGray, SmallTextLight } from "../components/styled";
import { ErrorMessage } from "../components/ErrorMessage";

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
    onBack={() => { history.go(-1); }} />;
}

export interface WalletTransactionProps {
  transaction: Transaction,
  onDelete: () => void,
  onRetry: () => void,
  onBack: () => void,
}


export function TransactionView({ transaction, onDelete, onRetry, onBack }: WalletTransactionProps) {

  function Status() {
    if (transaction.error) {
      return <span style={{ fontWeight: 'normal', fontSize: 16, color: 'red' }}>(failed)</span>
    }
    if (transaction.pending) {
      return <span style={{ fontWeight: 'normal', fontSize: 16, color: 'gray' }}>(pending...)</span>
    }
    return null
  }

  function Fee({ value }: { value: AmountJson }) {
    if (Amounts.isZero(value)) return null
    return <span style="font-size: 16px;font-weight: normal;color: gray;">(fee {Amounts.stringify(value)})</span>
  }

  function TransactionTemplate({ upperRight, children }: { upperRight: VNode, children: VNode[] }) {
    return <PopupBox>
      <header>
        <SmallTextLight>
          {transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}
        </SmallTextLight>
        <SmallTextLight>
          {upperRight}
        </SmallTextLight>
      </header>
      <section>
        <ErrorMessage title={transaction?.error?.hint} />
        {children}
      </section>
      <footer>
        <Button onClick={onBack}><i18n.Translate> &lt; back</i18n.Translate></Button>
        <div>
          {transaction?.error ? <ButtonPrimary onClick={onRetry}><i18n.Translate>retry</i18n.Translate></ButtonPrimary> : null}
          <ButtonDestructive onClick={onDelete}><i18n.Translate>delete</i18n.Translate></ButtonDestructive>
        </div>
      </footer>
    </PopupBox>
  }

  if (transaction.type === TransactionType.Withdrawal) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate upperRight={<Fragment>From <b>{transaction.exchangeBaseUrl}</b></Fragment>}>
      <h3>Withdraw <Status /></h3>
      <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
    </TransactionTemplate>
  }

  const showLargePic = () => {

  }

  if (transaction.type === TransactionType.Payment) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountEffective),
      Amounts.parseOrThrow(transaction.amountRaw),
    ).amount

    return <TransactionTemplate upperRight={<Fragment>To <b>{transaction.info.merchant.name}</b></Fragment>}>
      <h3>Payment <Status /></h3>
      <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
      <span style="font-size:small; color:gray">#{transaction.info.orderId}</span>
      <p>
        {transaction.info.summary}
      </p>
      <div>
        {transaction.info.products && transaction.info.products.length > 0 &&
          <ListOfProducts>
            {transaction.info.products.map(p => <RowBorderGray>
              <a href="#" onClick={showLargePic}>
                <img src={p.image ? p.image : emptyImg} />
              </a>
              <div>
                {p.quantity && p.quantity > 0 && <SmallTextLight>x {p.quantity} {p.unit}</SmallTextLight>}
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
    return <TransactionTemplate upperRight={<Fragment>To <b>{transaction.targetPaytoUri}</b></Fragment>}>
      <h3>Deposit <Status /></h3>
      <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Refresh) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate upperRight={<Fragment>From <b>{transaction.exchangeBaseUrl}</b></Fragment>}>
      <h3>Refresh <Status /></h3>
      <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Tip) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate upperRight={<Fragment>From <b>{transaction.merchantBaseUrl}</b></Fragment>}>
      <h3>Tip <Status /></h3>
      <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
    </TransactionTemplate>
  }

  if (transaction.type === TransactionType.Refund) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return <TransactionTemplate upperRight={<Fragment>From <b>{transaction.info.merchant.name}</b></Fragment>}>
      <h3>Refund <Status /></h3>
      <h1>{transaction.amountEffective} <Fee value={fee} /></h1>

      <span style="font-size:small; color:gray">#{transaction.info.orderId}</span>
      <p>
        {transaction.info.summary}
      </p>
      <div>
        {transaction.info.products && transaction.info.products.length > 0 &&
          <ListOfProducts>
            {transaction.info.products.map(p => <RowBorderGray>
              <a href="#" onClick={showLargePic}>
                <img src={p.image ? p.image : emptyImg} />
              </a>
              <div>
                {p.quantity && p.quantity > 0 && <SmallTextLight>x {p.quantity} {p.unit}</SmallTextLight>}
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
