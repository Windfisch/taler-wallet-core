/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

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
 * Page that shows refund status for purchases.
 *
 * @author Florian Dold
 */


import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");

import * as dbTypes from "../../dbTypes";

import { AmountJson } from "../../amounts";
import * as Amounts from "../../amounts";

import * as timer from "../../timer";

import { AmountDisplay } from "../renderHtml";
import * as wxApi from "../wxApi";

interface RefundStatusViewProps {
  contractTermsHash?: string;
  refundUrl?: string;
}

interface RefundStatusViewState {
  contractTermsHash?: string;
  purchase?: dbTypes.PurchaseRecord;
  refundFees?: AmountJson;
  gotResult: boolean;
}

interface RefundDetailProps {
  purchase: dbTypes.PurchaseRecord;
  /**
   * Full refund fees (including refreshing) so far, or undefined if no refund
   * permission was processed yet
   */
  fullRefundFees?: AmountJson;
}

const RefundDetail = ({purchase, fullRefundFees}: RefundDetailProps) => {
  const pendingKeys = Object.keys(purchase.refundsPending);
  const doneKeys = Object.keys(purchase.refundsDone);
  if (pendingKeys.length === 0 && doneKeys.length === 0) {
    return <p>No refunds</p>;
  }

  const firstRefundKey = [...pendingKeys, ...doneKeys][0];
  if (!firstRefundKey) {
    return <p>Waiting for refunds ...</p>;
  }
  const allRefunds = { ...purchase.refundsDone, ...purchase.refundsPending };
  const currency = Amounts.parseOrThrow(allRefunds[firstRefundKey].refund_amount).currency;
  if (!currency) {
    throw Error("invariant");
  }

  let amountPending = Amounts.getZero(currency);
  for (const k of pendingKeys) {
    const refundAmount = Amounts.parseOrThrow(purchase.refundsPending[k].refund_amount);
    amountPending = Amounts.add(amountPending, refundAmount).amount;
  }
  let amountDone = Amounts.getZero(currency);
  for (const k of doneKeys) {
    const refundAmount = Amounts.parseOrThrow(purchase.refundsDone[k].refund_amount);
    amountDone = Amounts.add(amountDone, refundAmount).amount;
  }

  const hasPending = amountPending.fraction !== 0 || amountPending.value !== 0;

  return (
    <div>
      {hasPending ? <p>Refund pending: <AmountDisplay amount={amountPending} /></p> : null}
      <p>
        Refund received: <AmountDisplay amount={amountDone} />{" "}
        (refund fees: {fullRefundFees ? <AmountDisplay amount={fullRefundFees} /> : "??" })
      </p>
    </div>
  );
};

class RefundStatusView extends React.Component<RefundStatusViewProps, RefundStatusViewState> {

  constructor(props: RefundStatusViewProps) {
    super(props);
    this.state = { gotResult: false };
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
    // Just to be safe:  update every second, in case we miss a notification
    // from the background page.
    timer.after(1000, () => this.update());
  }

  render(): JSX.Element {
    if (!this.props.contractTermsHash && !this.props.refundUrl) {
      return (
        <div id="main">
          <span>Error: Neither contract terms hash nor refund url given.</span>
        </div>
      );
    }
    const purchase = this.state.purchase;
    if (!purchase) {
      let message;
      if (this.state.gotResult) {
        message = <span>No purchase with contract terms hash {this.props.contractTermsHash} found</span>;
      } else {
        message = <span>...</span>;
      }
      return <div id="main">{message}</div>;
    }
    const merchantName = purchase.contractTerms.merchant.name || "(unknown)";
    const summary = purchase.contractTerms.summary || purchase.contractTerms.order_id;
    return (
      <div id="main">
        <h1>Refund Status</h1>
        <p>
          Status of purchase <strong>{summary}</strong> from merchant <strong>{merchantName}</strong>{" "}
          (order id {purchase.contractTerms.order_id}).
        </p>
        <p>Total amount: <AmountDisplay amount={Amounts.parseOrThrow(purchase.contractTerms.amount)} /></p>
        {purchase.finished
          ? <RefundDetail purchase={purchase} fullRefundFees={this.state.refundFees} />
          : <p>Purchase not completed.</p>}
      </div>
    );
  }

  async update() {
    let contractTermsHash = this.state.contractTermsHash;
    if (!contractTermsHash) {
      const refundUrl = this.props.refundUrl;
      if (!refundUrl) {
        console.error("neither contractTermsHash nor refundUrl is given");
        return;
      }
      contractTermsHash = await wxApi.acceptRefund(refundUrl);
      this.setState({ contractTermsHash });
    }
    const purchase = await wxApi.getPurchase(contractTermsHash);
    console.log("got purchase", purchase);
    // We got a result, but it might be undefined if not found in DB.
    this.setState({ purchase, gotResult: true });
    const refundsDone = Object.keys(purchase.refundsDone).map((x) => purchase.refundsDone[x]);
    if (refundsDone.length) {
      const refundFees = await wxApi.getFullRefundFees({ refundPermissions: refundsDone });
      this.setState({ purchase, gotResult: true, refundFees });
    }
  }
}


async function main() {
  const url = new URI(document.location.href);
  const query: any = URI.parseQuery(url.query());

  const container = document.getElementById("container");
  if (!container) {
    console.error("fatal: can't mount component, countainer missing");
    return;
  }

  const talerRefundUri = query.talerRefundUri;
  if (!talerRefundUri) {
    console.error("taler refund URI requred");
    return;
  }

  ReactDOM.render(<RefundStatusView contractTermsHash={contractTermsHash} refundUrl={refundUrl} />, container);
}

document.addEventListener("DOMContentLoaded", () => main());
