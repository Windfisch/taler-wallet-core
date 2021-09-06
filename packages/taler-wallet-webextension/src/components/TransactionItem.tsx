import { AmountString, Timestamp, Transaction, TransactionType } from '@gnu-taler/taler-util';
import { format, formatDistance } from 'date-fns';
import { h } from 'preact';
import imageBank from '../../static/img/ri-bank-line.svg';
import imageHandHeart from '../../static/img/ri-hand-heart-line.svg';
import imageRefresh from '../../static/img/ri-refresh-line.svg';
import imageRefund from '../../static/img/ri-refund-2-line.svg';
import imageShoppingCart from '../../static/img/ri-shopping-cart-line.svg';
import { Pages } from "../NavigationBar";
import { Column, ExtraLargeText, HistoryRow, SmallLightText, LargeText, LightText } from './styled/index';

export function TransactionItem(props: { tx: Transaction, multiCurrency: boolean }): JSX.Element {
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
          multiCurrency={props.multiCurrency}
        ></TransactionLayout>
      );
    case TransactionType.Payment:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title={tx.info.merchant.name}
          timestamp={tx.timestamp}
          iconPath={imageShoppingCart}
          pending={tx.pending}
          multiCurrency={props.multiCurrency}
        ></TransactionLayout>
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
          multiCurrency={props.multiCurrency}
        ></TransactionLayout>
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
          multiCurrency={props.multiCurrency}
        ></TransactionLayout>
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
          multiCurrency={props.multiCurrency}
        ></TransactionLayout>
      );
    case TransactionType.Deposit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title={tx.targetPaytoUri}
          timestamp={tx.timestamp}
          iconPath={imageRefresh}
          pending={tx.pending}
          multiCurrency={props.multiCurrency}
        ></TransactionLayout>
      );
  }
}

function TransactionLayout(props: TransactionLayoutProps): JSX.Element {
  const date = new Date(props.timestamp.t_ms);
  const dateStr = format(date, 'dd MMM, hh:mm')

  return (
    <HistoryRow href={Pages.transaction.replace(':tid', props.id)}>
      <img src={props.iconPath} />
      <Column>
        <LargeText>
          <span>{props.title}</span>
        </LargeText>
        {props.pending &&
          <LightText style={{marginTop: 5, marginBottom: 5}}>Waiting for confirmation</LightText>
        }
        <SmallLightText>{dateStr}</SmallLightText>
      </Column>
      <TransactionAmount
        pending={props.pending}
        amount={props.amount}
        multiCurrency={props.multiCurrency}
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
  id: string;
  iconPath: string;
  pending: boolean;
  multiCurrency: boolean;
}

interface TransactionAmountProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountString | "unknown";
  pending: boolean;
  multiCurrency: boolean;
}

function TransactionAmount(props: TransactionAmountProps): JSX.Element {
  const [currency, amount] = props.amount.split(":");
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
    <Column style={{
      textAlign: 'center',
      color:
        props.pending ? "gray" :
          (sign === '+' ? 'darkgreen' :
            (sign === '-' ? 'darkred' :
              undefined))
    }}>
      <ExtraLargeText>
        {sign}
        {amount}
      </ExtraLargeText>
      {props.multiCurrency && <div>{currency}</div>}
      {props.pending && <div>PENDING</div>}
    </Column>
  );
}

