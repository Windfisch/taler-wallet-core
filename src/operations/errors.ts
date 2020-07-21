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
    if (e instanceof OperationFailedAndReportedError) {
      throw e;
    }
    if (e instanceof OperationFailedError) {
      await onOpError(e.operationError);
      throw new OperationFailedAndReportedError(e.operationError);
    }
    if (e instanceof Error) {
      const opErr = {
        type: "exception",
        message: e.message,
        details: {},
      };
      await onOpError(opErr);
      throw new OperationFailedAndReportedError(opErr);
    }
    const opErr = {
      type: "exception",
      message: "unexpected exception thrown",
      details: {
        value: e.toString(),
      },
    };
    await onOpError(opErr);
    throw new OperationFailedAndReportedError(opErr);
  }
}
