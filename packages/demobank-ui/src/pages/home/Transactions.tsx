/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { Logger } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect } from "preact/hooks";
import useSWR from "swr";
import { useTranslationContext } from "@gnu-taler/web-util/lib/index.browser";

const logger = new Logger("Transactions");
/**
 * Show one page of transactions.
 */
export function Transactions({
  pageNumber,
  accountLabel,
  balanceValue,
}: {
  pageNumber: number;
  accountLabel: string;
  balanceValue?: string;
}): VNode {
  const { i18n } = useTranslationContext();
  const { data, error, mutate } = useSWR(
    `access-api/accounts/${accountLabel}/transactions?page=${pageNumber}`,
  );
  useEffect(() => {
    if (balanceValue) {
      mutate();
    }
  }, [balanceValue ?? ""]);
  if (typeof error !== "undefined") {
    logger.error("transactions not found error", error);
    switch (error.status) {
      case 404: {
        return <p>Transactions page {pageNumber} was not found.</p>;
      }
      case 401: {
        return <p>Wrong credentials given.</p>;
      }
      default: {
        return <p>Transaction page {pageNumber} could not be retrieved.</p>;
      }
    }
  }
  if (!data) {
    logger.trace(`History data of ${accountLabel} not arrived`);
    return <p>Transactions page loading...</p>;
  }
  logger.trace(`History data of ${accountLabel}`, data);
  return (
    <div class="results">
      <table class="pure-table pure-table-striped">
        <thead>
          <tr>
            <th>{i18n.str`Date`}</th>
            <th>{i18n.str`Amount`}</th>
            <th>{i18n.str`Counterpart`}</th>
            <th>{i18n.str`Subject`}</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.map((item: any, idx: number) => {
            const sign = item.direction == "DBIT" ? "-" : "";
            const counterpart =
              item.direction == "DBIT" ? item.creditorIban : item.debtorIban;
            // Pattern:
            //
            // DD/MM YYYY subject -5 EUR
            // DD/MM YYYY subject 5 EUR
            const dateRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{1,2})/;
            const dateParse = dateRegex.exec(item.date);
            const date =
              dateParse !== null
                ? `${dateParse[3]}/${dateParse[2]} ${dateParse[1]}`
                : "date not found";
            return (
              <tr key={idx}>
                <td>{date}</td>
                <td>
                  {sign}
                  {item.amount} {item.currency}
                </td>
                <td>{counterpart}</td>
                <td>{item.subject}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
