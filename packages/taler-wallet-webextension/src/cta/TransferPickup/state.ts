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
  AbsoluteTime,
  Amounts,
  TalerErrorDetail,
  TalerProtocolTimestamp,
} from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { talerPayPushUri, onClose, onSuccess }: Props,
  api: typeof wxApi,
): State {
  const hook = useAsyncAsHook(async () => {
    return await api.checkPeerPushPayment({
      talerUri: talerPayPushUri,
    });
  }, []);
  const [operationError, setOperationError] = useState<
    TalerErrorDetail | undefined
  >(undefined);

  if (!hook) {
    return {
      status: "loading",
      error: undefined,
    };
  }
  if (hook.hasError) {
    return {
      status: "loading-uri",
      error: hook,
    };
  }

  const {
    amount: purseAmount,
    contractTerms,
    peerPushPaymentIncomingId,
  } = hook.response;

  const amount: string = contractTerms?.amount;
  const summary: string | undefined = contractTerms?.summary;
  const expiration: TalerProtocolTimestamp | undefined =
    contractTerms?.purse_expiration;

  async function accept(): Promise<void> {
    try {
      const resp = await api.acceptPeerPushPayment({
        peerPushPaymentIncomingId,
      });
      onSuccess(resp.transactionId)
    } catch (e) {
      if (e instanceof TalerError) {
        setOperationError(e.errorDetail);
      }
      console.error(e);
      throw Error("error trying to accept");
    }
  }
  return {
    status: "ready",
    amount: Amounts.parseOrThrow(amount),
    error: undefined,
    accept: {
      onClick: accept,
    },
    summary,
    expiration: expiration ? AbsoluteTime.fromTimestamp(expiration) : undefined,
    cancel: {
      onClick: onClose,
    },
    operationError,
  };
}
