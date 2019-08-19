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
 * Imports.
 */
import { Wallet } from "../wallet";
import { getDefaultNodeWallet } from "../headless/helpers";

class AndroidWalletHelper {
  walletPromise: Promise<Wallet> | undefined;
  constructor() {}

  async init() {
    this.walletPromise = getDefaultNodeWallet();
  }
}

export function installAndroidWalletListener() {
  // @ts-ignore
  const sendMessage: (m: any) => void = global.__akono_sendMessage;
  if (typeof sendMessage !== "function") {
    const errMsg =
      "FATAL: cannot install android wallet listener: akono functions missing";
    console.error(errMsg);
    throw new Error(errMsg);
  }
  const walletHelper = new AndroidWalletHelper();
  const onMessage = (msg: any) => {
    const operation = msg.operation;
    if (typeof operation !== "string") {
      console.error(
        "message to android wallet helper must contain operation of type string",
      );
      return;
    }
    const id = msg.id;
    let result;
    switch (operation) {
      case "init":
        result = walletHelper.init();
        break;
      case "getBalances":
        break;
      case "withdraw-testkudos":
        break;
      default:
        console.error(`operation "${operation}" not understood`);
        return;
    }

    const respMsg = { result, id };
    console.log("sending message back", respMsg);
    sendMessage(respMsg);
  };
  // @ts-ignore
  globalThis.__akono_onMessage = onMessage;
}
