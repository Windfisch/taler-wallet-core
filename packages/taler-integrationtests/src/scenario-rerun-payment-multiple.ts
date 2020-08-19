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
  BankService,
  ExchangeService,
  MerchantService,
  WalletCli,
  runTestWithState,
  MerchantPrivateApi,
} from "./harness";
import { withdrawViaBank } from "./helpers";
import fs from "fs";

let existingTestDir =
  process.env["TALER_TEST_OLD_DIR"] ?? "/tmp/taler-integrationtest-current";

if (!fs.existsSync(existingTestDir)) {
  throw Error("old test dir not found");
}

existingTestDir = fs.realpathSync(existingTestDir);

const prevT = new GlobalTestState({
  testDir: existingTestDir,
});

async function withdrawAndPay(
  t: GlobalTestState,
  wallet: WalletCli,
  bank: BankService,
  exchange: ExchangeService,
  merchant: MerchantService,
): Promise<void> {
  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:100" });

  // Set up order.

  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:80",
      fulfillment_url: "taler://fulfillment-success/thx",
    },
  });

  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  // Make wallet pay for the order

  const r1 = await wallet.apiRequest("preparePay", {
    talerPayUri: orderStatus.taler_pay_uri,
  });
  t.assertTrue(r1.type === "response");

  const r2 = await wallet.apiRequest("confirmPay", {
    // FIXME: should be validated, don't cast!
    proposalId: (r1.result as any).proposalId,
  });
  t.assertTrue(r2.type === "response");

  // Check if payment was successful.

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "paid");
}

/**
 * Run test.
 */
runTestWithState(prevT, async (t: GlobalTestState) => {
  // Set up test environment

  const bank = BankService.fromExistingConfig(t);
  const exchange = ExchangeService.fromExistingConfig(t, "testexchange-1");
  const merchant = MerchantService.fromExistingConfig(t, "testmerchant-1");

  await bank.start();
  await exchange.start();
  await merchant.start();
  await Promise.all([
    bank.pingUntilAvailable(),
    merchant.pingUntilAvailable(),
    exchange.pingUntilAvailable(),
  ]);

  const wallet = new WalletCli(t);

  // Withdraw digital cash into the wallet.

  const repetitions = Number.parseInt(process.env["TALER_TEST_REPEAT"] ?? "1");

  for (let rep = 0; rep < repetitions; rep++) {
    console.log("repetition", rep);
    try {
      wallet.deleteDatabase();
      await withdrawAndPay(t, wallet, bank, exchange, merchant);
    } catch (e) {
      console.log("ignoring exception", e);
    }
  }

  await t.shutdown();
});
