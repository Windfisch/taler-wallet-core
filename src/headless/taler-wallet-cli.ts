/*
 This file is part of TALER
 (C) 2019 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import commander = require("commander");
import os = require("os");
import { getDefaultNodeWallet, withdrawTestBalance } from "./helpers";
import { MerchantBackendConnection } from "./merchant";
import { runIntegrationTest } from "./integrationtest";
import { Wallet } from "../wallet";
import querystring = require("querystring");
import qrcodeGenerator = require("qrcode-generator")

const program = new commander.Command();
program.version("0.0.1").option("--verbose", "enable verbose output", false);

const walletDbPath = os.homedir + "/" + ".talerwalletdb.json";

function applyVerbose(verbose: boolean) {
  if (verbose) {
    console.log("enabled verbose logging");
    Wallet.enableTracing = true;
  }
}

program
  .command("test-withdraw")
  .description("withdraw test currency from the test bank")
  .action(async () => {
    applyVerbose(program.verbose);
    console.log("test-withdraw command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    await withdrawTestBalance(wallet);
    process.exit(0);
  });

program
  .command("balance")
  .description("show wallet balance")
  .action(async () => {
    applyVerbose(program.verbose);
    console.log("balance command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    console.log("got wallet");
    const balance = await wallet.getBalances();
    console.log(JSON.stringify(balance, undefined, 2));
    process.exit(0);
  });

async function asyncSleep(milliSeconds: number): Promise<void> {
  return new Promise<void>((resolve, reject) =>{
    setTimeout(() => resolve(), milliSeconds)
  });
}

program
  .command("test-merchant-qrcode")
  .option("-a, --amount <spend-amt>", "amount to spend", "TESTKUDOS:1")
  .option("-s, --summary <summary>", "contract summary", "Test Payment")
  .action(async cmdObj => {
    applyVerbose(program.verbose);
    console.log("creating order");
    const merchantBackend = new MerchantBackendConnection("https://backend.test.taler.net", "default", "sandbox");
    const orderResp = await merchantBackend.createOrder(cmdObj.amount, cmdObj.summary, "");
    console.log("created new order with order ID", orderResp.orderId);
    const checkPayResp = await merchantBackend.checkPayment(orderResp.orderId);
    const qrcode = qrcodeGenerator(0, "M");
    const contractUrl = checkPayResp.contract_url;
    if (typeof contractUrl !== "string") {
      console.error("fata: no contract url received from backend");
      process.exit(1);
      return;
    }
    qrcode.addData("talerpay:" + querystring.escape(contractUrl));
    qrcode.make();
    console.log(qrcode.createASCII());
    console.log("waiting for payment ...")
    while (1) {
      await asyncSleep(500);
      const checkPayResp2 = await merchantBackend.checkPayment(orderResp.orderId);
      if (checkPayResp2.paid) {
        console.log("payment successfully received!")
        break;
      }
    }
  });

program
  .command("integrationtest")
  .option(
    "-e, --exchange <exchange-url>",
    "exchange base URL",
    "https://exchange.test.taler.net/",
  )
  .option(
    "-m, --merchant <merchant-url>",
    "merchant base URL",
    "https://backend.test.taler.net/",
  )
  .option(
    "-m, --merchant-instance <merchant-instance>",
    "merchant instance",
    "default",
  )
  .option(
    "-m, --merchant-api-key <merchant-api-key>",
    "merchant API key",
    "sandbox",
  )
  .option(
    "-b, --bank <bank-url>",
    "bank base URL",
    "https://bank.test.taler.net/",
  )
  .option(
    "-w, --withdraw-amount <withdraw-amt>",
    "amount to withdraw",
    "TESTKUDOS:10",
  )
  .option("-s, --spend-amount <spend-amt>", "amount to spend", "TESTKUDOS:5")
  .description("Run integration test with bank, exchange and merchant.")
  .action(async cmdObj => {
    applyVerbose(program.verbose);

    await runIntegrationTest({
      amountToSpend: cmdObj.spendAmount,
      amountToWithdraw: cmdObj.withdrawAmount,
      bankBaseUrl: cmdObj.bank,
      exchangeBaseUrl: cmdObj.exchange,
      merchantApiKey: cmdObj.merchantApiKey,
      merchantBaseUrl: cmdObj.merchant,
      merchantInstance: cmdObj.merchantInstance,
    }).catch(err => {
      console.error("Failed with exception:");
      console.error(err);
    });

    process.exit(0);
  });

// error on unknown commands
program.on("command:*", function() {
  console.error(
    "Invalid command: %s\nSee --help for a list of available commands.",
    program.args.join(" "),
  );
  process.exit(1);
});

program.parse(process.argv);

if (process.argv.length <= 2) {
  console.error("Error: No command given.");
  program.help();
}
