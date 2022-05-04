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
  Amounts,
  ConfirmPayResult,
  ConfirmPayResultType,
  ContractTerms,
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
  Product,
  TalerErrorCode,
} from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Amount } from "../components/Amount.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation.js";
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
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { ButtonHandler } from "../mui/handlers.js";
import * as wxApi from "../wxApi.js";

interface Props {
  talerPayUri?: string;
  goToWalletManualWithdraw: (currency?: string) => void;
  goBack: () => void;
}

type State = Loading | Ready | Confirmed;
interface Loading {
  status: "loading";
  hook: HookError | undefined;
}
interface Ready {
  status: "ready";
  hook: undefined;
  uri: string;
  amount: AmountJson;
  totalFees: AmountJson;
  payStatus: PreparePayResult;
  balance: AmountJson | undefined;
  payHandler: ButtonHandler;
  payResult: undefined;
}

interface Confirmed {
  status: "confirmed";
  hook: undefined;
  uri: string;
  amount: AmountJson;
  totalFees: AmountJson;
  payStatus: PreparePayResult;
  balance: AmountJson | undefined;
  payResult: ConfirmPayResult;
  payHandler: ButtonHandler;
}

export function useComponentState(
  talerPayUri: string | undefined,
  api: typeof wxApi,
): State {
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(
    undefined,
  );
  const [payErrMsg, setPayErrMsg] = useState<TalerError | undefined>(undefined);

  const hook = useAsyncAsHook(async () => {
    if (!talerPayUri) throw Error("ERROR_NO-URI-FOR-PAYMENT");
    const payStatus = await api.preparePay(talerPayUri);
    const balance = await api.getBalance();
    return { payStatus, balance, uri: talerPayUri };
  });

  useEffect(() => {
    api.onUpdateNotification([NotificationType.CoinWithdrawn], () => {
      hook?.retry();
    });
  });

  const hookResponse = !hook || hook.hasError ? undefined : hook.response;

  useEffect(() => {
    if (!hookResponse) return;
    const { payStatus } = hookResponse;
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
  }, [hookResponse]);

  if (!hook || hook.hasError) {
    return {
      status: "loading",
      hook,
    };
  }
  const { payStatus } = hook.response;
  const amount = Amounts.parseOrThrow(payStatus.amountRaw);

  const foundBalance = hook.response.balance.balances.find(
    (b) => Amounts.parseOrThrow(b.available).currency === amount.currency,
  );
  const foundAmount = foundBalance
    ? Amounts.parseOrThrow(foundBalance.available)
    : undefined;

  async function doPayment(): Promise<void> {
    try {
      if (payStatus.status !== "payment-possible") {
        throw TalerError.fromUncheckedDetail({
          code: TalerErrorCode.GENERIC_CLIENT_INTERNAL_ERROR,
          hint: `payment is not possible: ${payStatus.status}`,
        });
      }
      const res = await api.confirmPay(payStatus.proposalId, undefined);
      if (res.type !== ConfirmPayResultType.Done) {
        throw TalerError.fromUncheckedDetail({
          code: TalerErrorCode.GENERIC_CLIENT_INTERNAL_ERROR,
          hint: `could not confirm payment`,
          payResult: res,
        });
      }
      const fu = res.contractTerms.fulfillment_url;
      if (fu) {
        if (typeof window !== "undefined") {
          document.location.href = fu;
        } else {
          console.log(`should d to ${fu}`);
        }
      }
      setPayResult(res);
    } catch (e) {
      if (e instanceof TalerError) {
        setPayErrMsg(e);
      }
    }
  }

  const payDisabled =
    payErrMsg ||
    !foundAmount ||
    payStatus.status === PreparePayResultType.InsufficientBalance;

  const payHandler: ButtonHandler = {
    onClick: payDisabled ? undefined : doPayment,
    error: payErrMsg,
  };

  let totalFees = Amounts.getZero(amount.currency);
  if (payStatus.status === PreparePayResultType.PaymentPossible) {
    const amountEffective: AmountJson = Amounts.parseOrThrow(
      payStatus.amountEffective,
    );
    totalFees = Amounts.sub(amountEffective, amount).amount;
  }

  if (!payResult) {
    return {
      status: "ready",
      hook: undefined,
      uri: hook.response.uri,
      amount,
      totalFees,
      balance: foundAmount,
      payHandler,
      payStatus: hook.response.payStatus,
      payResult,
    };
  }

  return {
    status: "confirmed",
    hook: undefined,
    uri: hook.response.uri,
    amount,
    totalFees,
    balance: foundAmount,
    payStatus: hook.response.payStatus,
    payResult,
    payHandler: {},
  };
}

export function PayPage({
  talerPayUri,
  goToWalletManualWithdraw,
  goBack,
}: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useComponentState(talerPayUri, wxApi);

  if (state.status === "loading") {
    if (!state.hook) return <Loading />;
    return (
      <LoadingError
        title={<i18n.Translate>Could not load pay status</i18n.Translate>}
        error={state.hook}
      />
    );
  }
  return (
    <View
      state={state}
      goBack={goBack}
      goToWalletManualWithdraw={goToWalletManualWithdraw}
    />
  );
}

export function View({
  state,
  goBack,
  goToWalletManualWithdraw,
}: {
  state: Ready | Confirmed;
  goToWalletManualWithdraw: (currency?: string) => void;
  goBack: () => void;
}): VNode {
  const { i18n } = useTranslationContext();
  const contractTerms: ContractTerms = state.payStatus.contractTerms;

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

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash payment</i18n.Translate>
      </SubTitle>

      <ShowImportantMessage state={state} />

      <section>
        {state.payStatus.status !== PreparePayResultType.InsufficientBalance &&
          Amounts.isNonZero(state.totalFees) && (
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
        {Amounts.isNonZero(state.totalFees) && (
          <Fragment>
            <Part
              big
              title={<i18n.Translate>Fee</i18n.Translate>}
              text={<Amount value={state.totalFees} />}
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
      <ButtonsSection
        state={state}
        goToWalletManualWithdraw={goToWalletManualWithdraw}
      />
      <section>
        <Link upperCased onClick={goBack}>
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

function ShowImportantMessage({ state }: { state: Ready | Confirmed }): VNode {
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

  if (state.status == "confirmed") {
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

function PayWithMobile({ state }: { state: Ready }): VNode {
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

function ButtonsSection({
  state,
  goToWalletManualWithdraw,
}: {
  state: Ready | Confirmed;
  goToWalletManualWithdraw: (currency: string) => void;
}): VNode {
  const { i18n } = useTranslationContext();
  if (state.status === "ready") {
    const { payStatus } = state;
    if (payStatus.status === PreparePayResultType.PaymentPossible) {
      return (
        <Fragment>
          <section>
            <ButtonSuccess upperCased onClick={state.payHandler.onClick}>
              <i18n.Translate>
                Pay {<Amount value={payStatus.amountEffective} />}
              </i18n.Translate>
            </ButtonSuccess>
          </section>
          <PayWithMobile state={state} />
        </Fragment>
      );
    }
    if (payStatus.status === PreparePayResultType.InsufficientBalance) {
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
            <ButtonSuccess
              upperCased
              onClick={() => goToWalletManualWithdraw(state.amount.currency)}
            >
              <i18n.Translate>Withdraw digital cash</i18n.Translate>
            </ButtonSuccess>
          </section>
          <PayWithMobile state={state} />
        </Fragment>
      );
    }
    if (payStatus.status === PreparePayResultType.AlreadyConfirmed) {
      return (
        <Fragment>
          <section>
            {payStatus.paid &&
              state.payStatus.contractTerms.fulfillment_message && (
                <Part
                  title={<i18n.Translate>Merchant message</i18n.Translate>}
                  text={state.payStatus.contractTerms.fulfillment_message}
                  kind="neutral"
                />
              )}
          </section>
          {!payStatus.paid && <PayWithMobile state={state} />}
        </Fragment>
      );
    }
  }

  if (state.status === "confirmed") {
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
