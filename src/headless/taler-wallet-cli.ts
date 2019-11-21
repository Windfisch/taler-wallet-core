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

import os = require("os");
import { getDefaultNodeWallet, withdrawTestBalance } from "./helpers";
import { MerchantBackendConnection } from "./merchant";
import { runIntegrationTest } from "./integrationtest";
import { Wallet, OperationFailedAndReportedError } from "../wallet";
import qrcodeGenerator = require("qrcode-generator");
import * as clk from "./clk";
import { BridgeIDBFactory, MemoryBackend } from "idb-bridge";
import { Logger } from "../logging";
import * as Amounts from "../amounts";

const logger = new Logger("taler-wallet-cli.ts");

const walletDbPath = os.homedir + "/" + ".talerwalletdb.json";

async function doPay(
  wallet: Wallet,
  payUrl: string,
  options: { alwaysYes: boolean } = { alwaysYes: true },
) {
  const result = await wallet.preparePay(payUrl);
  if (result.status === "error") {
    console.error("Could not pay:", result.error);
    process.exit(1);
    return;
  }
  if (result.status === "insufficient-balance") {
    console.log("contract", result.contractTerms!);
    console.error("insufficient balance");
    process.exit(1);
    return;
  }
  if (result.status === "paid") {
    console.log("already paid!");
    process.exit(0);
    return;
  }
  if (result.status === "payment-possible") {
    console.log("paying ...");
  } else {
    throw Error("not reached");
  }
  console.log("contract", result.contractTerms!);
  let pay;
  if (options.alwaysYes) {
    pay = true;
  } else {
    while (true) {
      const yesNoResp = (await clk.prompt("Pay? [Y/n]")).toLowerCase();
      if (yesNoResp === "" || yesNoResp === "y" || yesNoResp === "yes") {
        pay = true;
        break;
      } else if (yesNoResp === "n" || yesNoResp === "no") {
        pay = false;
        break;
      } else {
        console.log("please answer y/n");
      }
    }
  }

  if (pay) {
    const payRes = await wallet.confirmPay(result.proposalId!, undefined);
    console.log("paid!");
  } else {
    console.log("not paying");
  }
}

function applyVerbose(verbose: boolean) {
  if (verbose) {
    console.log("enabled verbose logging");
    Wallet.enableTracing = true;
    BridgeIDBFactory.enableTracing = true;
  }
}

const walletCli = clk
  .program("wallet", {
    help: "Command line interface for the GNU Taler wallet.",
  })
  .maybeOption("inhibit", ["--inhibit"], clk.STRING, {
    help:
      "Inhibit running certain operations, useful for debugging and testing.",
  })
  .flag("verbose", ["-V", "--verbose"], {
    help: "Enable verbose output.",
  });

type WalletCliArgsType = clk.GetArgType<typeof walletCli>;

async function withWallet<T>(
  walletCliArgs: WalletCliArgsType,
  f: (w: Wallet) => Promise<T>,
): Promise<T> {
  const wallet = await getDefaultNodeWallet({
    persistentStoragePath: walletDbPath,
  });
  applyVerbose(walletCliArgs.wallet.verbose);
  try {
    await wallet.fillDefaults();
    const ret = await f(wallet);
    return ret;
  } catch (e) {
    if (e instanceof OperationFailedAndReportedError) {
      console.error("Operation failed: " + e.message);
      console.log("Hint: check pending operations for details.");
    } else {
      console.error("caught exception:", e);
    }
    process.exit(1);
  } finally {
    wallet.stop();
  }
}

walletCli
  .subcommand("", "balance", { help: "Show wallet balance." })
  .action(async args => {
    console.log("balance command called");
    await withWallet(args, async wallet => {
      const balance = await wallet.getBalances();
      console.log(JSON.stringify(balance, undefined, 2));
    });
  });

walletCli
  .subcommand("", "history", { help: "Show wallet event history." })
  .maybeOption("from", ["--from"], clk.STRING)
  .maybeOption("to", ["--to"], clk.STRING)
  .maybeOption("limit", ["--limit"], clk.STRING)
  .maybeOption("contEvt", ["--continue-with"], clk.STRING)
  .action(async args => {
    await withWallet(args, async wallet => {
      const history = await wallet.getHistory();
      console.log(JSON.stringify(history, undefined, 2));
    });
  });

walletCli
  .subcommand("", "pending", { help: "Show pending operations." })
  .action(async args => {
    await withWallet(args, async wallet => {
      const pending = await wallet.getPendingOperations();
      console.log(JSON.stringify(pending, undefined, 2));
    });
  });

async function asyncSleep(milliSeconds: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), milliSeconds);
  });
}

walletCli
  .subcommand("runPendingOpt", "run-pending", {
    help: "Run pending operations.",
  })
  .action(async args => {
    await withWallet(args, async wallet => {
      await wallet.runPending();
    });
  });

walletCli
  .subcommand("handleUri", "handle-uri", {
    help: "Handle a taler:// URI.",
  })
  .requiredArgument("uri", clk.STRING)
  .flag("autoYes", ["-y", "--yes"])
  .action(async args => {
    await withWallet(args, async wallet => {
      const uri: string = args.handleUri.uri;
      if (uri.startsWith("taler://pay/")) {
        await doPay(wallet, uri, { alwaysYes: args.handleUri.autoYes });
      } else if (uri.startsWith("taler://tip/")) {
        const res = await wallet.getTipStatus(uri);
        console.log("tip status", res);
        await wallet.acceptTip(uri);
      } else if (uri.startsWith("taler://refund/")) {
        await wallet.applyRefund(uri);
      } else if (uri.startsWith("taler://withdraw/")) {
        const withdrawInfo = await wallet.getWithdrawalInfo(uri);
        const selectedExchange = withdrawInfo.suggestedExchange;
        if (!selectedExchange) {
          console.error("no suggested exchange!");
          process.exit(1);
          return;
        }
        const { confirmTransferUrl } = await wallet.acceptWithdrawal(
          uri,
          selectedExchange,
        );
        if (confirmTransferUrl) {
          console.log("please confirm the transfer at", confirmTransferUrl);
        }
      } else {
        console.error("unrecognized URI");
      }
    });
  });

const exchangesCli = walletCli.subcommand("exchangesCmd", "exchanges", {
  help: "Manage exchanges.",
});

exchangesCli
  .subcommand("exchangesListCmd", "list", {
    help: "List known exchanges.",
  })
  .action(async args => {
    console.log("Listing exchanges ...");
    await withWallet(args, async wallet => {
      const exchanges = await wallet.getExchanges();
      console.log("exchanges", exchanges);
    });
  });

exchangesCli
  .subcommand("exchangesUpdateCmd", "update", {
    help: "Update or add an exchange by base URL.",
  })
  .requiredArgument("url", clk.STRING, {
    help: "Base URL of the exchange.",
  })
  .flag("force", ["-f", "--force"])
  .action(async args => {
    await withWallet(args, async wallet => {
      const res = await wallet.updateExchangeFromUrl(
        args.exchangesUpdateCmd.url,
        args.exchangesUpdateCmd.force,
      );
    });
  });

const advancedCli = walletCli.subcommand("advancedArgs", "advanced", {
  help:
    "Subcommands for advanced operations (only use if you know what you're doing!).",
});

advancedCli
  .subcommand("refresh", "force-refresh", {
    help: "Force a refresh on a coin.",
  })
  .requiredArgument("coinPub", clk.STRING)
  .action(async args => {
    await withWallet(args, async wallet => {
      await wallet.refresh(args.refresh.coinPub, true);
    });
  });

advancedCli
  .subcommand("coins", "list-coins", {
    help: "List coins.",
  })
  .action(async args => {
    await withWallet(args, async wallet => {
      const coins = await wallet.getCoins();
      for (const coin of coins) {
        console.log(`coin ${coin.coinPub}`);
        console.log(` status ${coin.status}`);
        console.log(` exchange ${coin.exchangeBaseUrl}`);
        console.log(` remaining amount ${Amounts.toString(coin.currentAmount)}`);
      }
    });
  });

const testCli = walletCli.subcommand("testingArgs", "testing", {
  help: "Subcommands for testing GNU Taler deployments.",
});

testCli
  .subcommand("testPayCmd", "test-pay", { help: "create contract and pay" })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING)
  .requiredOption("summary", ["-s", "--summary"], clk.STRING, {
    default: "Test Payment",
  })
  .action(async args => {
    const cmdArgs = args.testPayCmd;
    console.log("creating order");
    const merchantBackend = new MerchantBackendConnection(
      "https://backend.test.taler.net/",
      "sandbox",
    );
    const orderResp = await merchantBackend.createOrder(
      cmdArgs.amount,
      cmdArgs.summary,
      "",
    );
    console.log("created new order with order ID", orderResp.orderId);
    const checkPayResp = await merchantBackend.checkPayment(orderResp.orderId);
    const talerPayUri = checkPayResp.taler_pay_uri;
    if (!talerPayUri) {
      console.error("fatal: no taler pay URI received from backend");
      process.exit(1);
      return;
    }
    console.log("taler pay URI:", talerPayUri);
    await withWallet(args, async (wallet) => {
      await doPay(wallet, talerPayUri, { alwaysYes: true });
    });
  });


testCli
  .subcommand("integrationtestCmd", "integrationtest", {
    help: "Run integration test with bank, exchange and merchant.",
  })
  .requiredOption("exchange", ["-e", "--exchange"], clk.STRING, {
    default: "https://exchange.test.taler.net/",
  })
  .requiredOption("merchant", ["-m", "--merchant"], clk.STRING, {
    default: "https://backend.test.taler.net/",
  })
  .requiredOption("merchantApiKey", ["-k", "--merchant-api-key"], clk.STRING, {
    default: "sandbox",
  })
  .requiredOption("bank", ["-b", "--bank"], clk.STRING, {
    default: "https://bank.test.taler.net/",
  })
  .requiredOption("withdrawAmount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:10",
  })
  .requiredOption("spendAmount", ["-s", "--spend-amount"], clk.STRING, {
    default: "TESTKUDOS:4",
  })
  .action(async args => {
    console.log("parsed args", args);
    applyVerbose(args.wallet.verbose);
    let cmdObj = args.integrationtestCmd;

    try {
      await runIntegrationTest({
        amountToSpend: cmdObj.spendAmount,
        amountToWithdraw: cmdObj.withdrawAmount,
        bankBaseUrl: cmdObj.bank,
        exchangeBaseUrl: cmdObj.exchange,
        merchantApiKey: cmdObj.merchantApiKey,
        merchantBaseUrl: cmdObj.merchant,
      }).catch(err => {
        console.error("Failed with exception:");
        console.error(err);
      });

      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });

testCli
  .subcommand("testMerchantQrcodeCmd", "test-merchant-qrcode")
  .requiredOption("amount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:1",
  })
  .requiredOption("summary", ["-s", "--summary"], clk.STRING, {
    default: "Test Payment",
  })
  .action(async args => {
    const cmdArgs = args.testMerchantQrcodeCmd;
    applyVerbose(args.wallet.verbose);
    console.log("creating order");
    const merchantBackend = new MerchantBackendConnection(
      "https://backend.test.taler.net/",
      "sandbox",
    );
    const orderResp = await merchantBackend.createOrder(
      cmdArgs.amount,
      cmdArgs.summary,
      "",
    );
    console.log("created new order with order ID", orderResp.orderId);
    const checkPayResp = await merchantBackend.checkPayment(orderResp.orderId);
    const qrcode = qrcodeGenerator(0, "M");
    const talerPayUri = checkPayResp.taler_pay_uri;
    if (!talerPayUri) {
      console.error("fatal: no taler pay URI received from backend");
      process.exit(1);
      return;
    }
    console.log("taler pay URI:", talerPayUri);
    qrcode.addData(talerPayUri);
    qrcode.make();
    console.log(qrcode.createASCII());
    console.log("waiting for payment ...");
    while (1) {
      await asyncSleep(500);
      const checkPayResp2 = await merchantBackend.checkPayment(
        orderResp.orderId,
      );
      if (checkPayResp2.paid) {
        console.log("payment successfully received!");
        break;
      }
    }
  });

testCli
  .subcommand("withdrawArgs", "withdraw", {
    help: "Withdraw from a test bank (must support test registrations).",
  })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:10",
    help: "Amount to withdraw.",
  })
  .requiredOption("exchange", ["-e", "--exchange"], clk.STRING, {
    default: "https://exchange.test.taler.net/",
    help: "Exchange base URL.",
  })
  .requiredOption("bank", ["-b", "--bank"], clk.STRING, {
    default: "https://bank.test.taler.net/",
    help: "Bank base URL",
  })
  .action(async args => {
    await withWallet(args, async wallet => {
      await withdrawTestBalance(
        wallet,
        args.withdrawArgs.amount,
        args.withdrawArgs.bank,
        args.withdrawArgs.exchange,
      );
      logger.info("Withdraw done");
    });
  });

walletCli.run();
