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

const program = new commander.Command();
program.version("0.0.1");

const walletDbPath = os.homedir + "/" + ".talerwalletdb.json";

program
  .command("test-withdraw")
  .description("withdraw test currency from the test bank")
  .action(async () => {
    console.log("test-withdraw command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    await withdrawTestBalance(wallet);
    process.exit(0);
  });

program
  .command("balance", undefined, { isDefault: true })
  .description("show wallet balance")
  .action(async () => {
    console.log("balance command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    const balance = await wallet.getBalances();
    console.log(JSON.stringify(balance, undefined, 2));
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
