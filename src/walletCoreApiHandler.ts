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
  makeCodecForObject,
  codecForString,
  Codec,
  makeCodecOptional,
} from "./util/codec";
import { Amounts } from "./util/amounts";
import { OperationErrorDetails } from "./types/walletTypes";

interface AddExchangeRequest {
  exchangeBaseUrl: string;
}

const codecForAddExchangeRequest = (): Codec<AddExchangeRequest> =>
  makeCodecForObject<AddExchangeRequest>()
    .property("exchangeBaseUrl", codecForString)
    .build("AddExchangeRequest");

interface GetExchangeTosRequest {
  exchangeBaseUrl: string;
}

const codecForGetExchangeTosRequest = (): Codec<GetExchangeTosRequest> =>
  makeCodecForObject<GetExchangeTosRequest>()
    .property("exchangeBaseUrl", codecForString)
    .build("GetExchangeTosRequest");

interface AcceptManualWithdrawalRequest {
  exchangeBaseUrl: string;
  amount: string;
}

const codecForAcceptManualWithdrawalRequet = (): Codec<
  AcceptManualWithdrawalRequest
> =>
  makeCodecForObject<AcceptManualWithdrawalRequest>()
    .property("exchangeBaseUrl", codecForString)
    .property("amount", codecForString)
    .build("AcceptManualWithdrawalRequest");

interface GetWithdrawalDetailsForAmountRequest {
  exchangeBaseUrl: string;
  amount: string;
}

interface AcceptBankIntegratedWithdrawalRequest {
  talerWithdrawUri: string;
  exchangeBaseUrl: string;
}

const codecForAcceptBankIntegratedWithdrawalRequest = (): Codec<
  AcceptBankIntegratedWithdrawalRequest
> =>
  makeCodecForObject<AcceptBankIntegratedWithdrawalRequest>()
    .property("exchangeBaseUrl", codecForString)
    .property("talerWithdrawUri", codecForString)
    .build("AcceptBankIntegratedWithdrawalRequest");

const codecForGetWithdrawalDetailsForAmountRequest = (): Codec<
  GetWithdrawalDetailsForAmountRequest
> =>
  makeCodecForObject<GetWithdrawalDetailsForAmountRequest>()
    .property("exchangeBaseUrl", codecForString)
    .property("amount", codecForString)
    .build("GetWithdrawalDetailsForAmountRequest");

interface AcceptExchangeTosRequest {
  exchangeBaseUrl: string;
  etag: string;
}

const codecForAcceptExchangeTosRequest = (): Codec<AcceptExchangeTosRequest> =>
  makeCodecForObject<AcceptExchangeTosRequest>()
    .property("exchangeBaseUrl", codecForString)
    .property("etag", codecForString)
    .build("AcceptExchangeTosRequest");

interface ApplyRefundRequest {
  talerRefundUri: string;
}

const codecForApplyRefundRequest = (): Codec<ApplyRefundRequest> =>
  makeCodecForObject<ApplyRefundRequest>()
    .property("talerRefundUri", codecForString)
    .build("ApplyRefundRequest");

interface GetWithdrawalDetailsForUriRequest {
  talerWithdrawUri: string;
}

const codecForGetWithdrawalDetailsForUri = (): Codec<
  GetWithdrawalDetailsForUriRequest
> =>
  makeCodecForObject<GetWithdrawalDetailsForUriRequest>()
    .property("talerWithdrawUri", codecForString)
    .build("GetWithdrawalDetailsForUriRequest");

interface AbortProposalRequest {
  proposalId: string;
}

const codecForAbortProposalRequest = (): Codec<AbortProposalRequest> =>
  makeCodecForObject<AbortProposalRequest>()
    .property("proposalId", codecForString)
    .build("AbortProposalRequest");

interface PreparePayRequest {
  talerPayUri: string;
}

const codecForPreparePayRequest = (): Codec<PreparePayRequest> =>
  makeCodecForObject<PreparePayRequest>()
    .property("talerPayUri", codecForString)
    .build("PreparePay");

interface ConfirmPayRequest {
  proposalId: string;
  sessionId?: string;
}

const codecForConfirmPayRequest = (): Codec<ConfirmPayRequest> =>
  makeCodecForObject<ConfirmPayRequest>()
    .property("proposalId", codecForString)
    .property("sessionId", makeCodecOptional(codecForString))
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
      await wallet.acceptExchangeTermsOfService(
        req.exchangeBaseUrl,
        req.etag,
      );
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

export type CoreApiResponse =
 | CoreApiResponseSuccess
 | CoreApiResponseError;

export type CoreApiEnvelope =
 | CoreApiResponse
 | CoreApiNotification;

export interface CoreApiNotification {
  type: "notification";
  payload: unknown;
}

export interface CoreApiResponseSuccess {
  // To distinguish the message from notifications
  type: "response";
  operation: string,
  id: string;
  result: unknown;
}

export interface CoreApiResponseError {
  // To distinguish the message from notifications
  type: "error";
  operation: string,
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
