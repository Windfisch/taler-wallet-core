/*
 This file is part of GNU Taler
 (C) 2019-2020 Taler Systems SA

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Classes and helpers for error handling specific to wallet operations.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import {
  TalerErrorCode,
  TalerErrorDetail,
  TransactionType,
} from "@gnu-taler/taler-util";

export interface DetailsMap {
  [TalerErrorCode.WALLET_PENDING_OPERATION_FAILED]: {
    innerError: TalerErrorDetail;
    transactionId?: string;
  };
  [TalerErrorCode.WALLET_EXCHANGE_DENOMINATIONS_INSUFFICIENT]: {
    exchangeBaseUrl: string;
  };
  [TalerErrorCode.WALLET_EXCHANGE_PROTOCOL_VERSION_INCOMPATIBLE]: {
    exchangeProtocolVersion: string;
    walletProtocolVersion: string;
  };
  [TalerErrorCode.WALLET_WITHDRAWAL_OPERATION_ABORTED_BY_BANK]: {};
  [TalerErrorCode.WALLET_TIPPING_COIN_SIGNATURE_INVALID]: {};
  [TalerErrorCode.WALLET_ORDER_ALREADY_CLAIMED]: {
    orderId: string;
    claimUrl: string;
  };
  [TalerErrorCode.WALLET_CONTRACT_TERMS_MALFORMED]: {};
  [TalerErrorCode.WALLET_CONTRACT_TERMS_SIGNATURE_INVALID]: {
    merchantPub: string;
    orderId: string;
  };
  [TalerErrorCode.WALLET_CONTRACT_TERMS_BASE_URL_MISMATCH]: {
    baseUrlForDownload: string;
    baseUrlFromContractTerms: string;
  };
  [TalerErrorCode.WALLET_INVALID_TALER_PAY_URI]: {
    talerPayUri: string;
  };
  [TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR]: {};
  [TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION]: {};
  [TalerErrorCode.WALLET_BANK_INTEGRATION_PROTOCOL_VERSION_INCOMPATIBLE]: {};
  [TalerErrorCode.WALLET_CORE_API_OPERATION_UNKNOWN]: {};
  [TalerErrorCode.WALLET_HTTP_REQUEST_THROTTLED]: {};
  [TalerErrorCode.WALLET_NETWORK_ERROR]: {};
  [TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE]: {};
  [TalerErrorCode.WALLET_EXCHANGE_COIN_SIGNATURE_INVALID]: {};
  [TalerErrorCode.WALLET_WITHDRAWAL_GROUP_INCOMPLETE]: {};
  [TalerErrorCode.WALLET_CORE_NOT_AVAILABLE]: {};
  [TalerErrorCode.GENERIC_UNEXPECTED_REQUEST_ERROR]: {};
  [TalerErrorCode.WALLET_PAY_MERCHANT_SERVER_ERROR]: {
    requestError: TalerErrorDetail;
  };
  [TalerErrorCode.WALLET_CRYPTO_WORKER_ERROR]: {
    innerError: TalerErrorDetail;
  };
  [TalerErrorCode.WALLET_CRYPTO_WORKER_BAD_REQUEST]: {
    detail: string;
  };
  [TalerErrorCode.WALLET_WITHDRAWAL_KYC_REQUIRED]: {
    // FIXME!
  };
}

type ErrBody<Y> = Y extends keyof DetailsMap ? DetailsMap[Y] : never;

export function makeErrorDetail<C extends TalerErrorCode>(
  code: C,
  detail: ErrBody<C>,
  hint?: string,
): TalerErrorDetail {
  if (!hint && !(detail as any).hint) {
    hint = getDefaultHint(code);
  }
  return { code, hint, ...detail };
}

export function makePendingOperationFailedError(
  innerError: TalerErrorDetail,
  tag: TransactionType,
  uid: string,
): TalerError {
  return TalerError.fromDetail(TalerErrorCode.WALLET_PENDING_OPERATION_FAILED, {
    innerError,
    transactionId: `${tag}:${uid}`,
  });
}

export function summarizeTalerErrorDetail(ed: TalerErrorDetail): string {
  const errName = TalerErrorCode[ed.code] ?? "<unknown>";
  return `Error (${ed.code}/${errName})`;
}

function getDefaultHint(code: number): string {
  const errName = TalerErrorCode[code];
  if (errName) {
    return `Error (${errName})`;
  } else {
    return `Error (<unknown>)`;
  }
}

export class TalerProtocolViolationError<T = any> extends Error {
  constructor(hint?: string) {
    let msg: string;
    if (hint) {
      msg = `Taler protocol violation error (${hint})`;
    } else {
      msg = `Taler protocol violation error`;
    }
    super(msg);
    Object.setPrototypeOf(this, TalerProtocolViolationError.prototype);
  }
}

export class TalerError<T = any> extends Error {
  errorDetail: TalerErrorDetail & T;
  private constructor(d: TalerErrorDetail & T) {
    super(d.hint ?? `Error (code ${d.code})`);
    this.errorDetail = d;
    Object.setPrototypeOf(this, TalerError.prototype);
  }

  static fromDetail<C extends TalerErrorCode>(
    code: C,
    detail: ErrBody<C>,
    hint?: string,
  ): TalerError {
    if (!hint) {
      hint = getDefaultHint(code);
    }
    return new TalerError<unknown>({ code, hint, ...detail });
  }

  static fromUncheckedDetail(d: TalerErrorDetail): TalerError {
    return new TalerError<unknown>({ ...d });
  }

  static fromException(e: any): TalerError {
    const errDetail = getErrorDetailFromException(e);
    return new TalerError(errDetail);
  }

  hasErrorCode<C extends keyof DetailsMap>(
    code: C,
  ): this is TalerError<DetailsMap[C]> {
    return this.errorDetail.code === code;
  }
}

/**
 * Convert an exception (or anything that was thrown) into
 * a TalerErrorDetail object.
 */
export function getErrorDetailFromException(e: any): TalerErrorDetail {
  if (e instanceof TalerError) {
    return e.errorDetail;
  }
  if (e instanceof Error) {
    const err = makeErrorDetail(
      TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
      {
        stack: e.stack,
      },
      `unexpected exception (message: ${e.message})`,
    );
    return err;
  }
  // Something was thrown that is not even an exception!
  // Try to stringify it.
  let excString: string;
  try {
    excString = e.toString();
  } catch (e) {
    // Something went horribly wrong.
    excString = "can't stringify exception";
  }
  const err = makeErrorDetail(
    TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
    {},
    `unexpected exception (not an exception, ${excString})`,
  );
  return err;
}
