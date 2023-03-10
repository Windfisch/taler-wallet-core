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
import { AbsoluteTime, Duration, j2s } from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { GlobalTestState, WalletCli } from "../harness/harness.js";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
} from "../harness/helpers.js";

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runPeerToPeerPullTest(t: GlobalTestState) {
  // Set up test environment

  const { bank, exchange, merchant } = await createSimpleTestkudosEnvironment(
    t,
  );

  // Withdraw digital cash into the wallet.
  const wallet1 = new WalletCli(t, "w1");
  const wallet2 = new WalletCli(t, "w2");
  await withdrawViaBank(t, {
    wallet: wallet2,
    bank,
    exchange,
    amount: "TESTKUDOS:20",
  });

  await wallet1.runUntilDone();

  const purse_expiration = AbsoluteTime.toTimestamp(
    AbsoluteTime.addDuration(
      AbsoluteTime.now(),
      Duration.fromSpec({ days: 2 }),
    ),
  );

  const resp = await wallet1.client.call(
    WalletApiOperation.InitiatePeerPullPayment,
    {
      exchangeBaseUrl: exchange.baseUrl,
      partialContractTerms: {
        summary: "Hello World",
        amount: "TESTKUDOS:5",
        purse_expiration
      },
    },
  );

  const checkResp = await wallet2.client.call(
    WalletApiOperation.CheckPeerPullPayment,
    {
      talerUri: resp.talerUri,
    },
  );

  console.log(`checkResp: ${j2s(checkResp)}`);

  const acceptResp = await wallet2.client.call(
    WalletApiOperation.AcceptPeerPullPayment,
    {
      peerPullPaymentIncomingId: checkResp.peerPullPaymentIncomingId,
    },
  );

  await wallet1.runUntilDone();
  await wallet2.runUntilDone();

  const txn1 = await wallet1.client.call(
    WalletApiOperation.GetTransactions,
    {},
  );
  const txn2 = await wallet2.client.call(
    WalletApiOperation.GetTransactions,
    {},
  );

  console.log(`txn1: ${j2s(txn1)}`);
  console.log(`txn2: ${j2s(txn2)}`);
}

runPeerToPeerPullTest.suites = ["wallet"];
