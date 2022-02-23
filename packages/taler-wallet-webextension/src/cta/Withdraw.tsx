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
  i18n,
  Translate,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import { OperationFailedError } from "@gnu-taler/taler-wallet-core";
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
  const [withdrawError, setWithdrawError] = useState<
    OperationFailedError | undefined
  >(undefined);
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
      if (e instanceof OperationFailedError) {
        setWithdrawError(e);
      }
      setConfirmDisabled(false);
    }
  }

  return (
    <WalletAction>
      <LogoHeader />
      <h2>
        <Translate>Digital cash withdrawal</Translate>
      </h2>

      {withdrawError && (
        <ErrorTalerOperation
          title={
            <Translate>Could not finish the withdrawal operation</Translate>
          }
          error={withdrawError.operationError}
        />
      )}

      <section>
        <Part
          title={<Translate>Total to withdraw</Translate>}
          text={amountToString(Amounts.sub(amount, withdrawalFee).amount)}
          kind="positive"
        />
        {Amounts.isNonZero(withdrawalFee) && (
          <Fragment>
            <Part
              title={<Translate>Chosen amount</Translate>}
              text={amountToString(amount)}
              kind="neutral"
            />
            <Part
              title={<Translate>Exchange fee</Translate>}
              text={amountToString(withdrawalFee)}
              kind="negative"
            />
          </Fragment>
        )}
        {exchangeBaseUrl && (
          <Part
            title={<Translate>Exchange</Translate>}
            text={exchangeBaseUrl}
            kind="neutral"
            big
          />
        )}
      </section>
      {!reviewing && (
        <section>
          {switchingExchange ? (
            <Fragment>
              <div>
                <SelectList
                  label={<Translate>Known exchanges</Translate>}
                  list={exchanges}
                  value={nextExchange}
                  name="switchingExchange"
                  onChange={setNextExchange}
                />
              </div>
              <LinkSuccess
                upperCased
                onClick={() => {
                  if (nextExchange !== undefined) {
                    onSwitchExchange(nextExchange);
                  }
                  setSwitchingExchange(false);
                }}
              >
                {nextExchange === undefined ? (
                  <Translate>Cancel exchange selection</Translate>
                ) : (
                  <Translate>Confirm exchange selection</Translate>
                )}
              </LinkSuccess>
            </Fragment>
          ) : (
            <LinkSuccess upperCased onClick={() => setSwitchingExchange(true)}>
              <Translate>Switch exchange</Translate>
            </LinkSuccess>
          )}
        </section>
      )}
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
            <Translate>Confirm withdrawal</Translate>
          </ButtonSuccess>
        )}
        {terms.status === "notfound" && (
          <ButtonWarning
            upperCased
            disabled={!exchangeBaseUrl}
            onClick={doWithdrawAndCheckError}
          >
            <Translate>Withdraw anyway</Translate>
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
  const [customExchange, setCustomExchange] = useState<string | undefined>(
    undefined,
  );
  // const [errorAccepting, setErrorAccepting] = useState<string | undefined>(
  //   undefined,
  // );

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
        title={<Translate>Could not load the withdrawal details</Translate>}
        error={detailsHook}
      />
    );
  }

  const details = detailsHook.response;

  const onAccept = async (): Promise<void> => {
    if (!exchange) return;
    try {
      await wxApi.setExchangeTosAccepted(exchange, details.tos.version);
      setReviewed(true);
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

  return (
    <View
      onWithdraw={onWithdraw}
      amount={withdrawAmount}
      exchangeBaseUrl={exchange}
      withdrawalFee={details.info.withdrawFee} //FIXME
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
  const uriInfoHook = useAsyncAsHook(() =>
    !talerWithdrawUri
      ? Promise.reject(undefined)
      : wxApi.getWithdrawalDetailsForUri({ talerWithdrawUri }),
  );

  if (!talerWithdrawUri) {
    return (
      <span>
        <Translate>missing withdraw uri</Translate>
      </span>
    );
  }
  if (!uriInfoHook) {
    return <Loading />;
  }
  if (uriInfoHook.hasError) {
    return (
      <LoadingError
        title={<Translate>Could not get the info from the URI</Translate>}
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
