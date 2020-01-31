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
import * as i18n from "../i18n";

import { AmountJson } from "../../util/amounts";
import * as Amounts from "../../util/amounts";

import {
  WalletBalance,
  WalletBalanceEntry,
} from "../../types/walletTypes";

import {
  abbrev,
  renderAmount,
  PageLink,
  registerMountPage,
} from "../renderHtml";
import * as wxApi from "../wxApi";

import React, { Fragment } from "react";
import { HistoryEvent } from "../../types/history";

import moment from "moment";
import { Timestamp } from "../../util/time";

function onUpdateNotification(f: () => void): () => void {
  const port = chrome.runtime.connect({ name: "notifications" });
  const listener = () => {
    f();
  };
  port.onMessage.addListener(listener);
  return () => {
    port.onMessage.removeListener(listener);
  };
}

class Router extends React.Component<any, any> {
  static setRoute(s: string): void {
    window.location.hash = s;
  }

  static getRoute(): string {
    // Omit the '#' at the beginning
    return window.location.hash.substring(1);
  }

  static onRoute(f: any): () => void {
    Router.routeHandlers.push(f);
    return () => {
      const i = Router.routeHandlers.indexOf(f);
      this.routeHandlers = this.routeHandlers.splice(i, 1);
    };
  }

  private static routeHandlers: any[] = [];

  componentWillMount() {
    console.log("router mounted");
    window.onhashchange = () => {
      this.setState({});
      for (const f of Router.routeHandlers) {
        f();
      }
    };
  }

  componentWillUnmount() {
    console.log("router unmounted");
  }

  render(): JSX.Element {
    const route = window.location.hash.substring(1);
    console.log("rendering route", route);
    let defaultChild: React.ReactChild | null = null;
    let foundChild: React.ReactChild | null = null;
    React.Children.forEach(this.props.children, child => {
      const childProps: any = (child as any).props;
      if (!childProps) {
        return;
      }
      if (childProps.default) {
        defaultChild = child as React.ReactChild;
      }
      if (childProps.route === route) {
        foundChild = child as React.ReactChild;
      }
    });
    const c: React.ReactChild | null = foundChild || defaultChild;
    if (!c) {
      throw Error("unknown route");
    }
    Router.setRoute((c as any).props.route);
    return <div>{c}</div>;
  }
}

interface TabProps {
  target: string;
  children?: React.ReactNode;
}

function Tab(props: TabProps) {
  let cssClass = "";
  if (props.target === Router.getRoute()) {
    cssClass = "active";
  }
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    Router.setRoute(props.target);
    e.preventDefault();
  };
  return (
    <a onClick={onClick} href={props.target} className={cssClass}>
      {props.children}
    </a>
  );
}

class WalletNavBar extends React.Component<any, any> {
  private cancelSubscription: any;

  componentWillMount() {
    this.cancelSubscription = Router.onRoute(() => {
      this.setState({});
    });
  }

  componentWillUnmount() {
    if (this.cancelSubscription) {
      this.cancelSubscription();
    }
  }

  render() {
    console.log("rendering nav bar");
    return (
      <div className="nav" id="header">
        <Tab target="/balance">{i18n.str`Balance`}</Tab>
        <Tab target="/history">{i18n.str`History`}</Tab>
        <Tab target="/debug">{i18n.str`Debug`}</Tab>
      </div>
    );
  }
}

function ExtensionLink(props: any) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    chrome.tabs.create({
      url: chrome.extension.getURL(props.target),
    });
    e.preventDefault();
  };
  return (
    <a onClick={onClick} href={props.target}>
      {props.children}
    </a>
  );
}

/**
 * Render an amount as a large number with a small currency symbol.
 */
function bigAmount(amount: AmountJson): JSX.Element {
  const v = amount.value + amount.fraction / Amounts.fractionalBase;
  return (
    <span>
      <span style={{ fontSize: "5em", display: 'block'}}>{v}</span>{" "}
      <span>{amount.currency}</span>
    </span>
  );
}

function EmptyBalanceView() {
  return (
    <i18n.Translate wrap="p">
      You have no balance to show. Need some{" "}
      <PageLink pageName="welcome.html">help</PageLink> getting started?
    </i18n.Translate>
  );
}

class WalletBalanceView extends React.Component<any, any> {
  private balance: WalletBalance;
  private gotError = false;
  private canceler: (() => void) | undefined = undefined;
  private unmount = false;

  componentWillMount() {
    this.canceler = onUpdateNotification(() => this.updateBalance());
    this.updateBalance();
  }

  componentWillUnmount() {
    console.log("component WalletBalanceView will unmount");
    if (this.canceler) {
      this.canceler();
    }
    this.unmount = true;
  }

  async updateBalance() {
    let balance: WalletBalance;
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
    }
    if (this.unmount) {
      return;
    }
    this.gotError = false;
    console.log("got balance", balance);
    this.balance = balance;
    this.setState({});
  }

  formatPending(entry: WalletBalanceEntry): JSX.Element {
    let incoming: JSX.Element | undefined;
    let payment: JSX.Element | undefined;

    console.log(
      "available: ",
      entry.pendingIncoming ? renderAmount(entry.available) : null,
    );
    console.log(
      "incoming: ",
      entry.pendingIncoming ? renderAmount(entry.pendingIncoming) : null,
    );

    if (Amounts.isNonZero(entry.pendingIncoming)) {
      incoming = (
        <i18n.Translate wrap="span">
          <span style={{ color: "darkgreen" }}>
            {"+"}
            {renderAmount(entry.pendingIncoming)}
          </span>{" "}
          incoming
        </i18n.Translate>
      );
    }

    if (Amounts.isNonZero(entry.pendingPayment)) {
      payment = (
        <i18n.Translate wrap="span">
          <span style={{ color: "red" }}>
            {"-"}
            {renderAmount(entry.pendingPayment)}
          </span>{" "}
          being spent
        </i18n.Translate>
      );
    }

    const l = [incoming, payment].filter(x => x !== undefined);
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
        <div className='balance'>
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
    const listing = Object.keys(wallet.byCurrency).map(key => {
      const entry: WalletBalanceEntry = wallet.byCurrency[key];
      return (
        <p>
          {bigAmount(entry.available)} {this.formatPending(entry)}
        </p>
      );
    });
    return listing.length > 0 ? <div className='balance'>{listing}</div> : <EmptyBalanceView />;
  }
}

function Icon({ l }: { l: string }) {
  return <div className={"icon"}>{l}</div>;
}

function formatAndCapitalize(text: string) {
  text = text.replace("-", " ");
  text = text.replace(/^./, text[0].toUpperCase());
  return text;
}

type HistoryItemProps = {
  title?: string | JSX.Element;
  text?: string | JSX.Element;
  small?: string | JSX.Element;
  amount?: string | AmountJson;
  fees?: string | AmountJson;
  invalid?: string | AmountJson;
  icon?: string;
  timestamp: Timestamp;
  negative?: boolean;
};

function HistoryItem({
  title,
  text,
  small,
  amount,
  fees,
  invalid,
  timestamp,
  icon,
  negative = false
}: HistoryItemProps) {
  function formatDate(timestamp: number | "never") {
    if (timestamp !== "never") {
      const itemDate = moment(timestamp);
      if (itemDate.isBetween(moment().subtract(2, "days"), moment())) {
        return itemDate.fromNow();
      }
      return itemDate.format("lll");
    }
    return null;
  }

  let invalidElement, amountElement, feesElement;

  if (amount) {
    amountElement = renderAmount(amount);
  }

  if (fees) {
    fees = typeof fees === "string" ? Amounts.parse(fees) : fees;
    if (fees && Amounts.isNonZero(fees)) {
      feesElement = renderAmount(fees);
    }
  }

  if (invalid) {
    invalid = typeof invalid === "string" ? Amounts.parse(invalid) : invalid;
    if (invalid && Amounts.isNonZero(invalid)) {
      invalidElement = renderAmount(invalid);
    }
  }

  return (
    <div className="historyItem">
      {icon ? <Icon l={icon} /> : null}
      <div className="historyContent">
        {title ? <div className={"historyTitle"}>{title}</div> : null}
        {text ? <div className={"historyText"}>{text}</div> : null}
        {small ? <div className={"historySmall"}>{small}</div> : null}
      </div>
      <div className={"historyLeft"}>
        <div className={"historyAmount"}>
          {amountElement ? (
            <div className={`${negative ? "negative" : "positive"}`}>
              {amountElement}
            </div>
          ) : null}
          {invalidElement ? (
            <div className={"secondary"}>
              {i18n.str`Invalid `}{" "}
              <span className={"negative"}>{invalidElement}</span>
            </div>
          ) : null}
          {feesElement ? (
            <div className={"secondary"}>
              {i18n.str`Fees `}{" "}
              <span className={"negative"}>{feesElement}</span>
            </div>
          ) : null}
        </div>
        <div className="historyDate">{formatDate(timestamp.t_ms)}</div>
      </div>
    </div>
  );
}

function amountDiff(
  total: string | Amounts.AmountJson,
  partial: string | Amounts.AmountJson
): Amounts.AmountJson | string {
  let a = typeof total === "string" ? Amounts.parse(total) : total;
  let b = typeof partial === "string" ? Amounts.parse(partial) : partial;
  if (a && b) {
    return Amounts.sub(a, b).amount;
  } else {
    return total;
  }
}


function parseSummary(summary: string) {
  let parsed = summary.split(/: (.+)/);
  return {
    merchant: parsed[0],
    item: parsed[1]
  };
}

function formatHistoryItem(historyItem: HistoryEvent) {
  switch (historyItem.type) {
    case "refreshed": {
      return (
        <HistoryItem
          timestamp={historyItem.timestamp}
          small={i18n.str`Refresh sessions has completed`}
          fees={amountDiff(
            historyItem.amountRefreshedRaw,
            historyItem.amountRefreshedEffective
          )}
        />
      );
    }

    case "order-refused": {
      const { merchant, item } = parseSummary(
        historyItem.orderShortInfo.summary
      );
      return (
        <HistoryItem
          icon={"X"}
          timestamp={historyItem.timestamp}
          small={i18n.str`Order Refused`}
          title={merchant}
          text={abbrev(item, 30)}
        />
      );
    }

    case "order-redirected": {
      const { merchant, item } = parseSummary(
        historyItem.newOrderShortInfo.summary
      );
      return (
        <HistoryItem
          icon={"⟲"}
          small={i18n.str`Order redirected`}
          text={abbrev(item, 40)}
          timestamp={historyItem.timestamp}
          title={merchant}
        />
      );
    }

    case "payment-aborted": {
      const { merchant, item } = parseSummary(
        historyItem.orderShortInfo.summary
      );
      return (
        <HistoryItem
          amount={historyItem.orderShortInfo.amount}
          fees={historyItem.amountLost}
          icon={"P"}
          small={i18n.str`Payment aborted`}
          text={abbrev(item, 40)}
          timestamp={historyItem.timestamp}
          title={merchant}
        />
      );
    }

    case "payment-sent": {
      const url = historyItem.orderShortInfo.fulfillmentUrl;
      const { merchant, item } = parseSummary(
        historyItem.orderShortInfo.summary
      );
      const fees = amountDiff(
        historyItem.amountPaidWithFees,
        historyItem.orderShortInfo.amount
      );
      const fulfillmentLinkElem = (
        <Fragment>
          <a
            href={url}
            onClick={openTab(url)}
          >
            {item ? abbrev(item, 30) : null}
          </a>
        </Fragment>
      );
      return (
        <HistoryItem
          amount={historyItem.orderShortInfo.amount}
          fees={fees}
          icon={"P"}
          negative={true}
          small={i18n.str`Payment Sent`}
          text={fulfillmentLinkElem}
          timestamp={historyItem.timestamp}
          title={merchant}
        />
      );
    }
    case "order-accepted": {
      const url = historyItem.orderShortInfo.fulfillmentUrl;
      const { merchant, item } = parseSummary(
        historyItem.orderShortInfo.summary
      );
      const fulfillmentLinkElem = (
        <Fragment>
          <a
            href={url}
            onClick={openTab(url)}
          >
            {item ? abbrev(item, 40) : null}
          </a>
        </Fragment>
      );
      return (
        <HistoryItem
          negative={true}
          amount={historyItem.orderShortInfo.amount}
          icon={"P"}
          small={i18n.str`Order accepted`}
          text={fulfillmentLinkElem}
          timestamp={historyItem.timestamp}
          title={merchant}
        />
      );
    }
    case "reserve-balance-updated": {
      return (
        <HistoryItem
          timestamp={historyItem.timestamp}
          small={i18n.str`Reserve balance updated`}
          fees={amountDiff(
            historyItem.amountExpected,
            historyItem.amountReserveBalance
          )}
        />
      );
    }
    case "refund": {
      const merchantElem = (
        <em>{abbrev(historyItem.orderShortInfo.summary, 25)}</em>
      );
      return (
        <HistoryItem
          icon={"R"}
          timestamp={historyItem.timestamp}
          small={i18n.str`Payment refund`}
          text={merchantElem}
          amount={historyItem.amountRefundedRaw}
          invalid={historyItem.amountRefundedInvalid}
          fees={amountDiff(
            amountDiff(
              historyItem.amountRefundedRaw,
              historyItem.amountRefundedInvalid
            ),
            historyItem.amountRefundedEffective
          )}
        />
      );
    }
    case "withdrawn": {
      const exchange = new URL(historyItem.exchangeBaseUrl).host;
      const fees = amountDiff(
        historyItem.amountWithdrawnRaw,
        historyItem.amountWithdrawnEffective
      );
      return (
        <HistoryItem
          amount={historyItem.amountWithdrawnRaw}
          fees={fees}
          icon={"w"}
          small={i18n.str`Withdrawn`}
          title={exchange}
          timestamp={historyItem.timestamp}
        />
      );
    }
    case "tip-accepted": {
      return (
        <HistoryItem
          icon={"T"}
          negative={true}
          timestamp={historyItem.timestamp}
          title={<i18n.Translate wrap={Fragment}>Tip Accepted</i18n.Translate>}
          amount={historyItem.tipAmountRaw}
        />
      );
    }
    case "tip-declined": {
      return (
        <HistoryItem
          icon={"T"}
          timestamp={historyItem.timestamp}
          title={<i18n.Translate wrap={Fragment}>Tip Declined</i18n.Translate>}
          amount={historyItem.tipAmountRaw}
        />
      );
    }
    default:
      return (
        <HistoryItem
          timestamp={historyItem.timestamp}
          small={i18n.str`${formatAndCapitalize(historyItem.type)}`}
        />
      );
  }
}

const HistoryComponent = (props: any) => {
  const record = props.record;
  return formatHistoryItem(record);
};

class WalletHistory extends React.Component<any, any> {
  private myHistory: any[];
  private gotError = false;
  private unmounted = false;
  private hidenTypes: string[] = [
    "order-accepted",
    "order-redirected",
    "refreshed",
    "reserve-balance-updated",
    "exchange-updated",
    "exchange-added"
  ];
 
  componentWillMount() {
    this.update();
    this.setState({ filter: true });
    onUpdateNotification(() => this.update());
  }

  componentWillUnmount() {
    console.log("history component unmounted");
    this.unmounted = true;
  }

  update() {
    chrome.runtime.sendMessage({ type: "get-history" }, resp => {
      if (this.unmounted) {
        return;
      }
      console.log("got history response");
      if (resp.error) {
        this.gotError = true;
        console.error("could not retrieve history", resp);
        this.setState({});
        return;
      }
      this.gotError = false;
      console.log("got history", resp.history);
      this.myHistory = resp.history;
      this.setState({});
    });
  }

  render(): JSX.Element {
    console.log("rendering history");
    const history: HistoryEvent[] = this.myHistory;
    if (this.gotError) {
      return i18n.str`Error: could not retrieve event history`;
    }

    if (!history) {
      // We're not ready yet
      return <span />;
    }

    const listing: any[] = [];
    const messages = history
      .reverse()
      .filter(hEvent => {
        if (!this.state.filter) return true;
        return this.hidenTypes.indexOf(hEvent.type) === -1;
      });

    for (const record of messages) {
      const item = (<HistoryComponent key={record.eventId} record={record} />);
      listing.push(item);
    }

    if (listing.length > 0) {
      return (
        <div>
          <div className="container">{listing}</div>
          <div className="option">
            Filtered list{" "}
            <input
              type="checkbox"
              checked={this.state.filter}
              onChange={() => this.setState({ filter: !this.state.filter })}
            />
          </div>
        </div>
      );
    }
    return <p>{i18n.str`Your wallet has no events recorded.`}</p>;
  }
}

function reload() {
  try {
    chrome.runtime.reload();
    window.close();
  } catch (e) {
    // Functionality missing in firefox, ignore!
  }
}

function confirmReset() {
  if (
    confirm(
      "Do you want to IRREVOCABLY DESTROY everything inside your" +
        " wallet and LOSE ALL YOUR COINS?",
    )
  ) {
    wxApi.resetDb();
    window.close();
  }
}

function WalletDebug(props: any) {
  return (
    <div>
      <p>Debug tools:</p>
      <button onClick={openExtensionPage("/src/webex/pages/popup.html")}>
        wallet tab
      </button>
      <button onClick={openExtensionPage("/src/webex/pages/benchmark.html")}>
        benchmark
      </button>
      <button onClick={openExtensionPage("/src/webex/pages/show-db.html")}>
        show db
      </button>
      <button onClick={openExtensionPage("/src/webex/pages/tree.html")}>
        show tree
      </button>
      <button onClick={openExtensionPage("/src/webex/pages/logs.html")}>
        show logs
      </button>
      <br />
      <button onClick={confirmReset}>reset</button>
      <button onClick={reload}>reload chrome extension</button>
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

function openTab(page: string) {
  return (evt: React.SyntheticEvent<any>) => {
    evt.preventDefault();
    chrome.tabs.create({
      url: page,
    });
  };
}

function WalletPopup() {
  return (
    <div>
      <WalletNavBar />
      <div style={{ margin: "1em" }}>
        <Router>
          <WalletBalanceView route="/balance" default />
          <WalletHistory route="/history" />
          <WalletDebug route="/debug" />
        </Router>
      </div>
    </div>
  );
}

registerMountPage(() => {
  chrome.runtime.connect({ name: "popup" });
  return <WalletPopup />
});
