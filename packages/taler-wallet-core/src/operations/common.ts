/*
 This file is part of GNU Taler
 (C) 2022 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { TalerErrorDetail, TalerErrorCode } from "@gnu-taler/taler-util";
import { CryptoApiStoppedError } from "../crypto/workers/cryptoApi.js";
import { TalerError, getErrorDetailFromException } from "../errors.js";

/**
 * Run an operation and call the onOpError callback
 * when there was an exception or operation error that must be reported.
 * The cause will be re-thrown to the caller.
 */
export async function guardOperationException<T>(
  op: () => Promise<T>,
  onOpError: (e: TalerErrorDetail) => Promise<void>,
): Promise<T> {
  try {
    return await op();
  } catch (e: any) {
    if (e instanceof CryptoApiStoppedError) {
      throw e;
    }
    if (
      e instanceof TalerError &&
      e.hasErrorCode(TalerErrorCode.WALLET_PENDING_OPERATION_FAILED)
    ) {
      throw e;
    }
    const opErr = getErrorDetailFromException(e);
    await onOpError(opErr);
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_PENDING_OPERATION_FAILED,
      {
        innerError: e.errorDetail,
      },
    );
  }
}
