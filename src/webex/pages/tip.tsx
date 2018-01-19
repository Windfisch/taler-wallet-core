/*
 This file is part of TALER
 (C) 2017 GNUnet e.V.

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
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */

import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");

import * as i18n from "../../i18n";

import {
  acceptTip,
  getTipStatus,
} from "../wxApi";

import {
  WithdrawDetailView,
  renderAmount,
} from "../renderHtml";

import * as Amounts from "../../amounts";
import { TipToken } from "../../talerTypes";
import { TipStatus } from "../../walletTypes";

interface TipDisplayProps {
  tipToken: TipToken;
}

interface TipDisplayState {
  tipStatus?: TipStatus;
  working: boolean;
}

class TipDisplay extends React.Component<TipDisplayProps, TipDisplayState> {
  constructor(props: TipDisplayProps) {
    super(props);
    this.state = { working: false };
  }

  async update() {
    const tipStatus = await getTipStatus(this.props.tipToken);
    this.setState({ tipStatus });
  }

  componentDidMount() {
    this.update();
    const port = chrome.runtime.connect();
    port.onMessage.addListener((msg: any) => {
      if (msg.notify) {
        console.log("got notified");
        this.update();
      }
    });
    this.update();
  }

  renderExchangeInfo(ts: TipStatus) {
    const rci = ts.rci;
    if (!rci) {
      return <p>Waiting for info about exchange ...</p>;
    }
    const totalCost = Amounts.add(rci.overhead, rci.withdrawFee).amount;
    return (
      <div>
        <p>
          The tip is handled by the exchange <strong>{rci.exchangeInfo.baseUrl}</strong>.{" "}
          The exchange provider will charge
          {" "}
          <strong>{renderAmount(totalCost)}</strong>
          {" "}.
        </p>
        <WithdrawDetailView rci={rci} />
      </div>
    );
  }

  accept() {
    this.setState({ working: true});
    acceptTip(this.props.tipToken);
  }

  renderButtons() {
    return (
      <form className="pure-form">
        <button
            className="pure-button pure-button-primary"
            type="button"
            onClick={() => this.accept()}>
          { this.state.working
            ? <span><object className="svg-icon svg-baseline" data="/img/spinner-bars.svg" /> </span>
            : null }
          Accept tip
        </button>
        {" "}
        <button className="pure-button" type="button" onClick={() => { window.close(); }}>Discard tip</button>
      </form>
    );
  }

  render(): JSX.Element {
    const ts = this.state.tipStatus;
    if (!ts) {
      return <p>Processing ...</p>;
    }
    return (
      <div>
        <h2>Tip Received!</h2>
        <p>You received a tip of <strong>{renderAmount(ts.tip.amount)}</strong> from <span> </span>
        <strong>{ts.tip.merchantDomain}</strong>.</p>
        {ts.tip.accepted
          ? <p>You've accepted this tip! <a href={ts.tip.nextUrl}>Go back to merchant</a></p>
          : this.renderButtons()
        }
        {this.renderExchangeInfo(ts)}
      </div>
    );
  }
}

async function main() {
  try {
    const url = new URI(document.location.href);
    const query: any = URI.parseQuery(url.query());

    const tipToken = TipToken.checked(JSON.parse(query.tip_token));

    ReactDOM.render(<TipDisplay tipToken={tipToken} />,
                    document.getElementById("container")!);

  } catch (e) {
    // TODO: provide more context information, maybe factor it out into a
    // TODO:generic error reporting function or component.
    document.body.innerText = i18n.str`Fatal error: "${e.message}".`;
    console.error(`got error "${e.message}"`, e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  main();
});
