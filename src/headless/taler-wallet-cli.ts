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

const program = new commander.Command();
program
  .version("0.0.1")
  .option('--verbose', "enable verbose output", false);

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
    applyVerbose(program.verbose)
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
    applyVerbose(program.verbose)
    console.log("balance command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    console.log("got wallet");
    const balance = await wallet.getBalances();
    console.log(JSON.stringify(balance, undefined, 2));
    process.exit(0);
  });


program
  .command("integrationtest")
  .option('-e, --exchange <exchange-url>', 'exchange base URL', "https://exchange.test.taler.net/")
  .option('-m, --merchant <merchant-url>', 'merchant base URL', "https://backend.test.taler.net/")
  .option('-m, --merchant-instance <merchant-instance>', 'merchant instance', "default")
  .option('-m, --merchant-api-key <merchant-api-key>', 'merchant API key', "sandbox")
  .option('-b, --bank <bank-url>', 'bank base URL', "https://bank.test.taler.net/")
  .option('-w, --withdraw-amount <withdraw-amt>', 'amount to withdraw', "TESTKUDOS:10")
  .option('-s, --spend-amount <spend-amt>', 'amount to spend', "TESTKUDOS:5")
  .description("Run integration test with bank, exchange and merchant.")
  .action(async (cmdObj) => {
    applyVerbose(program.verbose)

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
