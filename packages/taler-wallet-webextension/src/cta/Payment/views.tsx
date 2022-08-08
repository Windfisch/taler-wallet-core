/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  AbsoluteTime,
  Amounts,
  ConfirmPayResultType,
  ContractTerms,
  PreparePayResultType,
  Product,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Amount } from "../../components/Amount.js";
import { ErrorTalerOperation } from "../../components/ErrorTalerOperation.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { QR } from "../../components/QR.js";
import {
  Link,
  LinkSuccess,
  SmallLightText,
  SubTitle,
  SuccessBox,
  WalletAction,
  WarningBox,
} from "../../components/styled/index.js";
import { Time } from "../../components/Time.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { MerchantDetails, PurchaseDetails } from "../../wallet/Transaction.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load pay status</i18n.Translate>}
      error={error}
    />
  );
}

type SupportedStates =
  | State.Ready
  | State.Confirmed
  | State.Completed
  | State.NoBalanceForCurrency
  | State.NoEnoughBalance;

export function BaseView(state: SupportedStates): VNode {
  const { i18n } = useTranslationContext();
  const contractTerms: ContractTerms = state.payStatus.contractTerms;

  const price = {
    raw: state.amount,
    effective:
      "amountEffective" in state.payStatus
        ? Amounts.parseOrThrow(state.payStatus.amountEffective)
        : state.amount,
  };
  const totalFees = Amounts.sub(price.effective, price.raw).amount;

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash payment</i18n.Translate>
      </SubTitle>

      <ShowImportantMessage state={state} />

      <section style={{ textAlign: "left" }}>
        {/* {state.payStatus.status !== PreparePayResultType.InsufficientBalance &&
          Amounts.isNonZero(totalFees) && (
            <Part
              big
              title={<i18n.Translate>Total to pay</i18n.Translate>}
              text={<Amount value={state.payStatus.amountEffective} />}
              kind="negative"
            />
          )}
        <Part
          big
          title={<i18n.Translate>Purchase amount</i18n.Translate>}
          text={<Amount value={state.payStatus.amountRaw} />}
          kind="neutral"
        />
        {Amounts.isNonZero(totalFees) && (
          <Fragment>
            <Part
              big
              title={<i18n.Translate>Fee</i18n.Translate>}
              text={<Amount value={totalFees} />}
              kind="negative"
            />
          </Fragment>
        )} */}
        <Part
          title={<i18n.Translate>Purchase</i18n.Translate>}
          text={contractTerms.summary}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Merchant</i18n.Translate>}
          text={<MerchantDetails merchant={contractTerms.merchant} />}
          kind="neutral"
        />
        {/* <pre>{JSON.stringify(price)}</pre>
        <hr />
        <pre>{JSON.stringify(state.payStatus, undefined, 2)}</pre> */}
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={
            <PurchaseDetails
              price={price}
              info={{
                ...contractTerms,
                orderId: contractTerms.order_id,
                contractTermsHash: "",
                products: contractTerms.products!,
              }}
              proposalId={state.payStatus.proposalId}
            />
          }
          kind="neutral"
        />
        {contractTerms.order_id && (
          <Part
            title={<i18n.Translate>Receipt</i18n.Translate>}
            text={`#${contractTerms.order_id}`}
            kind="neutral"
          />
        )}
        {contractTerms.pay_deadline && (
          <Part
            title={<i18n.Translate>Valid until</i18n.Translate>}
            text={
              <Time
                timestamp={AbsoluteTime.fromTimestamp(
                  contractTerms.pay_deadline,
                )}
                format="dd MMMM yyyy, HH:mm"
              />
            }
            kind="neutral"
          />
        )}
      </section>
      <ButtonsSection
        state={state}
        goToWalletManualWithdraw={state.goToWalletManualWithdraw}
      />
      <section>
        <Link upperCased onClick={state.goBack}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Link>
      </section>
    </WalletAction>
  );
}

export function ProductList({ products }: { products: Product[] }): VNode {
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

function ShowImportantMessage({ state }: { state: SupportedStates }): VNode {
  const { i18n } = useTranslationContext();
  const { payStatus } = state;
  if (payStatus.status === PreparePayResultType.AlreadyConfirmed) {
    if (payStatus.paid) {
      if (payStatus.contractTerms.fulfillment_url) {
        return (
          <SuccessBox>
            <i18n.Translate>
              Already paid, you are going to be redirected to{" "}
              <a href={payStatus.contractTerms.fulfillment_url}>
                {payStatus.contractTerms.fulfillment_url}
              </a>
            </i18n.Translate>
          </SuccessBox>
        );
      }
      return (
        <SuccessBox>
          <i18n.Translate>Already paid</i18n.Translate>
        </SuccessBox>
      );
    }
    return (
      <WarningBox>
        <i18n.Translate>Already claimed</i18n.Translate>
      </WarningBox>
    );
  }

  if (state.status == "completed") {
    const { payResult, payHandler } = state;
    if (payHandler.error) {
      return <ErrorTalerOperation error={payHandler.error.errorDetail} />;
    }
    if (payResult.type === ConfirmPayResultType.Done) {
      return (
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
      );
    }
  }
  return <Fragment />;
}

function PayWithMobile({ state }: { state: SupportedStates }): VNode {
  const { i18n } = useTranslationContext();

  const [showQR, setShowQR] = useState<boolean>(false);

  const privateUri =
    state.payStatus.status !== PreparePayResultType.AlreadyConfirmed
      ? `${state.uri}&n=${state.payStatus.noncePriv}`
      : state.uri;
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
            Scan the QR code or &nbsp;
            <a href={privateUri}>
              <i18n.Translate>click here</i18n.Translate>
            </a>
          </i18n.Translate>
        </div>
      )}
    </section>
  );
}

function ButtonsSection({
  state,
  goToWalletManualWithdraw,
}: {
  state: SupportedStates;
  goToWalletManualWithdraw: (currency: string) => Promise<void>;
}): VNode {
  const { i18n } = useTranslationContext();
  if (state.status === "ready") {
    return (
      <Fragment>
        <section>
          <Button
            variant="contained"
            color="success"
            onClick={state.payHandler.onClick}
          >
            <i18n.Translate>
              Pay &nbsp;
              {<Amount value={state.payStatus.amountEffective} />}
            </i18n.Translate>
          </Button>
        </section>
        <PayWithMobile state={state} />
      </Fragment>
    );
  }
  if (
    state.status === "no-enough-balance" ||
    state.status === "no-balance-for-currency"
  ) {
    // if (state.payStatus.status === PreparePayResultType.InsufficientBalance) {
    let BalanceMessage = "";
    if (!state.balance) {
      BalanceMessage = i18n.str`You have no balance for this currency. Withdraw digital cash first.`;
    } else {
      const balanceShouldBeEnough =
        Amounts.cmp(state.balance, state.amount) !== -1;
      if (balanceShouldBeEnough) {
        BalanceMessage = i18n.str`Could not find enough coins to pay this order. Even if you have enough ${state.balance.currency} some restriction may apply.`;
      } else {
        BalanceMessage = i18n.str`Your current balance is not enough for this order.`;
      }
    }
    return (
      <Fragment>
        <section>
          <WarningBox>{BalanceMessage}</WarningBox>
        </section>
        <section>
          <Button
            variant="contained"
            color="success"
            onClick={() => goToWalletManualWithdraw(state.amount.currency)}
          >
            <i18n.Translate>Withdraw digital cash</i18n.Translate>
          </Button>
        </section>
        <PayWithMobile state={state} />
      </Fragment>
    );
    // }
  }
  if (state.status === "confirmed") {
    if (state.payStatus.status === PreparePayResultType.AlreadyConfirmed) {
      return (
        <Fragment>
          <section>
            {state.payStatus.paid &&
              state.payStatus.contractTerms.fulfillment_message && (
                <Part
                  title={<i18n.Translate>Merchant message</i18n.Translate>}
                  text={state.payStatus.contractTerms.fulfillment_message}
                  kind="neutral"
                />
              )}
          </section>
          {!state.payStatus.paid && <PayWithMobile state={state} />}
        </Fragment>
      );
    }
  }

  if (state.status === "completed") {
    if (state.payResult.type === ConfirmPayResultType.Pending) {
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
  }

  return <Fragment />;
}
