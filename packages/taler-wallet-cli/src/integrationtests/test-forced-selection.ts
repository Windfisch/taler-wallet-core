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
import {
  ConfirmPayResultType,
  j2s,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import { Wallet, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import {
  GlobalTestState,
  MerchantPrivateApi,
  WithAuthorization,
} from "../harness/harness.js";
import { createSimpleTestkudosEnvironment } from "../harness/helpers.js";

/**
 * Run test for forced denom/coin selection.
 */
export async function runForcedSelectionTest(t: GlobalTestState) {
  // Set up test environment

  const { wallet, bank, exchange, merchant } =
    await createSimpleTestkudosEnvironment(t);

  await wallet.client.call(WalletApiOperation.AddExchange, {
    exchangeBaseUrl: exchange.baseUrl,
  });

  await wallet.client.call(WalletApiOperation.WithdrawTestBalance, {
    exchangeBaseUrl: exchange.baseUrl,
    amount: "TESTKUDOS:10",
    bankBaseUrl: bank.baseUrl,
    forcedDenomSel: {
      denoms: [
        {
          value: "TESTKUDOS:2",
          count: 3,
        },
      ],
    },
  });

  await wallet.runUntilDone();

  const coinDump = await wallet.client.call(WalletApiOperation.DumpCoins, {});
  console.log(coinDump);
  t.assertDeepEqual(coinDump.coins.length, 3);

  const payResp = await wallet.client.call(WalletApiOperation.TestPay, {
    amount: "TESTKUDOS:3",
    merchantBaseUrl: merchant.makeInstanceBaseUrl(),
    summary: "bla",
    forcedCoinSel: {
      coins: [
        {
          value: "TESTKUDOS:2",
          contribution: "TESTKUDOS:1",
        },
        {
          value: "TESTKUDOS:2",
          contribution: "TESTKUDOS:1",
        },
        {
          value: "TESTKUDOS:2",
          contribution: "TESTKUDOS:1",
        },
      ],
    },
  });

  console.log(j2s(payResp));

  // Without forced selection, we would only use 2 coins.
  t.assertDeepEqual(payResp.payCoinSelection.coinContributions.length, 3);
}

runForcedSelectionTest.suites = ["wallet"];
