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

/**
 * Imports.
 */
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { GlobalTestState } from "../harness/harness.js";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
} from "../harness/helpers.js";

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runPeerToPeerPushTest(t: GlobalTestState) {
  // Set up test environment

  const { wallet, bank, exchange, merchant } =
    await createSimpleTestkudosEnvironment(t);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  await wallet.runUntilDone();

  const resp = await wallet.client.call(
    WalletApiOperation.InitiatePeerPushPayment,
    {
      amount: "TESTKUDOS:5",
      partialContractTerms: {
        summary: "Hello World",
      },
    },
  );

  console.log(resp);

  const checkResp = await wallet.client.call(
    WalletApiOperation.CheckPeerPushPayment,
    {
      talerUri: resp.talerUri,
    },
  );

  console.log(checkResp);

  const acceptResp = await wallet.client.call(
    WalletApiOperation.AcceptPeerPushPayment,
    {
      peerPushPaymentIncomingId: checkResp.peerPushPaymentIncomingId,
    },
  );

  console.log(acceptResp);

  await wallet.runUntilDone();
}

runPeerToPeerPushTest.suites = ["wallet"];
