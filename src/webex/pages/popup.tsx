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
import * as i18n from "../../i18n";

import { runOnceWhenReady } from "./common";

import { AmountJson } from "../../amounts";
import * as Amounts from "../../amounts";

import {
  HistoryRecord,
  WalletBalance,
  WalletBalanceEntry,
} from "../../walletTypes";

import { abbrev, renderAmount } from "../renderHtml";
import * as wxApi from "../wxApi";

import * as React from "react";
import * as ReactDOM from "react-dom";

import URI = require("urijs");

function onUpdateNotification(f: () => void): () => void {
  const port = chrome.runtime.connect({name: "notifications"});
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
    let defaultChild: React.ReactChild|null = null;
    let foundChild: React.ReactChild|null = null;
    React.Children.forEach(this.props.children, (child) => {
      const childProps: any = (child as any).props;
      if (!childProps) {
        return;
      }
      if (childProps.default) {
        defaultChild = child;
      }
      if (childProps.route === route) {
        foundChild = child;
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
        <Tab target="/balance">
          {i18n.str`Balance`}
        </Tab>
        <Tab target="/history">
          {i18n.str`History`}
        </Tab>
        <Tab target="/debug">
          {i18n.str`Debug`}
        </Tab>
      </div>);
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
      <span style={{fontSize: "300%"}}>{v}</span>
      {" "}
      <span>{amount.currency}</span>
      </span>
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

  renderEmpty(): JSX.Element {
    const helpLink = (
      <ExtensionLink target="/src/webex/pages/help/empty-wallet.html">
        {i18n.str`help`}
      </ExtensionLink>
    );
    return (
      <div>
        <i18n.Translate wrap="p">
        You have no balance to show. Need some
          {" "}<span>{helpLink}</span>{" "}
          getting started?
        </i18n.Translate>
      </div>
    );
  }

  formatPending(entry: WalletBalanceEntry): JSX.Element {
    let incoming: JSX.Element | undefined;
    let payment: JSX.Element | undefined;

    console.log("available: ", entry.pendingIncoming ? renderAmount(entry.available) : null);
    console.log("incoming: ", entry.pendingIncoming ? renderAmount(entry.pendingIncoming) : null);

    if (Amounts.isNonZero(entry.pendingIncoming)) {
      incoming = (
        <i18n.Translate wrap="span">
          <span style={{color: "darkgreen"}}>
            {"+"}
            {renderAmount(entry.pendingIncoming)}
          </span>
          {" "}
          incoming
      </i18n.Translate>
      );
    }

    if (Amounts.isNonZero(entry.pendingPayment)) {
      payment = (
        <i18n.Translate wrap="span">
          <span style={{color: "red"}}>
            {"-"}
            {renderAmount(entry.pendingPayment)}
          </span>
          {" "}
          being spent
        </i18n.Translate>
      );
    }

    const l = [incoming, payment].filter((x) => x !== undefined);
    if (l.length === 0) {
      return <span />;
    }

    if (l.length === 1) {
      return <span>({l})</span>;
    }
    return <span>({l[0]}, {l[1]})</span>;

  }

  render(): JSX.Element {
    const wallet = this.balance;
    if (this.gotError) {
      return i18n.str`Error: could not retrieve balance information.`;
    }
    if (!wallet) {
      return <span></span>;
    }
    console.log(wallet);
    let paybackAvailable = false;
    const listing = Object.keys(wallet.byCurrency).map((key) => {
      const entry: WalletBalanceEntry = wallet.byCurrency[key];
      if (entry.paybackAmount.value !== 0 || entry.paybackAmount.fraction !== 0) {
        paybackAvailable = true;
      }
      return (
        <p>
          {bigAmount(entry.available)}
          {" "}
          {this.formatPending(entry)}
        </p>
      );
    });
    const makeLink = (page: string, name: string) => {
      const url = chrome.extension.getURL(`/src/webex/pages/${page}`);
      return <div><a className="actionLink" href={url} target="_blank">{name}</a></div>;
    };
    return (
      <div>
        {listing.length > 0 ? listing : this.renderEmpty()}
        {paybackAvailable && makeLink("payback", i18n.str`Payback`)}
        {makeLink("return-coins.html#dissolve", i18n.str`Return Electronic Cash to Bank Account`)}
        {makeLink("auditors.html", i18n.str`Manage Trusted Auditors and Exchanges`)}
      </div>
    );
  }
}


function formatHistoryItem(historyItem: HistoryRecord) {
  const d = historyItem.detail;
  console.log("hist item", historyItem);
  switch (historyItem.type) {
    case "create-reserve":
      return (
        <i18n.Translate wrap="p">
          Bank requested reserve (<span>{abbrev(d.reservePub)}</span>) for
          {" "}
          <span>{renderAmount(d.requestedAmount)}</span>.
        </i18n.Translate>
      );
    case "confirm-reserve": {
      const exchange = (new URI(d.exchangeBaseUrl)).host();
      const pub = abbrev(d.reservePub);
      return (
        <i18n.Translate wrap="p">
          Started to withdraw
          <span>{renderAmount(d.requestedAmount)}</span>
          from <span>{exchange}</span> (<span>{pub}</span>).
        </i18n.Translate>
      );
    }
    case "offer-contract": {
      return (
        <i18n.Translate wrap="p">
          Merchant <em>{abbrev(d.merchantName, 15)}</em> offered
          contract <span>{abbrev(d.contractTermsHash)}</span>.
        </i18n.Translate>
      );
    }
    case "depleted-reserve": {
      const exchange = d.exchangeBaseUrl ? (new URI(d.exchangeBaseUrl)).host() : "??";
      const amount = renderAmount(d.requestedAmount);
      const pub = abbrev(d.reservePub);
      return (
        <i18n.Translate wrap="p">
          Withdrew <span>{amount}</span> from <span>{exchange}</span> (<span>{pub}</span>).
        </i18n.Translate>
      );
    }
    case "pay": {
      const url = d.fulfillmentUrl;
      const merchantElem = <em>{abbrev(d.merchantName, 15)}</em>;
      const fulfillmentLinkElem = <a href={url} onClick={openTab(url)}>view product</a>;
      return (
        <i18n.Translate wrap="p">
          Paid <span>{renderAmount(d.amount)}</span> to merchant <span>{merchantElem}</span>.
          <span> </span>
          (<span>{fulfillmentLinkElem}</span>)
        </i18n.Translate>
      );
    }
    case "refund": {
      const merchantElem = <em>{abbrev(d.merchantName, 15)}</em>;
      return (
        <i18n.Translate wrap="p">
          Merchant <span>{merchantElem}</span> gave a refund over <span>{renderAmount(d.refundAmount)}</span>.
        </i18n.Translate>
      );
    }
    case "tip": {
      const tipPageUrl = new URI(chrome.extension.getURL("/src/webex/pages/tip.html"));
      const params = { tip_id: d.tipId, merchant_domain: d.merchantDomain };
      const url = tipPageUrl.query(params).href();
      const tipLink = <a href={url} onClick={openTab(url)}>{i18n.str`tip`}</a>;
      // i18n: Tip
      return (
        <>
          <i18n.Translate wrap="p">
            Merchant <span>{d.merchantDomain}</span> gave
            a <span>{tipLink}</span> of <span>{renderAmount(d.amount)}</span>.
          </i18n.Translate>
          <span> { d.accepted ? null : <i18n.Translate>You did not accept the tip yet.</i18n.Translate> }</span>
        </>
      );
    }
    default:
      return (<p>{i18n.str`Unknown event (${historyItem.type})`}</p>);
  }
}


class WalletHistory extends React.Component<any, any> {
  private myHistory: any[];
  private gotError = false;
  private unmounted = false;

  componentWillMount() {
    this.update();
    onUpdateNotification(() => this.update());
  }

  componentWillUnmount() {
    console.log("history component unmounted");
    this.unmounted = true;
  }

  update() {
    chrome.runtime.sendMessage({type: "get-history"}, (resp) => {
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
    const history: HistoryRecord[] = this.myHistory;
    if (this.gotError) {
      return i18n.str`Error: could not retrieve event history`;
    }

    if (!history) {
      // We're not ready yet
      return <span />;
    }

    const listing: any[] = [];
    for (const record of history.reverse()) {
      const item = (
        <div className="historyItem">
          <div className="historyDate">
            {(new Date(record.timestamp)).toString()}
          </div>
          {formatHistoryItem(record)}
        </div>
      );

      listing.push(item);
    }

    if (listing.length > 0) {
      return <div className="container">{listing}</div>;
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
  if (confirm("Do you want to IRREVOCABLY DESTROY everything inside your" +
              " wallet and LOSE ALL YOUR COINS?")) {
    wxApi.resetDb();
    window.close();
  }
}


function WalletDebug(props: any) {
  return (<div>
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
    <button onClick={confirmReset}>
      reset
    </button>
    <button onClick={reload}>
      reload chrome extension
    </button>
  </div>);
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


const el = (
  <div>
    <WalletNavBar />
    <div style={{margin: "1em"}}>
      <Router>
        <WalletBalanceView route="/balance" default/>
        <WalletHistory route="/history"/>
        <WalletDebug route="/debug"/>
      </Router>
    </div>
  </div>
);

runOnceWhenReady(() => {
  ReactDOM.render(el, document.getElementById("content")!);
  // Will be used by the backend to detect when the popup gets closed,
  // so we can clear notifications
  chrome.runtime.connect({name: "popup"});
});
