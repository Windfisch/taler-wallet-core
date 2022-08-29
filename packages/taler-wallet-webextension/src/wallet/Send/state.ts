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
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { p }: Props,
  api: typeof wxApi,
): State {
  const [subject, setSubject] = useState("");
  const amount = Amounts.parseOrThrow("ARS:0")

  const hook = useAsyncAsHook(api.listExchanges);
  const [exchangeIdx, setExchangeIdx] = useState("0")

  if (!hook) {
    return {
      status: "loading",
      error: undefined,
    }
  }
  if (hook.hasError) {
    return {
      status: "loading-uri",
      error: hook,
    };
  }

  const exchanges = hook.response.exchanges;
  const exchangeMap = exchanges.reduce((prev, cur, idx) => ({ ...prev, [cur.exchangeBaseUrl]: String(idx) }), {} as Record<string, string>)
  const selected = exchanges[Number(exchangeIdx)];

  return {
    status: "ready",
    exchange: {
      list: exchangeMap,
      value: exchangeIdx,
      onChange: async (v) => {
        setExchangeIdx(v)
      }
    },
    subject: {
      value: subject,
      onInput: async (e) => setSubject(e)
    },
    amount,
    error: undefined,
  }
}
