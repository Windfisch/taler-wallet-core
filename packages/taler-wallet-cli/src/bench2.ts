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
import {
  buildCodecForObject,
  codecForNumber,
  codecForString,
  codecOptional,
  Logger,
} from "@gnu-taler/taler-util";
import {
  checkReserve,
  createFakebankReserve,
  CryptoDispatcher,
  depositCoin,
  downloadExchangeInfo,
  findDenomOrThrow,
  NodeHttpLib,
  refreshCoin,
  SynchronousCryptoWorkerFactoryNode,
  withdrawCoin,
} from "@gnu-taler/taler-wallet-core";

/**
 * Entry point for the benchmark.
 *
 * The benchmark runs against an existing Taler deployment and does not
 * set up its own services.
 */
export async function runBench2(configJson: any): Promise<void> {
  const logger = new Logger("Bench2");

  // Validate the configuration file for this benchmark.
  const benchConf = codecForBench2Config().decode(configJson);
  const curr = benchConf.currency;
  const cryptoDisp = new CryptoDispatcher(new SynchronousCryptoWorkerFactoryNode());
  const cryptoApi = cryptoDisp.cryptoApi;

  const http = new NodeHttpLib();
  http.setThrottling(false);

  const numIter = benchConf.iterations ?? 1;
  const numDeposits = benchConf.deposits ?? 5;

  const reserveAmount = (numDeposits + 1) * 10;

  for (let i = 0; i < numIter; i++) {
    const exchangeInfo = await downloadExchangeInfo(benchConf.exchange, http);

    const reserveKeyPair = await cryptoApi.createEddsaKeypair({});

    console.log("creating fakebank reserve");

    await createFakebankReserve({
      amount: `${curr}:${reserveAmount}`,
      exchangeInfo,
      fakebankBaseUrl: benchConf.bank,
      http,
      reservePub: reserveKeyPair.pub,
    });

    console.log("waiting for reserve");

    await checkReserve(http, benchConf.exchange, reserveKeyPair.pub);

    console.log("reserve found");

    const d1 = findDenomOrThrow(exchangeInfo, `${curr}:8`);

    for (let j = 0; j < numDeposits; j++) {
      console.log("withdrawing coin");
      const coin = await withdrawCoin({
        http,
        cryptoApi,
        reserveKeyPair: {
          reservePriv: reserveKeyPair.priv,
          reservePub: reserveKeyPair.pub,
        },
        denom: d1,
        exchangeBaseUrl: benchConf.exchange,
      });

      console.log("depositing coin");

      await depositCoin({
        amount: `${curr}:4`,
        coin: coin,
        cryptoApi,
        exchangeBaseUrl: benchConf.exchange,
        http,
        depositPayto: benchConf.payto,
      });

      const refreshDenoms = [
        findDenomOrThrow(exchangeInfo, `${curr}:1`),
        findDenomOrThrow(exchangeInfo, `${curr}:1`),
      ];

      console.log("refreshing coin");

      await refreshCoin({
        oldCoin: coin,
        cryptoApi,
        http,
        newDenoms: refreshDenoms,
      });

      console.log("refresh done");
    }
  }
}

/**
 * Format of the configuration file passed to the benchmark
 */
interface Bench2Config {
  /**
   * Base URL of the bank.
   */
  bank: string;

  /**
   * Payto url for deposits.
   */
  payto: string;

  /**
   * Base URL of the exchange.
   */
  exchange: string;

  /**
   * How many withdraw/deposit iterations should be made?
   * Defaults to 1.
   */
  iterations?: number;

  currency: string;

  deposits?: number;
}

/**
 * Schema validation codec for Bench1Config.
 */
const codecForBench2Config = () =>
  buildCodecForObject<Bench2Config>()
    .property("bank", codecForString())
    .property("payto", codecForString())
    .property("exchange", codecForString())
    .property("iterations", codecOptional(codecForNumber()))
    .property("deposits", codecOptional(codecForNumber()))
    .property("currency", codecForString())
    .build("Bench2Config");
