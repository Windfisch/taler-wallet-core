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

import { Amounts, i18n, Transaction, TransactionType } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { JSX } from "preact";
import { route } from 'preact-router';
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";
import { Pages } from "./popup";


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

  return <TransactionView
    transaction={transaction}
    onDelete={() => wxApi.deleteTransaction(tid).then(_ => history.go(-1))}
    onBack={() => { history.go(-1); }} />;
}

export interface WalletTransactionProps {
  transaction?: Transaction,
  onDelete: () => void,
  onBack: () => void,
}

export function TransactionView({ transaction, onDelete, onBack }: WalletTransactionProps) {
  if (!transaction) {
    return <div><i18n.Translate>Loading ...</i18n.Translate></div>;
  }

  function Footer() {
    return <footer style={{ marginTop: 'auto', display: 'flex' }}>
      <button onClick={onBack}><i18n.Translate>back</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button onClick={onDelete}><i18n.Translate>remove</i18n.Translate></button>

      </div>

    </footer>
  }

  function Pending() {
    if (!transaction?.pending) return null
    return <span style={{ fontWeight: 'normal', fontSize: 16, color: 'gray' }}>(pending...)</span>
  }

  if (transaction.type === TransactionType.Withdrawal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Withdrawal <Pending /></h1>
          <p>
            From <b>{transaction.exchangeBaseUrl}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount subtracted</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount received</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountRaw),
                  Amounts.parseOrThrow(transaction.amountEffective),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Payment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Payment ({transaction.proposalId.substring(0, 10)}...) <Pending /></h1>
          <p>
            To <b>{transaction.info.merchant.name}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Order id</td>
              <td>{transaction.info.orderId}</td>
            </tr>
            <tr>
              <td>Summary</td>
              <td>{transaction.info.summary}</td>
            </tr>
            {transaction.info.products && transaction.info.products.length > 0 &&
              <tr>
                <td>Products</td>
                <td><ol style={{ margin: 0, textAlign: 'left' }}>
                  {transaction.info.products.map(p =>
                    <li>{p.description}</li>
                  )}</ol></td>
              </tr>
            }
            <tr>
              <td>Order amount</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Order amount and fees</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountEffective),
                  Amounts.parseOrThrow(transaction.amountRaw),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Deposit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Deposit ({transaction.depositGroupId}) <Pending /></h1>
          <p>
            To <b>{transaction.targetPaytoUri}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount deposit</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount deposit and fees</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountEffective),
                  Amounts.parseOrThrow(transaction.amountRaw),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Refresh) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Refresh <Pending /></h1>
          <p>
            From <b>{transaction.exchangeBaseUrl}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount refreshed</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Fees</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Tip) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Tip <Pending /></h1>
          <p>
            From <b>{transaction.merchantBaseUrl}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount deduce</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount received</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountRaw),
                  Amounts.parseOrThrow(transaction.amountEffective),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  const TRANSACTION_FROM_REFUND = /[a-z]*:([\w]{10}).*/
  if (transaction.type === TransactionType.Refund) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Refund ({TRANSACTION_FROM_REFUND.exec(transaction.refundedTransactionId)![1]}...) <Pending /></h1>
          <p>
            From <b>{transaction.info.merchant.name}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Order id</td>
              <td>{transaction.info.orderId}</td>
            </tr>
            <tr>
              <td>Summary</td>
              <td>{transaction.info.summary}</td>
            </tr>
            {transaction.info.products && transaction.info.products.length > 0 &&
              <tr>
                <td>Products</td>
                <td><ol>
                  {transaction.info.products.map(p =>
                    <li>{p.description}</li>
                  )}</ol></td>
              </tr>
            }
            <tr>
              <td>Amount deduce</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount received</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountRaw),
                  Amounts.parseOrThrow(transaction.amountEffective),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }


  return <div></div>
}
