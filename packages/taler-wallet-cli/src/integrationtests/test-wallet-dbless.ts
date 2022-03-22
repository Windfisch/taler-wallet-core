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
  CryptoApi,
  depositCoin,
  downloadExchangeInfo,
  findDenomOrThrow,
  generateReserveKeypair,
  NodeHttpLib,
  refreshCoin,
  SynchronousCryptoWorkerFactory,
  TalerError,
  topupReserveWithDemobank,
  withdrawCoin,
} from "@gnu-taler/taler-wallet-core";
import { GlobalTestState } from "../harness/harness.js";
import { createSimpleTestkudosEnvironment } from "../harness/helpers.js";

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runWalletDblessTest(t: GlobalTestState) {
  // Set up test environment

  const { bank, exchange } = await createSimpleTestkudosEnvironment(t);

  const http = new NodeHttpLib();
  const cryptoApi = new CryptoApi(new SynchronousCryptoWorkerFactory());

  try {
    // Withdraw digital cash into the wallet.

    const exchangeInfo = await downloadExchangeInfo(exchange.baseUrl, http);

    const reserveKeyPair = generateReserveKeypair();

    await topupReserveWithDemobank(
      http,
      reserveKeyPair.reservePub,
      bank.baseUrl,
      exchangeInfo,
      "TESTKUDOS:10",
    );

    await exchange.runWirewatchOnce();

    await checkReserve(http, exchange.baseUrl, reserveKeyPair.reservePub);

    const d1 = findDenomOrThrow(exchangeInfo, "TESTKUDOS:8");

    const coin = await withdrawCoin({
      http,
      cryptoApi,
      reserveKeyPair,
      denom: d1,
      exchangeBaseUrl: exchange.baseUrl,
    });

    await depositCoin({
      amount: "TESTKUDOS:4",
      coin: coin,
      cryptoApi,
      exchangeBaseUrl: exchange.baseUrl,
      http,
    });

    const refreshDenoms = [
      findDenomOrThrow(exchangeInfo, "TESTKUDOS:1"),
      findDenomOrThrow(exchangeInfo, "TESTKUDOS:1"),
    ];

    await refreshCoin({
      oldCoin: coin,
      cryptoApi,
      http,
      newDenoms: refreshDenoms,
    });
  } catch (e) {
    if (e instanceof TalerError) {
      console.log(e);
      console.log(j2s(e.errorDetail));
    } else {
      console.log(e);
    }
    throw e;
  }
}

runWalletDblessTest.suites = ["wallet"];
