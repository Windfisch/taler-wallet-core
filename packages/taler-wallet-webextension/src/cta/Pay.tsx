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
  AmountLike,
  Amounts,
  ConfirmPayResult,
  ConfirmPayResultDone,
  ConfirmPayResultType,
  ContractTerms,
  i18n,
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
  Product,
  Translate,
} from "@gnu-taler/taler-util";
import { OperationFailedError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ErrorMessage } from "../components/ErrorMessage";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import { LogoHeader } from "../components/LogoHeader";
import { Part } from "../components/Part";
import { QR } from "../components/QR";
import {
  ButtonSuccess,
  LightText,
  LinkSuccess,
  SmallLightText,
  SuccessBox,
  WalletAction,
  WarningBox,
} from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import * as wxApi from "../wxApi";

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
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(
    undefined,
  );
  const [payErrMsg, setPayErrMsg] = useState<
    OperationFailedError | string | undefined
  >(undefined);

  const hook = useAsyncAsHook(async () => {
    if (!talerPayUri) throw Error("Missing pay uri");
    const payStatus = await wxApi.preparePay(talerPayUri);
    const balance = await wxApi.getBalance();
    return { payStatus, balance };
  }, [NotificationType.CoinWithdrawn]);

  if (!hook) {
    return <Loading />;
  }

  if (hook.hasError) {
    return (
      <LoadingError
        title={<Translate>Could not load pay status</Translate>}
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
  goToWalletManualWithdraw: () => void;
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
  let totalFees: AmountJson = Amounts.getZero(payStatus.amountRaw);
  const contractTerms: ContractTerms = payStatus.contractTerms;

  useEffect(() => {
    if (
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
  });

  if (!contractTerms) {
    return (
      <ErrorMessage
        title={
          <Translate>
            Could not load contract terms from merchant or wallet backend.
          </Translate>
        }
      />
    );
  }

  if (payStatus.status === PreparePayResultType.PaymentPossible) {
    const amountRaw = Amounts.parseOrThrow(payStatus.amountRaw);
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
            <Translate>Pay with a mobile phone</Translate>
          ) : (
            <Translate>Hide QR</Translate>
          )}
        </LinkSuccess>
        {showQR && (
          <div>
            <QR text={privateUri} />
            <Translate>
              Scan the QR code or
              <a href={privateUri}>
                <Translate>click here</Translate>
              </a>
            </Translate>
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
                <Translate>Processing</Translate>...
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
              <Translate>
                Pay {amountToString(payStatus.amountEffective)}
              </Translate>
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
                <Translate>
                  Your balance of {amountToString(balance)} is not enough to pay
                  for this purchase
                </Translate>
              </WarningBox>
            ) : (
              <WarningBox>
                <Translate>
                  Your balance is not enough to pay for this purchase.
                </Translate>
              </WarningBox>
            )}
          </section>
          <section>
            <ButtonSuccess upperCased onClick={goToWalletManualWithdraw}>
              <Translate>Withdraw digital cash</Translate>
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
                title={<Translate>Merchant message</Translate>}
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

      <h2>
        <Translate>Digital cash payment</Translate>
      </h2>
      {payStatus.status === PreparePayResultType.AlreadyConfirmed &&
        (payStatus.paid ? (
          payStatus.contractTerms.fulfillment_url ? (
            <SuccessBox>
              <Translate>
                Already paid, you are going to be redirected to{" "}
                <a href={payStatus.contractTerms.fulfillment_url}>
                  {payStatus.contractTerms.fulfillment_url}
                </a>
              </Translate>
            </SuccessBox>
          ) : (
            <SuccessBox>
              <Translate>Already paid</Translate>
            </SuccessBox>
          )
        ) : (
          <WarningBox>
            <Translate>Already claimed</Translate>
          </WarningBox>
        ))}
      {payResult && payResult.type === ConfirmPayResultType.Done && (
        <SuccessBox>
          <h3>
            <Translate>Payment complete</Translate>
          </h3>
          <p>
            {!payResult.contractTerms.fulfillment_message ? (
              payResult.contractTerms.fulfillment_url ? (
                <Translate>
                  You are going to be redirected to $
                  {payResult.contractTerms.fulfillment_url}
                </Translate>
              ) : (
                <Translate>You can close this page.</Translate>
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
              title={<Translate>Total to pay</Translate>}
              text={amountToString(payStatus.amountEffective)}
              kind="negative"
            />
          )}
        <Part
          big
          title={<Translate>Purchase amount</Translate>}
          text={amountToString(payStatus.amountRaw)}
          kind="neutral"
        />
        {Amounts.isNonZero(totalFees) && (
          <Fragment>
            <Part
              big
              title={<Translate>Fee</Translate>}
              text={amountToString(totalFees)}
              kind="negative"
            />
          </Fragment>
        )}
        <Part
          title={<Translate>Merchant</Translate>}
          text={contractTerms.merchant.name}
          kind="neutral"
        />
        <Part
          title={<Translate>Purchase</Translate>}
          text={contractTerms.summary}
          kind="neutral"
        />
        {contractTerms.order_id && (
          <Part
            title={<Translate>Receipt</Translate>}
            text={`#${contractTerms.order_id}`}
            kind="neutral"
          />
        )}
        {contractTerms.products && contractTerms.products.length > 0 && (
          <ProductList products={contractTerms.products} />
        )}
      </section>
      <ButtonsSection />
    </WalletAction>
  );
}

function ProductList({ products }: { products: Product[] }): VNode {
  return (
    <Fragment>
      <SmallLightText style={{ margin: ".5em" }}>
        <Translate>List of products</Translate>
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
                  <Translate>Total</Translate>
                  {` `}
                  {p.price ? (
                    `${Amounts.stringifyValue(
                      Amounts.mult(
                        Amounts.parseOrThrow(p.price),
                        p.quantity ?? 1,
                      ).amount,
                    )} ${p}`
                  ) : (
                    <Translate>free</Translate>
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
