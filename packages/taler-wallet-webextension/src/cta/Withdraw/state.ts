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


import { Amounts } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useMemo, useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler, SelectFieldHandler } from "../../mui/handlers.js";
import { buildTermsOfServiceState } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import { State, Props } from "./index.js";

export function useComponentState(
  { talerWithdrawUri }: Props,
  api: typeof wxApi,
): State {
  const [customExchange, setCustomExchange] = useState<string | undefined>(
    undefined,
  );
  const [ageRestricted, setAgeRestricted] = useState(0);

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
      : uriInfoHook.response;

  const { amount, thisExchange, thisCurrencyExchanges } = useMemo(() => {
    if (!uriHookDep)
      return {
        amount: undefined,
        thisExchange: undefined,
        thisCurrencyExchanges: [],
      };

    const { uriInfo, knownExchanges } = uriHookDep;

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
  const terms = useAsyncAsHook(async () => {
    if (!thisExchange) return false;

    const exchangeTos = await api.getExchangeTos(thisExchange, ["text/xml"]);

    const state = buildTermsOfServiceState(exchangeTos);

    return { state };
  }, [thisExchange]);

  /**
   * With the exchange and amount, ask the wallet the information
   * about the withdrawal
   */
  const info = useAsyncAsHook(async () => {
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
  }, [thisExchange, amount]);

  const [reviewing, setReviewing] = useState<boolean>(false);
  const [reviewed, setReviewed] = useState<boolean>(false);

  const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
    undefined,
  );
  const [doingWithdraw, setDoingWithdraw] = useState<boolean>(false);
  const [withdrawCompleted, setWithdrawCompleted] = useState<boolean>(false);

  const [showExchangeSelection, setShowExchangeSelection] = useState(false);
  const [nextExchange, setNextExchange] = useState<string | undefined>();

  if (!uriInfoHook) return { status: "loading", error: undefined }
  if (uriInfoHook.hasError) {
    return {
      status: "loading-uri",
      error: uriInfoHook,
    };
  }

  if (!thisExchange || !amount) {
    return {
      status: "loading-exchange",
      error: {
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
        !ageRestricted ? undefined : ageRestricted,
      );
      if (res.confirmTransferUrl) {
        document.location.href = res.confirmTransferUrl;
      }
      setWithdrawCompleted(true);
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

  if (!info) {
    return { status: "loading", error: undefined }
  }
  if (info.hasError) {
    return {
      status: "loading-info",
      error: info,
    };
  }
  if (!info.response) {
    return { status: "loading", error: undefined };
  }
  if (withdrawCompleted) {
    return { status: "completed", error: undefined };
  }

  const exchangeHandler: SelectFieldHandler = {
    onChange: async (e) => setNextExchange(e),
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

  const ageRestrictionOptions: Record<string, string> | undefined = "6:12:18"
    .split(":")
    .reduce((p, c) => ({ ...p, [c]: `under ${c}` }), {});

  if (ageRestrictionOptions) {
    ageRestrictionOptions["0"] = "Not restricted";
  }

  return {
    status: "success",
    error: undefined,
    exchange: exchangeHandler,
    editExchange,
    cancelEditExchange,
    confirmEditExchange,
    showExchangeSelection,
    toBeReceived,
    withdrawalFee,
    chosenAmount: amount,
    ageRestriction: {
      list: ageRestrictionOptions,
      value: String(ageRestricted),
      onChange: async (v) => setAgeRestricted(parseInt(v, 10)),
    },
    doWithdrawal: {
      onClick:
        doingWithdraw || (mustAcceptFirst && !reviewed)
          ? undefined
          : doWithdrawAndCheckError,
      error: withdrawError,
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

