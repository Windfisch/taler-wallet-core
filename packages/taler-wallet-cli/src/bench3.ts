/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
  j2s,
  Logger,
} from "@gnu-taler/taler-util";
import {
  getDefaultNodeWallet2,
  NodeHttpLib,
  WalletApiOperation,
  Wallet,
  AccessStats,
} from "@gnu-taler/taler-wallet-core";
import benchMerchantIDGenerator from "./benchMerchantIDGenerator.js";

/**
 * Entry point for the benchmark.
 *
 * The benchmark runs against an existing Taler deployment and does not
 * set up its own services.
 */
export async function runBench3(configJson: any): Promise<void> {
  const logger = new Logger("Bench3");

  // Validate the configuration file for this benchmark.
  const b3conf = codecForBench3Config().decode(configJson);

  if (!b3conf.paytoTemplate.includes("${id")) {
    throw new Error("Payto template url must contain '${id}' placeholder");
  }

  const myHttpLib = new NodeHttpLib();
  myHttpLib.setThrottling(false);

  const numIter = b3conf.iterations ?? 1;
  const numDeposits = b3conf.deposits ?? 5;
  const restartWallet = b3conf.restartAfter ?? 20;

  const withdrawAmount = (numDeposits + 1) * 10;

  const IDGenerator = benchMerchantIDGenerator(b3conf.randomAlg, b3conf.numMerchants ?? 100);

  logger.info(
    `Starting Benchmark iterations=${numIter} deposits=${numDeposits} with ${b3conf.randomAlg} merchant selection`,
  );

  const trustExchange = !!process.env["TALER_WALLET_INSECURE_TRUST_EXCHANGE"];
  if (trustExchange) {
    logger.info("trusting exchange (not validating signatures)");
  } else {
    logger.info("not trusting exchange (validating signatures)");
  }
  const batchWithdrawal = !!process.env["TALER_WALLET_BATCH_WITHDRAWAL"];

  let wallet = {} as Wallet;
  let getDbStats: () => AccessStats;

  for (let i = 0; i < numIter; i++) {
    // Create a new wallet in each iteration
    // otherwise the TPS go down
    // my assumption is that the in-memory db file gets too large
    if (i % restartWallet == 0) {
      if (Object.keys(wallet).length !== 0) {
        wallet.stop();
        console.log("wallet DB stats", j2s(getDbStats!()));
      }

      const res = await getDefaultNodeWallet2({
        // No persistent DB storage.
        persistentStoragePath: undefined,
        httpLib: myHttpLib,
      });
      wallet = res.wallet;
      getDbStats = res.getDbStats;
      if (trustExchange) {
        wallet.setInsecureTrustExchange();
      }
      wallet.setBatchWithdrawal(batchWithdrawal);
      await wallet.client.call(WalletApiOperation.InitWallet, {});
    }

    logger.trace(`Starting withdrawal amount=${withdrawAmount}`);
    let start = Date.now();

    await wallet.client.call(WalletApiOperation.WithdrawFakebank, {
      amount: b3conf.currency + ":" + withdrawAmount,
      bank: b3conf.bank,
      exchange: b3conf.exchange,
    });

    await wallet.runTaskLoop({
      stopWhenDone: true,
    });

    logger.info(
      `Finished withdrawal amount=${withdrawAmount} time=${Date.now() - start}`,
    );

    for (let i = 0; i < numDeposits; i++) {
      logger.trace(`Starting deposit amount=10`);
      start = Date.now();

      let merchID = IDGenerator.getRandomMerchantID();
      let payto = b3conf.paytoTemplate.replace("${id}", merchID.toString());

      await wallet.client.call(WalletApiOperation.CreateDepositGroup, {
        amount: b3conf.currency + ":10",
        depositPaytoUri: payto,
      });

      await wallet.runTaskLoop({
        stopWhenDone: true,
      });

      logger.info(`Finished deposit amount=10 time=${Date.now() - start}`);
    }
  }

  wallet.stop();
  console.log("wallet DB stats", j2s(getDbStats!()));
}

/**
 * Format of the configuration file passed to the benchmark
 */
interface Bench3Config {
  /**
   * Base URL of the bank.
   */
  bank: string;

  /**
   * Payto url template for deposits, must contain '${id}' for replacements.
   */
  paytoTemplate: string;

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

  /**
   * How any iterations run until the wallet db gets purged
   * Defaults to 20.
   */
  restartAfter?: number;

  /**
   * Number of merchants to select from randomly
   */
  numMerchants?: number;

  /**
   * Which random generator to use.
   * Possible values: 'zipf', 'rand'
   */
  randomAlg: string;
}

/**
 * Schema validation codec for Bench1Config.
 */
const codecForBench3Config = () =>
  buildCodecForObject<Bench3Config>()
    .property("bank", codecForString())
    .property("paytoTemplate", codecForString())
    .property("numMerchants", codecOptional(codecForNumber()))
    .property("randomAlg", codecForString())
    .property("exchange", codecForString())
    .property("iterations", codecOptional(codecForNumber()))
    .property("deposits", codecOptional(codecForNumber()))
    .property("currency", codecForString())
    .property("restartAfter", codecOptional(codecForNumber()))
    .build("Bench1Config");
