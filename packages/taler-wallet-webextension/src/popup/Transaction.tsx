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
import { Fragment, JSX } from "preact";
import { route } from 'preact-router';
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";
import { Pages } from "./popup";
import emptyImg from "../../static/img/empty.png"

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
    return <footer style={{ marginTop: 'auto', display: 'flex', flexShrink: 0 }}>
      <button onClick={onBack}><i18n.Translate>back</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button class="pure-button button-destructive" onClick={onDelete}><i18n.Translate>forget</i18n.Translate></button>
      </div>

    </footer>
  }

  function Pending() {
    if (!transaction?.pending) return null
    return <span style={{ fontWeight: 'normal', fontSize: 16, color: 'gray' }}>(pending...)</span>
  }

  const Fee = ({ value }: { value: AmountJson }) => Amounts.isNonZero(value) ?
    <span style="font-size: 16px;font-weight: normal;color: gray;">(fee {Amounts.stringify(value)})</span> : null

  if (transaction.type === TransactionType.Withdrawal) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} >
        <section style={{ color: transaction.pending ? 'gray' : '', flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 2em)', overflow: 'auto' }}>
          <span style="flat: left; font-size:small; color:gray">{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</span>
          <span style="float: right; font-size:small; color:gray">
            From <b>{transaction.exchangeBaseUrl}</b>
          </span>
          <h3>Withdraw <Pending /></h3>
          <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
        </section>
        <Footer />
      </div>
    );
  }

  const showLargePic = () => {

  }

  if (transaction.type === TransactionType.Payment) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountEffective),
      Amounts.parseOrThrow(transaction.amountRaw),
    ).amount

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} >
        <section style={{ color: transaction.pending ? 'gray' : '', flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 2em)', overflow: 'auto' }}>
          <span style="flat: left; font-size:small; color:gray">{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</span>
          <span style="float: right; font-size:small; color:gray">
            To <b>{transaction.info.merchant.name}</b>
          </span>
          <h3>Payment <Pending /></h3>
          <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
          <span style="font-size:small; color:gray">#{transaction.info.orderId}</span>
          <p>
            {transaction.info.summary}
          </p>
          <div>
            {transaction.info.products && transaction.info.products.length > 0 && <div>
              {transaction.info.products.map(p => <div style="display: flex; flex-direction: row; border: 1px solid gray; border-radius: 0.5em; margin: 0.5em 0px; justify-content: left; padding: 0.5em;">
                <a href="#" onClick={showLargePic}>
                  <img class="pure-img" style="display:inline-block" src={p.image ? p.image : emptyImg} width="32" height="32" />
                </a>
                <div style="display: block; margin-left: 1em;">
                  {p.quantity && p.quantity > 0 && <div style="font-size: small; color: gray;">x {p.quantity} {p.unit}</div>}
                  <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', width: 'calc(20rem - 32px - 32px - 8px - 1em)', whiteSpace: 'nowrap' }}>{p.description}</div>
                </div>
              </div>)}
            </div>
            }
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Deposit) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} >
        <section style={{ color: transaction.pending ? 'gray' : '', flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 2em)', overflow: 'auto' }}>
          <span style="flat: left; font-size:small; color:gray">{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</span>
          <span style="float: right; font-size:small; color:gray">
            To <b>{transaction.targetPaytoUri}</b>
          </span>
          <h3>Deposit <Pending /></h3>
          <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Refresh) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} >
        <section style={{ color: transaction.pending ? 'gray' : '', flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 2em)', overflow: 'auto' }}>
          <span style="flat: left; font-size:small; color:gray">{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</span>
          <span style="float: right; font-size:small; color:gray">
            From <b>{transaction.exchangeBaseUrl}</b>
          </span>
          <h3>Refresh <Pending /></h3>
          <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Tip) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} >
        <section style={{ color: transaction.pending ? 'gray' : '', flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 2em)', overflow: 'auto' }}>
          <span style="flat: left; font-size:small; color:gray">{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</span>
          <span style="float: right; font-size:small; color:gray">
            From <b>{transaction.merchantBaseUrl}</b>
          </span>
          <h3>Tip <Pending /></h3>
          <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Refund) {
    const fee = Amounts.sub(
      Amounts.parseOrThrow(transaction.amountRaw),
      Amounts.parseOrThrow(transaction.amountEffective),
    ).amount
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }} >
        <section style={{ color: transaction.pending ? 'gray' : '', flex: '1 0 auto', height: 'calc(320px - 34px - 45px - 2em)', overflow: 'auto' }}>
          <span style="flat: left; font-size:small; color:gray">{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</span>
          <span style="float: right; font-size:small; color:gray">
            From <b>{transaction.info.merchant.name}</b>
          </span>
          <h3>Refund <Pending /></h3>
          <h1>{transaction.amountEffective} <Fee value={fee} /></h1>
          <span style="font-size:small; color:gray">#{transaction.info.orderId}</span>
          <p>
            {transaction.info.summary}
          </p>
          <div>
            {transaction.info.products && transaction.info.products.length > 0 && <div>
              {transaction.info.products.map(p => <div style="display: flex; flex-direction: row; border: 1px solid gray; border-radius: 0.5em; margin: 0.5em 0px; justify-content: left; padding: 0.5em;">
                <a href="#" onClick={showLargePic}>
                  <img class="pure-img" style="display:inline-block" src={p.image ? p.image : emptyImg} width="32" height="32" />
                </a>
                <div style="display: block; margin-left: 1em;">
                  {p.quantity && p.quantity > 0 && <div style="font-size: small; color: gray;">x {p.quantity} {p.unit}</div>}
                  <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', width: 'calc(20rem - 32px - 32px - 8px - 1em)', whiteSpace: 'nowrap' }}>{p.description}</div>
                </div>
              </div>)}
            </div>
            }
          </div>

        </section>
        <Footer />
      </div>
    );
  }


  return <div></div>
}
