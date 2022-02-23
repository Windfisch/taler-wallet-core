/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
  Timestamp,
  Transaction,
  TransactionType,
  Translate,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import imageBank from "../../static/img/ri-bank-line.svg";
import imageHandHeart from "../../static/img/ri-hand-heart-line.svg";
import imageRefresh from "../../static/img/ri-refresh-line.svg";
import imageRefund from "../../static/img/ri-refund-2-line.svg";
import imageShoppingCart from "../../static/img/ri-shopping-cart-line.svg";
import { Pages } from "../NavigationBar";
import {
  Column,
  ExtraLargeText,
  HistoryRow,
  SmallLightText,
  LargeText,
  LightText,
} from "./styled";
import { Time } from "./Time";

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
          timestamp={tx.timestamp}
          iconPath={imageBank}
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
          timestamp={tx.timestamp}
          iconPath={imageShoppingCart}
          pending={tx.pending}
        />
      );
    case TransactionType.Refund:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title={tx.info.merchant.name}
          timestamp={tx.timestamp}
          iconPath={imageRefund}
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
          timestamp={tx.timestamp}
          iconPath={imageHandHeart}
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
          timestamp={tx.timestamp}
          iconPath={imageRefresh}
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
          timestamp={tx.timestamp}
          iconPath={imageBank}
          pending={tx.pending}
        />
      );
  }
}

function TransactionLayout(props: TransactionLayoutProps): VNode {
  return (
    <HistoryRow href={Pages.balance_transaction.replace(":tid", props.id)}>
      <img src={props.iconPath} />
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
            <Translate>Waiting for confirmation</Translate>
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
  timestamp: Timestamp;
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
        {Amounts.stringifyValue(props.amount)}
      </ExtraLargeText>
      {props.pending && (
        <div>
          <Translate>PENDING</Translate>
        </div>
      )}
    </Column>
  );
}
