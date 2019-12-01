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

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import * as wxApi from "../wxApi";
import { PurchaseDetails } from "../../walletTypes";
import { AmountView } from "../renderHtml";

function RefundStatusView(props: { talerRefundUri: string }) {
  const [applied, setApplied] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<
    PurchaseDetails | undefined
  >(undefined);
  const [errMsg, setErrMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    const doFetch = async () => {
      try {
        const hc = await wxApi.applyRefund(props.talerRefundUri);
        setApplied(true);
        const r = await wxApi.getPurchaseDetails(hc);
        setPurchaseDetails(r);
      } catch (e) {
        console.error(e);
        setErrMsg(e.message);
        console.log("err message", e.message);
      }
    };
    doFetch();
  }, []);

  console.log("rendering");

  if (errMsg) {
    return <span>Error: {errMsg}</span>;
  }

  if (!applied || !purchaseDetails) {
    return <span>Updating refund status</span>;
  }

  return (
    <>
      <h2>Refund Status</h2>
      <p>
        The product <em>{purchaseDetails.contractTerms.summary!}</em> has
        received a total refund of <AmountView amount={purchaseDetails.totalRefundAmount} />.
      </p>
      <p>
        Note that additional fees from the exchange may apply.
      </p>
    </>
  );
}

async function main() {
  const url = new URL(document.location.href);

  const container = document.getElementById("container");
  if (!container) {
    console.error("fatal: can't mount component, container missing");
    return;
  }

  const talerRefundUri = url.searchParams.get("talerRefundUri");
  if (!talerRefundUri) {
    console.error("taler refund URI requred");
    return;
  }

  ReactDOM.render(
    <RefundStatusView talerRefundUri={talerRefundUri} />,
    container,
  );
}

document.addEventListener("DOMContentLoaded", () => main());
