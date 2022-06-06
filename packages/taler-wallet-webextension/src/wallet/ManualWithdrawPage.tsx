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
  AcceptManualWithdrawalResult,
  AmountJson,
  Amounts,
  NotificationType,
  parsePaytoUri,
  PaytoUri,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Loading } from "../components/Loading.js";
import { LoadingError } from "../components/LoadingError.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import * as wxApi from "../wxApi.js";
import { CreateManualWithdraw } from "./CreateManualWithdraw.js";
import { ReserveCreated } from "./ReserveCreated.js";

interface Props {
  currency?: string;
  onCancel: () => Promise<void>;
}

export function ManualWithdrawPage({ currency, onCancel }: Props): VNode {
  const [success, setSuccess] = useState<
    | {
        response: AcceptManualWithdrawalResult;
        exchangeBaseUrl: string;
        amount: AmountJson;
        paytoURI: PaytoUri | undefined;
        payto: string;
      }
    | undefined
  >(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const state = useAsyncAsHook(wxApi.listExchanges);
  useEffect(() => {
    wxApi.onUpdateNotification([NotificationType.ExchangeAdded], () => {
      state?.retry();
    });
  });
  const { i18n } = useTranslationContext();

  async function doCreate(
    exchangeBaseUrl: string,
    amount: AmountJson,
  ): Promise<void> {
    try {
      const response = await wxApi.acceptManualWithdrawal(
        exchangeBaseUrl,
        Amounts.stringify(amount),
      );
      const payto = response.exchangePaytoUris[0];
      const paytoURI = parsePaytoUri(payto);
      setSuccess({ exchangeBaseUrl, response, amount, paytoURI, payto });
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("unexpected error");
      }
      setSuccess(undefined);
    }
  }

  if (success) {
    return (
      <ReserveCreated
        reservePub={success.response.reservePub}
        paytoURI={success.paytoURI}
        // payto={success.payto}
        exchangeBaseUrl={success.exchangeBaseUrl}
        amount={success.amount}
        onCancel={onCancel}
      />
    );
  }

  if (!state) {
    return <Loading />;
  }
  if (state.hasError) {
    return (
      <LoadingError
        title={
          <i18n.Translate>
            Could not load the list of known exchanges
          </i18n.Translate>
        }
        error={state}
      />
    );
  }

  const exchangeList = state.response.exchanges.reduce(
    (p, c) => ({
      ...p,
      [c.exchangeBaseUrl]: c.currency,
    }),
    {} as Record<string, string>,
  );

  return (
    <CreateManualWithdraw
      error={error}
      exchangeUrlWithCurrency={exchangeList}
      onCreate={doCreate}
      initialCurrency={currency}
    />
  );
}
