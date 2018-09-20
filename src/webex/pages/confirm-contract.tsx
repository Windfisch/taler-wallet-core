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

import { runOnceWhenReady } from "./common";

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
import { WalletApiError } from "../wxApi";

import * as Amounts from "../../amounts";


interface DetailState {
  collapsed: boolean;
}

interface DetailProps {
  contractTerms: ContractTerms;
  collapsed: boolean;
  exchanges: ExchangeRecord[] | undefined;
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
            i18n.str`show fewer details`
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
  proposal: ProposalDownloadRecord | undefined;
  checkPayError: string | undefined;
  confirmPayError: object | undefined;
  payDisabled: boolean;
  alreadyPaid: boolean;
  exchanges: ExchangeRecord[] | undefined;
  /**
   * Don't request updates to proposal state while
   * this is set to true, to avoid UI flickering
   * when pressing pay.
   */
  holdCheck: boolean;
  payStatus?: CheckPayResult;
  replaying: boolean;
  payInProgress: boolean;
  payAttempt: number;
  working: boolean;
  abortDone: boolean;
  abortStarted: boolean;
}

class ContractPrompt extends React.Component<ContractPromptProps, ContractPromptState> {
  constructor(props: ContractPromptProps) {
    super(props);
    this.state = {
      abortDone: false,
      abortStarted: false,
      alreadyPaid: false,
      checkPayError: undefined,
      confirmPayError: undefined,
      exchanges: undefined,
      holdCheck: false,
      payAttempt: 0,
      payDisabled: true,
      payInProgress: false,
      proposal: undefined,
      proposalId: props.proposalId,
      replaying: false,
      working: false,
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
      if (p && p.finished) {
        if (p.lastSessionSig === undefined || p.lastSessionSig === this.props.sessionId) {
          const nextUrl = new URI(p.contractTerms.fulfillment_url);
          nextUrl.addSearch("order_id", p.contractTerms.order_id);
          if (p.lastSessionSig) {
            nextUrl.addSearch("session_sig", p.lastSessionSig);
          }
          location.replace(nextUrl.href());
          return;
        } else {
          // We're in a new session
          this.setState({ replaying: true });
          // FIXME:  This could also go wrong.  However the payment
          // was already successful once, so we can just retry and not refund it.
          const payResult = await wxApi.submitPay(p.contractTermsHash, this.props.sessionId);
          console.log("payResult", payResult);
          location.replace(payResult.nextUrl);
          return;
        }
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
          this.setState({ checkPayError: msgInsufficient });
        } else {
          this.setState({ checkPayError: msgNoMatch });
        }
      } else {
        this.setState({ checkPayError: msgInsufficient });
      }
      this.setState({ payDisabled: true });
    } else if (payStatus.status === "paid") {
      this.setState({ alreadyPaid: true, payDisabled: false, checkPayError: undefined, payStatus });
    } else {
      this.setState({ payDisabled: false, checkPayError: undefined, payStatus });
    }
  }

  async doPayment() {
    const proposal = this.state.proposal;
    this.setState({ holdCheck: true, payAttempt: this.state.payAttempt + 1});
    if (!proposal) {
      return;
    }
    const proposalId = proposal.id;
    if (proposalId === undefined) {
      console.error("proposal has no id");
      return;
    }
    console.log("confirmPay with", proposalId, "and", this.props.sessionId);
    let payResult;
    this.setState({ working: true });
    try {
      payResult = await wxApi.confirmPay(proposalId, this.props.sessionId);
    } catch (e) {
      if (!(e instanceof WalletApiError)) {
        throw e;
      }
      this.setState({ confirmPayError: e.detail });
      return;
    }
    console.log("payResult", payResult);
    document.location.replace(payResult.nextUrl);
    this.setState({ holdCheck: true });
  }


  async abortPayment() {
    const proposal = this.state.proposal;
    this.setState({ holdCheck: true, abortStarted: true });
    if (!proposal) {
      return;
    }
    wxApi.abortFailedPayment(proposal.contractTermsHash);
    this.setState({ abortDone: true });
  }


  render() {
    if (this.props.contractUrl === undefined && this.props.proposalId === undefined) {
      return <span>Error: either contractUrl or proposalId must be given</span>;
    }
    if (this.state.replaying) {
      return <span>Re-submitting existing payment</span>;
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
    const amount = <strong>{renderAmount(Amounts.parseOrThrow(c.amount))}</strong>;
    console.log("payStatus", this.state.payStatus);

    let products = null;
    if (c.products.length) {
      products = (
        <div>
          <span>The following items are included:</span>
          <ul>
            {c.products.map(
              (p: any, i: number) => (<li key={i}>{p.description}: {renderAmount(p.price)}</li>))
            }
          </ul>
      </div>
      );
    }

    const ConfirmButton = () => (
      <button className="pure-button button-success"
              disabled={this.state.payDisabled}
              onClick={() => this.doPayment()}>
        {i18n.str`Confirm payment`}
      </button>
    );

    const WorkingButton = () => (
      <div>
      <button className="pure-button button-success"
              disabled={this.state.payDisabled}
              onClick={() => this.doPayment()}>
        <span><object className="svg-icon svg-baseline" data="/img/spinner-bars.svg" /> </span>
        {i18n.str`Submitting payment`}
      </button>
      </div>
    );

    const ConfirmPayDialog = () => (
      <div>
        {this.state.working ? WorkingButton() : ConfirmButton()}
        <div>
          {(this.state.alreadyPaid
            ? <p className="okaybox">
              {i18n.str`You already paid for this, clicking "Confirm payment" will not cost money again.`}
              </p>
            : <p />)}
          {(this.state.checkPayError ? <p className="errorbox">{this.state.checkPayError}</p> : <p />)}
        </div>
        <Details exchanges={this.state.exchanges} contractTerms={c} collapsed={!this.state.checkPayError}/>
      </div>
    );

    const PayErrorDialog = () => (
      <div>
        <p>There was an error paying (attempt #{this.state.payAttempt}):</p>
        <pre>{JSON.stringify(this.state.confirmPayError)}</pre>
        { this.state.abortStarted
        ? <span>{i18n.str`Aborting payment ...`}</span>
        : this.state.abortDone
        ? <span>{i18n.str`Payment aborted!`}</span>
        : <>
            <button className="pure-button" onClick={() => this.doPayment()}>
            {i18n.str`Retry Payment`}
            </button>
            <button className="pure-button" onClick={() => this.abortPayment()}>
            {i18n.str`Abort Payment`}
            </button>
          </>
        }
      </div>
    );

    return (
        <div>
          <i18n.Translate wrap="p">
            The merchant{" "}<span>{merchantName}</span> offers you to purchase:
          </i18n.Translate>
          <div style={{"textAlign": "center"}}>
            <strong>{c.summary}</strong>
          </div>
          <strong></strong>
          {products}
          {(this.state.payStatus && this.state.payStatus.coinSelection)
            ? <i18n.Translate wrap="p">
                The total price is <span>{amount} </span>
                (plus <span>{renderAmount(this.state.payStatus.coinSelection.totalFees)}</span> fees).
              </i18n.Translate>
            :
            <i18n.Translate wrap="p">The total price is <span>{amount}</span>.</i18n.Translate>
          }
          { this.state.confirmPayError
            ? PayErrorDialog()
            : ConfirmPayDialog()
          }
        </div>
    );
  }
}


runOnceWhenReady(() => {
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
