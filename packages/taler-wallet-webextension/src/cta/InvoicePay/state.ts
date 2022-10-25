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
  NotificationType,
  PreparePayResult,
  PreparePayResultType,
  TalerErrorDetail,
  TalerProtocolTimestamp
} from "@gnu-taler/taler-util";
import { TalerError, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useEffect, useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { wxApi } from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { talerPayPullUri, onClose, goToWalletManualWithdraw, onSuccess }: Props,
  api: typeof wxApi,
): State {
  const hook = useAsyncAsHook(async () => {
    const p2p = await api.wallet.call(WalletApiOperation.CheckPeerPullPayment, {
      talerUri: talerPayPullUri,
    });
    const balance = await api.wallet.call(WalletApiOperation.GetBalances, {});
    return { p2p, balance };
  });

  useEffect(() => api.listener.onUpdateNotification(
    [NotificationType.CoinWithdrawn],
    hook?.retry
  ));

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
    contractTerms,
    peerPullPaymentIncomingId,
  } = hook.response.p2p;

  const amountStr: string = contractTerms?.amount;
  const amount = Amounts.parseOrThrow(amountStr);
  const summary: string | undefined = contractTerms?.summary;
  const expiration: TalerProtocolTimestamp | undefined =
    contractTerms?.purse_expiration;

  const foundBalance = hook.response.balance.balances.find(
    (b) => Amounts.parseOrThrow(b.available).currency === amount.currency,
  );

  const paymentPossible: PreparePayResult = {
    status: PreparePayResultType.PaymentPossible,
    proposalId: "fakeID",
    contractTerms: {} as any,
    contractTermsHash: "asd",
    amountRaw: hook.response.p2p.amount,
    amountEffective: hook.response.p2p.amount,
    noncePriv: "",
  } as PreparePayResult;

  const insufficientBalance: PreparePayResult = {
    status: PreparePayResultType.InsufficientBalance,
    proposalId: "fakeID",
    contractTerms: {} as any,
    amountRaw: hook.response.p2p.amount,
    noncePriv: "",
  };

  const baseResult = {
    uri: talerPayPullUri,
    cancel: {
      onClick: onClose,
    },
    amount,
    goToWalletManualWithdraw,
    summary,
    expiration: expiration ? AbsoluteTime.fromTimestamp(expiration) : undefined,
    operationError,
  };

  if (!foundBalance) {
    return {
      status: "no-balance-for-currency",
      error: undefined,
      balance: undefined,
      ...baseResult,
      payStatus: insufficientBalance,
    };
  }

  const foundAmount = Amounts.parseOrThrow(foundBalance.available);

  //FIXME: should use pay result type since it check for coins exceptions
  if (Amounts.cmp(foundAmount, amount) < 0) {
    //payStatus.status === PreparePayResultType.InsufficientBalance) {
    return {
      status: "no-enough-balance",
      error: undefined,
      balance: foundAmount,
      ...baseResult,
      payStatus: insufficientBalance,
    };
  }

  async function accept(): Promise<void> {
    try {
      const resp = await api.wallet.call(WalletApiOperation.AcceptPeerPullPayment, {
        peerPullPaymentIncomingId,
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
    error: undefined,
    ...baseResult,
    payStatus: paymentPossible,
    balance: foundAmount,
    accept: {
      onClick: accept,
    },
  };
}
