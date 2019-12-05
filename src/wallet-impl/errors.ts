import { OperationError } from "../walletTypes";

/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * This exception is there to let the caller know that an error happened,
 * but the error has already been reported by writing it to the database.
 */
export class OperationFailedAndReportedError extends Error {
  constructor(message: string) {
    super(message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, OperationFailedAndReportedError.prototype);
  }
}

/**
 * This exception is thrown when an error occured and the caller is
 * responsible for recording the failure in the database.
 */
export class OperationFailedError extends Error {
  constructor(message: string, public err: OperationError) {
    super(message);

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
    return op();
  } catch (e) {
    if (e instanceof OperationFailedAndReportedError) {
      throw e;
    }
    if (e instanceof OperationFailedError) {
      await onOpError(e.err);
      throw new OperationFailedAndReportedError(e.message);
    }
    if (e instanceof Error) {
      await onOpError({
        type: "exception",
        message: e.message,
        details: {},
      });
      throw new OperationFailedAndReportedError(e.message);
    }
    await onOpError({
      type: "exception",
      message: "non-error exception thrown",
      details: {
        value: e.toString(),
      },
    });
    throw new OperationFailedAndReportedError(e.message);
  }
}