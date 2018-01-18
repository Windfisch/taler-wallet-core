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
  ExchangeRecord,
  ProposalDownloadRecord,
} from "../../dbTypes";
import { ContractTerms } from "../../talerTypes";
import {
  CheckPayResult,
} from "../../walletTypes";

import { renderAmount } from "../renderHtml";
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
  proposalId?: number;
  contractUrl?: string;
  sessionId?: string;
  resourceUrl?: string;
}

interface ContractPromptState {
  proposalId: number | undefined;
  proposal: ProposalDownloadRecord | null;
  error: string |  null;
  payDisabled: boolean;
  alreadyPaid: boolean;
  exchanges: null|ExchangeRecord[];
  /**
   * Don't request updates to proposal state while
   * this is set to true, to avoid UI flickering
   * when pressing pay.
   */
  holdCheck: boolean;
  payStatus?: CheckPayResult;
}

class ContractPrompt extends React.Component<ContractPromptProps, ContractPromptState> {
  constructor(props: ContractPromptProps) {
    super(props);
    this.state = {
      alreadyPaid: false,
      error: null,
      exchanges: null,
      holdCheck: false,
      payDisabled: true,
      proposal: null,
      proposalId: props.proposalId,
    };
  }

  componentWillMount() {
    this.update();
  }

  componentWillUnmount() {
    // FIXME: abort running ops
  }

  async update() {
    if (this.props.resourceUrl) {
      const p = await wxApi.queryPaymentByFulfillmentUrl(this.props.resourceUrl);
      console.log("query for resource url", this.props.resourceUrl, "result", p);
      if (p.found && (p.lastSessionSig === undefined || p.lastSessionSig === this.props.sessionId)) {
        const nextUrl = new URI(p.contractTerms.fulfillment_url);
        nextUrl.addSearch("order_id", p.contractTerms.order_id);
        if (p.lastSessionSig) {
          nextUrl.addSearch("session_sig", p.lastSessionSig);
        }
        location.href = nextUrl.href();
      }
    }
    let proposalId = this.props.proposalId;
    if (proposalId === undefined) {
      if (this.props.contractUrl === undefined) {
        // Nothing we can do ...
        return;
      }
      proposalId = await wxApi.downloadProposal(this.props.contractUrl);
    }
    const proposal = await wxApi.getProposal(proposalId);
    this.setState({ proposal, proposalId });
    this.checkPayment();
    const exchanges = await wxApi.getExchanges();
    this.setState({ exchanges });
  }

  async checkPayment() {
    window.setTimeout(() => this.checkPayment(), 500);
    if (this.state.holdCheck) {
      return;
    }
    const proposalId = this.state.proposalId;
    if (proposalId === undefined) {
      return;
    }
    const payStatus = await wxApi.checkPay(proposalId);
    if (payStatus.status === "insufficient-balance") {
      const msgInsufficient = i18n.str`You have insufficient funds of the requested currency in your wallet.`;
      // tslint:disable-next-line:max-line-length
      const msgNoMatch = i18n.str`You do not have any funds from an exchange that is accepted by this merchant. None of the exchanges accepted by the merchant is known to your wallet.`;
      if (this.state.exchanges && this.state.proposal) {
        const acceptedExchangePubs = this.state.proposal.contractTerms.exchanges.map((e) => e.master_pub);
        const ex = this.state.exchanges.find((e) => acceptedExchangePubs.indexOf(e.masterPublicKey) >= 0);
        if (ex) {
          this.setState({ error: msgInsufficient });
        } else {
          this.setState({ error: msgNoMatch });
        }
      } else {
        this.setState({ error: msgInsufficient });
      }
      this.setState({ payDisabled: true });
    } else if (payStatus.status === "paid") {
      this.setState({ alreadyPaid: true, payDisabled: false, error: null, payStatus });
    } else {
      this.setState({ payDisabled: false, error: null, payStatus });
    }
  }

  async doPayment() {
    const proposal = this.state.proposal;
    this.setState({holdCheck: true});
    if (!proposal) {
      return;
    }
    const proposalId = proposal.id;
    if (proposalId === undefined) {
      console.error("proposal has no id");
      return;
    }
    console.log("confirmPay with", proposalId, "and", this.props.sessionId);
    const payResult = await wxApi.confirmPay(proposalId, this.props.sessionId);
    console.log("payResult", payResult);
    document.location.href = payResult.nextUrl;
    this.setState({ holdCheck: true });
  }


  render() {
    if (this.props.contractUrl === undefined && this.props.proposalId === undefined) {
      return <span>Error: either contractUrl or proposalId must be given</span>;
    }
    if (this.state.proposalId === undefined) {
      return <span>Downloading contract terms</span>;
    }
    if (!this.state.proposal) {
      return <span>...</span>;
    }
    const c = this.state.proposal.contractTerms;
    let merchantName;
    if (c.merchant && c.merchant.name) {
      merchantName = <strong>{c.merchant.name}</strong>;
    } else {
      merchantName = <strong>(pub: {c.merchant_pub})</strong>;
    }
    const amount = <strong>{renderAmount(c.amount)}</strong>;
    console.log("payStatus", this.state.payStatus);
    return (
      <div>
        <div>
          <i18n.Translate wrap="p">
            The merchant <span>{merchantName}</span> {" "}
            offers you to purchase:
          </i18n.Translate>
          <ul>
            {c.products.map(
              (p: any, i: number) => (<li key={i}>{p.description}: {renderAmount(p.price)}</li>))
            }
          </ul>
            {(this.state.payStatus && this.state.payStatus.coinSelection)
              ? <p>
                  The total price is <span>{amount}</span>{" "}
                  (plus <span>{renderAmount(this.state.payStatus.coinSelection.totalFees)}</span> fees).
                </p>
              :
              <p>The total price is <span>{amount}</span>.</p>
            }
        </div>
        <button className="pure-button button-success"
                disabled={this.state.payDisabled}
                onClick={() => this.doPayment()}>
          {i18n.str`Confirm payment`}
        </button>
        <div>
          {(this.state.alreadyPaid
            ? <p className="okaybox">
                You already paid for this, clicking "Confirm payment" will not cost money again.
              </p>
            : <p />)}
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

  let proposalId;
  try {
    proposalId = JSON.parse(query.proposalId);
  } catch  {
    // ignore error
  }

  const sessionId = query.sessionId;
  const contractUrl = query.contractUrl;

  const resourceUrl = query.resourceUrl;

  ReactDOM.render(
    <ContractPrompt {...{ proposalId, contractUrl, sessionId, resourceUrl }}/>,
    document.getElementById("contract")!);
});
