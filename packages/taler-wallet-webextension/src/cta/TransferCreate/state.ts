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
  Amounts,
  TalerErrorDetail,
  TalerProtocolTimestamp
} from "@gnu-taler/taler-util";
import { TalerError, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { isFuture, parse } from "date-fns";
import { useState } from "preact/hooks";
import { useBackendContext } from "../../context/backend.js";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { amount: amountStr, onClose, onSuccess }: Props,
): State {
  const api = useBackendContext()
  const amount = Amounts.parseOrThrow(amountStr);

  const [subject, setSubject] = useState<string | undefined>();
  const [timestamp, setTimestamp] = useState<string | undefined>();

  const [operationError, setOperationError] = useState<
    TalerErrorDetail | undefined
  >(undefined);

  const hook = useAsyncAsHook(async () => {
    const resp = await api.wallet.call(
      WalletApiOperation.PreparePeerPushPayment,
      {
        amount: amountStr,
      },
    );
    return resp;
  });

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

  const { amountEffective, amountRaw } = hook.response;
  const debitAmount = Amounts.parseOrThrow(amountRaw);
  const toBeReceived = Amounts.parseOrThrow(amountEffective);

  let purse_expiration: TalerProtocolTimestamp | undefined = undefined;
  let timestampError: string | undefined = undefined;

  const t =
    timestamp === undefined
      ? undefined
      : parse(timestamp, "dd/MM/yyyy", new Date());

  if (t !== undefined) {
    if (Number.isNaN(t.getTime())) {
      timestampError = 'Should have the format "dd/MM/yyyy"';
    } else {
      if (!isFuture(t)) {
        timestampError = "Should be in the future";
      } else {
        purse_expiration = {
          t_s: t.getTime() / 1000,
        };
      }
    }
  }

  async function accept(): Promise<void> {
    if (!subject || !purse_expiration) return;
    try {
      const resp = await api.wallet.call(
        WalletApiOperation.InitiatePeerPushPayment,
        {
          partialContractTerms: {
            summary: subject,
            amount: amountStr,
            purse_expiration,
          },
        },
      );
      onSuccess(resp.transactionId);
    } catch (e) {
      if (e instanceof TalerError) {
        setOperationError(e.errorDetail);
      }
      console.error(e);
      throw Error("error trying to accept");
    }
  }

  const unableToCreate =
    !subject || Amounts.isZero(amount) || !purse_expiration;

  return {
    status: "ready",
    cancel: {
      onClick: onClose,
    },
    subject: {
      error:
        subject === undefined
          ? undefined
          : !subject
            ? "Can't be empty"
            : undefined,
      value: subject ?? "",
      onInput: async (e) => setSubject(e),
    },
    expiration: {
      error: timestampError,
      value: timestamp === undefined ? "" : timestamp,
      onInput: async (e) => {
        setTimestamp(e);
      },
    },
    create: {
      onClick: unableToCreate ? undefined : accept,
    },
    debitAmount,
    toBeReceived,
    error: undefined,
    operationError,
  };
}
