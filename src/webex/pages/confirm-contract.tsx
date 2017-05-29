/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

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
 * Page shown to the user to confirm entering
 * a contract.
 */


/**
 * Imports.
 */
import * as i18n from "../../i18n";
import {
  Contract,
  ExchangeRecord,
  OfferRecord,
} from "../../types";

import { renderContract } from "../renderHtml";
import * as wxApi from "../wxApi";

import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");


interface DetailState {
  collapsed: boolean;
}

interface DetailProps {
  contract: Contract;
  collapsed: boolean;
  exchanges: null|ExchangeRecord[];
}


class Details extends React.Component<DetailProps, DetailState> {
  constructor(props: DetailProps) {
    super(props);
    console.log("new Details component created");
    this.state = {
      collapsed: props.collapsed,
    };

    console.log("initial state:", this.state);
  }

  render() {
    if (this.state.collapsed) {
      return (
        <div>
          <button className="linky"
                  onClick={() => { this.setState({collapsed: false} as any); }}>
          <i18n.Translate wrap="span">
            show more details
          </i18n.Translate>
          </button>
        </div>
      );
    } else {
      return (
        <div>
          <button className="linky"
                  onClick={() => this.setState({collapsed: true} as any)}>
            show less details
          </button>
          <div>
            {i18n.str`Accepted exchanges:`}
            <ul>
              {this.props.contract.exchanges.map(
                (e) => <li>{`${e.url}: ${e.master_pub}`}</li>)}
            </ul>
            {i18n.str`Exchanges in the wallet:`}
            <ul>
              {(this.props.exchanges || []).map(
                (e: ExchangeRecord) =>
                  <li>{`${e.baseUrl}: ${e.masterPublicKey}`}</li>)}
            </ul>
          </div>
        </div>);
    }
  }
}

interface ContractPromptProps {
  offerId: number;
}

interface ContractPromptState {
  offer: OfferRecord|null;
  error: string|null;
  payDisabled: boolean;
  exchanges: null|ExchangeRecord[];
}

class ContractPrompt extends React.Component<ContractPromptProps, ContractPromptState> {
  constructor() {
    super();
    this.state = {
      error: null,
      exchanges: null,
      offer: null,
      payDisabled: true,
    };
  }

  componentWillMount() {
    this.update();
  }

  componentWillUnmount() {
    // FIXME: abort running ops
  }

  async update() {
    const offer = await wxApi.getOffer(this.props.offerId);
    this.setState({offer} as any);
    this.checkPayment();
    const exchanges = await wxApi.getExchanges();
    this.setState({exchanges} as any);
  }

  async checkPayment() {
    const offer = this.state.offer;
    if (!offer) {
      return;
    }
    const payStatus = await wxApi.checkPay(offer);

    if (payStatus === "insufficient-balance") {
      const msgInsufficient = i18n.str`You have insufficient funds of the requested currency in your wallet.`;
      // tslint:disable-next-line:max-line-length
      const msgNoMatch = i18n.str`You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.`;
      if (this.state.exchanges && this.state.offer) {
        const acceptedExchangePubs = this.state.offer.contract.exchanges.map((e) => e.master_pub);
        const ex = this.state.exchanges.find((e) => acceptedExchangePubs.indexOf(e.masterPublicKey) >= 0);
        if (ex) {
          this.setState({error: msgInsufficient});
        } else {
          this.setState({error: msgNoMatch});
        }
      } else {
        this.setState({error: msgInsufficient});
      }
      this.setState({payDisabled: true});
    } else {
      this.setState({payDisabled: false, error: null});
    }
    window.setTimeout(() => this.checkPayment(), 500);
  }

  async doPayment() {
    const offer = this.state.offer;
    if (!offer) {
      return;
    }
    const payStatus = await wxApi.confirmPay(offer);
    switch (payStatus) {
      case "insufficient-balance":
        this.checkPayment();
        return;
      case "paid":
        console.log("contract", offer.contract);
        document.location.href = offer.contract.fulfillment_url;
        break;
    }
  }


  render() {
    if (!this.state.offer) {
      return <span>...</span>;
    }
    const c = this.state.offer.contract;
    return (
      <div>
        <div>
          {renderContract(c)}
        </div>
        <button onClick={() => this.doPayment()}
                disabled={this.state.payDisabled}
                className="accept">
          Confirm payment
        </button>
        <div>
          {(this.state.error ? <p className="errorbox">{this.state.error}</p> : <p />)}
        </div>
        <Details exchanges={this.state.exchanges} contract={c} collapsed={!this.state.error}/>
      </div>
    );
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const url = new URI(document.location.href);
  const query: any = URI.parseQuery(url.query());
  const offerId = JSON.parse(query.offerId);

  ReactDOM.render(<ContractPrompt offerId={offerId}/>, document.getElementById(
    "contract")!);
});
