import { Logger } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect } from "preact/hooks";
import useSWR from "swr";
import { useTranslationContext } from "../../context/translation.js";

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
