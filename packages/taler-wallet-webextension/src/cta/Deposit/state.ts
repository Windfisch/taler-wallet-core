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

import { Amounts, CreateDepositGroupResponse } from "@gnu-taler/taler-util";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { talerDepositUri, amountStr, cancel }: Props,
  api: typeof wxApi,
): State {
  const [result, setResult] = useState<CreateDepositGroupResponse | undefined>(
    undefined,
  );

  const info = useAsyncAsHook(async () => {
    if (!talerDepositUri) throw Error("ERROR_NO-URI-FOR-DEPOSIT");
    if (!amountStr) throw Error("ERROR_NO-AMOUNT-FOR-DEPOSIT");
    const amount = Amounts.parse(amountStr);
    if (!amount) throw Error("ERROR_INVALID-AMOUNT-FOR-DEPOSIT");
    const deposit = await api.prepareDeposit(
      talerDepositUri,
      Amounts.stringify(amount),
    );
    return { deposit, uri: talerDepositUri, amount };
  });

  if (!info) return { status: "loading", error: undefined };
  if (info.hasError) {
    return {
      status: "loading-uri",
      error: info,
    };
  }

  const { deposit, uri, amount } = info.response;
  async function doDeposit(): Promise<void> {
    const resp = await api.createDepositGroup(uri, Amounts.stringify(amount));
    setResult(resp);
  }

  if (result !== undefined) {
    return {
      status: "completed",
      error: undefined,
    };
  }

  return {
    status: "ready",
    error: undefined,
    confirm: {
      onClick: doDeposit,
    },
    fee: Amounts.sub(deposit.totalDepositCost, deposit.effectiveDepositAmount)
      .amount,
    cost: deposit.totalDepositCost,
    effective: deposit.effectiveDepositAmount,
    cancel,
  };
}
