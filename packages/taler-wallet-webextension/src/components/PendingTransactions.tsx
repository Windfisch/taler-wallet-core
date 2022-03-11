import { Amounts, NotificationType, Transaction } from "@gnu-taler/taler-util";
import { PendingTaskInfo } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, JSX } from "preact";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { Avatar } from "../mui/Avatar";
import { Typography } from "../mui/Typography";
import Banner from "./Banner";
import { Time } from "./Time";
import * as wxApi from "../wxApi";

interface Props extends JSX.HTMLAttributes {}

export function PendingTransactions({}: Props) {
  const state = useAsyncAsHook(wxApi.getTransactions, [
    NotificationType.WithdrawGroupFinished,
  ]);
  const transactions =
    !state || state.hasError ? [] : state.response.transactions;

  if (!state || state.hasError) {
    return <Fragment />;
  }
  return <PendingTransactionsView transactions={transactions} />;
}

export function PendingTransactionsView({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <Banner
      title="PENDING OPERATIONS"
      style={{
        backgroundColor: "lightcyan",
        maxHeight: 150,
        padding: 8,
        overflowY: transactions.length > 3 ? "scroll" : "hidden",
      }}
      elements={transactions.map((t) => {
        const amount = Amounts.parseOrThrow(t.amountEffective);
        return {
          icon: (
            <Avatar
              style={{
                border: "solid blue 1px",
                color: "blue",
                boxSizing: "border-box",
              }}
            >
              {t.type.substring(0, 1)}
            </Avatar>
          ),
          description: (
            <Typography>
              <b>
                {amount.currency} {Amounts.stringifyValue(amount)}
              </b>{" "}
              - <Time timestamp={t.timestamp} format="dd MMMM yyyy" />
            </Typography>
          ),
        };
      })}
    />
  );
}

export default PendingTransactions;
