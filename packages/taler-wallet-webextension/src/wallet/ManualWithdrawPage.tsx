/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
*/

import {
  AcceptManualWithdrawalResult,
  AmountJson,
  Amounts,
  NotificationType,
  Translate,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../components/Loading";
import { LoadingError } from "../components/LoadingError";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { Pages } from "../NavigationBar";
import * as wxApi from "../wxApi";
import { CreateManualWithdraw } from "./CreateManualWithdraw";
import { ExchangeAddPage } from "./ExchangeAddPage";
import { ReserveCreated } from "./ReserveCreated";

interface Props {
  currency?: string;
  onCancel: () => void;
}

export function ManualWithdrawPage({ currency, onCancel }: Props): VNode {
  const [success, setSuccess] = useState<
    | {
        response: AcceptManualWithdrawalResult;
        exchangeBaseUrl: string;
        amount: AmountJson;
      }
    | undefined
  >(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const state = useAsyncAsHook(wxApi.listExchanges, [
    NotificationType.ExchangeAdded,
  ]);

  async function doCreate(
    exchangeBaseUrl: string,
    amount: AmountJson,
  ): Promise<void> {
    try {
      const response = await wxApi.acceptManualWithdrawal(
        exchangeBaseUrl,
        Amounts.stringify(amount),
      );
      setSuccess({ exchangeBaseUrl, response, amount });
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("unexpected error");
      }
      setSuccess(undefined);
    }
  }

  const [addingExchange, setAddingExchange] = useState(false);

  if (addingExchange) {
    return <ExchangeAddPage onBack={() => setAddingExchange(false)} />;
  }

  if (success) {
    return (
      <ReserveCreated
        reservePub={success.response.reservePub}
        payto={success.response.exchangePaytoUris[0]}
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
          <Translate>Could not load the list of known exchanges</Translate>
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
      onAddExchange={() => setAddingExchange(true)}
      error={error}
      exchangeList={exchangeList}
      onCreate={doCreate}
      initialCurrency={currency}
    />
  );
}
