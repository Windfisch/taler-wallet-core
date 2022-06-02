import {
  AbsoluteTime,
  Amounts,
  NotificationType,
  Transaction,
} from "@gnu-taler/taler-util";
import { Fragment, h, JSX, VNode } from "preact";
import { useEffect } from "preact/hooks";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { Avatar } from "../mui/Avatar.js";
import { Typography } from "../mui/Typography.js";
import * as wxApi from "../wxApi.js";
import Banner from "./Banner.js";
import { Time } from "./Time.js";

interface Props extends JSX.HTMLAttributes {
  goToTransaction: (id: string) => Promise<void>;
}

export function PendingTransactions({ goToTransaction }: Props): VNode {
  const state = useAsyncAsHook(wxApi.getTransactions);

  useEffect(() => {
    wxApi.onUpdateNotification([NotificationType.WithdrawGroupFinished], () => {
      state?.retry();
    });
  });

  const transactions =
    !state || state.hasError
      ? []
      : state.response.transactions.filter((t) => t.pending);

  if (!state || state.hasError || !transactions.length) {
    return <Fragment />;
  }
  return (
    <PendingTransactionsView
      goToTransaction={goToTransaction}
      transactions={transactions}
    />
  );
}

export function PendingTransactionsView({
  transactions,
  goToTransaction,
}: {
  goToTransaction: (id: string) => Promise<void>;
  transactions: Transaction[];
}): VNode {
  return (
    <Banner
      title="PENDING OPERATIONS"
      style={{
        backgroundColor: "lightcyan",
        maxHeight: 150,
        padding: 8,
        flexGrow: 1,
        maxWidth: 500,
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
          action: () => goToTransaction(t.transactionId),
          description: (
            <Fragment>
              <Typography inline bold>
                {amount.currency} {Amounts.stringifyValue(amount)}
              </Typography>
              &nbsp;-&nbsp;
              <Time
                timestamp={AbsoluteTime.fromTimestamp(t.timestamp)}
                format="dd MMMM yyyy"
              />
            </Fragment>
          ),
        };
      })}
    />
  );
}

export default PendingTransactions;
