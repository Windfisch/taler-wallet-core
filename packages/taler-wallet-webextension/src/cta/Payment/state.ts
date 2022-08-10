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


import { AmountJson, Amounts, ConfirmPayResult, ConfirmPayResultType, NotificationType, PreparePayResultType, TalerErrorCode } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useEffect, useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { ButtonHandler } from "../../mui/handlers.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { talerPayUri, cancel, goToWalletManualWithdraw }: Props,
  api: typeof wxApi,
): State {
  const [payResult, setPayResult] = useState<ConfirmPayResult | undefined>(
    undefined,
  );
  const [payErrMsg, setPayErrMsg] = useState<TalerError | undefined>(undefined);

  const hook = useAsyncAsHook(async () => {
    if (!talerPayUri) throw Error("ERROR_NO-URI-FOR-PAYMENT");
    const payStatus = await api.preparePay(talerPayUri);
    const balance = await api.getBalance();
    return { payStatus, balance, uri: talerPayUri };
  });

  useEffect(() => {
    api.onUpdateNotification([NotificationType.CoinWithdrawn], () => {
      hook?.retry();
    });
  });

  const hookResponse = !hook || hook.hasError ? undefined : hook.response;

  useEffect(() => {
    if (!hookResponse) return;
    const { payStatus } = hookResponse;
    if (
      payStatus &&
      payStatus.status === PreparePayResultType.AlreadyConfirmed &&
      payStatus.paid
    ) {
      const fu = payStatus.contractTerms.fulfillment_url;
      if (fu) {
        setTimeout(() => {
          document.location.href = fu;
        }, 3000);
      }
    }
  }, [hookResponse]);

  if (!hook) return { status: "loading", error: undefined };
  if (hook.hasError) {
    return {
      status: "loading-uri",
      error: hook,
    };
  }
  const { payStatus } = hook.response;
  const amount = Amounts.parseOrThrow(payStatus.amountRaw);

  const foundBalance = hook.response.balance.balances.find(
    (b) => Amounts.parseOrThrow(b.available).currency === amount.currency,
  );

  const baseResult = {
    uri: hook.response.uri,
    amount,
    error: undefined,
    cancel, goToWalletManualWithdraw
  }

  if (!foundBalance) {
    return {
      status: "no-balance-for-currency",
      balance: undefined,
      payStatus,
      ...baseResult,
    }
  }

  const foundAmount = Amounts.parseOrThrow(foundBalance.available);

  if (payResult) {
    return {
      status: "completed",
      balance: foundAmount,
      payStatus,
      payHandler: {
        error: payErrMsg,
      },
      payResult,
      ...baseResult,
    };
  }

  if (payStatus.status === PreparePayResultType.InsufficientBalance) {
    return {
      status: 'no-enough-balance',
      balance: foundAmount,
      payStatus,
      ...baseResult,
    }
  }

  if (payStatus.status === PreparePayResultType.AlreadyConfirmed) {
    return {
      status: "confirmed",
      balance: foundAmount,
      payStatus,
      ...baseResult,
    };
  }


  async function doPayment(): Promise<void> {
    try {
      if (payStatus.status !== "payment-possible") {
        throw TalerError.fromUncheckedDetail({
          code: TalerErrorCode.GENERIC_CLIENT_INTERNAL_ERROR,
          hint: `payment is not possible: ${payStatus.status}`,
        });
      }
      const res = await api.confirmPay(payStatus.proposalId, undefined);
      if (res.type !== ConfirmPayResultType.Done) {
        throw TalerError.fromUncheckedDetail({
          code: TalerErrorCode.GENERIC_CLIENT_INTERNAL_ERROR,
          hint: `could not confirm payment`,
          payResult: res,
        });
      }
      const fu = res.contractTerms.fulfillment_url;
      if (fu) {
        if (typeof window !== "undefined") {
          document.location.href = fu;
        } else {
          console.log(`should d to ${fu}`);
        }
      }
      setPayResult(res);
    } catch (e) {
      if (e instanceof TalerError) {
        setPayErrMsg(e);
      }
    }
  }

  const payHandler: ButtonHandler = {
    onClick: payErrMsg ? undefined : doPayment,
    error: payErrMsg,
  };

  // (payStatus.status === PreparePayResultType.PaymentPossible)
  return {
    status: "ready",
    payHandler,
    payStatus,
    ...baseResult,
    balance: foundAmount
  };

}

