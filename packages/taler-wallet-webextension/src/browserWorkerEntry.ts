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
 * Web worker for crypto operations.
 */

/**
 * Imports.
 */

import { Logger } from "@gnu-taler/taler-util";
import { nativeCrypto } from "@gnu-taler/taler-wallet-core";

const logger = new Logger("browserWorkerEntry.ts");

const worker: Worker = self as any as Worker;

async function handleRequest(
  operation: string,
  id: number,
  req: unknown,
): Promise<void> {
  const impl = nativeCrypto;

  if (!(operation in impl)) {
    console.error(`crypto operation '${operation}' not found`);
    return;
  }

  try {
    const result = await (impl as any)[operation](req);
    worker.postMessage({ result, id });
  } catch (e) {
    logger.error("error during operation", e);
    return;
  }
}

worker.onmessage = (msg: MessageEvent) => {
  const req = msg.data.req;
  if (typeof req !== "object") {
    console.error("request must be an object");
    return;
  }
  const id = msg.data.id;
  if (typeof id !== "number") {
    console.error("RPC id must be number");
    return;
  }
  const operation = msg.data.operation;
  if (typeof operation !== "string") {
    console.error("RPC operation must be string");
    return;
  }

  handleRequest(operation, id, req).catch((e) => {
    console.error("error in browser worker", e);
  });
};
