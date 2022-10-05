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
import { j2s } from "@gnu-taler/taler-util";
import {
  checkReserve,
  CryptoDispatcher,
  depositCoin,
  downloadExchangeInfo,
  findDenomOrThrow,
  NodeHttpLib,
  refreshCoin,
  SynchronousCryptoWorkerFactory,
  TalerError,
  topupReserveWithDemobank,
  WalletApiOperation,
  withdrawCoin,
} from "@gnu-taler/taler-wallet-core";
import { GlobalTestState, WalletCli } from "../harness/harness.js";
import { createSimpleTestkudosEnvironment } from "../harness/helpers.js";

/**
 * Run test for the different crypto workers.
 */
export async function runWalletCryptoWorkerTest(t: GlobalTestState) {
  const wallet1 = new WalletCli(t, "w1", {
    cryptoWorkerType: "sync",
  });

  await wallet1.client.call(WalletApiOperation.TestCrypto, {});

  const wallet2 = new WalletCli(t, "w2", {
    cryptoWorkerType: "node-worker-thread",
  });

  await wallet2.client.call(WalletApiOperation.TestCrypto, {});
}

runWalletCryptoWorkerTest.suites = ["wallet"];
