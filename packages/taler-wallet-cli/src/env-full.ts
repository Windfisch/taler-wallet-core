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
import { Duration, j2s, URL } from "@gnu-taler/taler-util";
import { CoinConfig, defaultCoinConfig } from "./harness/denomStructures.js";
import {
  GlobalTestState,
  setupDb,
  ExchangeService,
  FakebankService,
  MerchantService,
  getPayto,
} from "./harness/harness.js";

/**
 * Entry point for the full Taler test environment.
 */
export async function runEnvFull(t: GlobalTestState): Promise<void> {
  const db = await setupDb(t);

  const bank = await FakebankService.create(t, {
    allowRegistrations: true,
    currency: "TESTKUDOS",
    database: db.connStr,
    httpPort: 8082,
  });

  const exchange = ExchangeService.create(t, {
    name: "testexchange-1",
    currency: "TESTKUDOS",
    httpPort: 8081,
    database: db.connStr,
  });

  const merchant = await MerchantService.create(t, {
    name: "testmerchant-1",
    currency: "TESTKUDOS",
    httpPort: 8083,
    database: db.connStr,
  });

  const exchangeBankAccount = await bank.createExchangeAccount(
    "myexchange",
    "x",
  );
  console.log("exchange bank account", j2s(exchangeBankAccount));
  exchange.addBankAccount("1", exchangeBankAccount);

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

  await bank.start();

  await bank.pingUntilAvailable();

  const coinConfig: CoinConfig[] = defaultCoinConfig.map((x) => x("TESTKUDOS"));
  exchange.addCoinConfigList(coinConfig);

  await exchange.start();
  await exchange.pingUntilAvailable();

  merchant.addExchange(exchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [getPayto("merchant-default")],
    defaultWireTransferDelay: Duration.toTalerProtocolDuration(
      Duration.fromSpec({ minutes: 1 }),
    ),
  });

  await merchant.addInstance({
    id: "minst1",
    name: "minst1",
    paytoUris: [getPayto("minst1")],
    defaultWireTransferDelay: Duration.toTalerProtocolDuration(
      Duration.fromSpec({ minutes: 1 }),
    ),
  });

  console.log("setup done!");
}
