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


import { VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { CreateManualWithdraw } from "./CreateManualWithdraw";
import * as wxApi from '../wxApi'
import { AcceptManualWithdrawalResult, AmountJson, Amounts } from "@gnu-taler/taler-util";
import { ReserveCreated } from "./ReserveCreated.js";

interface Props {

}

export function ManualWithdrawPage({ }: Props): VNode {
  const [success, setSuccess] = useState<AcceptManualWithdrawalResult | undefined>(undefined)
  const [currency, setCurrency] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  async function onExchangeChange(exchange: string | undefined) {
    if (!exchange) return
    try {
      const r = await fetch(`${exchange}/keys`)
      const j = await r.json()
      setCurrency(j.currency)
    } catch (e) {
      setError('The exchange url seems invalid')
      setCurrency(undefined)
    }
  }

  async function doCreate(exchangeBaseUrl: string, amount: AmountJson) {
    try {
      const resp = await wxApi.acceptManualWithdrawal(exchangeBaseUrl, Amounts.stringify(amount))
      setSuccess(resp)
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('unexpected error')
      }
      setSuccess(undefined)
    }
  }

  if (success) {
    return <ReserveCreated reservePub={success.reservePub} paytos={success.exchangePaytoUris} onBack={() => {}}/>
  }

  return <CreateManualWithdraw
    error={error} currency={currency}
    onCreate={doCreate} onExchangeChange={onExchangeChange}
  />;
}



