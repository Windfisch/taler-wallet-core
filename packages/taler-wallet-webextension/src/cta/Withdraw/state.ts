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

import { Amounts, parsePaytoUri } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { buildTermsOfServiceState } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import { PropsFromURI, PropsFromParams, State } from "./index.js";

export function useComponentStateFromParams(
  { amount, cancel }: PropsFromParams,
  api: typeof wxApi,
): State {
  const [ageRestricted, setAgeRestricted] = useState(0);

  const exchangeHook = useAsyncAsHook(api.listExchanges);

  const exchangeHookDep =
    !exchangeHook || exchangeHook.hasError || !exchangeHook.response
      ? undefined
      : exchangeHook.response;

  const chosenAmount = Amounts.parseOrThrow(amount);

  // get the first exchange with the currency as the default one
  const exchange = exchangeHookDep
    ? exchangeHookDep.exchanges.find(
        (e) => e.currency === chosenAmount.currency,
      )
    : undefined;
  /**
   * For the exchange selected, bring the status of the terms of service
   */
  const terms = useAsyncAsHook(async () => {
    if (!exchange) return undefined;

    const exchangeTos = await api.getExchangeTos(exchange.exchangeBaseUrl, [
      "text/xml",
    ]);

    const state = buildTermsOfServiceState(exchangeTos);

    return { state };
  }, [exchangeHookDep]);

  /**
   * With the exchange and amount, ask the wallet the information
   * about the withdrawal
   */
  const amountHook = useAsyncAsHook(async () => {
    if (!exchange) return undefined;

    const info = await api.getExchangeWithdrawalInfo({
      exchangeBaseUrl: exchange.exchangeBaseUrl,
      amount: chosenAmount,
      tosAcceptedFormat: ["text/xml"],
      ageRestricted,
    });

    const withdrawAmount = {
      raw: Amounts.parseOrThrow(info.withdrawalAmountRaw),
      effective: Amounts.parseOrThrow(info.withdrawalAmountEffective),
    };

    return {
      amount: withdrawAmount,
      ageRestrictionOptions: info.ageRestrictionOptions,
    };
  }, [exchangeHookDep]);

  const [reviewing, setReviewing] = useState<boolean>(false);
  const [reviewed, setReviewed] = useState<boolean>(false);

  const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
    undefined,
  );
  const [doingWithdraw, setDoingWithdraw] = useState<boolean>(false);
  const [withdrawCompleted, setWithdrawCompleted] = useState<boolean>(false);

  if (!exchangeHook) return { status: "loading", error: undefined };
  if (exchangeHook.hasError) {
    return {
      status: "loading-uri",
      error: exchangeHook,
    };
  }

  if (!exchange) {
    return {
      status: "loading-exchange",
      error: {
        hasError: true,
        operational: false,
        message: "ERROR_NO-DEFAULT-EXCHANGE",
      },
    };
  }

  async function doWithdrawAndCheckError(): Promise<void> {
    if (!exchange) return;

    try {
      setDoingWithdraw(true);

      const response = await wxApi.acceptManualWithdrawal(
        exchange.exchangeBaseUrl,
        Amounts.stringify(amount),
      );

      setWithdrawCompleted(true);
    } catch (e) {
      if (e instanceof TalerError) {
        setWithdrawError(e);
      }
    }
    setDoingWithdraw(false);
  }

  if (!amountHook) {
    return { status: "loading", error: undefined };
  }
  if (amountHook.hasError) {
    return {
      status: "loading-info",
      error: amountHook,
    };
  }
  if (!amountHook.response) {
    return { status: "loading", error: undefined };
  }
  if (withdrawCompleted) {
    return { status: "completed", error: undefined };
  }

  const withdrawalFee = Amounts.sub(
    amountHook.response.amount.raw,
    amountHook.response.amount.effective,
  ).amount;
  const toBeReceived = amountHook.response.amount.effective;

  const { state: termsState } = (!terms
    ? undefined
    : terms.hasError
    ? undefined
    : terms.response) || { state: undefined };

  async function onAccept(accepted: boolean): Promise<void> {
    if (!termsState || !exchange) return;

    try {
      await api.setExchangeTosAccepted(
        exchange.exchangeBaseUrl,
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

  const ageRestrictionOptions =
    amountHook.response.ageRestrictionOptions?.reduce(
      (p, c) => ({ ...p, [c]: `under ${c}` }),
      {} as Record<string, string>,
    );

  const ageRestrictionEnabled = ageRestrictionOptions !== undefined;
  if (ageRestrictionEnabled) {
    ageRestrictionOptions["0"] = "Not restricted";
  }

  //TODO: calculate based on exchange info
  const ageRestriction = ageRestrictionEnabled
    ? {
        list: ageRestrictionOptions,
        value: String(ageRestricted),
        onChange: async (v: string) => setAgeRestricted(parseInt(v, 10)),
      }
    : undefined;

  return {
    status: "success",
    error: undefined,
    exchangeUrl: exchange.exchangeBaseUrl,
    toBeReceived,
    withdrawalFee,
    chosenAmount,
    ageRestriction,
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
    cancel,
  };
}

export function useComponentStateFromURI(
  { talerWithdrawUri, cancel }: PropsFromURI,
  api: typeof wxApi,
): State {
  const [ageRestricted, setAgeRestricted] = useState(0);

  /**
   * Ask the wallet about the withdraw URI
   */
  const uriInfoHook = useAsyncAsHook(async () => {
    if (!talerWithdrawUri) throw Error("ERROR_NO-URI-FOR-WITHDRAWAL");

    const uriInfo = await api.getWithdrawalDetailsForUri({
      talerWithdrawUri,
    });
    const { amount, defaultExchangeBaseUrl } = uriInfo;
    return { amount, thisExchange: defaultExchangeBaseUrl };
  });

  /**
   * Get the amount and select one exchange
   */
  const uriHookDep =
    !uriInfoHook || uriInfoHook.hasError || !uriInfoHook.response
      ? undefined
      : uriInfoHook.response;

  /**
   * For the exchange selected, bring the status of the terms of service
   */
  const terms = useAsyncAsHook(async () => {
    if (!uriHookDep?.thisExchange) return false;

    const exchangeTos = await api.getExchangeTos(uriHookDep.thisExchange, [
      "text/xml",
    ]);

    const state = buildTermsOfServiceState(exchangeTos);

    return { state };
  }, [uriHookDep]);

  /**
   * With the exchange and amount, ask the wallet the information
   * about the withdrawal
   */
  const amountHook = useAsyncAsHook(async () => {
    if (!uriHookDep?.thisExchange) return false;

    const info = await api.getExchangeWithdrawalInfo({
      exchangeBaseUrl: uriHookDep?.thisExchange,
      amount: Amounts.parseOrThrow(uriHookDep.amount),
      tosAcceptedFormat: ["text/xml"],
      ageRestricted,
    });

    const withdrawAmount = {
      raw: Amounts.parseOrThrow(info.withdrawalAmountRaw),
      effective: Amounts.parseOrThrow(info.withdrawalAmountEffective),
    };

    return {
      amount: withdrawAmount,
      ageRestrictionOptions: info.ageRestrictionOptions,
    };
  }, [uriHookDep]);

  const [reviewing, setReviewing] = useState<boolean>(false);
  const [reviewed, setReviewed] = useState<boolean>(false);

  const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
    undefined,
  );
  const [doingWithdraw, setDoingWithdraw] = useState<boolean>(false);
  const [withdrawCompleted, setWithdrawCompleted] = useState<boolean>(false);

  if (!uriInfoHook) return { status: "loading", error: undefined };
  if (uriInfoHook.hasError) {
    return {
      status: "loading-uri",
      error: uriInfoHook,
    };
  }

  const { amount, thisExchange } = uriInfoHook.response;

  const chosenAmount = Amounts.parseOrThrow(amount);

  if (!thisExchange) {
    return {
      status: "loading-exchange",
      error: {
        hasError: true,
        operational: false,
        message: "ERROR_NO-DEFAULT-EXCHANGE",
      },
    };
  }

  // const selectedExchange = thisExchange;

  async function doWithdrawAndCheckError(): Promise<void> {
    if (!thisExchange) return;

    try {
      setDoingWithdraw(true);
      if (!talerWithdrawUri) return;
      const res = await api.acceptWithdrawal(
        talerWithdrawUri,
        thisExchange,
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

  if (!amountHook) {
    return { status: "loading", error: undefined };
  }
  if (amountHook.hasError) {
    return {
      status: "loading-info",
      error: amountHook,
    };
  }
  if (!amountHook.response) {
    return { status: "loading", error: undefined };
  }
  if (withdrawCompleted) {
    return { status: "completed", error: undefined };
  }

  const withdrawalFee = Amounts.sub(
    amountHook.response.amount.raw,
    amountHook.response.amount.effective,
  ).amount;
  const toBeReceived = amountHook.response.amount.effective;

  const { state: termsState } = (!terms
    ? undefined
    : terms.hasError
    ? undefined
    : terms.response) || { state: undefined };

  async function onAccept(accepted: boolean): Promise<void> {
    if (!termsState || !thisExchange) return;

    try {
      await api.setExchangeTosAccepted(
        thisExchange,
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

  const ageRestrictionOptions =
    amountHook.response.ageRestrictionOptions?.reduce(
      (p, c) => ({ ...p, [c]: `under ${c}` }),
      {} as Record<string, string>,
    );

  const ageRestrictionEnabled = ageRestrictionOptions !== undefined;
  if (ageRestrictionEnabled) {
    ageRestrictionOptions["0"] = "Not restricted";
  }

  //TODO: calculate based on exchange info
  const ageRestriction = ageRestrictionEnabled
    ? {
        list: ageRestrictionOptions,
        value: String(ageRestricted),
        onChange: async (v: string) => setAgeRestricted(parseInt(v, 10)),
      }
    : undefined;

  return {
    status: "success",
    error: undefined,
    exchangeUrl: thisExchange,
    toBeReceived,
    withdrawalFee,
    chosenAmount,
    talerWithdrawUri,
    ageRestriction,
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
    cancel,
  };
}
