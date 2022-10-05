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

/**
 * Imports.
 */
import { j2s, Logger, TalerErrorCode } from "@gnu-taler/taler-util";
import { getErrorDetailFromException, makeErrorDetail } from "../../errors.js";
import { TalerCryptoInterfaceR } from "../cryptoImplementation.js";
import {
  CryptoWorkerRequestMessage,
  CryptoWorkerResponseMessage,
} from "./cryptoWorkerInterface.js";

const logger = new Logger("worker-common.ts");

/**
 * Process a crypto worker request by calling into the table
 * of supported operations.
 *
 * Does not throw, but returns an error response instead.
 */
export async function processRequestWithImpl(
  reqMsg: CryptoWorkerRequestMessage,
  impl: TalerCryptoInterfaceR,
): Promise<CryptoWorkerResponseMessage> {
  if (typeof reqMsg !== "object") {
    logger.error("request must be an object");
    return {
      type: "error",
      error: makeErrorDetail(TalerErrorCode.WALLET_CRYPTO_WORKER_BAD_REQUEST, {
        detail: "",
      }),
    };
  }
  const id = reqMsg.id;
  if (typeof id !== "number") {
    const msg = "RPC id must be number";
    logger.error(msg);
    return {
      type: "error",
      error: makeErrorDetail(TalerErrorCode.WALLET_CRYPTO_WORKER_BAD_REQUEST, {
        detail: msg,
      }),
    };
  }
  const operation = reqMsg.operation;
  if (typeof operation !== "string") {
    const msg = "RPC operation must be string";
    logger.error(msg);
    return {
      type: "error",
      id,
      error: makeErrorDetail(TalerErrorCode.WALLET_CRYPTO_WORKER_BAD_REQUEST, {
        detail: msg,
      }),
    };
  }

  if (!(operation in impl)) {
    const msg = `crypto operation '${operation}' not found`;
    logger.error(msg);
    return {
      type: "error",
      id,
      error: makeErrorDetail(TalerErrorCode.WALLET_CRYPTO_WORKER_BAD_REQUEST, {
        detail: msg,
      }),
    };
  }

  let responseMsg: CryptoWorkerResponseMessage;

  try {
    const result = await (impl as any)[operation](impl, reqMsg);
    responseMsg = { type: "success", result, id };
  } catch (e: any) {
    logger.error(`error during operation: ${e.stack ?? e.toString()}`);
    responseMsg = {
      type: "error",
      error: getErrorDetailFromException(e),
      id,
    };
  }
  return responseMsg;
}
