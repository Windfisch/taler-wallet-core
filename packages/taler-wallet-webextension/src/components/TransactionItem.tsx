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

import {
  AmountJson,
  Amounts,
  AmountString,
  AbsoluteTime,
  Transaction,
  TransactionType,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useTranslationContext } from "../context/translation.js";
import { Avatar } from "../mui/Avatar.js";
import { Pages } from "../NavigationBar.js";
import {
  Column,
  ExtraLargeText,
  HistoryRow,
  LargeText,
  LightText,
  SmallLightText,
} from "./styled/index.js";
import { Time } from "./Time.js";

export function TransactionItem(props: { tx: Transaction }): VNode {
  const tx = props.tx;
  switch (tx.type) {
    case TransactionType.Withdrawal:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title={new URL(tx.exchangeBaseUrl).hostname}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"W"}
          pending={tx.pending}
        />
      );
    case TransactionType.Payment:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title={tx.info.merchant.name}
          subtitle={tx.info.summary}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"P"}
          pending={tx.pending}
        />
      );
    case TransactionType.Refund:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          subtitle={tx.info.summary}
          title={tx.info.merchant.name}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"R"}
          pending={tx.pending}
        />
      );
    case TransactionType.Tip:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title={new URL(tx.merchantBaseUrl).hostname}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"T"}
          pending={tx.pending}
        />
      );
    case TransactionType.Refresh:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title={new URL(tx.exchangeBaseUrl).hostname}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"R"}
          pending={tx.pending}
        />
      );
    case TransactionType.Deposit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title={tx.targetPaytoUri}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"D"}
          pending={tx.pending}
        />
      );
    case TransactionType.PeerPullCredit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title={tx.info.summary || "Invoice"}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"I"}
          pending={tx.pending}
        />
      );
    case TransactionType.PeerPullDebit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title={tx.info.summary || "Invoice"}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"I"}
          pending={tx.pending}
        />
      );
    case TransactionType.PeerPushCredit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title={tx.info.summary || "Transfer"}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"T"}
          pending={tx.pending}
        />
      );
    case TransactionType.PeerPushDebit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title={tx.info.summary || "Transfer"}
          timestamp={AbsoluteTime.fromTimestamp(tx.timestamp)}
          iconPath={"T"}
          pending={tx.pending}
        />
      );
    default: {
      const pe: never = tx;
      throw Error(`unsupported transaction type ${pe}`);
    }
  }
}

function TransactionLayout(props: TransactionLayoutProps): VNode {
  const { i18n } = useTranslationContext();
  return (
    <HistoryRow
      href={Pages.balanceTransaction({ tid: props.id })}
      style={{
        backgroundColor: props.pending ? "lightcyan" : "inherit",
        alignItems: "center",
      }}
    >
      <Avatar
        style={{
          border: "solid gray 1px",
          color: "gray",
          boxSizing: "border-box",
        }}
      >
        {props.iconPath}
      </Avatar>
      <Column>
        <LargeText>
          <div>{props.title}</div>
          {props.subtitle && (
            <div style={{ color: "gray", fontSize: "medium", marginTop: 5 }}>
              {props.subtitle}
            </div>
          )}
        </LargeText>
        {props.pending && (
          <LightText style={{ marginTop: 5, marginBottom: 5 }}>
            <i18n.Translate>Waiting for confirmation</i18n.Translate>
          </LightText>
        )}
        <SmallLightText style={{ marginTop: 5 }}>
          <Time timestamp={props.timestamp} format="hh:mm" />
        </SmallLightText>
      </Column>
      <TransactionAmount
        pending={props.pending}
        amount={Amounts.parseOrThrow(props.amount)}
        debitCreditIndicator={props.debitCreditIndicator}
      />
    </HistoryRow>
  );
}

interface TransactionLayoutProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountString | "unknown";
  timestamp: AbsoluteTime;
  title: string;
  subtitle?: string;
  id: string;
  iconPath: string;
  pending: boolean;
}

interface TransactionAmountProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountJson;
  pending: boolean;
}

function TransactionAmount(props: TransactionAmountProps): VNode {
  const { i18n } = useTranslationContext();
  let sign: string;
  switch (props.debitCreditIndicator) {
    case "credit":
      sign = "+";
      break;
    case "debit":
      sign = "-";
      break;
    case "unknown":
      sign = "";
  }
  return (
    <Column
      style={{
        textAlign: "center",
        color: props.pending
          ? "gray"
          : sign === "+"
          ? "darkgreen"
          : sign === "-"
          ? "darkred"
          : undefined,
      }}
    >
      <ExtraLargeText>
        {sign}
        {Amounts.stringifyValue(props.amount, 2)}
      </ExtraLargeText>
      {props.pending && (
        <div>
          <i18n.Translate>PENDING</i18n.Translate>
        </div>
      )}
    </Column>
  );
}
