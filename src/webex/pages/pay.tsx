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

import { ExchangeRecord, ProposalDownloadRecord } from "../../dbTypes";
import { ContractTerms } from "../../talerTypes";
import { CheckPayResult, PreparePayResult } from "../../walletTypes";

import { renderAmount } from "../renderHtml";
import * as wxApi from "../wxApi";

import React, { useState, useEffect } from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");
import { WalletApiError } from "../wxApi";

import * as Amounts from "../../amounts";

function TalerPayDialog({ talerPayUri }: { talerPayUri: string }) {
  const [payStatus, setPayStatus] = useState<PreparePayResult | undefined>();
  const [payErrMsg, setPayErrMsg] = useState<string | undefined>("");
  const [numTries, setNumTries] = useState(0);
  let totalFees: Amounts.AmountJson | undefined = undefined;

  useEffect(() => {
    const doFetch = async () => {
      const p = await wxApi.preparePay(talerPayUri);
      setPayStatus(p);
    };
    doFetch();
  });

  if (!payStatus) {
    return <span>Loading payment information ...</span>;
  }

  if (payStatus.status === "error") {
    return <span>Error: {payStatus.error}</span>;
  }

  if (payStatus.status === "payment-possible") {
    totalFees = payStatus.totalFees;
  }

  if (payStatus.status === "paid" && numTries === 0) {
    return (
      <span>
        You have already paid for this article. Click{" "}
        <a href={payStatus.nextUrl}>here</a> to view it again.
      </span>
    );
  }

  const contractTerms = payStatus.contractTerms;

  if (!contractTerms) {
    return (
      <span>
        Error: did not get contract terms from merchant or wallet backend.
      </span>
    );
  }

  let merchantName: React.ReactElement;
  if (contractTerms.merchant && contractTerms.merchant.name) {
    merchantName = <strong>{contractTerms.merchant.name}</strong>;
  } else {
    merchantName = <strong>(pub: {contractTerms.merchant_pub})</strong>;
  }

  const amount = (
    <strong>{renderAmount(Amounts.parseOrThrow(contractTerms.amount))}</strong>
  );

  const doPayment = async () => {
    setNumTries(numTries + 1);
    try {
      const res = await wxApi.confirmPay(payStatus!.proposalId!, undefined);
      document.location.href = res.nextUrl;
    } catch (e) {
      console.error(e);
      setPayErrMsg(e.message);
    }
  };

  return (
    <div>
      <p>
        <i18n.Translate wrap="p">
          The merchant <span>{merchantName}</span> offers you to purchase:
        </i18n.Translate>
        <div style={{ textAlign: "center" }}>
          <strong>{contractTerms.summary}</strong>
        </div>
        {totalFees ? (
          <i18n.Translate wrap="p">
            The total price is <span>{amount} </span>
            (plus <span>{renderAmount(totalFees)}</span> fees).
          </i18n.Translate>
        ) : (
          <i18n.Translate wrap="p">
            The total price is <span>{amount}</span>.
          </i18n.Translate>
        )}
      </p>

      {payErrMsg ? (
        <div>
          <p>Payment failed: {payErrMsg}</p>
          <button
            className="pure-button button-success"
            onClick={() => doPayment()}
          >
            {i18n.str`Retry`}
          </button>
        </div>
      ) : (
        <div>
          <button
            className="pure-button button-success"
            onClick={() => doPayment()}
          >
            {i18n.str`Confirm payment`}
          </button>
        </div>
      )}
    </div>
  );
}

runOnceWhenReady(() => {
  try {
    const url = new URI(document.location.href);
    const query: any = URI.parseQuery(url.query());

    let talerPayUri = query.talerPayUri;

    ReactDOM.render(
      <TalerPayDialog talerPayUri={talerPayUri} />,
      document.getElementById("contract")!,
    );
  } catch (e) {
    ReactDOM.render(
      <span>Fatal error: {e.message}</span>,
      document.getElementById("contract")!,
    );
    console.error(e);
  }
});
