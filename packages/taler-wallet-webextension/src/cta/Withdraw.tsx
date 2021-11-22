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
 * @author Florian Dold
 */

import {
  AmountJson,
  Amounts,
  ExchangeListItem,
  i18n,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { LogoHeader } from "../components/LogoHeader";
import { Part } from "../components/Part";
import { SelectList } from "../components/SelectList";
import {
  ButtonSuccess,
  ButtonWarning,
  LinkSuccess,
  WalletAction,
  WarningText,
} from "../components/styled";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { amountToString, buildTermsOfServiceState, TermsState } from "../utils";
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
  confirmed: boolean;
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
  confirmed,
}: ViewProps): VNode {
  const needsReview = terms.status === "changed" || terms.status === "new";

  const [switchingExchange, setSwitchingExchange] = useState<
    string | undefined
  >(undefined);
  const exchanges = knownExchanges.reduce(
    (prev, ex) => ({ ...prev, [ex.exchangeBaseUrl]: ex.exchangeBaseUrl }),
    {},
  );

  return (
    <WalletAction>
      <LogoHeader />
      <h2>{i18n.str`Digital cash withdrawal`}</h2>
      <section>
        <Part
          title="Total to withdraw"
          text={amountToString(Amounts.sub(amount, withdrawalFee).amount)}
          kind="positive"
        />
        <Part
          title="Chosen amount"
          text={amountToString(amount)}
          kind="neutral"
        />
        {Amounts.isNonZero(withdrawalFee) && (
          <Part
            title="Exchange fee"
            text={amountToString(withdrawalFee)}
            kind="negative"
          />
        )}
        {exchangeBaseUrl && (
          <Part title="Exchange" text={exchangeBaseUrl} kind="neutral" big />
        )}
      </section>
      {!reviewing && (
        <section>
          {switchingExchange !== undefined ? (
            <Fragment>
              <div>
                <SelectList
                  label="Known exchanges"
                  list={exchanges}
                  name=""
                  onChange={onSwitchExchange}
                />
              </div>
              <LinkSuccess
                upperCased
                onClick={() => onSwitchExchange(switchingExchange)}
              >
                {i18n.str`Confirm exchange selection`}
              </LinkSuccess>
            </Fragment>
          ) : (
            <LinkSuccess upperCased onClick={() => setSwitchingExchange("")}>
              {i18n.str`Switch exchange`}
            </LinkSuccess>
          )}
        </section>
      )}
      {terms.status === "notfound" && (
        <section>
          <WarningText>
            {i18n.str`Exchange doesn't have terms of service`}
          </WarningText>
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
            disabled={!exchangeBaseUrl || confirmed}
            onClick={onWithdraw}
          >
            {i18n.str`Confirm withdrawal`}
          </ButtonSuccess>
        )}
        {terms.status === "notfound" && (
          <ButtonWarning
            upperCased
            disabled={!exchangeBaseUrl}
            onClick={onWithdraw}
          >
            {i18n.str`Withdraw anyway`}
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
  const [confirmed, setConfirmed] = useState<boolean>(false);

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
    return (
      <span>
        <i18n.Translate>Getting withdrawal details.</i18n.Translate>
      </span>
    );
  }
  if (detailsHook.hasError) {
    return (
      <span>
        <i18n.Translate>
          Problems getting details: {detailsHook.message}
        </i18n.Translate>
      </span>
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
    setConfirmed(true);
    console.log("accepting exchange", exchange);
    try {
      const res = await wxApi.acceptWithdrawal(uri, exchange);
      console.log("accept withdrawal response", res);
      if (res.confirmTransferUrl) {
        document.location.href = res.confirmTransferUrl;
      }
    } catch (e) {
      setConfirmed(false);
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
      confirmed={confirmed}
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
        <i18n.Translate>missing withdraw uri</i18n.Translate>
      </span>
    );
  }
  if (!uriInfoHook) {
    return (
      <span>
        <i18n.Translate>Loading...</i18n.Translate>
      </span>
    );
  }
  if (uriInfoHook.hasError) {
    return (
      <span>
        <i18n.Translate>
          This URI is not valid anymore: {uriInfoHook.message}
        </i18n.Translate>
      </span>
    );
  }
  return (
    <WithdrawPageWithParsedURI
      uri={talerWithdrawUri}
      uriInfo={uriInfoHook.response}
    />
  );
}
