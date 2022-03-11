import { Amounts, Transaction } from "@gnu-taler/taler-util";
import { PendingTaskInfo } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { Avatar } from "../mui/Avatar";
import { Typography } from "../mui/Typography";
import Banner from "./Banner";
import { Time } from "./Time";

interface Props {
  transactions: Transaction[];
}

export function PendingTransactions({ transactions }: Props) {
  return (
    <Banner
      title="PENDING OPERATIONS"
      style={{ backgroundColor: "lightblue", padding: 8 }}
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
