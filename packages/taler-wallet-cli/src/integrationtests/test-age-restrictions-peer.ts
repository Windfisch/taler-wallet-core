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
import { getDefaultNodeWallet2, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { defaultCoinConfig } from "../harness/denomStructures.js";
import { GlobalTestState, WalletCli } from "../harness/harness.js";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
  makeTestPayment,
} from "../harness/helpers.js";

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runAgeRestrictionsPeerTest(t: GlobalTestState) {
  // Set up test environment

  const {
    wallet: walletOne,
    bank,
    exchange,
    merchant,
  } = await createSimpleTestkudosEnvironment(
    t,
    defaultCoinConfig.map((x) => x("TESTKUDOS")),
    {
      ageMaskSpec: "8:10:12:14:16:18:21",
    },
  );

  const walletTwo = new WalletCli(t, "walletTwo");
  const walletThree = new WalletCli(t, "walletThree");

  {
    const wallet = walletOne;

    await withdrawViaBank(t, {
      wallet,
      bank,
      exchange,
      amount: "TESTKUDOS:20",
      restrictAge: 13,
    });

    const initResp = await wallet.client.call(WalletApiOperation.InitiatePeerPushPayment, {
      amount: "TESTKUDOS:1",
      partialContractTerms: {
        summary: "Hello, World",
      },
    });

    await wallet.runUntilDone();

    const checkResp = await walletTwo.client.call(WalletApiOperation.CheckPeerPushPayment, {
      talerUri: initResp.talerUri,
    });

    await walletTwo.client.call(WalletApiOperation.AcceptPeerPushPayment, {
      peerPushPaymentIncomingId: checkResp.peerPushPaymentIncomingId,
    });

    await walletTwo.runUntilDone();
  }
}

runAgeRestrictionsPeerTest.suites = ["wallet"];
