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

/* eslint-disable react-hooks/rules-of-hooks */
import { AmountJson, Amounts, ExchangeListItem, parsePaytoUri } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { Amount } from "../../components/Amount.js";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { useSelectedExchange } from "../../hooks/useSelectedExchange.js";
import { buildTermsOfServiceState } from "../../utils/index.js";
import * as wxApi from "../../wxApi.js";
import { PropsFromURI, PropsFromParams, State } from "./index.js";

type RecursiveState<S extends object> = S | (() => RecursiveState<S>)

export function useComponentStateFromParams(
  { amount, cancel, onSuccess }: PropsFromParams,
  api: typeof wxApi,
): RecursiveState<State> {
  const uriInfoHook = useAsyncAsHook(async () => {
    const exchanges = await api.listExchanges();
    return { amount: Amounts.parseOrThrow(amount), exchanges };
  });

  console.log("uri info", uriInfoHook)

  if (!uriInfoHook) return { status: "loading", error: undefined };

  if (uriInfoHook.hasError) {
    return {
      status: "loading-error",
      error: uriInfoHook,
    };
  }

  const chosenAmount = uriInfoHook.response.amount;
  const exchangeList = uriInfoHook.response.exchanges.exchanges

  async function doManualWithdraw(exchange: string, ageRestricted: number | undefined): Promise<{ transactionId: string, confirmTransferUrl: string | undefined }> {
    const res = await api.acceptManualWithdrawal(exchange, Amounts.stringify(chosenAmount), ageRestricted);
    return {
      confirmTransferUrl: undefined,
      transactionId: res.transactionId
    };
  }

  return () => exchangeSelectionState(doManualWithdraw, cancel, onSuccess, undefined, chosenAmount, exchangeList, undefined, api)

}

export function useComponentStateFromURI(
  { talerWithdrawUri, cancel, onSuccess }: PropsFromURI,
  api: typeof wxApi,
): RecursiveState<State> {
  /**
   * Ask the wallet about the withdraw URI
   */
  const uriInfoHook = useAsyncAsHook(async () => {
    if (!talerWithdrawUri) throw Error("ERROR_NO-URI-FOR-WITHDRAWAL");

    const uriInfo = await api.getWithdrawalDetailsForUri({
      talerWithdrawUri,
    });
    const exchanges = await api.listExchanges();
    const { amount, defaultExchangeBaseUrl } = uriInfo;
    return { talerWithdrawUri, amount: Amounts.parseOrThrow(amount), thisExchange: defaultExchangeBaseUrl, exchanges };
  });

  console.log("uri info", uriInfoHook)
  if (!uriInfoHook) return { status: "loading", error: undefined };

  if (uriInfoHook.hasError) {
    return {
      status: "loading-error",
      error: uriInfoHook,
    };
  }

  const uri = uriInfoHook.response.talerWithdrawUri;
  const chosenAmount = uriInfoHook.response.amount;
  const defaultExchange = uriInfoHook.response.thisExchange;
  const exchangeList = uriInfoHook.response.exchanges.exchanges

  async function doManagedWithdraw(exchange: string, ageRestricted: number | undefined): Promise<{ transactionId: string, confirmTransferUrl: string | undefined }> {
    const res = await api.acceptWithdrawal(uri, exchange, ageRestricted,);
    return {
      confirmTransferUrl: res.confirmTransferUrl,
      transactionId: res.transactionId
    };
  }

  return () => exchangeSelectionState(doManagedWithdraw, cancel, onSuccess, uri, chosenAmount, exchangeList, defaultExchange, api)

}

type ManualOrManagedWithdrawFunction = (exchange: string, ageRestricted: number | undefined) => Promise<{ transactionId: string, confirmTransferUrl: string | undefined }>

function exchangeSelectionState(doWithdraw: ManualOrManagedWithdrawFunction, cancel: () => Promise<void>, onSuccess: (txid: string) => Promise<void>, talerWithdrawUri: string | undefined, chosenAmount: AmountJson, exchangeList: ExchangeListItem[], defaultExchange: string | undefined, api: typeof wxApi,): RecursiveState<State> {

  //FIXME: use substates here
  const selectedExchange = useSelectedExchange({ currency: chosenAmount.currency, defaultExchange, list: exchangeList })

  if (selectedExchange.status === 'no-exchange') {
    return {
      status: "no-exchange",
      error: undefined,
    }
  }

  if (selectedExchange.status === 'selecting-exchange') {
    return selectedExchange
  }
  console.log("exchange selected", selectedExchange.selected)

  return () => {

    const [ageRestricted, setAgeRestricted] = useState(0);
    const currentExchange = selectedExchange.selected
    /**
     * For the exchange selected, bring the status of the terms of service
     */
    const terms = useAsyncAsHook(async () => {
      const exchangeTos = await api.getExchangeTos(currentExchange.exchangeBaseUrl, [
        "text/xml",
      ]);

      const state = buildTermsOfServiceState(exchangeTos);

      return { state };
    }, []);
    console.log("terms", terms)
    /**
     * With the exchange and amount, ask the wallet the information
     * about the withdrawal
     */
    const amountHook = useAsyncAsHook(async () => {

      const info = await api.getExchangeWithdrawalInfo({
        exchangeBaseUrl: currentExchange.exchangeBaseUrl,
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
    }, []);

    const [reviewing, setReviewing] = useState<boolean>(false);
    const [reviewed, setReviewed] = useState<boolean>(false);

    const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
      undefined,
    );
    const [doingWithdraw, setDoingWithdraw] = useState<boolean>(false);


    async function doWithdrawAndCheckError(): Promise<void> {

      try {
        setDoingWithdraw(true);
        const res = await doWithdraw(currentExchange.exchangeBaseUrl, !ageRestricted ? undefined : ageRestricted)
        if (res.confirmTransferUrl) {
          document.location.href = res.confirmTransferUrl;
        } else {
          onSuccess(res.transactionId);
        }
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
      if (!termsState) return;

      try {
        await api.setExchangeTosAccepted(
          currentExchange.exchangeBaseUrl,
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
      doSelectExchange: selectedExchange.doSelect,
      exchangeUrl: currentExchange.exchangeBaseUrl,
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
}
