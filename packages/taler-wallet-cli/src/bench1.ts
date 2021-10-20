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
import { buildCodecForObject, codecForString } from "@gnu-taler/taler-util";
import {
  getDefaultNodeWallet,
  NodeHttpLib,
  WalletApiOperation,
} from "@gnu-taler/taler-wallet-core";

/**
 * Entry point for the benchmark.
 *
 * The benchmark runs against an existing Taler deployment and does not
 * set up its own services.
 */
export async function runBench1(configJson: any): Promise<void> {
  // Validate the configuration file for this benchmark.
  const b1conf = codecForBench1Config().decode(configJson);

  const myHttpLib = new NodeHttpLib();
  const wallet = await getDefaultNodeWallet({
    // No persistent DB storage.
    persistentStoragePath: undefined,
    httpLib: myHttpLib,
  });
  await wallet.client.call(WalletApiOperation.InitWallet, {});

  await wallet.client.call(WalletApiOperation.WithdrawFakebank, {
    amount: "TESTKUDOS:10",
    bank: b1conf.bank,
    exchange: b1conf.exchange,
  });

  await wallet.runTaskLoop({
    stopWhenDone: true,
  });

  await wallet.client.call(WalletApiOperation.CreateDepositGroup, {
    amount: "TESTKUDOS:5",
    depositPaytoUri: "payto://x-taler-bank/localhost/foo",
  });

  await wallet.runTaskLoop({
    stopWhenDone: true,
  });

  wallet.stop();
}

/**
 * Format of the configuration file passed to the benchmark
 */
interface Bench1Config {
  /**
   * Base URL of the bank.
   */
  bank: string;

  /**
   * Base URL of the exchange.
   */
  exchange: string;
}

/**
 * Schema validation codec for Bench1Config.
 */
const codecForBench1Config = () =>
  buildCodecForObject<Bench1Config>()
    .property("bank", codecForString())
    .property("exchange", codecForString())
    .build("Bench1Config");
