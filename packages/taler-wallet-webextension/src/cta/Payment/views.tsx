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
  AmountJson,
  Amounts,
  MerchantContractTerms as ContractTerms,
  PreparePayResult,
  PreparePayResultType,
  Product,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Amount } from "../../components/Amount.js";
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
import { ButtonHandler } from "../../mui/handlers.js";
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
  // const totalFees = Amounts.sub(price.effective, price.raw).amount;

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
        amount={state.amount}
        balance={state.balance}
        payStatus={state.payStatus}
        uri={state.uri}
        payHandler={state.status === "ready" ? state.payHandler : undefined}
        goToWalletManualWithdraw={state.goToWalletManualWithdraw}
      />
      <section>
        <Link upperCased onClick={state.cancel}>
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

  return <Fragment />;
}

export function PayWithMobile({ uri }: { uri: string }): VNode {
  const { i18n } = useTranslationContext();

  const [showQR, setShowQR] = useState<boolean>(false);

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
          <QR text={uri} />
          <i18n.Translate>
            Scan the QR code or &nbsp;
            <a href={uri}>
              <i18n.Translate>click here</i18n.Translate>
            </a>
          </i18n.Translate>
        </div>
      )}
    </section>
  );
}

interface ButtonSectionProps {
  payStatus: PreparePayResult;
  payHandler: ButtonHandler | undefined;
  balance: AmountJson | undefined;
  uri: string;
  amount: AmountJson;
  goToWalletManualWithdraw: (currency: string) => Promise<void>;
}

export function ButtonsSection({
  payStatus,
  uri,
  payHandler,
  balance,
  amount,
  goToWalletManualWithdraw,
}: ButtonSectionProps): VNode {
  const { i18n } = useTranslationContext();
  if (payStatus.status === PreparePayResultType.PaymentPossible) {
    const privateUri = `${uri}&n=${payStatus.noncePriv}`;

    return (
      <Fragment>
        <section>
          <Button
            variant="contained"
            color="success"
            onClick={payHandler?.onClick}
          >
            <i18n.Translate>
              Pay &nbsp;
              {<Amount value={amount} />}
            </i18n.Translate>
          </Button>
        </section>
        <PayWithMobile uri={privateUri} />
      </Fragment>
    );
  }

  if (payStatus.status === PreparePayResultType.InsufficientBalance) {
    let BalanceMessage = "";
    if (!balance) {
      BalanceMessage = i18n.str`You have no balance for this currency. Withdraw digital cash first.`;
    } else {
      const balanceShouldBeEnough = Amounts.cmp(balance, amount) !== -1;
      if (balanceShouldBeEnough) {
        BalanceMessage = i18n.str`Could not find enough coins to pay. Even if you have enough ${balance.currency} some restriction may apply.`;
      } else {
        BalanceMessage = i18n.str`Your current balance is not enough.`;
      }
    }
    const uriPrivate = `${uri}&n=${payStatus.noncePriv}`;

    return (
      <Fragment>
        <section>
          <WarningBox>{BalanceMessage}</WarningBox>
        </section>
        <section>
          <Button
            variant="contained"
            color="success"
            onClick={() => goToWalletManualWithdraw(Amounts.stringify(amount))}
          >
            <i18n.Translate>Get digital cash</i18n.Translate>
          </Button>
        </section>
        <PayWithMobile uri={uriPrivate} />
      </Fragment>
    );
  }
  if (payStatus.status === PreparePayResultType.AlreadyConfirmed) {
    return (
      <Fragment>
        <section>
          {payStatus.paid && payStatus.contractTerms.fulfillment_message && (
            <Part
              title={<i18n.Translate>Merchant message</i18n.Translate>}
              text={payStatus.contractTerms.fulfillment_message}
              kind="neutral"
            />
          )}
        </section>
        {!payStatus.paid && <PayWithMobile uri={uri} />}
      </Fragment>
    );
  }

  const error: never = payStatus;

  return <Fragment />;
}
