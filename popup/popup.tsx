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


"use strict";

import {substituteFulfillmentUrl} from "../lib/wallet/helpers";
import BrowserClickedEvent = chrome.browserAction.BrowserClickedEvent;
import {HistoryRecord, HistoryLevel} from "../lib/wallet/wallet";
import {AmountJson} from "../lib/wallet/types";
import {abbrev, prettyAmount} from "../lib/wallet/renderHtml";

declare var i18n: any;

function onUpdateNotification(f: () => void) {
  let port = chrome.runtime.connect({name: "notifications"});
  port.onMessage.addListener((msg, port) => {
    f();
  });
}


class Router extends preact.Component<any,any> {
  static setRoute(s: string): void {
    window.location.hash = s;
  }

  static getRoute(): string {
    // Omit the '#' at the beginning
    return window.location.hash.substring(1);
  }

  static onRoute(f: any): () => void {
    this.routeHandlers.push(f);
    return () => {
      let i = this.routeHandlers.indexOf(f);
      this.routeHandlers = this.routeHandlers.splice(i, 1);
    }
  }

  static routeHandlers: any[] = [];

  componentWillMount() {
    console.log("router mounted");
    window.onhashchange = () => {
      this.setState({});
      for (let f of Router.routeHandlers) {
        f();
      }
    }
  }

  componentWillUnmount() {
    console.log("router unmounted");
  }


  render(props: any, state: any): JSX.Element {
    let route = window.location.hash.substring(1);
    console.log("rendering route", route);
    let defaultChild: JSX.Element|null = null;
    for (let child of props.children) {
      if (child.attributes["default"]) {
        defaultChild = child;
      }
      if (child.attributes["route"] == route) {
        return <div>{child}</div>;
      }
    }
    if (defaultChild == null) {
      throw Error("unknown route");
    }
    console.log("rendering default route");
    Router.setRoute(defaultChild.attributes["route"]);
    return <div>{defaultChild}</div>;
  }
}

export function main() {
  console.log("popup main");

  let el = (
    <div>
      <WalletNavBar />
      <div style="margin:1em">
      <Router>
        <WalletBalance route="/balance" default/>
        <WalletHistory route="/history"/>
        <WalletDebug route="/debug"/>
      </Router>
      </div>
    </div>
  );

  preact.render(el, document.getElementById("content")!);
}

interface TabProps extends preact.ComponentProps {
  target: string;
}

function Tab(props: TabProps) {
  let cssClass = "";
  if (props.target == Router.getRoute()) {
    cssClass = "active";
  }
  let onClick = (e: Event) => {
    Router.setRoute(props.target);
    e.preventDefault();
  };
  return (
    <a onClick={onClick} href={props.target} className={cssClass}>
      {props.children}
    </a>
  );
}


class WalletNavBar extends preact.Component<any,any> {
  cancelSubscription: any;

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
      <div class="nav" id="header">
        <Tab target="/balance">
          Balance
        </Tab>
        <Tab target="/history">
          History
        </Tab>
        <Tab target="/debug">
          Debug
        </Tab>
      </div>);
  }
}


function ExtensionLink(props: any) {
  let onClick = (e: Event) => {
    chrome.tabs.create({
                         "url": chrome.extension.getURL(props.target)
                       });
    e.preventDefault();
  };
  return (
    <a onClick={onClick} href={props.target}>
      {props.children}
    </a>)
}

class WalletBalance extends preact.Component<any, any> {
  myWallet: any;
  gotError = false;

  componentWillMount() {
    this.updateBalance();

    onUpdateNotification(() => this.updateBalance());
  }

  updateBalance() {
    chrome.runtime.sendMessage({type: "balances"}, (resp) => {
      if (resp.error) {
        this.gotError = true;
        console.error("could not retrieve balances", resp);
        this.forceUpdate();
        return;
      }
      this.gotError = false;
      console.log("got wallet", resp);
      this.myWallet = resp.balances;
      this.forceUpdate();
    });
  }

  renderEmpty() : JSX.Element {
    let helpLink = (
      <ExtensionLink target="pages/help/empty-wallet.html">
        help
      </ExtensionLink>
    );
    return <div>You have no balance to show. Need some {helpLink} getting started?</div>;
  }

  render(): JSX.Element {
    let wallet = this.myWallet;
    if (this.gotError) {
      return i18n`Error: could not retrieve balance information.`;
    }
    if (!wallet) {
      return this.renderEmpty();
    }
    console.log(wallet);
    let listing = Object.keys(wallet).map((key) => {
      return <p>{prettyAmount(wallet[key])}</p>
    });
    if (listing.length > 0) {
      return <div>{listing}</div>;
    }

    return this.renderEmpty();
  }
}


function formatHistoryItem(historyItem: HistoryRecord) {
  const d = historyItem.detail;
  const t = historyItem.timestamp;
  console.log("hist item", historyItem);
  switch (historyItem.type) {
    case "create-reserve":
      return (
        <p>
          {i18n.parts`Bank requested reserve (${abbrev(d.reservePub)}) for ${prettyAmount(
            d.requestedAmount)}.`}
        </p>
      );
    case "confirm-reserve": {
      // FIXME: eventually remove compat fix
      let exchange = d.exchangeBaseUrl ? URI(d.exchangeBaseUrl).host() : "??";
      let amount = prettyAmount(d.requestedAmount);
      let pub = abbrev(d.reservePub);
      return (
        <p>
          {i18n.parts`Started to withdraw ${amount} from ${exchange} (${pub}).`}
        </p>
      );
    }
    case "offer-contract": {
      let link = chrome.extension.getURL("view-contract.html");
      let linkElem = <a href={link}>{abbrev(d.contractHash)}</a>;
      let merchantElem = <em>{abbrev(d.merchantName, 15)}</em>;
      return (
        <p>
          {i18n.parts`Merchant ${merchantElem} offered contract ${linkElem}.`}
        </p>
      );
    }
    case "depleted-reserve": {
      let exchange = d.exchangeBaseUrl ? URI(d.exchangeBaseUrl).host() : "??";
      let amount = prettyAmount(d.requestedAmount);
      let pub = abbrev(d.reservePub);
      return (<p>
        {i18n.parts`Withdrew ${amount} from ${exchange} (${pub}).`}
      </p>);
    }
    case "pay": {
      let url = substituteFulfillmentUrl(d.fulfillmentUrl,
                                         {H_contract: d.contractHash});
      let merchantElem = <em>{abbrev(d.merchantName, 15)}</em>;
      let fulfillmentLinkElem = <a href={url} onClick={openTab(url)}>view product</a>;
      return (
        <p>
          {i18n.parts`Paid ${prettyAmount(d.amount)} to merchant ${merchantElem}.  (${fulfillmentLinkElem})`}
        </p>);
    }
    default:
      return (<p>i18n`Unknown event (${historyItem.type})`</p>);
  }
}


class WalletHistory extends preact.Component<any, any> {
  myHistory: any[];
  gotError = false;

  componentWillMount() {
    this.update();
    onUpdateNotification(() => this.update());
  }

  update() {
    chrome.runtime.sendMessage({type: "get-history"}, (resp) => {
      console.log("got history response");
      if (resp.error) {
        this.gotError = true;
        console.error("could not retrieve history", resp);
        this.forceUpdate();
        return;
      }
      this.gotError = false;
      console.log("got history", resp.history);
      this.myHistory = resp.history;
      this.forceUpdate();
    });
  }

  render(): JSX.Element {
    console.log("rendering history");
    let history: HistoryRecord[] = this.myHistory;
    if (this.gotError) {
      return i18n`Error: could not retrieve event history`;
    }

    if (!history) {
      // We're not ready yet
      return <span />;
    }

    let subjectMemo: {[s: string]: boolean} = {};
    let listing: any[] = [];
    for (let record of history.reverse()) {
      if (record.subjectId && subjectMemo[record.subjectId]) {
        continue;
      }
      if (record.level != undefined && record.level < HistoryLevel.User) {
        continue;
      }
      subjectMemo[record.subjectId as string] = true;

      let item = (
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
    return <p>{i18n`Your wallet has no events recorded.`}</p>
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
    chrome.runtime.sendMessage({type: "reset"});
    window.close();
  }
}


function WalletDebug(props: any) {
  return (<div>
    <p>Debug tools:</p>
    <button onClick={openExtensionPage("popup/popup.html")}>
      wallet tab
    </button>
    <button onClick={openExtensionPage("pages/show-db.html")}>
      show db
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
  return function() {
    chrome.tabs.create({
                         "url": chrome.extension.getURL(page)
                       });
  }
}


function openTab(page: string) {
  return function() {
    chrome.tabs.create({
                         "url": page
                       });
  }
}
