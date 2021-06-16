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
// import * as i18n from "../i18n";

import { renderAmount, ProgressButton } from "../renderHtml";
import * as wxApi from "../wxApi";

import { useState, useEffect } from "preact/hooks";

import { getJsonI18n, i18n } from "@gnu-taler/taler-util";
import {
  PreparePayResult,
  ConfirmPayResult,
  AmountJson,
  PreparePayResultType,
  Amounts,
  ContractTerms,
  ConfirmPayResultType,
} from "@gnu-taler/taler-util";
import { JSX, VNode } from "preact";

interface Props {
  talerPayUri?: string
}

export function PayPage({ talerPayUri }: Props): JSX.Element {
  const [payStatus, setPayStatus] = useState<PreparePayResult | undefined>(undefined);
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(undefined);
  const [payErrMsg, setPayErrMsg] = useState<string | undefined>("");
  const [numTries, setNumTries] = useState(0);
  const [loading, setLoading] = useState(false);
  let totalFees: AmountJson | undefined = undefined;

  useEffect(() => {
    if (!talerPayUri) return;
    const doFetch = async (): Promise<void> => {
      const p = await wxApi.preparePay(talerPayUri);
      setPayStatus(p);
    };
    doFetch();
  }, [numTries, talerPayUri]);

  if (!talerPayUri) {
    return <span>missing pay uri</span>
  }
  
  if (!payStatus) {
    return <span>Loading payment information ...</span>;
  }

  let insufficientBalance = false;
  if (payStatus.status == PreparePayResultType.InsufficientBalance) {
    insufficientBalance = true;
  }

  if (payStatus.status === PreparePayResultType.PaymentPossible) {
    const amountRaw = Amounts.parseOrThrow(payStatus.amountRaw);
    const amountEffective: AmountJson = Amounts.parseOrThrow(
      payStatus.amountEffective,
    );
    totalFees = Amounts.sub(amountEffective, amountRaw).amount;
  }

  if (
    payStatus.status === PreparePayResultType.AlreadyConfirmed &&
    numTries === 0
  ) {
    const fulfillmentUrl = payStatus.contractTerms.fulfillment_url;
    if (fulfillmentUrl) {
      return (
        <span>
          You have already paid for this article. Click{" "}
          <a href={fulfillmentUrl} target="_bank" rel="external">here</a> to view it again.
        </span>
      );
    } else {
      <span>
        You have already paid for this article:{" "}
        <em>
          {payStatus.contractTerms.fulfillment_message ?? "no message given"}
        </em>
      </span>;
    }
  }

  const contractTerms: ContractTerms = payStatus.contractTerms;

  if (!contractTerms) {
    return (
      <span>
        Error: did not get contract terms from merchant or wallet backend.
      </span>
    );
  }

  let merchantName: VNode;
  if (contractTerms.merchant && contractTerms.merchant.name) {
    merchantName = <strong>{contractTerms.merchant.name}</strong>;
  } else {
    merchantName = <strong>(pub: {contractTerms.merchant_pub})</strong>;
  }

  const amount = (
    <strong>{renderAmount(Amounts.parseOrThrow(contractTerms.amount))}</strong>
  );

  const doPayment = async (): Promise<void> => {
    if (payStatus.status !== "payment-possible") {
      throw Error(`invalid state: ${payStatus.status}`);
    }
    const proposalId = payStatus.proposalId;
    setNumTries(numTries + 1);
    try {
      setLoading(true);
      const res = await wxApi.confirmPay(proposalId, undefined);
      if (res.type !== ConfirmPayResultType.Done) {
        throw Error("payment pending");
      }
      const fu = res.contractTerms.fulfillment_url;
      if (fu) {
        document.location.href = fu;
      }
      setPayResult(res);
    } catch (e) {
      console.error(e);
      setPayErrMsg(e.message);
    }
  };

  if (payResult && payResult.type === ConfirmPayResultType.Done) {
    if (payResult.contractTerms.fulfillment_message) {
      const obj = {
        fulfillment_message: payResult.contractTerms.fulfillment_message,
        fulfillment_message_i18n:
          payResult.contractTerms.fulfillment_message_i18n,
      };
      const msg = getJsonI18n(obj, "fulfillment_message");
      return (
        <div>
          <p>Payment succeeded.</p>
          <p>{msg}</p>
        </div>
      );
    } else {
      return <span>Redirecting ...</span>;
    }
  }

  return (
    <div>
      <p>
        <i18n.Translate>
          The merchant <span>{merchantName}</span> offers you to purchase:
        </i18n.Translate>
        <div style={{ textAlign: "center" }}>
          <strong>{contractTerms.summary}</strong>
        </div>
        {totalFees ? (
          <i18n.Translate>
            The total price is <span>{amount} </span>
            (plus <span>{renderAmount(totalFees)}</span> fees).
          </i18n.Translate>
        ) : (
          <i18n.Translate>
            The total price is <span>{amount}</span>.
          </i18n.Translate>
        )}
      </p>

      {insufficientBalance ? (
        <div>
          <p style={{ color: "red", fontWeight: "bold" }}>
            Unable to pay: Your balance is insufficient.
          </p>
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
            isLoading={loading}
            disabled={insufficientBalance}
            onClick={() => doPayment()}
          >
            {i18n.str`Confirm payment`}
          </ProgressButton>
        </div>
      )}
    </div>
  );
}

