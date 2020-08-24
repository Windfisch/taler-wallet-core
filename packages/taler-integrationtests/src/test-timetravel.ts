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
import { runTest, GlobalTestState, MerchantPrivateApi, WalletCli } from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";
import { PreparePayResultType, durationMin, Duration } from "taler-wallet-core";

/**
 * Basic time travel test.
 */
runTest(async (t: GlobalTestState) => {
  // Set up test environment

  const {
    wallet,
    bank,
    exchange,
    merchant,
  } = await createSimpleTestkudosEnvironment(t);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  // Travel 400 days into the future,
  // as the deposit expiration is two years
  // into the future.
  const timetravelDuration: Duration = {
    d_ms: 1000 * 60 * 60 * 24 * 400,
  };

  await exchange.stop();
  exchange.setTimetravel(timetravelDuration);
  await exchange.start();
  await exchange.pingUntilAvailable();

  await merchant.stop();
  merchant.setTimetravel(timetravelDuration);
  await merchant.start();
  await merchant.pingUntilAvailable();

  // This should fail, as the wallet didn't time travel yet.
  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  const bal = await wallet.getBalances();

  console.log(bal);
});
