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

// This file demonstrates how to use the single-file embedded wallet.

// Load the embedded wallet
const embedded = require("./dist/taler-wallet-embedded.cjs");

// Some bookkeeping to correlate requests to responses.
const requestMap = {};
let requestCounter = 1;

// Install __native_onMessage in the global namespace.
// The __native_onMessage handles messages from the host,
// i.e. it handles wallet-core requests from the host application (UI etc.).
embedded.installNativeWalletListener();

// The host application must the __native_sendMessage callback
// to allow wallet-core to respond.
globalThis.__native_sendMessage = (msgStr) => {
  const message = JSON.parse(msgStr);
  if (message.type === "notification") {
    console.log("got notification:", JSON.stringify(message.payload));
    return;
  }
  if (message.type === "response") {
    console.log("got response", JSON.parse(msgStr));
    const msgId = message.id;
    requestMap[msgId](message);
    delete requestMap[msgId];
    return;
  }
  throw Error("not reached");
};

async function makeRequest(operation, payload = {}) {
  return new Promise((resolve, reject) => {
    const reqId = `req-${requestCounter++}`;
    requestMap[reqId] = (x) => resolve(x);
    __native_onMessage(
      JSON.stringify({
        operation,
        args: payload,
        id: reqId,
      }),
    );
  });
}

async function testMain() {
  const resp = await makeRequest("init");
  console.log("response from init", JSON.stringify(resp));
}

testMain();
