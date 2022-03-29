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

import {
  AmountJson,
  Amounts,
  amountToPretty,
  ConfirmPayResult,
  ConfirmPayResultType,
  ContractTerms,
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation.js";
import { LogoHeader } from "../components/LogoHeader.js";
import { Part } from "../components/Part.js";
import {
  ErrorBox,
  SubTitle,
  SuccessBox,
  WalletAction,
  WarningBox,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import * as wxApi from "../wxApi.js";

interface Props {
  talerPayUri?: string;
  goBack: () => void;
}

export function DepositPage({ talerPayUri, goBack }: Props): VNode {
  const { i18n } = useTranslationContext();
  const [payStatus, setPayStatus] = useState<PreparePayResult | undefined>(
    undefined,
  );
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(
    undefined,
  );
  const [payErrMsg, setPayErrMsg] = useState<TalerError | string | undefined>(
    undefined,
  );

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
        if (e instanceof TalerError) {
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
    return (
      <span>
        <i18n.Translate>missing pay uri</i18n.Translate>
      </span>
    );
  }

  if (!payStatus) {
    if (payErrMsg instanceof TalerError) {
      return (
        <WalletAction>
          <LogoHeader />
          <SubTitle>
            <i18n.Translate>Digital cash payment</i18n.Translate>
          </SubTitle>
          <section>
            <ErrorTalerOperation
              title={
                <i18n.Translate>
                  Could not get the payment information for this order
                </i18n.Translate>
              }
              error={payErrMsg?.errorDetail}
            />
          </section>
        </WalletAction>
      );
    }
    if (payErrMsg) {
      return (
        <WalletAction>
          <LogoHeader />
          <SubTitle>
            <i18n.Translate>Digital cash payment</i18n.Translate>
          </SubTitle>
          <section>
            <p>
              <i18n.Translate>
                Could not get the payment information for this order
              </i18n.Translate>
            </p>
            <ErrorBox>{payErrMsg}</ErrorBox>
          </section>
        </WalletAction>
      );
    }
    return (
      <span>
        <i18n.Translate>Loading payment information</i18n.Translate> ...
      </span>
    );
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
  const { i18n } = useTranslationContext();

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash deposit</i18n.Translate>
      </SubTitle>
      {payStatus.status === PreparePayResultType.AlreadyConfirmed &&
        (payStatus.paid ? (
          <SuccessBox>
            <i18n.Translate>Already paid</i18n.Translate>
          </SuccessBox>
        ) : (
          <WarningBox>
            <i18n.Translate>Already claimed</i18n.Translate>
          </WarningBox>
        ))}
      {payResult && payResult.type === ConfirmPayResultType.Done && (
        <SuccessBox>
          <h3>
            <i18n.Translate>Payment complete</i18n.Translate>
          </h3>
          <p>
            {!payResult.contractTerms.fulfillment_message ? (
              <i18n.Translate>
                You will now be sent back to the merchant you came from.
              </i18n.Translate>
            ) : (
              payResult.contractTerms.fulfillment_message
            )}
          </p>
        </SuccessBox>
      )}
      <section>
        {payStatus.status !== PreparePayResultType.InsufficientBalance &&
          Amounts.isNonZero(totalFees) && (
            <Part
              big
              title={<i18n.Translate>Total to pay</i18n.Translate>}
              text={amountToPretty(
                Amounts.parseOrThrow(payStatus.amountEffective),
              )}
              kind="negative"
            />
          )}
        <Part
          big
          title={<i18n.Translate>Purchase amount</i18n.Translate>}
          text={amountToPretty(Amounts.parseOrThrow(payStatus.amountRaw))}
          kind="neutral"
        />
        {Amounts.isNonZero(totalFees) && (
          <Fragment>
            <Part
              big
              title={<i18n.Translate>Fee</i18n.Translate>}
              text={amountToPretty(totalFees)}
              kind="negative"
            />
          </Fragment>
        )}
        <Part
          title={<i18n.Translate>Merchant</i18n.Translate>}
          text={contractTerms.merchant.name}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Purchase</i18n.Translate>}
          text={contractTerms.summary}
          kind="neutral"
        />
        {contractTerms.order_id && (
          <Part
            title={<i18n.Translate>Receipt</i18n.Translate>}
            text={`#${contractTerms.order_id}`}
            kind="neutral"
          />
        )}
      </section>
    </WalletAction>
  );
}
