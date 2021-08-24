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

import { AmountString, Balance, Transaction, TransactionsResponse } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { Fragment, h, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { DateSeparator, WalletBox } from "../components/styled";
import { TransactionItem } from "../components/TransactionItem";
import { useBalances } from "../hooks/useBalances";
import * as wxApi from "../wxApi";


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
  return `${c.substring(idx + 1)} ${c.substring(0, idx)}`
}



export function HistoryView({ list, balances }: { list: Transaction[], balances: Balance[] }) {
  const byDate = list.reduce(function (rv, x) {
    const theDate = x.timestamp.t_ms === "never" ? "never" : format(x.timestamp.t_ms, 'dd MMMM yyyy');
    (rv[theDate] = rv[theDate] || []).push(x);
    return rv;
  }, {} as { [x: string]: Transaction[] });

  const multiCurrency = balances.length > 1

  return <WalletBox noPadding>
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
      {Object.keys(byDate).map(d => {
        return <Fragment>
          <DateSeparator>{d}</DateSeparator>
          {byDate[d].map((tx, i) => (
            <TransactionItem key={i} tx={tx} multiCurrency={multiCurrency}/>
          ))}
        </Fragment>
      })}
    </section>
  </WalletBox>
}
