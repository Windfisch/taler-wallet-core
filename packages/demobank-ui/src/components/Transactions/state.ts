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

import { AbsoluteTime, Amounts } from "@gnu-taler/taler-util";
import { parse } from "date-fns";
import { useEffect } from "preact/hooks";
import useSWR from "swr";
import { Props, State } from "./index.js";

export function useComponentState({ accountLabel, pageNumber, balanceValue }: Props): State {
  const { data, error, mutate } = useSWR(
    `access-api/accounts/${accountLabel}/transactions?page=${pageNumber}`,
  );

  useEffect(() => {
    if (balanceValue) {
      mutate();
    }
  }, [balanceValue ?? ""]);

  if (error) {
    switch (error.status) {
      case 404:
        return {
          status: "loading-error",
          error: {
            hasError: true,
            operational: false,
            message: `Transactions page ${pageNumber} was not found.`
          }
        }
      case 401:
        return {
          status: "loading-error",
          error: {
            hasError: true,
            operational: false,
            message: "Wrong credentials given."
          }
        }
      default:
        return {
          status: "loading-error",
          error: {
            hasError: true,
            operational: false,
            message: `Transaction page ${pageNumber} could not be retrieved.`
          } as any
        }
    }
  }

  if (!data) {
    return {
      status: "loading",
      error: undefined
    }
  }


  const transactions = data.transactions.map((item: unknown) => {
    if (!item || typeof item !== "object" ||
      !("direction" in item) ||
      !("creditorIban" in item) ||
      !("debtorIban" in item) ||
      !("date" in item) ||
      !("subject" in item) ||
      !("currency" in item) ||
      !("amount" in item)
    ) {
      //not valid
      return;
    }
    const anyItem = item as any;
    if (
      !(typeof anyItem.creditorIban === 'string') ||
      !(typeof anyItem.debtorIban === 'string') ||
      !(typeof anyItem.date === 'string') ||
      !(typeof anyItem.subject === 'string') ||
      !(typeof anyItem.currency === 'string') ||
      !(typeof anyItem.amount === 'string')
    ) {
      return;
    }

    const negative = anyItem.direction === "DBIT";
    const counterpart = negative ? anyItem.creditorIban : anyItem.debtorIban;
    // Pattern:
    //
    // DD/MM YYYY subject -5 EUR
    // DD/MM YYYY subject 5 EUR
    const dateRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{1,2})/;
    const dateParse = dateRegex.exec(anyItem.date);
    const dateStr =
      dateParse !== null
        ? `${dateParse[3]}/${dateParse[2]} ${dateParse[1]}`
        : undefined;

    const date = parse(dateStr ?? "", "dd/MM yyyy", new Date())

    const when: AbsoluteTime = {
      t_ms: date.getTime()
    }
    const amount = Amounts.parseOrThrow(`${anyItem.currency}:${anyItem.amount}`);
    const subject = anyItem.subject;
    return {
      negative,
      counterpart,
      when,
      amount,
      subject,
    }
  });

  return {
    status: "ready",
    error: undefined,
    transactions,
  };
}
