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

import * as wxApi from "../wxApi";
import * as types from "../../types";

import { AmountDisplay } from "../renderHtml";

interface RefundStatusViewProps {
  contractTermsHash: string;
}

interface RefundStatusViewState {
  purchase?: types.PurchaseRecord;
  refundFees?: types.AmountJson;
  gotResult: boolean;
}


const RefundDetail = ({purchase, fullRefundFees}: {purchase: types.PurchaseRecord, fullRefundFees: types.AmountJson}) => {
  const pendingKeys = Object.keys(purchase.refundsPending);
  const doneKeys = Object.keys(purchase.refundsDone);
  if (pendingKeys.length == 0 && doneKeys.length == 0) {
    return <p>No refunds</p>;
  }

  const currency = { ...purchase.refundsDone, ...purchase.refundsPending }[([...pendingKeys, ...doneKeys][0])].refund_amount.currency;
  if (!currency) {
    throw Error("invariant");
  }

  let amountPending = types.Amounts.getZero(currency);
  for (let k of pendingKeys) {
    amountPending = types.Amounts.add(amountPending, purchase.refundsPending[k].refund_amount).amount;
  }
  let amountDone = types.Amounts.getZero(currency);
  for (let k of doneKeys) {
    amountDone = types.Amounts.add(amountDone, purchase.refundsDone[k].refund_amount).amount;
  }

  const hasPending = amountPending.fraction !== 0 || amountPending.value !== 0;

  return (
    <div>
      {hasPending ? <p>Refund pending: <AmountDisplay amount={amountPending} /></p> : null}
      <p>Refund received: <AmountDisplay amount={amountDone} /> (refund fees: <AmountDisplay amount={fullRefundFees} />)</p>
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
  }

  render(): JSX.Element {
    const purchase = this.state.purchase;
    if (!purchase) {
      if (this.state.gotResult) {
        return <span>No purchase with contract terms hash {this.props.contractTermsHash} found</span>;
      } else {
        return <span>...</span>;
      }
    }
    const merchantName = purchase.contractTerms.merchant.name || "(unknown)";
    const summary = purchase.contractTerms.summary || purchase.contractTerms.order_id;
    return (
      <div id="main">
        <h1>Refund Status</h1>
        <p>Status of purchase <strong>{summary}</strong> from merchant <strong>{merchantName}</strong> (order id {purchase.contractTerms.order_id}).</p>
        <p>Total amount: <AmountDisplay amount={purchase.contractTerms.amount} /></p>
        {purchase.finished ? <RefundDetail purchase={purchase} fullRefundFees={this.state.refundFees!} /> : <p>Purchase not completed.</p>}
      </div>
    );
  }

  async update() {
    const purchase = await wxApi.getPurchase(this.props.contractTermsHash);
    console.log("got purchase", purchase);
    const refundsDone = Object.keys(purchase.refundsDone).map((x) => purchase.refundsDone[x]);
    const refundFees = await wxApi.getFullRefundFees( {refundPermissions: refundsDone });
    this.setState({ purchase, gotResult: true, refundFees });
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

  const contractTermsHash = query.contractTermsHash || "(none)";
  ReactDOM.render(<RefundStatusView contractTermsHash={contractTermsHash} />, container);
}

document.addEventListener("DOMContentLoaded", () => main());
