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
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { amount: amountStr, onClose, onSuccess }: Props,
  api: typeof wxApi,
): State {
  const amount = Amounts.parseOrThrow(amountStr);

  const [subject, setSubject] = useState("");
  const [operationError, setOperationError] = useState<
    TalerErrorDetail | undefined
  >(undefined);


  async function accept(): Promise<void> {
    try {
      const resp = await api.initiatePeerPushPayment({
        amount: Amounts.stringify(amount),
        partialContractTerms: {
          summary: subject,
        },
      });
      onSuccess(resp.transactionId);
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
    invalid: !subject || Amounts.isZero(amount),
    cancel: {
      onClick: onClose,
    },
    subject: {
      error: !subject ? "cant be empty" : undefined,
      value: subject,
      onInput: async (e) => setSubject(e),
    },
    create: {
      onClick: accept
    },
    chosenAmount: amount,
    toBeReceived: amount,
    error: undefined,
    operationError,
  };
}
