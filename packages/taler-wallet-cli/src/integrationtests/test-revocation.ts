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
import { CoinConfig } from "./denomStructures";
import {
  GlobalTestState,
  ExchangeService,
  MerchantService,
  WalletCli,
  setupDb,
  BankService,
  delayMs,
} from "./harness";
import {
  withdrawViaBank,
  makeTestPayment,
  SimpleTestEnvironment,
} from "./helpers";

async function revokeAllWalletCoins(req: {
  wallet: WalletCli;
  exchange: ExchangeService;
  merchant: MerchantService;
}): Promise<void> {
  const { wallet, exchange, merchant } = req;
  const coinDump = await wallet.dumpCoins();
  console.log(coinDump);
  const usedDenomHashes = new Set<string>();
  for (const coin of coinDump.coins) {
    usedDenomHashes.add(coin.denom_pub_hash);
  }
  for (const x of usedDenomHashes.values()) {
    await exchange.revokeDenomination(x);
  }
  await delayMs(1000);
  await exchange.keyup();
  await delayMs(1000);
  await merchant.stop();
  await merchant.start();
  await merchant.pingUntilAvailable();
}

async function createTestEnvironment(
  t: GlobalTestState,
): Promise<SimpleTestEnvironment> {
  const db = await setupDb(t);

  const bank = await BankService.create(t, {
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

  exchange.changeConfig((config) => {
    config.setString("taler-helper-crypto-eddsa", "lookahead_sign", "20 s");
    config.setString("taler-helper-crypto-rsa", "lookahead_sign", "20 s");
  });

  const exchangeBankAccount = await bank.createExchangeAccount(
    "MyExchange",
    "x",
  );
  exchange.addBankAccount("1", exchangeBankAccount);

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

  await bank.start();

  await bank.pingUntilAvailable();

  const coin_u1: CoinConfig = {
    durationLegal: "3 years",
    durationSpend: "2 years",
    durationWithdraw: "7 days",
    rsaKeySize: 1024,
    name: `TESTKUDOS_u1`,
    value: `TESTKUDOS:1`,
    feeDeposit: `TESTKUDOS:0`,
    feeRefresh: `TESTKUDOS:0`,
    feeRefund: `TESTKUDOS:0`,
    feeWithdraw: `TESTKUDOS:0`,
  };

  exchange.addCoinConfigList([coin_u1]);

  await exchange.start();
  await exchange.pingUntilAvailable();

  merchant.addExchange(exchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  await merchant.addInstance({
    id: "minst1",
    name: "minst1",
    paytoUris: ["payto://x-taler-bank/minst1"],
  });

  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [`payto://x-taler-bank/merchant-default`],
  });

  console.log("setup done!");

  const wallet = new WalletCli(t);

  return {
    commonDb: db,
    exchange,
    merchant,
    wallet,
    bank,
    exchangeBankAccount,
  };
}

/**
 * Basic time travel test.
 */
export async function runRevocationTest(t: GlobalTestState) {
  // Set up test environment

  const { wallet, bank, exchange, merchant } = await createTestEnvironment(t);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:15" });

  console.log("revoking first time");
  await revokeAllWalletCoins({ wallet, exchange, merchant });

  // FIXME: this shouldn't be necessary once https://bugs.taler.net/n/6565
  // is implemented.
  await wallet.forceUpdateExchange({ exchangeBaseUrl: exchange.baseUrl });
  await wallet.runUntilDone();
  await wallet.runUntilDone();
  const bal = await wallet.getBalances();
  console.log("wallet balance", bal);

  const order = {
    summary: "Buy me!",
    amount: "TESTKUDOS:10",
    fulfillment_url: "taler://fulfillment-success/thx",
  };

  await makeTestPayment(t, { wallet, merchant, order });

  wallet.deleteDatabase();
  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:15" });

  const coinDump = await wallet.dumpCoins();
  console.log(coinDump);
  const coinPubList = coinDump.coins.map((x) => x.coin_pub);
  await wallet.forceRefresh({
    coinPubList,
  });
  await wallet.runUntilDone();

  console.log("revoking second time");
  await revokeAllWalletCoins({ wallet, exchange, merchant });

  // FIXME: this shouldn't be necessary once https://bugs.taler.net/n/6565
  // is implemented.
  await wallet.forceUpdateExchange({ exchangeBaseUrl: exchange.baseUrl });
  await wallet.runUntilDone();
  await wallet.runUntilDone();
  {
    const bal = await wallet.getBalances();
    console.log("wallet balance", bal);
  }

  await makeTestPayment(t, { wallet, merchant, order });
}
