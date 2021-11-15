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

import { BalancesResponse } from "@gnu-taler/taler-util";
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";

interface BalancesHookOk {
  hasError: false;
  response: BalancesResponse;
}

interface BalancesHookError {
  hasError: true;
  message: string;
}

export type BalancesHook = BalancesHookOk | BalancesHookError | undefined;

export function useBalances(): BalancesHook {
  const [balance, setBalance] = useState<BalancesHook>(undefined);
  useEffect(() => {
    async function checkBalance() {
      try {
        const response = await wxApi.getBalance();
        console.log("got balance", balance);
        setBalance({ hasError: false, response });
      } catch (e) {
        console.error("could not retrieve balances", e);
        if (e instanceof Error) {
          setBalance({ hasError: true, message: e.message });
        }
      }
    }
    checkBalance();
    return wxApi.onUpdateNotification(checkBalance);
  }, []);

  return balance;
}
