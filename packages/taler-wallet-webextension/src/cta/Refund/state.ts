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

import { Amounts, NotificationType } from "@gnu-taler/taler-util";
import { useEffect, useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { talerRefundUri, cancel, onSuccess }: Props,
  api: typeof wxApi,
): State {
  const [ignored, setIgnored] = useState(false);

  const info = useAsyncAsHook(async () => {
    if (!talerRefundUri) throw Error("ERROR_NO-URI-FOR-REFUND");
    const refund = await api.prepareRefund({ talerRefundUri });
    return { refund, uri: talerRefundUri };
  });

  useEffect(() => {
    api.onUpdateNotification([NotificationType.RefreshMelted], () => {
      info?.retry();
    });
  });

  if (!info) {
    return { status: "loading", error: undefined };
  }
  if (info.hasError) {
    return {
      status: "loading-uri",
      error: info,
    };
  }

  const { refund, uri } = info.response;

  const doAccept = async (): Promise<void> => {
    const res = await api.applyRefund(uri);

    onSuccess(res.transactionId);
  };

  const doIgnore = async (): Promise<void> => {
    setIgnored(true);
  };

  const baseInfo = {
    amount: Amounts.parseOrThrow(info.response.refund.effectivePaid),
    granted: Amounts.parseOrThrow(info.response.refund.granted),
    merchantName: info.response.refund.info.merchant.name,
    products: info.response.refund.info.products,
    awaitingAmount: Amounts.parseOrThrow(refund.awaiting),
    error: undefined,
  };

  if (ignored) {
    return {
      status: "ignored",
      ...baseInfo,
    };
  }

  if (refund.pending) {
    return {
      status: "in-progress",
      ...baseInfo,
    };
  }

  return {
    status: "ready",
    ...baseInfo,
    orderId: info.response.refund.info.orderId,
    accept: {
      onClick: doAccept,
    },
    ignore: {
      onClick: doIgnore,
    },
    cancel,
  };
}
