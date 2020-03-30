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
import { OperationError } from "../types/walletTypes";
import { HttpResponse } from "../util/http";
import { Codec } from "../util/codec";

/**
 * This exception is there to let the caller know that an error happened,
 * but the error has already been reported by writing it to the database.
 */
export class OperationFailedAndReportedError extends Error {
  constructor(public operationError: OperationError) {
    super(operationError.message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, OperationFailedAndReportedError.prototype);
  }
}

/**
 * This exception is thrown when an error occured and the caller is
 * responsible for recording the failure in the database.
 */
export class OperationFailedError extends Error {
  constructor(public operationError: OperationError) {
    super(operationError.message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, OperationFailedError.prototype);
  }
}

/**
 * Process an HTTP response that we expect to contain Taler-specific JSON.
 *
 * Depending on the status code, we throw an exception.  This function
 * will try to extract Taler-specific error information from the HTTP response
 * if possible.
 */
export async function scrutinizeTalerJsonResponse<T>(
  resp: HttpResponse,
  codec: Codec<T>,
): Promise<T> {
  // FIXME: We should distinguish between different types of error status
  // to react differently (throttle, report permanent failure)

  // FIXME: Make sure that when we receive an error message,
  // it looks like a Taler error message

  if (resp.status !== 200) {
    let exc: OperationFailedError | undefined = undefined;
    try {
      const errorJson = await resp.json();
      const m = `received error response (status ${resp.status})`;
      exc = new OperationFailedError({
        type: "protocol",
        message: m,
        details: {
          httpStatusCode: resp.status,
          errorResponse: errorJson,
        },
      });
    } catch (e) {
      const m = "could not parse response JSON";
      exc = new OperationFailedError({
        type: "network",
        message: m,
        details: {
          status: resp.status,
        },
      });
    }
    throw exc;
  }
  let json: any;
  try {
    json = await resp.json();
  } catch (e) {
    const m = "could not parse response JSON";
    throw new OperationFailedError({
      type: "network",
      message: m,
      details: {
        status: resp.status,
      },
    });
  }
  return codec.decode(json);
}

/**
 * Run an operation and call the onOpError callback
 * when there was an exception or operation error that must be reported.
 * The cause will be re-thrown to the caller.
 */
export async function guardOperationException<T>(
  op: () => Promise<T>,
  onOpError: (e: OperationError) => Promise<void>,
): Promise<T> {
  try {
    return await op();
  } catch (e) {
    console.log("guard: caught exception");
    if (e instanceof OperationFailedAndReportedError) {
      throw e;
    }
    if (e instanceof OperationFailedError) {
      await onOpError(e.operationError);
      throw new OperationFailedAndReportedError(e.operationError);
    }
    if (e instanceof Error) {
      console.log("guard: caught Error");
      const opErr = {
        type: "exception",
        message: e.message,
        details: {},
      };
      await onOpError(opErr);
      throw new OperationFailedAndReportedError(opErr);
    }
    console.log("guard: caught something else");
    const opErr = {
      type: "exception",
      message: "non-error exception thrown",
      details: {
        value: e.toString(),
      },
    };
    await onOpError(opErr);
    throw new OperationFailedAndReportedError(opErr);
  }
}
