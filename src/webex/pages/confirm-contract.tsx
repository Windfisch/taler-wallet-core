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
  ContractTerms,
  ExchangeRecord,
  ProposalRecord,
} from "../../types";

import { renderContractTerms } from "../renderHtml";
import * as wxApi from "../wxApi";

import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");


interface DetailState {
  collapsed: boolean;
}

interface DetailProps {
  contractTerms: ContractTerms;
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
              {this.props.contractTerms.exchanges.map(
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
  proposalId: number;
}

interface ContractPromptState {
  proposal: ProposalRecord|null;
  error: string|null;
  payDisabled: boolean;
  alreadyPaid: boolean;
  exchanges: null|ExchangeRecord[];
}

class ContractPrompt extends React.Component<ContractPromptProps, ContractPromptState> {
  constructor() {
    super();
    this.state = {
      error: null,
      exchanges: null,
      proposal: null,
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
    const proposal = await wxApi.getProposal(this.props.proposalId);
    this.setState({proposal} as any);
    this.checkPayment();
    const exchanges = await wxApi.getExchanges();
    this.setState({exchanges} as any);
  }

  async checkPayment() {
    const payStatus = await wxApi.checkPay(this.props.proposalId);
    if (payStatus === "insufficient-balance") {
      const msgInsufficient = i18n.str`You have insufficient funds of the requested currency in your wallet.`;
      // tslint:disable-next-line:max-line-length
      const msgNoMatch = i18n.str`You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.`;
      if (this.state.exchanges && this.state.proposal) {
        const acceptedExchangePubs = this.state.proposal.contractTerms.exchanges.map((e) => e.master_pub);
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
    } else if (payStatus === "paid") {
      this.setState({alreadyPaid: true, payDisabled: false, error: null});
    } else {
      this.setState({payDisabled: false, error: null});
    }
    window.setTimeout(() => this.checkPayment(), 500);
  }

  async doPayment() {
    const proposal = this.state.proposal;
    if (!proposal) {
      return;
    }
    const payStatus = await wxApi.confirmPay(this.props.proposalId);
    switch (payStatus) {
      case "insufficient-balance":
        this.checkPayment();
        return;
      case "paid":
        console.log("contract", proposal.contractTerms);
        document.location.href = proposal.contractTerms.fulfillment_url;
        break;
    }
  }


  render() {
    if (!this.state.proposal) {
      return <span>...</span>;
    }
    const c = this.state.proposal.contractTerms;
    return (
      <div>
        <div>
          {renderContractTerms(c)}
        </div>
        <button onClick={() => this.doPayment()}
                disabled={this.state.payDisabled}
                className="accept">
          Confirm payment
        </button>
        <div>
          {(this.state.alreadyPaid ? <p className="okaybox">You already paid for this, clicking "Confirm payment" will not cost money again.</p> : <p />)}
          {(this.state.error ? <p className="errorbox">{this.state.error}</p> : <p />)}
        </div>
        <Details exchanges={this.state.exchanges} contractTerms={c} collapsed={!this.state.error}/>
      </div>
    );
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const url = new URI(document.location.href);
  const query: any = URI.parseQuery(url.query());
  const proposalId = JSON.parse(query.proposalId);

  ReactDOM.render(<ContractPrompt proposalId={proposalId}/>, document.getElementById(
    "contract")!);
});
