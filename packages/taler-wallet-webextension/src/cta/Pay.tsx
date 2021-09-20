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

import { AmountLike, ConfirmPayResultDone, getJsonI18n, i18n } from "@gnu-taler/taler-util";
import {
  PreparePayResult,
  ConfirmPayResult,
  AmountJson,
  PreparePayResultType,
  Amounts,
  ContractTerms,
  ConfirmPayResultType,
} from "@gnu-taler/taler-util";
import { JSX, VNode, h, Fragment } from "preact";
import { ButtonDestructive, ButtonSuccess, ButtonWarning, LinkSuccess, LinkWarning, WalletAction } from "../components/styled";
import { LogoHeader } from "../components/LogoHeader";
import { Part } from "../components/Part";
import { QR } from "../components/QR";

interface Props {
  talerPayUri?: string
}

export function AlreadyPaid({ payStatus }: { payStatus: PreparePayResult }) {
  const fulfillmentUrl = payStatus.contractTerms.fulfillment_url;
  let message;
  if (fulfillmentUrl) {
    message = (
      <span>
        You have already paid for this article. Click{" "}
        <a href={fulfillmentUrl} target="_bank" rel="external">here</a> to view it again.
      </span>
    );
  } else {
    message = <span>
      You have already paid for this article:{" "}
      <em>
        {payStatus.contractTerms.fulfillment_message ?? "no message given"}
      </em>
    </span>;
  }
  return <section class="main">
    <h1>GNU Taler Wallet</h1>
    <article class="fade">
      {message}
    </article>
  </section>
}

const doPayment = async (payStatus: PreparePayResult): Promise<ConfirmPayResultDone> => {
  if (payStatus.status !== "payment-possible") {
    throw Error(`invalid state: ${payStatus.status}`);
  }
  const proposalId = payStatus.proposalId;
  const res = await wxApi.confirmPay(proposalId, undefined);
  if (res.type !== ConfirmPayResultType.Done) {
    throw Error("payment pending");
  }
  const fu = res.contractTerms.fulfillment_url;
  if (fu) {
    document.location.href = fu;
  }
  return res;
};



export function PayPage({ talerPayUri }: Props): JSX.Element {
  const [payStatus, setPayStatus] = useState<PreparePayResult | undefined>(undefined);
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(undefined);
  const [payErrMsg, setPayErrMsg] = useState<string | undefined>("");

  useEffect(() => {
    if (!talerPayUri) return;
    const doFetch = async (): Promise<void> => {
      const p = await wxApi.preparePay(talerPayUri);
      setPayStatus(p);
    };
    doFetch();
  }, [talerPayUri]);

  if (!talerPayUri) {
    return <span>missing pay uri</span>
  }

  if (!payStatus) {
    return <span>Loading payment information ...</span>;
  }

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

  const onClick = async () => {
    try {
      const res = await doPayment(payStatus)
      setPayResult(res);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        setPayErrMsg(e.message);
      }
    }

  }

  return <PaymentRequestView uri={talerPayUri} payStatus={payStatus} onClick={onClick} payErrMsg={payErrMsg} />;
}

export interface PaymentRequestViewProps {
  payStatus: PreparePayResult;
  onClick: () => void;
  payErrMsg?: string;
  uri: string;
}
export function PaymentRequestView({ uri, payStatus, onClick, payErrMsg }: PaymentRequestViewProps) {
  let totalFees: AmountJson = Amounts.getZero(payStatus.amountRaw);
  const contractTerms: ContractTerms = payStatus.contractTerms;

  if (!contractTerms) {
    return (
      <span>
        Error: did not get contract terms from merchant or wallet backend.
      </span>
    );
  }

  if (payStatus.status === PreparePayResultType.PaymentPossible) {
    const amountRaw = Amounts.parseOrThrow(payStatus.amountRaw);
    const amountEffective: AmountJson = Amounts.parseOrThrow(
      payStatus.amountEffective,
    );
    totalFees = Amounts.sub(amountEffective, amountRaw).amount;
  }

  let merchantName: VNode;
  if (contractTerms.merchant && contractTerms.merchant.name) {
    merchantName = <strong>{contractTerms.merchant.name}</strong>;
  } else {
    merchantName = <strong>(pub: {contractTerms.merchant_pub})</strong>;
  }

  const [showQR, setShowQR] = useState<boolean>(false)
  const privateUri = payStatus.status !== PreparePayResultType.AlreadyConfirmed ? `${uri}&n=${payStatus.noncePriv}` : uri
  return <WalletAction>
    <LogoHeader />
    <h2>
      {i18n.str`Digital cash payment`}
    </h2>
    <section>
      {payStatus.status === PreparePayResultType.InsufficientBalance ?
        <Part title="Insufficient balance" text="No enough coins to pay" kind='negative' /> :
        <Part big title="Total amount with fee" text={amountToString(payStatus.amountEffective)} kind='negative' />
      }
      <Part big title="Purchase amount" text={amountToString(payStatus.amountRaw)} kind='neutral' />
      {Amounts.isNonZero(totalFees) && <Part big title="Fee" text={amountToString(totalFees)} kind='negative' />}
      <Part title="Merchant" text={contractTerms.merchant.name} kind='neutral' />
      <Part title="Purchase" text={contractTerms.summary} kind='neutral' />
      {contractTerms.order_id && <Part title="Receipt" text={`#${contractTerms.order_id}`} kind='neutral' />}
    </section>
    {showQR && <section>
      <QR text={privateUri} />
      Scan the QR code or <a href={privateUri}>click here</a>
    </section>}
    <section>
      {payErrMsg ? (
        <div>
          <p>Payment failed: {payErrMsg}</p>
          <button class="pure-button button-success" onClick={onClick} >
            {i18n.str`Retry`}
          </button>
        </div>
      ) : (
        payStatus.status === PreparePayResultType.PaymentPossible ? <Fragment>
          <LinkSuccess upperCased onClick={() => setShowQR(qr => !qr)}>
            {!showQR ? i18n.str`Complete with mobile wallet` : i18n.str`Hide QR`}
          </LinkSuccess>
          <ButtonSuccess upperCased>
            {i18n.str`Confirm payment`}
          </ButtonSuccess>
        </Fragment> : (
          payStatus.status === PreparePayResultType.InsufficientBalance ? <Fragment>
            <LinkSuccess upperCased onClick={() => setShowQR(qr => !qr)}>
              {!showQR ? i18n.str`Pay with other device` : i18n.str`Hide QR`}
            </LinkSuccess>
            <ButtonDestructive upperCased disabled>
              {i18n.str`No enough coins`}
            </ButtonDestructive>
          </Fragment> :
            <Fragment>
              {payStatus.contractTerms.fulfillment_message && <div>
                {payStatus.contractTerms.fulfillment_message}
              </div>}
              <LinkWarning upperCased href={payStatus.contractTerms.fulfillment_url}>
                {i18n.str`Already paid`}
              </LinkWarning>
            </Fragment>

        )
      )}

    </section>
  </WalletAction>
}

function amountToString(text: AmountLike) {
  const aj = Amounts.jsonifyAmount(text)
  const amount = Amounts.stringifyValue(aj)
  return `${amount} ${aj.currency}`
}
