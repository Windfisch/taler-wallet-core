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
  j2s,
  Logger,
} from "@gnu-taler/taler-util";
import {
  getDefaultNodeWallet2,
  NodeHttpLib,
  WalletApiOperation,
  Wallet,
  AccessStats,
  downloadExchangeInfo,
} from "@gnu-taler/taler-wallet-core";

/**
 * Entry point for the benchmark.
 *
 * The benchmark runs against an existing Taler deployment and does not
 * set up its own services.
 */
export async function runBench2(configJson: any): Promise<void> {
  const logger = new Logger("Bench1");

  // Validate the configuration file for this benchmark.
  const benchConf = codecForBench1Config().decode(configJson);

  const myHttpLib = new NodeHttpLib();
  myHttpLib.setThrottling(false);

  const exchangeInfo = await downloadExchangeInfo(
    benchConf.exchange,
    myHttpLib,
  );
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

  /**
   * How any iterations run until the wallet db gets purged
   * Defaults to 20.
   */
  restartAfter?: number;
}

/**
 * Schema validation codec for Bench1Config.
 */
const codecForBench1Config = () =>
  buildCodecForObject<Bench2Config>()
    .property("bank", codecForString())
    .property("payto", codecForString())
    .property("exchange", codecForString())
    .property("iterations", codecOptional(codecForNumber()))
    .property("deposits", codecOptional(codecForNumber()))
    .property("currency", codecForString())
    .property("restartAfter", codecOptional(codecForNumber()))
    .build("Bench1Config");
