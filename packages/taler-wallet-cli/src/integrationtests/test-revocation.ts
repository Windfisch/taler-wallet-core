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
  GlobalTestState,
  ExchangeService,
  MerchantService,
  WalletCli,
} from "./harness";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
  makeTestPayment,
} from "./helpers";
import { CoinDumpJson } from "taler-wallet-core";

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

  await exchange.keyup();
  await exchange.pingUntilAvailable();
  await merchant.stop();
  await merchant.start();
  await merchant.pingUntilAvailable();
}

/**
 * Basic time travel test.
 */
export async function runRevocationTest(t: GlobalTestState) {
  // Set up test environment

  const {
    wallet,
    bank,
    exchange,
    merchant,
  } = await createSimpleTestkudosEnvironment(t);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:15" });

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
