/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  AmountLike,
  Amounts,
  ConfirmPayResult,
  ConfirmPayResultDone,
  ConfirmPayResultType,
  ContractTerms,
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
  Product,
} from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { LogoHeader } from "../components/LogoHeader.js";
import { Part } from "../components/Part.js";
import { QR } from "../components/QR.js";
import {
  ButtonSuccess,
  Link,
  LinkSuccess,
  SmallLightText,
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
  goToWalletManualWithdraw: (currency?: string) => void;
  goBack: () => void;
}

const doPayment = async (
  payStatus: PreparePayResult,
): Promise<ConfirmPayResultDone> => {
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

export function PayPage({
  talerPayUri,
  goToWalletManualWithdraw,
  goBack,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(
    undefined,
  );
  const [payErrMsg, setPayErrMsg] = useState<TalerError | string | undefined>(
    undefined,
  );

  const hook = useAsyncAsHook(async () => {
    if (!talerPayUri) throw Error("Missing pay uri");
    const payStatus = await wxApi.preparePay(talerPayUri);
    const balance = await wxApi.getBalance();
    return { payStatus, balance };
  }, [NotificationType.CoinWithdrawn]);

  useEffect(() => {
    const payStatus =
      hook && !hook.hasError ? hook.response.payStatus : undefined;
    if (
      payStatus &&
      payStatus.status === PreparePayResultType.AlreadyConfirmed &&
      payStatus.paid
    ) {
      const fu = payStatus.contractTerms.fulfillment_url;
      if (fu) {
        setTimeout(() => {
          document.location.href = fu;
        }, 3000);
      }
    }
  }, []);

  if (!hook) {
    return <Loading />;
  }

  if (hook.hasError) {
    return (
      <LoadingError
        title={<i18n.Translate>Could not load pay status</i18n.Translate>}
        error={hook}
      />
    );
  }

  const foundBalance = hook.response.balance.balances.find(
    (b) =>
      Amounts.parseOrThrow(b.available).currency ===
      Amounts.parseOrThrow(hook.response.payStatus.amountRaw).currency,
  );
  const foundAmount = foundBalance
    ? Amounts.parseOrThrow(foundBalance.available)
    : undefined;

  const onClick = async (): Promise<void> => {
    try {
      const res = await doPayment(hook.response.payStatus);
      setPayResult(res);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        setPayErrMsg(e.message);
      }
    }
  };

  return (
    <PaymentRequestView
      uri={talerPayUri!}
      payStatus={hook.response.payStatus}
      payResult={payResult}
      onClick={onClick}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
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
  goToWalletManualWithdraw: (s: string) => void;
  balance: AmountJson | undefined;
}
export function PaymentRequestView({
  uri,
  payStatus,
  payResult,
  onClick,
  goToWalletManualWithdraw,
  balance,
}: PaymentRequestViewProps): VNode {
  const { i18n } = useTranslationContext();
  let totalFees: AmountJson = Amounts.getZero(payStatus.amountRaw);
  const contractTerms: ContractTerms = payStatus.contractTerms;

  if (!contractTerms) {
    return (
      <ErrorMessage
        title={
          <i18n.Translate>
            Could not load contract terms from merchant or wallet backend.
          </i18n.Translate>
        }
      />
    );
  }

  const amountRaw = Amounts.parseOrThrow(payStatus.amountRaw);
  if (payStatus.status === PreparePayResultType.PaymentPossible) {
    const amountEffective: AmountJson = Amounts.parseOrThrow(
      payStatus.amountEffective,
    );
    totalFees = Amounts.sub(amountEffective, amountRaw).amount;
  }

  function Alternative(): VNode {
    const [showQR, setShowQR] = useState<boolean>(false);
    const privateUri =
      payStatus.status !== PreparePayResultType.AlreadyConfirmed
        ? `${uri}&n=${payStatus.noncePriv}`
        : uri;
    if (!uri) return <Fragment />;
    return (
      <section>
        <LinkSuccess upperCased onClick={() => setShowQR((qr) => !qr)}>
          {!showQR ? (
            <i18n.Translate>Pay with a mobile phone</i18n.Translate>
          ) : (
            <i18n.Translate>Hide QR</i18n.Translate>
          )}
        </LinkSuccess>
        {showQR && (
          <div>
            <QR text={privateUri} />
            <i18n.Translate>
              Scan the QR code or
              <a href={privateUri}>
                <i18n.Translate>click here</i18n.Translate>
              </a>
            </i18n.Translate>
          </div>
        )}
      </section>
    );
  }

  function ButtonsSection(): VNode {
    if (payResult) {
      if (payResult.type === ConfirmPayResultType.Pending) {
        return (
          <section>
            <div>
              <p>
                <i18n.Translate>Processing</i18n.Translate>...
              </p>
            </div>
          </section>
        );
      }
      return <Fragment />;
    }
    if (payStatus.status === PreparePayResultType.PaymentPossible) {
      return (
        <Fragment>
          <section>
            <ButtonSuccess upperCased onClick={onClick}>
              <i18n.Translate>
                Pay {amountToString(payStatus.amountEffective)}
              </i18n.Translate>
            </ButtonSuccess>
          </section>
          <Alternative />
        </Fragment>
      );
    }
    if (payStatus.status === PreparePayResultType.InsufficientBalance) {
      return (
        <Fragment>
          <section>
            {balance ? (
              <WarningBox>
                <i18n.Translate>
                  Your balance of {amountToString(balance)} is not enough to pay
                  for this purchase
                </i18n.Translate>
              </WarningBox>
            ) : (
              <WarningBox>
                <i18n.Translate>
                  Your balance is not enough to pay for this purchase.
                </i18n.Translate>
              </WarningBox>
            )}
          </section>
          <section>
            <ButtonSuccess
              upperCased
              onClick={() => goToWalletManualWithdraw(amountRaw.currency)}
            >
              <i18n.Translate>Withdraw digital cash</i18n.Translate>
            </ButtonSuccess>
          </section>
          <Alternative />
        </Fragment>
      );
    }
    if (payStatus.status === PreparePayResultType.AlreadyConfirmed) {
      return (
        <Fragment>
          <section>
            {payStatus.paid && contractTerms.fulfillment_message && (
              <Part
                title={<i18n.Translate>Merchant message</i18n.Translate>}
                text={contractTerms.fulfillment_message}
                kind="neutral"
              />
            )}
          </section>
          {!payStatus.paid && <Alternative />}
        </Fragment>
      );
    }
    return <span />;
  }

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash payment</i18n.Translate>
      </SubTitle>
      {payStatus.status === PreparePayResultType.AlreadyConfirmed &&
        (payStatus.paid ? (
          payStatus.contractTerms.fulfillment_url ? (
            <SuccessBox>
              <i18n.Translate>
                Already paid, you are going to be redirected to{" "}
                <a href={payStatus.contractTerms.fulfillment_url}>
                  {payStatus.contractTerms.fulfillment_url}
                </a>
              </i18n.Translate>
            </SuccessBox>
          ) : (
            <SuccessBox>
              <i18n.Translate>Already paid</i18n.Translate>
            </SuccessBox>
          )
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
              payResult.contractTerms.fulfillment_url ? (
                <i18n.Translate>
                  You are going to be redirected to $
                  {payResult.contractTerms.fulfillment_url}
                </i18n.Translate>
              ) : (
                <i18n.Translate>You can close this page.</i18n.Translate>
              )
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
              text={amountToString(payStatus.amountEffective)}
              kind="negative"
            />
          )}
        <Part
          big
          title={<i18n.Translate>Purchase amount</i18n.Translate>}
          text={amountToString(payStatus.amountRaw)}
          kind="neutral"
        />
        {Amounts.isNonZero(totalFees) && (
          <Fragment>
            <Part
              big
              title={<i18n.Translate>Fee</i18n.Translate>}
              text={amountToString(totalFees)}
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
        {contractTerms.products && contractTerms.products.length > 0 && (
          <ProductList products={contractTerms.products} />
        )}
      </section>
      <ButtonsSection />
      <section>
        <Link upperCased>
          <i18n.Translate>Cancel</i18n.Translate>
        </Link>
      </section>
    </WalletAction>
  );
}

function ProductList({ products }: { products: Product[] }): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <SmallLightText style={{ margin: ".5em" }}>
        <i18n.Translate>List of products</i18n.Translate>
      </SmallLightText>
      <dl>
        {products.map((p, i) => {
          if (p.price) {
            const pPrice = Amounts.parseOrThrow(p.price);
            return (
              <div key={i} style={{ display: "flex", textAlign: "left" }}>
                <div>
                  <img
                    src={p.image ? p.image : undefined}
                    style={{ width: 32, height: 32 }}
                  />
                </div>
                <div>
                  <dt>
                    {p.quantity ?? 1} x {p.description}{" "}
                    <span style={{ color: "gray" }}>
                      {Amounts.stringify(pPrice)}
                    </span>
                  </dt>
                  <dd>
                    <b>
                      {Amounts.stringify(
                        Amounts.mult(pPrice, p.quantity ?? 1).amount,
                      )}
                    </b>
                  </dd>
                </div>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: "flex", textAlign: "left" }}>
              <div>
                <img src={p.image} style={{ width: 32, height: 32 }} />
              </div>
              <div>
                <dt>
                  {p.quantity ?? 1} x {p.description}
                </dt>
                <dd>
                  <i18n.Translate>Total</i18n.Translate>
                  {` `}
                  {p.price ? (
                    `${Amounts.stringifyValue(
                      Amounts.mult(
                        Amounts.parseOrThrow(p.price),
                        p.quantity ?? 1,
                      ).amount,
                    )} ${p}`
                  ) : (
                    <i18n.Translate>free</i18n.Translate>
                  )}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </Fragment>
  );
}

function amountToString(text: AmountLike): string {
  const aj = Amounts.jsonifyAmount(text);
  const amount = Amounts.stringifyValue(aj, 2);
  return `${amount} ${aj.currency}`;
}
