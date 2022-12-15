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
import {
  AmountJson,
  Amounts,
  ExchangeListItem,
  ExchangeTosStatus,
} from "@gnu-taler/taler-util";
import { TalerError, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useBackendContext } from "../../context/backend.js";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { useSelectedExchange } from "../../hooks/useSelectedExchange.js";
import { RecursiveState } from "../../utils/index.js";
import { PropsFromParams, PropsFromURI, State } from "./index.js";

export function useComponentStateFromParams({
  amount,
  cancel,
  onSuccess,
}: PropsFromParams): RecursiveState<State> {
  const api = useBackendContext();
  const uriInfoHook = useAsyncAsHook(async () => {
    const exchanges = await api.wallet.call(
      WalletApiOperation.ListExchanges,
      {},
    );
    return { amount: Amounts.parseOrThrow(amount), exchanges };
  });

  if (!uriInfoHook) return { status: "loading", error: undefined };

  if (uriInfoHook.hasError) {
    return {
      status: "uri-error",
      error: uriInfoHook,
    };
  }

  const chosenAmount = uriInfoHook.response.amount;
  const exchangeList = uriInfoHook.response.exchanges.exchanges;

  async function doManualWithdraw(
    exchange: string,
    ageRestricted: number | undefined,
  ): Promise<{
    transactionId: string;
    confirmTransferUrl: string | undefined;
  }> {
    const res = await api.wallet.call(
      WalletApiOperation.AcceptManualWithdrawal,
      {
        exchangeBaseUrl: exchange,
        amount: Amounts.stringify(chosenAmount),
        restrictAge: ageRestricted,
      },
    );
    return {
      confirmTransferUrl: undefined,
      transactionId: res.transactionId,
    };
  }

  return () =>
    exchangeSelectionState(
      uriInfoHook.retry,
      doManualWithdraw,
      cancel,
      onSuccess,
      undefined,
      chosenAmount,
      exchangeList,
      undefined,
    );
}

export function useComponentStateFromURI({
  talerWithdrawUri,
  cancel,
  onSuccess,
}: PropsFromURI): RecursiveState<State> {
  const api = useBackendContext();
  /**
   * Ask the wallet about the withdraw URI
   */
  const uriInfoHook = useAsyncAsHook(async () => {
    if (!talerWithdrawUri) throw Error("ERROR_NO-URI-FOR-WITHDRAWAL");

    const uriInfo = await api.wallet.call(
      WalletApiOperation.GetWithdrawalDetailsForUri,
      {
        talerWithdrawUri,
      },
    );
    const { amount, defaultExchangeBaseUrl } = uriInfo;
    return {
      talerWithdrawUri,
      amount: Amounts.parseOrThrow(amount),
      thisExchange: defaultExchangeBaseUrl,
      exchanges: uriInfo.possibleExchanges,
    };
  });

  if (!uriInfoHook) return { status: "loading", error: undefined };

  if (uriInfoHook.hasError) {
    return {
      status: "uri-error",
      error: uriInfoHook,
    };
  }

  const uri = uriInfoHook.response.talerWithdrawUri;
  const chosenAmount = uriInfoHook.response.amount;
  const defaultExchange = uriInfoHook.response.thisExchange;
  const exchangeList = uriInfoHook.response.exchanges;

  async function doManagedWithdraw(
    exchange: string,
    ageRestricted: number | undefined,
  ): Promise<{
    transactionId: string;
    confirmTransferUrl: string | undefined;
  }> {
    const res = await api.wallet.call(
      WalletApiOperation.AcceptBankIntegratedWithdrawal,
      {
        exchangeBaseUrl: exchange,
        talerWithdrawUri: uri,
        restrictAge: ageRestricted,
      },
    );
    return {
      confirmTransferUrl: res.confirmTransferUrl,
      transactionId: res.transactionId,
    };
  }

  return () =>
    exchangeSelectionState(
      uriInfoHook.retry,
      doManagedWithdraw,
      cancel,
      onSuccess,
      uri,
      chosenAmount,
      exchangeList,
      defaultExchange,
    );
}

type ManualOrManagedWithdrawFunction = (
  exchange: string,
  ageRestricted: number | undefined,
) => Promise<{ transactionId: string; confirmTransferUrl: string | undefined }>;

function exchangeSelectionState(
  onTosUpdate: () => void,
  doWithdraw: ManualOrManagedWithdrawFunction,
  cancel: () => Promise<void>,
  onSuccess: (txid: string) => Promise<void>,
  talerWithdrawUri: string | undefined,
  chosenAmount: AmountJson,
  exchangeList: ExchangeListItem[],
  defaultExchange: string | undefined,
): RecursiveState<State> {
  const api = useBackendContext();
  const selectedExchange = useSelectedExchange({
    currency: chosenAmount.currency,
    defaultExchange,
    list: exchangeList,
  });

  if (selectedExchange.status !== "ready") {
    return selectedExchange;
  }

  return () => {
    const [ageRestricted, setAgeRestricted] = useState(0);
    const currentExchange = selectedExchange.selected;
    const tosNeedToBeAccepted =
      currentExchange.tosStatus == ExchangeTosStatus.New ||
      currentExchange.tosStatus == ExchangeTosStatus.Changed;

    /**
     * With the exchange and amount, ask the wallet the information
     * about the withdrawal
     */
    const amountHook = useAsyncAsHook(async () => {
      const info = await api.wallet.call(
        WalletApiOperation.GetWithdrawalDetailsForAmount,
        {
          exchangeBaseUrl: currentExchange.exchangeBaseUrl,
          amount: Amounts.stringify(chosenAmount),
          restrictAge: ageRestricted,
        },
      );

      const withdrawAmount = {
        raw: Amounts.parseOrThrow(info.amountRaw),
        effective: Amounts.parseOrThrow(info.amountEffective),
      };

      return {
        amount: withdrawAmount,
        ageRestrictionOptions: info.ageRestrictionOptions,
      };
    }, []);

    const [withdrawError, setWithdrawError] = useState<TalerError | undefined>(
      undefined,
    );
    const [doingWithdraw, setDoingWithdraw] = useState<boolean>(false);

    async function doWithdrawAndCheckError(): Promise<void> {
      try {
        setDoingWithdraw(true);
        const res = await doWithdraw(
          currentExchange.exchangeBaseUrl,
          !ageRestricted ? undefined : ageRestricted,
        );
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
        status: "amount-error",
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
      currentExchange,
      toBeReceived,
      withdrawalFee,
      chosenAmount,
      talerWithdrawUri,
      ageRestriction,
      doWithdrawal: {
        onClick:
          doingWithdraw || tosNeedToBeAccepted
            ? undefined
            : doWithdrawAndCheckError,
        error: withdrawError,
      },
      onTosUpdate,
      cancel,
    };
  };
}
