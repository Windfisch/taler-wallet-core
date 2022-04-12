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

import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { Fragment, h, VNode } from "preact";
import { useMemo, useState } from "preact/hooks";
import { Amount } from "../components/Amount.js";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation.js";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { LogoHeader } from "../components/LogoHeader.js";
import { Part } from "../components/Part.js";
import { SelectList } from "../components/SelectList.js";
import {
  ButtonSuccess,
  ButtonWarning,
  LinkSuccess,
  SubTitle,
  WalletAction,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { HookError, useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { buildTermsOfServiceState } from "../utils/index.js";
import {
  ButtonHandler,
  SelectFieldHandler,
} from "../wallet/CreateManualWithdraw.js";
import * as wxApi from "../wxApi.js";
import {
  Props as TermsOfServiceSectionProps,
  TermsOfServiceSection,
} from "./TermsOfServiceSection.js";

interface Props {
  talerWithdrawUri?: string;
}

type State = LoadingUri | LoadingExchange | LoadingInfoError | Success;

interface LoadingUri {
  status: "loading-uri";
  hook: HookError | undefined;
}
interface LoadingExchange {
  status: "loading-exchange";
  hook: HookError | undefined;
}
interface LoadingInfoError {
  status: "loading-info";
  hook: HookError | undefined;
}

type Success = {
  status: "success";
  hook: undefined;

  exchange: SelectFieldHandler;

  editExchange: ButtonHandler;
  cancelEditExchange: ButtonHandler;
  confirmEditExchange: ButtonHandler;

  showExchangeSelection: boolean;
  chosenAmount: AmountJson;
  withdrawalFee: AmountJson;
  toBeReceived: AmountJson;

  doWithdrawal: ButtonHandler;
  tosProps?: TermsOfServiceSectionProps;
  mustAcceptFirst: boolean;
};

export function useComponentState(
  talerWithdrawUri: string | undefined,
  api: typeof wxApi,
): State {
  const [customExchange, setCustomExchange] = useState<string | undefined>(
    undefined,
  );

  /**
   * Ask the wallet about the withdraw URI
   */
  const uriInfoHook = useAsyncAsHook(async () => {
    if (!talerWithdrawUri) throw Error("ERROR_NO-URI-FOR-WITHDRAWAL");

    const uriInfo = await api.getWithdrawalDetailsForUri({
      talerWithdrawUri,
    });
    const { exchanges: knownExchanges } = await api.listExchanges();

    return { uriInfo, knownExchanges };
  });

  /**
   * Get the amount and select one exchange
   */
  const uriHookDep =
    !uriInfoHook || uriInfoHook.hasError || !uriInfoHook.response
      ? undefined
      : uriInfoHook;

  const { amount, thisExchange, thisCurrencyExchanges } = useMemo(() => {
    if (!uriHookDep)
      return {
        amount: undefined,
        thisExchange: undefined,
        thisCurrencyExchanges: [],
      };

    const { uriInfo, knownExchanges } = uriHookDep.response;

    const amount = uriInfo ? Amounts.parseOrThrow(uriInfo.amount) : undefined;
    const thisCurrencyExchanges =
      !amount || !knownExchanges
        ? []
        : knownExchanges.filter((ex) => ex.currency === amount.currency);

    const thisExchange: string | undefined =
      customExchange ??
      uriInfo?.defaultExchangeBaseUrl ??
      (thisCurrencyExchanges && thisCurrencyExchanges[0]
        ? thisCurrencyExchanges[0].exchangeBaseUrl
        : undefined);

    return { amount, thisExchange, thisCurrencyExchanges };
  }, [uriHookDep, customExchange]);

  /**
   * For the exchange selected, bring the status of the terms of service
   */
  const terms = useAsyncAsHook(
    async () => {
      if (!thisExchange) return false;

      const exchangeTos = await api.getExchangeTos(thisExchange, ["text/xml"]);

      const state = buildTermsOfServiceState(exchangeTos);

      return { state };
    },
    [],
    [thisExchange],
  );

  /**
   * With the exchange and amount, ask the wallet the information
   * about the withdrawal
   */
  const info = useAsyncAsHook(
    async () => {
      if (!thisExchange || !amount) return false;

      const info = await api.getExchangeWithdrawalInfo({
        exchangeBaseUrl: thisExchange,
        amount,
        tosAcceptedFormat: ["text/xml"],
      });

      const withdrawalFee = Amounts.sub(
        Amounts.parseOrThrow(info.withdrawalAmountRaw),
        Amounts.parseOrThrow(info.withdrawalAmountEffective),
      ).amount;

      return { info, withdrawalFee };
    },
    [],
    [thisExchange, amount],
  );

  const [reviewing, setReviewing] = useState<boolean>(false);
  const [reviewed, setReviewed] = useState<boolean>(false);

  const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
    undefined,
  );
  const [doingWithdraw, setDoingWithdraw] = useState<boolean>(false);

  const [showExchangeSelection, setShowExchangeSelection] = useState(false);
  const [nextExchange, setNextExchange] = useState<string | undefined>();

  if (!uriInfoHook || uriInfoHook.hasError) {
    return {
      status: "loading-uri",
      hook: uriInfoHook,
    };
  }

  if (!thisExchange || !amount) {
    return {
      status: "loading-exchange",
      hook: {
        hasError: true,
        operational: false,
        message: "ERROR_NO-DEFAULT-EXCHANGE",
      },
    };
  }

  const selectedExchange = thisExchange;

  async function doWithdrawAndCheckError(): Promise<void> {
    try {
      setDoingWithdraw(true);
      if (!talerWithdrawUri) return;
      const res = await api.acceptWithdrawal(
        talerWithdrawUri,
        selectedExchange,
      );
      if (res.confirmTransferUrl) {
        document.location.href = res.confirmTransferUrl;
      }
    } catch (e) {
      if (e instanceof TalerError) {
        setWithdrawError(e);
      }
    }
    setDoingWithdraw(false);
  }

  const exchanges = thisCurrencyExchanges.reduce(
    (prev, ex) => ({ ...prev, [ex.exchangeBaseUrl]: ex.exchangeBaseUrl }),
    {},
  );

  if (!info || info.hasError) {
    return {
      status: "loading-info",
      hook: info,
    };
  }
  if (!info.response) {
    return {
      status: "loading-info",
      hook: undefined,
    };
  }

  const exchangeHandler: SelectFieldHandler = {
    onChange: setNextExchange,
    value: nextExchange ?? thisExchange,
    list: exchanges,
    isDirty: nextExchange !== undefined,
  };

  const editExchange: ButtonHandler = {
    onClick: async () => {
      setShowExchangeSelection(true);
    },
  };
  const cancelEditExchange: ButtonHandler = {
    onClick: async () => {
      setShowExchangeSelection(false);
    },
  };
  const confirmEditExchange: ButtonHandler = {
    onClick: async () => {
      setCustomExchange(exchangeHandler.value);
      setShowExchangeSelection(false);
      setNextExchange(undefined);
    },
  };

  const { withdrawalFee } = info.response;
  const toBeReceived = Amounts.sub(amount, withdrawalFee).amount;

  const { state: termsState } = (!terms
    ? undefined
    : terms.hasError
    ? undefined
    : terms.response) || { state: undefined };

  async function onAccept(accepted: boolean): Promise<void> {
    if (!termsState) return;

    try {
      await api.setExchangeTosAccepted(
        selectedExchange,
        accepted ? termsState.version : undefined,
      );
      setReviewed(accepted);
    } catch (e) {
      if (e instanceof Error) {
        //FIXME: uncomment this and display error
        // setErrorAccepting(e.message);
      }
    }
  }

  const mustAcceptFirst =
    termsState !== undefined &&
    (termsState.status === "changed" || termsState.status === "new");

  return {
    status: "success",
    hook: undefined,
    exchange: exchangeHandler,
    editExchange,
    cancelEditExchange,
    confirmEditExchange,
    showExchangeSelection,
    toBeReceived,
    withdrawalFee,
    chosenAmount: amount,
    doWithdrawal: {
      onClick: doWithdrawAndCheckError,
      error: withdrawError,
      disabled: doingWithdraw || (mustAcceptFirst && !reviewed),
    },
    tosProps: !termsState
      ? undefined
      : {
          onAccept,
          onReview: setReviewing,
          reviewed: reviewed,
          reviewing: reviewing,
          terms: termsState,
        },
    mustAcceptFirst,
  };
}

export function View({ state }: { state: Success }): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />
      <SubTitle>
        <i18n.Translate>Digital cash withdrawal</i18n.Translate>
      </SubTitle>

      {state.doWithdrawal.error && (
        <ErrorTalerOperation
          title={
            <i18n.Translate>
              Could not finish the withdrawal operation
            </i18n.Translate>
          }
          error={state.doWithdrawal.error.errorDetail}
        />
      )}

      <section>
        <Part
          title={<i18n.Translate>Total to withdraw</i18n.Translate>}
          text={<Amount value={state.toBeReceived} />}
          kind="positive"
        />
        {Amounts.isNonZero(state.withdrawalFee) && (
          <Fragment>
            <Part
              title={<i18n.Translate>Chosen amount</i18n.Translate>}
              text={<Amount value={state.chosenAmount} />}
              kind="neutral"
            />
            <Part
              title={<i18n.Translate>Exchange fee</i18n.Translate>}
              text={<Amount value={state.withdrawalFee} />}
              kind="negative"
            />
          </Fragment>
        )}
        <Part
          title={<i18n.Translate>Exchange</i18n.Translate>}
          text={state.exchange.value}
          kind="neutral"
          big
        />
        {state.showExchangeSelection ? (
          <Fragment>
            <div>
              <SelectList
                label={<i18n.Translate>Known exchanges</i18n.Translate>}
                list={state.exchange.list}
                value={state.exchange.value}
                name="switchingExchange"
                onChange={state.exchange.onChange}
              />
            </div>
            <LinkSuccess
              upperCased
              style={{ fontSize: "small" }}
              onClick={state.confirmEditExchange.onClick}
            >
              {state.exchange.isDirty ? (
                <i18n.Translate>Confirm exchange selection</i18n.Translate>
              ) : (
                <i18n.Translate>Cancel exchange selection</i18n.Translate>
              )}
            </LinkSuccess>
          </Fragment>
        ) : (
          <LinkSuccess
            style={{ fontSize: "small" }}
            upperCased
            onClick={state.editExchange.onClick}
          >
            <i18n.Translate>Edit exchange</i18n.Translate>
          </LinkSuccess>
        )}
      </section>
      {state.tosProps && <TermsOfServiceSection {...state.tosProps} />}
      {state.tosProps ? (
        <section>
          {(state.tosProps.terms.status === "accepted" ||
            (state.mustAcceptFirst && state.tosProps.reviewed)) && (
            <ButtonSuccess
              upperCased
              disabled={state.doWithdrawal.disabled}
              onClick={state.doWithdrawal.onClick}
            >
              <i18n.Translate>Confirm withdrawal</i18n.Translate>
            </ButtonSuccess>
          )}
          {state.tosProps.terms.status === "notfound" && (
            <ButtonWarning
              upperCased
              disabled={state.doWithdrawal.disabled}
              onClick={state.doWithdrawal.onClick}
            >
              <i18n.Translate>Withdraw anyway</i18n.Translate>
            </ButtonWarning>
          )}
        </section>
      ) : (
        <section>
          <i18n.Translate>Loading terms of service...</i18n.Translate>
        </section>
      )}
    </WalletAction>
  );
}

export function WithdrawPage({ talerWithdrawUri }: Props): VNode {
  const { i18n } = useTranslationContext();

  const state = useComponentState(talerWithdrawUri, wxApi);

  if (!talerWithdrawUri) {
    return (
      <span>
        <i18n.Translate>missing withdraw uri</i18n.Translate>
      </span>
    );
  }

  if (!state) {
    return <Loading />;
  }

  if (state.status === "loading-uri") {
    if (!state.hook) return <Loading />;

    return (
      <LoadingError
        title={
          <i18n.Translate>Could not get the info from the URI</i18n.Translate>
        }
        error={state.hook}
      />
    );
  }
  if (state.status === "loading-exchange") {
    if (!state.hook) return <Loading />;

    return (
      <LoadingError
        title={<i18n.Translate>Could not get exchange</i18n.Translate>}
        error={state.hook}
      />
    );
  }
  if (state.status === "loading-info") {
    if (!state.hook) return <Loading />;
    return (
      <LoadingError
        title={
          <i18n.Translate>Could not get info of withdrawal</i18n.Translate>
        }
        error={state.hook}
      />
    );
  }

  return <View state={state} />;
}
