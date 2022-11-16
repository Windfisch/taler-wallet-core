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
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { wxApi } from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { talerTipUri, onCancel, onSuccess }: Props,
  api: typeof wxApi,
): State {
  const tipInfo = useAsyncAsHook(async () => {
    if (!talerTipUri) throw Error("ERROR_NO-URI-FOR-TIP");
    const tip = await api.wallet.call(WalletApiOperation.PrepareTip, {
      talerTipUri,
    });
    return { tip };
  });

  if (!tipInfo) {
    return {
      status: "loading",
      error: undefined,
    };
  }
  if (tipInfo.hasError) {
    return {
      status: "loading-uri",
      error: tipInfo,
    };
  }

  const { tip } = tipInfo.response;

  const doAccept = async (): Promise<void> => {
    const res = await api.wallet.call(WalletApiOperation.AcceptTip, {
      walletTipId: tip.walletTipId,
    });

    //FIX: this may not be seen since we are moving to the success also
    tipInfo.retry();
    onSuccess(res.transactionId);
  };

  const baseInfo = {
    merchantBaseUrl: tip.merchantBaseUrl,
    exchangeBaseUrl: tip.exchangeBaseUrl,
    amount: Amounts.parseOrThrow(tip.tipAmountEffective),
    error: undefined,
    cancel: {
      onClick: onCancel,
    },
  };

  if (tip.accepted) {
    return {
      status: "accepted",
      ...baseInfo,
    };
  }

  return {
    status: "ready",
    ...baseInfo,
    accept: {
      onClick: doAccept,
    },
  };
}
