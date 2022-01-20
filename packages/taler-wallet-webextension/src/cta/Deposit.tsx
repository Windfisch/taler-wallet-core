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

import {
  AmountJson,
  Amounts,
  amountToPretty,
  ConfirmPayResult,
  ConfirmPayResultType,
  ContractTerms,
  i18n,
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import { OperationFailedError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation";
import { LogoHeader } from "../components/LogoHeader";
import { Part } from "../components/Part";
import {
  ErrorBox,
  SuccessBox,
  WalletAction,
  WarningBox,
} from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

interface Props {
  talerPayUri?: string;
  goBack: () => void;
}

export function DepositPage({ talerPayUri, goBack }: Props): VNode {
  const [payStatus, setPayStatus] = useState<PreparePayResult | undefined>(
    undefined,
  );
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(
    undefined,
  );
  const [payErrMsg, setPayErrMsg] = useState<
    OperationFailedError | string | undefined
  >(undefined);

  const balance = useAsyncAsHook(wxApi.getBalance, [
    NotificationType.CoinWithdrawn,
  ]);
  const balanceWithoutError = balance?.hasError
    ? []
    : balance?.response.balances || [];

  const foundBalance = balanceWithoutError.find(
    (b) =>
      payStatus &&
      Amounts.parseOrThrow(b.available).currency ===
        Amounts.parseOrThrow(payStatus?.amountRaw).currency,
  );
  const foundAmount = foundBalance
    ? Amounts.parseOrThrow(foundBalance.available)
    : undefined;
  // We use a string here so that dependency tracking for useEffect works properly
  const foundAmountStr = foundAmount
    ? Amounts.stringify(foundAmount)
    : undefined;

  useEffect(() => {
    if (!talerPayUri) return;
    const doFetch = async (): Promise<void> => {
      try {
        const p = await wxApi.preparePay(talerPayUri);
        setPayStatus(p);
      } catch (e) {
        console.log("Got error while trying to pay", e);
        if (e instanceof OperationFailedError) {
          setPayErrMsg(e);
        }
        if (e instanceof Error) {
          setPayErrMsg(e.message);
        }
      }
    };
    doFetch();
  }, [talerPayUri, foundAmountStr]);

  if (!talerPayUri) {
    return <span>missing pay uri</span>;
  }

  if (!payStatus) {
    if (payErrMsg instanceof OperationFailedError) {
      return (
        <WalletAction>
          <LogoHeader />
          <h2>{i18n.str`Digital cash payment`}</h2>
          <section>
            <ErrorTalerOperation
              title="Could not get the payment information for this order"
              error={payErrMsg?.operationError}
            />
          </section>
        </WalletAction>
      );
    }
    if (payErrMsg) {
      return (
        <WalletAction>
          <LogoHeader />
          <h2>{i18n.str`Digital cash payment`}</h2>
          <section>
            <p>Could not get the payment information for this order</p>
            <ErrorBox>{payErrMsg}</ErrorBox>
          </section>
        </WalletAction>
      );
    }
    return <span>Loading payment information ...</span>;
  }

  const onClick = async (): Promise<void> => {
    // try {
    //   const res = await doPayment(payStatus);
    //   setPayResult(res);
    // } catch (e) {
    //   console.error(e);
    //   if (e instanceof Error) {
    //     setPayErrMsg(e.message);
    //   }
    // }
  };

  return (
    <PaymentRequestView
      uri={talerPayUri}
      payStatus={payStatus}
      payResult={payResult}
      onClick={onClick}
      balance={foundAmount}
    />
  );
}

export interface PaymentRequestViewProps {
  payStatus: PreparePayResult;
  payResult?: ConfirmPayResult;
  onClick: () => void;
  payErrMsg?: string;
  uri: string;
  balance: AmountJson | undefined;
}
export function PaymentRequestView({
  payStatus,
  payResult,
}: PaymentRequestViewProps): VNode {
  let totalFees: AmountJson = Amounts.getZero(payStatus.amountRaw);
  const contractTerms: ContractTerms = payStatus.contractTerms;

  return (
    <WalletAction>
      <LogoHeader />

      <h2>{i18n.str`Digital cash deposit`}</h2>
      {payStatus.status === PreparePayResultType.AlreadyConfirmed &&
        (payStatus.paid ? (
          <SuccessBox> Already paid </SuccessBox>
        ) : (
          <WarningBox> Already claimed </WarningBox>
        ))}
      {payResult && payResult.type === ConfirmPayResultType.Done && (
        <SuccessBox>
          <h3>Payment complete</h3>
          <p>
            {!payResult.contractTerms.fulfillment_message
              ? "You will now be sent back to the merchant you came from."
              : payResult.contractTerms.fulfillment_message}
          </p>
        </SuccessBox>
      )}
      <section>
        {payStatus.status !== PreparePayResultType.InsufficientBalance &&
          Amounts.isNonZero(totalFees) && (
            <Part
              big
              title="Total to pay"
              text={amountToPretty(
                Amounts.parseOrThrow(payStatus.amountEffective),
              )}
              kind="negative"
            />
          )}
        <Part
          big
          title="Purchase amount"
          text={amountToPretty(Amounts.parseOrThrow(payStatus.amountRaw))}
          kind="neutral"
        />
        {Amounts.isNonZero(totalFees) && (
          <Fragment>
            <Part
              big
              title="Fee"
              text={amountToPretty(totalFees)}
              kind="negative"
            />
          </Fragment>
        )}
        <Part
          title="Merchant"
          text={contractTerms.merchant.name}
          kind="neutral"
        />
        <Part title="Purchase" text={contractTerms.summary} kind="neutral" />
        {contractTerms.order_id && (
          <Part
            title="Receipt"
            text={`#${contractTerms.order_id}`}
            kind="neutral"
          />
        )}
      </section>
    </WalletAction>
  );
}
