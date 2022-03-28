/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

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
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author sebasjm
 */

import {
  AmountJson,
  Amounts,
  ExchangeListItem,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation";
import { LogoHeader } from "../components/LogoHeader";
import { Part } from "../components/Part";
import { SelectList } from "../components/SelectList";
import {
  ButtonSuccess,
  ButtonWarning,
  LinkSuccess,
  WalletAction,
} from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import {
  amountToString,
  buildTermsOfServiceState,
  TermsState,
} from "../utils/index";
import * as wxApi from "../wxApi";
import { TermsOfServiceSection } from "./TermsOfServiceSection";
import { useTranslationContext } from "../context/translation";
import { TalerError } from "@gnu-taler/taler-wallet-core";

interface Props {
  talerWithdrawUri?: string;
}

export interface ViewProps {
  withdrawalFee: AmountJson;
  exchangeBaseUrl?: string;
  amount: AmountJson;
  onSwitchExchange: (ex: string) => void;
  onWithdraw: () => Promise<void>;
  onReview: (b: boolean) => void;
  onAccept: (b: boolean) => void;
  reviewing: boolean;
  reviewed: boolean;
  terms: TermsState;
  knownExchanges: ExchangeListItem[];
}

export function View({
  withdrawalFee,
  exchangeBaseUrl,
  knownExchanges,
  amount,
  onWithdraw,
  onSwitchExchange,
  terms,
  reviewing,
  onReview,
  onAccept,
  reviewed,
}: ViewProps): VNode {
  const { i18n } = useTranslationContext();
  const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
    undefined,
  );
  const [confirmDisabled, setConfirmDisabled] = useState<boolean>(false);

  const needsReview = terms.status === "changed" || terms.status === "new";

  const [switchingExchange, setSwitchingExchange] = useState(false);
  const [nextExchange, setNextExchange] = useState<string | undefined>(
    undefined,
  );

  const exchanges = knownExchanges
    .filter((e) => e.currency === amount.currency)
    .reduce(
      (prev, ex) => ({ ...prev, [ex.exchangeBaseUrl]: ex.exchangeBaseUrl }),
      {},
    );

  async function doWithdrawAndCheckError() {
    try {
      setConfirmDisabled(true);
      await onWithdraw();
    } catch (e) {
      if (e instanceof TalerError) {
        setWithdrawError(e);
      }
      setConfirmDisabled(false);
    }
  }

  return (
    <WalletAction>
      <LogoHeader />
      <h2>
        <i18n.Translate>Digital cash withdrawal</i18n.Translate>
      </h2>

      {withdrawError && (
        <ErrorTalerOperation
          title={
            <i18n.Translate>
              Could not finish the withdrawal operation
            </i18n.Translate>
          }
          error={withdrawError.errorDetail}
        />
      )}

      <section>
        <Part
          title={<i18n.Translate>Total to withdraw</i18n.Translate>}
          text={amountToString(Amounts.sub(amount, withdrawalFee).amount)}
          kind="positive"
        />
        {Amounts.isNonZero(withdrawalFee) && (
          <Fragment>
            <Part
              title={<i18n.Translate>Chosen amount</i18n.Translate>}
              text={amountToString(amount)}
              kind="neutral"
            />
            <Part
              title={<i18n.Translate>Exchange fee</i18n.Translate>}
              text={amountToString(withdrawalFee)}
              kind="negative"
            />
          </Fragment>
        )}
        {exchangeBaseUrl && (
          <Part
            title={<i18n.Translate>Exchange</i18n.Translate>}
            text={exchangeBaseUrl}
            kind="neutral"
            big
          />
        )}
        {!reviewing &&
          (switchingExchange ? (
            <Fragment>
              <div>
                <SelectList
                  label={<i18n.Translate>Known exchanges</i18n.Translate>}
                  list={exchanges}
                  value={nextExchange}
                  name="switchingExchange"
                  onChange={setNextExchange}
                />
              </div>
              <LinkSuccess
                upperCased
                style={{ fontSize: "small" }}
                onClick={() => {
                  if (nextExchange !== undefined) {
                    onSwitchExchange(nextExchange);
                  }
                  setSwitchingExchange(false);
                }}
              >
                {nextExchange === undefined ? (
                  <i18n.Translate>Cancel exchange selection</i18n.Translate>
                ) : (
                  <i18n.Translate>Confirm exchange selection</i18n.Translate>
                )}
              </LinkSuccess>
            </Fragment>
          ) : (
            <LinkSuccess
              style={{ fontSize: "small" }}
              upperCased
              onClick={() => setSwitchingExchange(true)}
            >
              <i18n.Translate>Edit exchange</i18n.Translate>
            </LinkSuccess>
          ))}
      </section>
      <TermsOfServiceSection
        reviewed={reviewed}
        reviewing={reviewing}
        terms={terms}
        onAccept={onAccept}
        onReview={onReview}
      />
      <section>
        {(terms.status === "accepted" || (needsReview && reviewed)) && (
          <ButtonSuccess
            upperCased
            disabled={!exchangeBaseUrl || confirmDisabled}
            onClick={doWithdrawAndCheckError}
          >
            <i18n.Translate>Confirm withdrawal</i18n.Translate>
          </ButtonSuccess>
        )}
        {terms.status === "notfound" && (
          <ButtonWarning
            upperCased
            disabled={!exchangeBaseUrl}
            onClick={doWithdrawAndCheckError}
          >
            <i18n.Translate>Withdraw anyway</i18n.Translate>
          </ButtonWarning>
        )}
      </section>
    </WalletAction>
  );
}

export function WithdrawPageWithParsedURI({
  uri,
  uriInfo,
}: {
  uri: string;
  uriInfo: WithdrawUriInfoResponse;
}): VNode {
  const { i18n } = useTranslationContext();
  const [customExchange, setCustomExchange] = useState<string | undefined>(
    undefined,
  );

  const [reviewing, setReviewing] = useState<boolean>(false);
  const [reviewed, setReviewed] = useState<boolean>(false);

  const knownExchangesHook = useAsyncAsHook(() => wxApi.listExchanges());

  const knownExchanges =
    !knownExchangesHook || knownExchangesHook.hasError
      ? []
      : knownExchangesHook.response.exchanges;
  const withdrawAmount = Amounts.parseOrThrow(uriInfo.amount);
  const thisCurrencyExchanges = knownExchanges.filter(
    (ex) => ex.currency === withdrawAmount.currency,
  );

  const exchange: string | undefined =
    customExchange ??
    uriInfo.defaultExchangeBaseUrl ??
    (thisCurrencyExchanges[0]
      ? thisCurrencyExchanges[0].exchangeBaseUrl
      : undefined);

  const detailsHook = useAsyncAsHook(async () => {
    if (!exchange) throw Error("no default exchange");
    const tos = await wxApi.getExchangeTos(exchange, ["text/xml"]);

    const tosState = buildTermsOfServiceState(tos);

    const info = await wxApi.getExchangeWithdrawalInfo({
      exchangeBaseUrl: exchange,
      amount: withdrawAmount,
      tosAcceptedFormat: ["text/xml"],
    });
    return { tos: tosState, info };
  });

  if (!detailsHook) {
    return <Loading />;
  }
  if (detailsHook.hasError) {
    return (
      <LoadingError
        title={
          <i18n.Translate>Could not load the withdrawal details</i18n.Translate>
        }
        error={detailsHook}
      />
    );
  }

  const details = detailsHook.response;

  const onAccept = async (accepted: boolean): Promise<void> => {
    if (!exchange) return;
    try {
      await wxApi.setExchangeTosAccepted(
        exchange,
        accepted ? details.tos.version : undefined,
      );
      setReviewed(accepted);
    } catch (e) {
      if (e instanceof Error) {
        //FIXME: uncomment this and display error
        // setErrorAccepting(e.message);
      }
    }
  };

  const onWithdraw = async (): Promise<void> => {
    if (!exchange) return;
    const res = await wxApi.acceptWithdrawal(uri, exchange);
    if (res.confirmTransferUrl) {
      document.location.href = res.confirmTransferUrl;
    }
  };

  const withdrawalFee = Amounts.sub(
    Amounts.parseOrThrow(details.info.withdrawalAmountRaw),
    Amounts.parseOrThrow(details.info.withdrawalAmountEffective),
  ).amount;

  return (
    <View
      onWithdraw={onWithdraw}
      amount={withdrawAmount}
      exchangeBaseUrl={exchange}
      withdrawalFee={withdrawalFee}
      terms={detailsHook.response.tos}
      onSwitchExchange={setCustomExchange}
      knownExchanges={knownExchanges}
      reviewed={reviewed}
      onAccept={onAccept}
      reviewing={reviewing}
      onReview={setReviewing}
    />
  );
}
export function WithdrawPage({ talerWithdrawUri }: Props): VNode {
  const { i18n } = useTranslationContext();
  const uriInfoHook = useAsyncAsHook(() =>
    !talerWithdrawUri
      ? Promise.reject(undefined)
      : wxApi.getWithdrawalDetailsForUri({ talerWithdrawUri }),
  );

  if (!talerWithdrawUri) {
    return (
      <span>
        <i18n.Translate>missing withdraw uri</i18n.Translate>
      </span>
    );
  }
  if (!uriInfoHook) {
    return <Loading />;
  }
  if (uriInfoHook.hasError) {
    return (
      <LoadingError
        title={
          <i18n.Translate>Could not get the info from the URI</i18n.Translate>
        }
        error={uriInfoHook}
      />
    );
  }

  return (
    <WithdrawPageWithParsedURI
      uri={talerWithdrawUri}
      uriInfo={uriInfoHook.response}
    />
  );
}
