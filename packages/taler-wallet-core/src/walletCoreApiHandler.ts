/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { Wallet } from "./wallet";
import {
  OperationFailedError,
  OperationFailedAndReportedError,
  makeErrorDetails,
} from "./operations/errors";
import { TalerErrorCode } from "./TalerErrorCode";
import { codecForTransactionsRequest } from "./types/transactions";
import {
  buildCodecForObject,
  codecForString,
  Codec,
  codecOptional,
} from "./util/codec";
import { Amounts } from "./util/amounts";
import { OperationErrorDetails } from "./types/walletTypes";

export interface AddExchangeRequest {
  exchangeBaseUrl: string;
}

export const codecForAddExchangeRequest = (): Codec<AddExchangeRequest> =>
  buildCodecForObject<AddExchangeRequest>()
    .property("exchangeBaseUrl", codecForString())
    .build("AddExchangeRequest");

export interface GetExchangeTosRequest {
  exchangeBaseUrl: string;
}

export const codecForGetExchangeTosRequest = (): Codec<GetExchangeTosRequest> =>
  buildCodecForObject<GetExchangeTosRequest>()
    .property("exchangeBaseUrl", codecForString())
    .build("GetExchangeTosRequest");

export interface AcceptManualWithdrawalRequest {
  exchangeBaseUrl: string;
  amount: string;
}

export const codecForAcceptManualWithdrawalRequet = (): Codec<
  AcceptManualWithdrawalRequest
> =>
  buildCodecForObject<AcceptManualWithdrawalRequest>()
    .property("exchangeBaseUrl", codecForString())
    .property("amount", codecForString())
    .build("AcceptManualWithdrawalRequest");

export interface GetWithdrawalDetailsForAmountRequest {
  exchangeBaseUrl: string;
  amount: string;
}

export interface AcceptBankIntegratedWithdrawalRequest {
  talerWithdrawUri: string;
  exchangeBaseUrl: string;
}

export const codecForAcceptBankIntegratedWithdrawalRequest = (): Codec<
  AcceptBankIntegratedWithdrawalRequest
> =>
  buildCodecForObject<AcceptBankIntegratedWithdrawalRequest>()
    .property("exchangeBaseUrl", codecForString())
    .property("talerWithdrawUri", codecForString())
    .build("AcceptBankIntegratedWithdrawalRequest");

export const codecForGetWithdrawalDetailsForAmountRequest = (): Codec<
  GetWithdrawalDetailsForAmountRequest
> =>
  buildCodecForObject<GetWithdrawalDetailsForAmountRequest>()
    .property("exchangeBaseUrl", codecForString())
    .property("amount", codecForString())
    .build("GetWithdrawalDetailsForAmountRequest");

export interface AcceptExchangeTosRequest {
  exchangeBaseUrl: string;
  etag: string;
}

export const codecForAcceptExchangeTosRequest = (): Codec<AcceptExchangeTosRequest> =>
  buildCodecForObject<AcceptExchangeTosRequest>()
    .property("exchangeBaseUrl", codecForString())
    .property("etag", codecForString())
    .build("AcceptExchangeTosRequest");

export interface ApplyRefundRequest {
  talerRefundUri: string;
}

export const codecForApplyRefundRequest = (): Codec<ApplyRefundRequest> =>
  buildCodecForObject<ApplyRefundRequest>()
    .property("talerRefundUri", codecForString())
    .build("ApplyRefundRequest");

export interface GetWithdrawalDetailsForUriRequest {
  talerWithdrawUri: string;
}

export const codecForGetWithdrawalDetailsForUri = (): Codec<
  GetWithdrawalDetailsForUriRequest
> =>
  buildCodecForObject<GetWithdrawalDetailsForUriRequest>()
    .property("talerWithdrawUri", codecForString())
    .build("GetWithdrawalDetailsForUriRequest");

export interface AbortProposalRequest {
  proposalId: string;
}

export const codecForAbortProposalRequest = (): Codec<AbortProposalRequest> =>
  buildCodecForObject<AbortProposalRequest>()
    .property("proposalId", codecForString())
    .build("AbortProposalRequest");

export interface PreparePayRequest {
  talerPayUri: string;
}

const codecForPreparePayRequest = (): Codec<PreparePayRequest> =>
  buildCodecForObject<PreparePayRequest>()
    .property("talerPayUri", codecForString())
    .build("PreparePay");

export interface ConfirmPayRequest {
  proposalId: string;
  sessionId?: string;
}

export const codecForConfirmPayRequest = (): Codec<ConfirmPayRequest> =>
  buildCodecForObject<ConfirmPayRequest>()
    .property("proposalId", codecForString())
    .property("sessionId", codecOptional(codecForString()))
    .build("ConfirmPay");

/**
 * Implementation of the "wallet-core" API.
 */

async function dispatchRequestInternal(
  wallet: Wallet,
  operation: string,
  payload: unknown,
): Promise<Record<string, any>> {
  switch (operation) {
    case "withdrawTestkudos":
      await wallet.withdrawTestBalance();
      return {};
    case "getTransactions": {
      const req = codecForTransactionsRequest().decode(payload);
      return await wallet.getTransactions(req);
    }
    case "addExchange": {
      const req = codecForAddExchangeRequest().decode(payload);
      await wallet.updateExchangeFromUrl(req.exchangeBaseUrl);
      return {};
    }
    case "listExchanges": {
      return await wallet.getExchanges();
    }
    case "getWithdrawalDetailsForUri": {
      const req = codecForGetWithdrawalDetailsForUri().decode(payload);
      return await wallet.getWithdrawalDetailsForUri(req.talerWithdrawUri);
    }
    case "acceptManualWithdrawal": {
      const req = codecForAcceptManualWithdrawalRequet().decode(payload);
      const res = await wallet.acceptManualWithdrawal(
        req.exchangeBaseUrl,
        Amounts.parseOrThrow(req.amount),
      );
      return res;
    }
    case "getWithdrawalDetailsForAmount": {
      const req = codecForGetWithdrawalDetailsForAmountRequest().decode(
        payload,
      );
      return await wallet.getWithdrawalDetailsForAmount(
        req.exchangeBaseUrl,
        Amounts.parseOrThrow(req.amount),
      );
    }
    case "getBalances": {
      return await wallet.getBalances();
    }
    case "getPendingOperations": {
      return await wallet.getPendingOperations();
    }
    case "setExchangeTosAccepted": {
      const req = codecForAcceptExchangeTosRequest().decode(payload);
      await wallet.acceptExchangeTermsOfService(req.exchangeBaseUrl, req.etag);
      return {};
    }
    case "applyRefund": {
      const req = codecForApplyRefundRequest().decode(payload);
      return await wallet.applyRefund(req.talerRefundUri);
    }
    case "acceptBankIntegratedWithdrawal": {
      const req = codecForAcceptBankIntegratedWithdrawalRequest().decode(
        payload,
      );
      return await wallet.acceptWithdrawal(
        req.talerWithdrawUri,
        req.exchangeBaseUrl,
      );
    }
    case "getExchangeTos": {
      const req = codecForGetExchangeTosRequest().decode(payload);
      return wallet.getExchangeTos(req.exchangeBaseUrl);
    }
    case "abortProposal": {
      const req = codecForAbortProposalRequest().decode(payload);
      await wallet.refuseProposal(req.proposalId);
      return {};
    }
    case "retryPendingNow": {
      await wallet.runPending(true);
      return {};
    }
    case "preparePay": {
      const req = codecForPreparePayRequest().decode(payload);
      return await wallet.preparePayForUri(req.talerPayUri);
    }
    case "confirmPay": {
      const req = codecForConfirmPayRequest().decode(payload);
      return await wallet.confirmPay(req.proposalId, req.sessionId);
    }
  }
  throw OperationFailedError.fromCode(
    TalerErrorCode.WALLET_CORE_API_OPERATION_UNKNOWN,
    "unknown operation",
    {
      operation,
    },
  );
}

export type CoreApiResponse = CoreApiResponseSuccess | CoreApiResponseError;

export type CoreApiEnvelope = CoreApiResponse | CoreApiNotification;

export interface CoreApiNotification {
  type: "notification";
  payload: unknown;
}

export interface CoreApiResponseSuccess {
  // To distinguish the message from notifications
  type: "response";
  operation: string;
  id: string;
  result: unknown;
}

export interface CoreApiResponseError {
  // To distinguish the message from notifications
  type: "error";
  operation: string;
  id: string;
  error: OperationErrorDetails;
}

/**
 * Handle a request to the wallet-core API.
 */
export async function handleCoreApiRequest(
  w: Wallet,
  operation: string,
  id: string,
  payload: unknown,
): Promise<CoreApiResponse> {
  try {
    const result = await dispatchRequestInternal(w, operation, payload);
    return {
      type: "response",
      operation,
      id,
      result,
    };
  } catch (e) {
    if (
      e instanceof OperationFailedError ||
      e instanceof OperationFailedAndReportedError
    ) {
      return {
        type: "error",
        operation,
        id,
        error: e.operationError,
      };
    } else {
      return {
        type: "error",
        operation,
        id,
        error: makeErrorDetails(
          TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
          `unexpected exception: ${e}`,
          {},
        ),
      };
    }
  }
}
