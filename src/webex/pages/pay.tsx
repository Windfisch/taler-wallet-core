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

import { PreparePayResult } from "../../walletTypes";

import { renderAmount, ProgressButton, registerMountPage } from "../renderHtml";
import * as wxApi from "../wxApi";

import React, { useState, useEffect } from "react";

import * as Amounts from "../../util/amounts";

function TalerPayDialog({ talerPayUri }: { talerPayUri: string }) {
  const [payStatus, setPayStatus] = useState<PreparePayResult | undefined>();
  const [payErrMsg, setPayErrMsg] = useState<string | undefined>("");
  const [numTries, setNumTries] = useState(0);
  const [loading, setLoading] = useState(false);
  let totalFees: Amounts.AmountJson | undefined = undefined;

  useEffect(() => {
    const doFetch = async () => {
      const p = await wxApi.preparePay(talerPayUri);
      setPayStatus(p);
    };
    doFetch();
  }, [numTries]);

  if (!payStatus) {
    return <span>Loading payment information ...</span>;
  }

  let insufficientBalance = false;
  if (payStatus.status == "insufficient-balance") {
    insufficientBalance = true;
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
    if (payStatus.status !== "payment-possible") {
      throw Error(`invalid state: ${payStatus.status}`);
    }
    const proposalId = payStatus.proposalId;
    setNumTries(numTries + 1);
    try {
      setLoading(true);
      const res = await wxApi.confirmPay(proposalId, undefined);
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

      {insufficientBalance ? (
        <div>
          <p style={{color: "red", fontWeight: "bold"}}>Unable to pay: Your balance is insufficient.</p>
        </div>
      ) : null}

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
          <ProgressButton
            loading={loading}
            disabled={insufficientBalance}
            onClick={() => doPayment()}>
            {i18n.str`Confirm payment`}
          </ProgressButton>
        </div>
      )}
    </div>
  );
}

registerMountPage(() => {
  const url = new URL(document.location.href);
  const talerPayUri = url.searchParams.get("talerPayUri");
  if (!talerPayUri) {
    throw Error("invalid parameter");
  }
  return <TalerPayDialog talerPayUri={talerPayUri} />;
});
