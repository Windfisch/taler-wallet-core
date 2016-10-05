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
 *
 * @author Florian Dold
 */


/// <reference path="../lib/decl/preact.d.ts" />
import {substituteFulfillmentUrl} from "../lib/wallet/helpers";
import m from "mithril";
import {Contract, AmountJson} from "../lib/wallet/types";
import {renderContract, prettyAmount} from "../lib/wallet/renderHtml";
"use strict";


interface DetailState {
  collapsed: boolean;
}

interface DetailProps {
  contract: Contract;
}

let h = preact.h;


class Details extends preact.Component<DetailProps, DetailState> {
  constructor() {
    super();
    this.state = {
      collapsed: true
    };
  }

  render(props: DetailProps, state: DetailState) {
    if (state.collapsed) {
      return h("div", {},
               h("button", {
                 className: "linky",
                 onClick: () => {
                   this.setState({collapsed: false});
                 }
               }, "show more details"));
    } else {
      return h("div", {},
               h("button", {
                 className: "linky",
                 onClick: () => {
                   this.setState({collapsed: true});
                 }
               }, "show less details"),
               h("div", {},
                 "Accepted exchanges:",
                 h("ul", {},
                   ...props.contract.exchanges.map(
                     e => h("li", {}, `${e.url}: ${e.master_pub}`)))));
    }
  }
}

interface ContractPromptProps {
  offer: any;
}

interface ContractPromptState {
  error: string|null;
  payDisabled: boolean;
}

class ContractPrompt extends preact.Component<ContractPromptProps, ContractPromptState> {
  constructor() {
    super();
    this.state = {
      error: null,
      payDisabled: true,
    }
  }

  componentWillMount() {
    this.checkPayment();
  }

  componentWillUnmount() {
    // FIXME: abort running ops
  }

  checkPayment() {
    let msg = {
      type: 'check-pay',
      detail: {
        offer: this.props.offer
      }
    };
    chrome.runtime.sendMessage(msg, (resp) => {
      if (resp.error) {
        console.log("check-pay error", JSON.stringify(resp));
        switch (resp.error) {
          case "coins-insufficient":
            this.state.error = i18n`You have insufficient funds of the requested currency in your wallet.`;
            break;
          default:
            this.state.error = `Error: ${resp.error}`;
            break;
        }
        this.state.payDisabled = true;
      } else {
        this.state.payDisabled = false;
        this.state.error = null;
      }
      this.forceUpdate();
      window.setTimeout(() => this.checkPayment(), 300);
    });
  }

  doPayment() {
    let d = {offer: this.props.offer};
    chrome.runtime.sendMessage({type: 'confirm-pay', detail: d}, (resp) => {
      if (resp.error) {
        console.log("confirm-pay error", JSON.stringify(resp));
        switch (resp.error) {
          case "coins-insufficient":
            this.state.error = "You do not have enough coins of the" +
              " requested currency.";
            break;
          default:
            this.state.error = `Error: ${resp.error}`;
            break;
        }
        preact.rerender();
        return;
      }
      let c = d.offer.contract;
      console.log("contract", c);
      document.location.href = substituteFulfillmentUrl(c.fulfillment_url,
                                                        this.props.offer);
    });
  }


  render(props: ContractPromptProps, state: ContractPromptState) {
    let c = props.offer.contract;
    return h("div", {},
             renderContract(c),
             h("button",
               {
                 onClick: () => this.doPayment(),
                 disabled: state.payDisabled,
                 "className": "accept"
               },
               i18n`Confirm Payment`),
             (state.error ? h("p",
                              {className: "errorbox"},
                              state.error) : h("p",  "")),
             h(Details, {contract: c})
    );
  }
}


export function main() {
  let url = URI(document.location.href);
  let query: any = URI.parseQuery(url.query());
  let offer = JSON.parse(query.offer);
  console.dir(offer);
  let contract = offer.contract;


  let prompt = h(ContractPrompt, {offer});
  preact.render(prompt, document.getElementById("contract")!);
}
