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

/**
 * Popup shown to the user when they click
 * the Taler browser action button.
 *
 * @author Florian Dold
 */

/**
 * Imports.
 */
import {
  AmountJson,
  Amounts,
  BalancesResponse,
  Balance,
  classifyTalerUri,
  TalerUriType,
  TransactionsResponse,
  Transaction,
  TransactionType,
  AmountString,
  Timestamp,
  amountFractionalBase,
  i18n,
} from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { Component, ComponentChildren, Fragment, JSX } from "preact";
import { route } from 'preact-router';
import { useEffect, useState } from "preact/hooks";
import { Diagnostics } from "../components/Diagnostics";
import { PermissionsCheckbox } from "../components/PermissionsCheckbox";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";
import { PageLink, renderAmount } from "../renderHtml";
import * as wxApi from "../wxApi";

export enum Pages {
  balance = '/balance',
  settings = '/settings',
  debug = '/debug',
  history = '/history',
  transaction = '/transaction/:tid',
}

interface TabProps {
  target: string;
  current?: string;
  children?: ComponentChildren;
}

function Tab(props: TabProps): JSX.Element {
  let cssClass = "";
  if (props.current === props.target) {
    cssClass = "active";
  }
  return (
    <a href={props.target} className={cssClass}>
      {props.children}
    </a>
  );
}

export function WalletNavBar({ current }: { current?: string }) {
  return (
    <div className="nav" id="header">
      <Tab target="/balance" current={current}>{i18n.str`Balance`}</Tab>
      <Tab target="/history" current={current}>{i18n.str`History`}</Tab>
      <Tab target="/settings" current={current}>{i18n.str`Settings`}</Tab>
      <Tab target="/debug" current={current}>{i18n.str`Debug`}</Tab>
    </div>
  );
}

/**
 * Render an amount as a large number with a small currency symbol.
 */
function bigAmount(amount: AmountJson): JSX.Element {
  const v = amount.value + amount.fraction / amountFractionalBase;
  return (
    <span>
      <span style={{ fontSize: "5em", display: "block" }}>{v}</span>{" "}
      <span>{amount.currency}</span>
    </span>
  );
}

function EmptyBalanceView(): JSX.Element {
  return (
    <p><i18n.Translate>
      You have no balance to show. Need some{" "}
      <PageLink pageName="/welcome">help</PageLink> getting started?
    </i18n.Translate></p>
  );
}

export class WalletBalanceView extends Component<any, any> {
  private balance?: BalancesResponse;
  private gotError = false;
  private canceler: (() => void) | undefined = undefined;
  private unmount = false;
  private updateBalanceRunning = false;

  componentWillMount(): void {
    this.canceler = wxApi.onUpdateNotification(() => this.updateBalance());
    this.updateBalance();
  }

  componentWillUnmount(): void {
    console.log("component WalletBalanceView will unmount");
    if (this.canceler) {
      this.canceler();
    }
    this.unmount = true;
  }

  async updateBalance(): Promise<void> {
    if (this.updateBalanceRunning) {
      return;
    }
    this.updateBalanceRunning = true;
    let balance: BalancesResponse;
    try {
      balance = await wxApi.getBalance();
    } catch (e) {
      if (this.unmount) {
        return;
      }
      this.gotError = true;
      console.error("could not retrieve balances", e);
      this.setState({});
      return;
    } finally {
      this.updateBalanceRunning = false;
    }
    if (this.unmount) {
      return;
    }
    this.gotError = false;
    console.log("got balance", balance);
    this.balance = balance;
    this.setState({});
  }

  formatPending(entry: Balance): JSX.Element {
    let incoming: JSX.Element | undefined;
    let payment: JSX.Element | undefined;

    const available = Amounts.parseOrThrow(entry.available);
    const pendingIncoming = Amounts.parseOrThrow(entry.pendingIncoming);
    const pendingOutgoing = Amounts.parseOrThrow(entry.pendingOutgoing);

    console.log(
      "available: ",
      entry.pendingIncoming ? renderAmount(entry.available) : null,
    );
    console.log(
      "incoming: ",
      entry.pendingIncoming ? renderAmount(entry.pendingIncoming) : null,
    );

    if (!Amounts.isZero(pendingIncoming)) {
      incoming = (
        <span><i18n.Translate>
          <span style={{ color: "darkgreen" }}>
            {"+"}
            {renderAmount(entry.pendingIncoming)}
          </span>{" "}
          incoming
        </i18n.Translate></span>
      );
    }

    const l = [incoming, payment].filter((x) => x !== undefined);
    if (l.length === 0) {
      return <span />;
    }

    if (l.length === 1) {
      return <span>({l})</span>;
    }
    return (
      <span>
        ({l[0]}, {l[1]})
      </span>
    );
  }

  render(): JSX.Element {
    const wallet = this.balance;
    if (this.gotError) {
      return (
        <div className="balance">
          <p>{i18n.str`Error: could not retrieve balance information.`}</p>
          <p>
            Click <PageLink pageName="welcome.html">here</PageLink> for help and
            diagnostics.
          </p>
        </div>
      );
    }
    if (!wallet) {
      return <span></span>;
    }
    console.log(wallet);
    const listing = wallet.balances.map((entry) => {
      const av = Amounts.parseOrThrow(entry.available);
      return (
        <p key={av.currency}>
          {bigAmount(av)} {this.formatPending(entry)}
        </p>
      );
    });
    return listing.length > 0 ? (
      <div className="balance">{listing}</div>
    ) : (
      <EmptyBalanceView />
    );
  }
}

interface TransactionAmountProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountString | "unknown";
  pending: boolean;
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
  const style: JSX.AllCSSProperties = {
    marginLeft: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    alignSelf: "center"
  };
  if (props.pending) {
    style.color = "gray";
  }
  return (
    <div style={{ ...style }}>
      <div style={{ fontSize: "x-large" }}>
        {sign}
        {amount}
      </div>
      <div>{currency}</div>
    </div>
  );
}

interface TransactionLayoutProps {
  debitCreditIndicator: "debit" | "credit" | "unknown";
  amount: AmountString | "unknown";
  timestamp: Timestamp;
  title: string;
  id: string;
  subtitle: string;
  iconPath: string;
  pending: boolean;
}

function TransactionLayout(props: TransactionLayoutProps): JSX.Element {
  const date = new Date(props.timestamp.t_ms);
  const dateStr = date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  } as any);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        border: "1px solid gray",
        borderRadius: "0.5em",
        margin: "0.5em 0",
        justifyContent: "space-between",
        padding: "0.5em",
      }}
    >
      <img src={props.iconPath} />
      <div
        style={{ display: "flex", flexDirection: "column", marginLeft: "1em" }}
      >
        <div style={{ fontSize: "small", color: "gray" }}>{dateStr}</div>
        <div style={{ fontVariant: "small-caps", fontSize: "x-large" }}>
          <a href={Pages.transaction.replace(':tid', props.id)}><span>{props.title}</span></a>
          {props.pending ? (
            <span style={{ color: "darkblue" }}> (Pending)</span>
          ) : null}
        </div>

        <div>{props.subtitle}</div>
      </div>
      <TransactionAmount
        pending={props.pending}
        amount={props.amount}
        debitCreditIndicator={props.debitCreditIndicator}
      />
    </div>
  );
}

function TransactionItem(props: { tx: Transaction }): JSX.Element {
  const tx = props.tx;
  switch (tx.type) {
    case TransactionType.Withdrawal:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Withdrawal"
          subtitle={`via ${tx.exchangeBaseUrl}`}
          timestamp={tx.timestamp}
          iconPath="/static/img/ri-bank-line.svg"
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Payment:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title="Payment"
          subtitle={tx.info.summary}
          timestamp={tx.timestamp}
          iconPath="/static/img/ri-shopping-cart-line.svg"
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Refund:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Refund"
          subtitle={tx.info.summary}
          timestamp={tx.timestamp}
          iconPath="/static/img/ri-refund-2-line.svg"
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Tip:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Tip"
          subtitle={`from ${new URL(tx.merchantBaseUrl).hostname}`}
          timestamp={tx.timestamp}
          iconPath="/static/img/ri-hand-heart-line.svg"
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Refresh:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"credit"}
          title="Refresh"
          subtitle={`via exchange ${tx.exchangeBaseUrl}`}
          timestamp={tx.timestamp}
          iconPath="/static/img/ri-refresh-line.svg"
          pending={tx.pending}
        ></TransactionLayout>
      );
    case TransactionType.Deposit:
      return (
        <TransactionLayout
          id={tx.transactionId}
          amount={tx.amountEffective}
          debitCreditIndicator={"debit"}
          title="Refresh"
          subtitle={`to ${tx.targetPaytoUri}`}
          timestamp={tx.timestamp}
          iconPath="/static/img/ri-refresh-line.svg"
          pending={tx.pending}
        ></TransactionLayout>
      );
  }
}

export function WalletHistory(props: any): JSX.Element {
  const [transactions, setTransactions] = useState<
    TransactionsResponse | undefined
  >(undefined);

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

  const txs = [...transactions.transactions].reverse();

  return (
    <div>
      {txs.map((tx, i) => (
        <TransactionItem key={i} tx={tx} />
      ))}
    </div>
  );
}

interface WalletTransactionProps {
  transaction?: Transaction,
  onDelete: () => void,
  onBack: () => void,
}

export function WalletTransactionView({ transaction, onDelete, onBack }: WalletTransactionProps) {
  if (!transaction) {
    return <div><i18n.Translate>Loading ...</i18n.Translate></div>;
  }

  function Footer() {
    return <footer style={{ marginTop: 'auto', display: 'flex' }}>
      <button onClick={onBack}><i18n.Translate>back</i18n.Translate></button>
      <div style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', display: 'flex' }}>
        <button onClick={onDelete}><i18n.Translate>remove</i18n.Translate></button>

      </div>

    </footer>
  }

  function Pending() {
    if (!transaction?.pending) return null
    return <span style={{ fontWeight: 'normal', fontSize: 16, color: 'gray' }}>(pending...)</span>
  }

  if (transaction.type === TransactionType.Withdrawal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Withdrawal <Pending /></h1>
          <p>
            From <b>{transaction.exchangeBaseUrl}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount subtracted</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount received</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountRaw),
                  Amounts.parseOrThrow(transaction.amountEffective),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Payment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Payment ({transaction.proposalId.substring(0, 10)}...) <Pending /></h1>
          <p>
            To <b>{transaction.info.merchant.name}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Order id</td>
              <td>{transaction.info.orderId}</td>
            </tr>
            <tr>
              <td>Summary</td>
              <td>{transaction.info.summary}</td>
            </tr>
            {transaction.info.products && transaction.info.products.length > 0 &&
              <tr>
                <td>Products</td>
                <td><ol style={{ margin: 0, textAlign: 'left' }}>
                  {transaction.info.products.map(p =>
                    <li>{p.description}</li>
                  )}</ol></td>
              </tr>
            }
            <tr>
              <td>Order amount</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Order amount and fees</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountEffective),
                  Amounts.parseOrThrow(transaction.amountRaw),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Deposit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Deposit ({transaction.depositGroupId}) <Pending /></h1>
          <p>
            To <b>{transaction.targetPaytoUri}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount deposit</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount deposit and fees</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountEffective),
                  Amounts.parseOrThrow(transaction.amountRaw),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Refresh) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Refresh <Pending /></h1>
          <p>
            From <b>{transaction.exchangeBaseUrl}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount refreshed</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Fees</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  if (transaction.type === TransactionType.Tip) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Tip <Pending /></h1>
          <p>
            From <b>{transaction.merchantBaseUrl}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Amount deduce</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount received</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountRaw),
                  Amounts.parseOrThrow(transaction.amountEffective),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }

  const TRANSACTION_FROM_REFUND = /[a-z]*:([\w]{10}).*/
  if (transaction.type === TransactionType.Refund) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '20rem' }} >
        <section>
          <h1>Refund ({TRANSACTION_FROM_REFUND.exec(transaction.refundedTransactionId)![1]}...) <Pending /></h1>
          <p>
            From <b>{transaction.info.merchant.name}</b>
          </p>
          <table class={transaction.pending ? "detailsTable pending" : "detailsTable"}>
            <tr>
              <td>Order id</td>
              <td>{transaction.info.orderId}</td>
            </tr>
            <tr>
              <td>Summary</td>
              <td>{transaction.info.summary}</td>
            </tr>
            {transaction.info.products && transaction.info.products.length > 0 &&
              <tr>
                <td>Products</td>
                <td><ol>
                  {transaction.info.products.map(p =>
                    <li>{p.description}</li>
                  )}</ol></td>
              </tr>
            }
            <tr>
              <td>Amount deduce</td>
              <td>{transaction.amountRaw}</td>
            </tr>
            <tr>
              <td>Amount received</td>
              <td>{transaction.amountEffective}</td>
            </tr>
            <tr>
              <td>Exchange fee</td>
              <td>{Amounts.stringify(
                Amounts.sub(
                  Amounts.parseOrThrow(transaction.amountRaw),
                  Amounts.parseOrThrow(transaction.amountEffective),
                ).amount
              )}</td>
            </tr>
            <tr>
              <td>When</td>
              <td>{transaction.timestamp.t_ms === "never" ? "never" : format(transaction.timestamp.t_ms, 'dd/MM/yyyy HH:mm:ss')}</td>
            </tr>
          </table>
        </section>
        <Footer />
      </div>
    );
  }


  return <div></div>
}

export function WalletTransaction({ tid }: { tid: string }): JSX.Element {
  const [transaction, setTransaction] = useState<
    Transaction | undefined
  >(undefined);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const res = await wxApi.getTransactions();
      const ts = res.transactions.filter(t => t.transactionId === tid)
      if (ts.length === 1) {
        setTransaction(ts[0]);
      } else {
        route(Pages.history)
      }
    };
    fetchData();
  }, []);

  return <WalletTransactionView
    transaction={transaction}
    onDelete={() => wxApi.deleteTransaction(tid).then(_ => history.go(-1))}
    onBack={() => { history.go(-1) }}
  />
}

export function WalletSettings() {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions()
  return (
    <div>
      <h2>Permissions</h2>
      <PermissionsCheckbox enabled={permissionsEnabled} onToggle={togglePermissions} />
      {/* 
      <h2>Developer mode</h2>
      <DebugCheckbox enabled={permissionsEnabled} onToggle={togglePermissions} /> 
      */}
    </div>
  );
}


export function DebugCheckbox({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }): JSX.Element {
  return (
    <div>
      <input
        checked={enabled}
        onClick={onToggle}
        type="checkbox"
        id="checkbox-perm"
        style={{ width: "1.5em", height: "1.5em", verticalAlign: "middle" }}
      />
      <label
        htmlFor="checkbox-perm"
        style={{ marginLeft: "0.5em", fontWeight: "bold" }}
      >
        Automatically open wallet based on page content
      </label>
      <span
        style={{
          color: "#383838",
          fontSize: "smaller",
          display: "block",
          marginLeft: "2em",
        }}
      >
        (Enabling this option below will make using the wallet faster, but
        requires more permissions from your browser.)
      </span>
    </div>
  );
}

function reload(): void {
  try {
    chrome.runtime.reload();
    window.close();
  } catch (e) {
    // Functionality missing in firefox, ignore!
  }
}

async function confirmReset(): Promise<void> {
  if (
    confirm(
      "Do you want to IRREVOCABLY DESTROY everything inside your" +
      " wallet and LOSE ALL YOUR COINS?",
    )
  ) {
    await wxApi.resetDb();
    window.close();
  }
}

export function WalletDebug(props: any): JSX.Element {
  return (
    <div>
      <p>Debug tools:</p>
      <button onClick={openExtensionPage("/static/popup.html")}>wallet tab</button>
      <br />
      <button onClick={confirmReset}>reset</button>
      <button onClick={reload}>reload chrome extension</button>
      <Diagnostics />
    </div>
  );
}

function openExtensionPage(page: string) {
  return () => {
    chrome.tabs.create({
      url: chrome.extension.getURL(page),
    });
  };
}

// function openTab(page: string) {
//   return (evt: React.SyntheticEvent<any>) => {
//     evt.preventDefault();
//     chrome.tabs.create({
//       url: page,
//     });
//   };
// }

function makeExtensionUrlWithParams(
  url: string,
  params?: { [name: string]: string | undefined },
): string {
  const innerUrl = new URL(chrome.extension.getURL("/" + url));
  if (params) {
    for (const key in params) {
      const p = params[key];
      if (p) {
        innerUrl.searchParams.set(key, p);
      }
    }
  }
  return innerUrl.href;
}

export function actionForTalerUri(talerUri: string): string | undefined {
  const uriType = classifyTalerUri(talerUri);
  switch (uriType) {
    case TalerUriType.TalerWithdraw:
      return makeExtensionUrlWithParams("static/wallet.html#/withdraw", {
        talerWithdrawUri: talerUri,
      });
    case TalerUriType.TalerPay:
      return makeExtensionUrlWithParams("static/wallet.html#/pay", {
        talerPayUri: talerUri,
      });
    case TalerUriType.TalerTip:
      return makeExtensionUrlWithParams("static/wallet.html#/tip", {
        talerTipUri: talerUri,
      });
    case TalerUriType.TalerRefund:
      return makeExtensionUrlWithParams("static/wallet.html#/refund", {
        talerRefundUri: talerUri,
      });
    case TalerUriType.TalerNotifyReserve:
      // FIXME: implement
      break;
    default:
      console.warn(
        "Response with HTTP 402 has Taler header, but header value is not a taler:// URI.",
      );
      break;
  }
  return undefined;
}

export async function findTalerUriInActiveTab(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(
      {
        code: `
        (() => {
          let x = document.querySelector("a[href^='taler://'") || document.querySelector("a[href^='taler+http://'");
          return x ? x.href.toString() : null;
        })();
      `,
        allFrames: false,
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resolve(undefined);
          return;
        }
        console.log("got result", result);
        resolve(result[0]);
      },
    );
  });
}

// export function WalletPopup(): JSX.Element {
//   const [talerActionUrl, setTalerActionUrl] = useState<string | undefined>(
//     undefined,
//   );
//   const [dismissed, setDismissed] = useState(false);
//   useEffect(() => {
//     async function check(): Promise<void> {
//       const talerUri = await findTalerUriInActiveTab();
//       if (talerUri) {
//         const actionUrl = actionForTalerUri(talerUri);
//         setTalerActionUrl(actionUrl);
//       }
//     }
//     check();
//   }, []);
//   if (talerActionUrl && !dismissed) {
//     return (
//       <div style={{ padding: "1em", width: 400 }}>
//         <h1>Taler Action</h1>
//         <p>This page has a Taler action. </p>
//         <p>
//           <button
//             onClick={() => {
//               window.open(talerActionUrl, "_blank");
//             }}
//           >
//             Open
//           </button>
//         </p>
//         <p>
//           <button onClick={() => setDismissed(true)}>Dismiss</button>
//         </p>
//       </div>
//     );
//   }
//   return (
//     <div>
//       <Match>{({ path }: any) => <WalletNavBar current={path} />}</Match>
//       <div style={{ margin: "1em", width: 400 }}>
//         <Router>
//           <Route path={Pages.balance} component={WalletBalanceView} />
//           <Route path={Pages.settings} component={WalletSettings} />
//           <Route path={Pages.debug} component={WalletDebug} />
//           <Route path={Pages.history} component={WalletHistory} />
//           <Route path={Pages.transaction} component={WalletTransaction} />
//         </Router>
//       </div>
//     </div>
//   );
// }

