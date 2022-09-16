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

import { Amounts, TalerErrorDetail } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { amount: amountStr, onClose }: Props,
  api: typeof wxApi,
): State {
  const amount = Amounts.parseOrThrow(amountStr);

  const [subject, setSubject] = useState("");
  const [talerUri, setTalerUri] = useState("");

  const hook = useAsyncAsHook(api.listExchanges);
  const [exchangeIdx, setExchangeIdx] = useState("0");
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

  if (talerUri) {
    return {
      status: "created",
      talerUri,
      error: undefined,
      cancel: {
        onClick: onClose,
      },
      copyToClipboard: {
        onClick: async () => {
          navigator.clipboard.writeText(talerUri);
        },
      },
    };
  }

  const exchanges = hook.response.exchanges.filter(
    (e) => e.currency === amount.currency,
  );
  const exchangeMap = exchanges.reduce(
    (prev, cur, idx) => ({ ...prev, [String(idx)]: cur.exchangeBaseUrl }),
    {} as Record<string, string>,
  );
  const selected = exchanges[Number(exchangeIdx)];

  async function accept(): Promise<string> {
    try {
      const resp = await api.initiatePeerPullPayment({
        amount: Amounts.stringify(amount),
        exchangeBaseUrl: selected.exchangeBaseUrl,
        partialContractTerms: {
          summary: subject,
        },
      });
      return resp.talerUri;
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
    subject: {
      error: !subject ? "cant be empty" : undefined,
      value: subject,
      onInput: async (e) => setSubject(e),
    },
    invalid: !subject || Amounts.isZero(amount),
    exchangeUrl: selected.exchangeBaseUrl,
    create: {
      onClick: async () => {
        const uri = await accept();
        setTalerUri(uri);
      },
    },
    cancel: {
      onClick: onClose,
    },
    chosenAmount: amount,
    toBeReceived: amount,
    error: undefined,
    operationError,
  };
}
