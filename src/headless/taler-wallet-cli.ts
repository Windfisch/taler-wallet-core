/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import os = require("os");
import fs = require("fs");
import { getDefaultNodeWallet, withdrawTestBalance } from "./helpers";
import { MerchantBackendConnection } from "./merchant";
import { runIntegrationTest, runIntegrationTestBasic } from "./integrationtest";
import { Wallet } from "../wallet";
import qrcodeGenerator = require("qrcode-generator");
import * as clk from "./clk";
import { BridgeIDBFactory, MemoryBackend } from "idb-bridge";
import { Logger } from "../util/logging";
import * as Amounts from "../util/amounts";
import { decodeCrock } from "../crypto/talerCrypto";
import { OperationFailedAndReportedError } from "../operations/errors";
import { Bank } from "./bank";
import { classifyTalerUri, TalerUriType } from "../util/taleruri";
import util = require("util");
import { Configuration } from "../util/talerconfig";
import { setDangerousTimetravel } from "../util/time";
import { makeCodecForList, codecForString } from "../util/codec";

// Backwards compatibility with nodejs<0.11, where TextEncoder and TextDecoder
// are not globals yet.
(global as any).TextEncoder = util.TextEncoder;
(global as any).TextDecoder = util.TextDecoder;

const logger = new Logger("taler-wallet-cli.ts");

const defaultWalletDbPath = os.homedir + "/" + ".talerwalletdb.json";

function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}

async function doPay(
  wallet: Wallet,
  payUrl: string,
  options: { alwaysYes: boolean } = { alwaysYes: true },
) {
  const result = await wallet.preparePayForUri(payUrl);
  if (result.status === "error") {
    console.error("Could not pay:", result.error);
    process.exit(1);
    return;
  }
  if (result.status === "insufficient-balance") {
    console.log("contract", result.contractTermsRaw);
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
  console.log("contract", result.contractTermsRaw);
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
    const payRes = await wallet.confirmPay(result.proposalId, undefined);
    console.log("paid!");
  } else {
    console.log("not paying");
  }
}

function applyVerbose(verbose: boolean) {
  if (verbose) {
    console.log("enabled verbose logging");
    BridgeIDBFactory.enableTracing = true;
  }
}

function printVersion() {
  const info = require("../../../package.json");
  console.log(`${info.version}`);
  process.exit(0);
}

const walletCli = clk
  .program("wallet", {
    help: "Command line interface for the GNU Taler wallet.",
  })
  .maybeOption("walletDbFile", ["--wallet-db"], clk.STRING, {
    help: "location of the wallet database file",
  })
  .maybeOption("timetravel", ["--timetravel"], clk.INT, {
    help: "modify system time by given offset in microseconds",
    onPresentHandler: (x) => {
      // Convert microseconds to milliseconds and do timetravel
      logger.info(`timetravelling ${x} microseconds`);
      setDangerousTimetravel(x / 1000);
    },
  })
  .maybeOption("inhibit", ["--inhibit"], clk.STRING, {
    help:
      "Inhibit running certain operations, useful for debugging and testing.",
  })
  .flag("version", ["-v", "--version"], {
    onPresentHandler: printVersion,
  })
  .flag("verbose", ["-V", "--verbose"], {
    help: "Enable verbose output.",
  });

type WalletCliArgsType = clk.GetArgType<typeof walletCli>;

async function withWallet<T>(
  walletCliArgs: WalletCliArgsType,
  f: (w: Wallet) => Promise<T>,
): Promise<T> {
  const dbPath = walletCliArgs.wallet.walletDbFile ?? defaultWalletDbPath;
  const wallet = await getDefaultNodeWallet({
    persistentStoragePath: dbPath,
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
      console.error("caught unhandled exception (bug?):", e);
    }
    process.exit(1);
  } finally {
    wallet.stop();
  }
}

walletCli
  .subcommand("balance", "balance", { help: "Show wallet balance." })
  .flag("json", ["--json"], {
    help: "Show raw JSON.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const balance = await wallet.getBalances();
      if (args.balance.json) {
        console.log(JSON.stringify(balance, undefined, 2));
      } else {
        const currencies = Object.keys(balance.byCurrency).sort();
        for (const c of currencies) {
          console.log(Amounts.toString(balance.byCurrency[c].available));
        }
      }
    });
  });

walletCli
  .subcommand("history", "history", { help: "Show wallet event history." })
  .flag("json", ["--json"], {
    default: false,
  })
  .maybeOption("from", ["--from"], clk.STRING)
  .maybeOption("to", ["--to"], clk.STRING)
  .maybeOption("limit", ["--limit"], clk.STRING)
  .maybeOption("contEvt", ["--continue-with"], clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const history = await wallet.getHistory();
      if (args.history.json) {
        console.log(JSON.stringify(history, undefined, 2));
      } else {
        for (const h of history.history) {
          console.log(
            `event at ${new Date(h.timestamp.t_ms).toISOString()} with type ${
              h.type
            }:`,
          );
          console.log(JSON.stringify(h, undefined, 2));
          console.log();
        }
      }
    });
  });

walletCli
  .subcommand("", "pending", { help: "Show pending operations." })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
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
  .flag("forceNow", ["-f", "--force-now"])
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.runPending(args.runPendingOpt.forceNow);
    });
  });

walletCli
  .subcommand("finishPendingOpt", "run-until-done", {
    help: "Run until no more work is left.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.runUntilDoneAndStop();
    });
  });

walletCli
  .subcommand("handleUri", "handle-uri", {
    help: "Handle a taler:// URI.",
  })
  .requiredArgument("uri", clk.STRING)
  .flag("autoYes", ["-y", "--yes"])
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const uri: string = args.handleUri.uri;
      const uriType = classifyTalerUri(uri);
      switch (uriType) {
        case TalerUriType.TalerPay:
          await doPay(wallet, uri, { alwaysYes: args.handleUri.autoYes });
          break;
        case TalerUriType.TalerTip:
          {
            const res = await wallet.getTipStatus(uri);
            console.log("tip status", res);
            await wallet.acceptTip(res.tipId);
          }
          break;
        case TalerUriType.TalerRefund:
          await wallet.applyRefund(uri);
          break;
        case TalerUriType.TalerWithdraw:
          {
            const withdrawInfo = await wallet.getWithdrawDetailsForUri(uri);
            const selectedExchange =
              withdrawInfo.bankWithdrawDetails.suggestedExchange;
            if (!selectedExchange) {
              console.error("no suggested exchange!");
              process.exit(1);
              return;
            }
            const res = await wallet.acceptWithdrawal(uri, selectedExchange);
            await wallet.processReserve(res.reservePub);
          }
          break;
        default:
          console.log(`URI type (${uriType}) not handled`);
          break;
      }
      return;
    });
  });

const exchangesCli = walletCli.subcommand("exchangesCmd", "exchanges", {
  help: "Manage exchanges.",
});

exchangesCli
  .subcommand("exchangesListCmd", "list", {
    help: "List known exchanges.",
  })
  .action(async (args) => {
    console.log("Listing exchanges ...");
    await withWallet(args, async (wallet) => {
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
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
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
  .subcommand("decode", "decode", {
    help: "Decode base32-crockford.",
  })
  .action((args) => {
    const enc = fs.readFileSync(0, "utf8");
    fs.writeFileSync(1, decodeCrock(enc.trim()));
  });

advancedCli
  .subcommand("payPrepare", "pay-prepare", {
    help: "Claim an order but don't pay yet.",
  })
  .requiredArgument("url", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const res = await wallet.preparePayForUri(args.payPrepare.url);
      switch (res.status) {
        case "error":
          console.log("error:", res.error);
          break;
        case "insufficient-balance":
          console.log("insufficient balance");
          break;
        case "paid":
          console.log("already paid");
          break;
        case "payment-possible":
          console.log("payment possible");
          break;
        default:
          assertUnreachable(res);
      }
    });
  });

advancedCli
  .subcommand("refresh", "force-refresh", {
    help: "Force a refresh on a coin.",
  })
  .requiredArgument("coinPub", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.refresh(args.refresh.coinPub);
    });
  });

advancedCli
  .subcommand("dumpCoins", "dump-coins", {
    help: "Dump coins in an easy-to-process format.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const coinDump = await wallet.dumpCoins();
      console.log(JSON.stringify(coinDump, undefined, 2));
    });
  });

  const coinPubListCodec = makeCodecForList(codecForString);

advancedCli
  .subcommand("suspendCoins", "suspend-coins", {
    help: "Mark a coin as suspended, will not be used for payments.",
  })
  .requiredArgument("coinPubSpec", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      let coinPubList: string[];
      try {
        coinPubList = coinPubListCodec.decode(
          JSON.parse(args.suspendCoins.coinPubSpec),
        );
      } catch (e) {
        console.log("could not parse coin list:", e.message);
        process.exit(1);
      }
      for (const c of coinPubList) {
        await wallet.setCoinSuspended(c, true);
      }
    });
  });

advancedCli
  .subcommand("unsuspendCoins", "unsuspend-coins", {
    help: "Mark a coin as suspended, will not be used for payments.",
  })
  .requiredArgument("coinPubSpec", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      let coinPubList: string[];
      try {
        coinPubList = coinPubListCodec.decode(
          JSON.parse(args.unsuspendCoins.coinPubSpec),
        );
      } catch (e) {
        console.log("could not parse coin list:", e.message);
        process.exit(1);
      }
      for (const c of coinPubList) {
        await wallet.setCoinSuspended(c, false);
      }
    });
  });

advancedCli
  .subcommand("coins", "list-coins", {
    help: "List coins.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const coins = await wallet.getCoins();
      for (const coin of coins) {
        console.log(`coin ${coin.coinPub}`);
        console.log(` status ${coin.status}`);
        console.log(` exchange ${coin.exchangeBaseUrl}`);
        console.log(` denomPubHash ${coin.denomPubHash}`);
        console.log(
          ` remaining amount ${Amounts.toString(coin.currentAmount)}`,
        );
      }
    });
  });

advancedCli
  .subcommand("updateReserve", "update-reserve", {
    help: "Update reserve status.",
  })
  .requiredArgument("reservePub", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const r = await wallet.updateReserve(args.updateReserve.reservePub);
      console.log("updated reserve:", JSON.stringify(r, undefined, 2));
    });
  });

advancedCli
  .subcommand("updateReserve", "show-reserve", {
    help: "Show the current reserve status.",
  })
  .requiredArgument("reservePub", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const r = await wallet.getReserve(args.updateReserve.reservePub);
      console.log("updated reserve:", JSON.stringify(r, undefined, 2));
    });
  });

const testCli = walletCli.subcommand("testingArgs", "testing", {
  help: "Subcommands for testing GNU Taler deployments.",
});

testCli
  .subcommand("integrationtestBasic", "integrationtest-basic")
  .requiredArgument("cfgfile", clk.STRING)
  .action(async (args) => {
    const cfgStr = fs.readFileSync(args.integrationtestBasic.cfgfile, "utf8");
    const cfg = new Configuration();
    cfg.loadFromString(cfgStr);
    try {
      await runIntegrationTestBasic(cfg);
    } catch (e) {
      console.log("integration test failed");
      console.log(e);
      process.exit(1);
    }
    process.exit(0);
  });

testCli
  .subcommand("testPayCmd", "test-pay", { help: "create contract and pay" })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING)
  .requiredOption("summary", ["-s", "--summary"], clk.STRING, {
    default: "Test Payment",
  })
  .action(async (args) => {
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
  .requiredOption("withdrawAmount", ["-w", "--amount"], clk.STRING, {
    default: "TESTKUDOS:10",
  })
  .requiredOption("spendAmount", ["-s", "--spend-amount"], clk.STRING, {
    default: "TESTKUDOS:4",
  })
  .action(async (args) => {
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
      }).catch((err) => {
        console.error("Integration test failed with exception:");
        console.error(err);
        process.exit(1);
      });
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });

testCli
  .subcommand("genTipUri", "gen-tip-uri", {
    help: "Generate a taler://tip URI.",
  })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:10",
  })
  .action(async (args) => {
    const merchantBackend = new MerchantBackendConnection(
      "https://backend.test.taler.net/",
      "sandbox",
    );
    const tipUri = await merchantBackend.authorizeTip("TESTKUDOS:10", "test");
    console.log(tipUri);
  });

testCli
  .subcommand("genWithdrawUri", "gen-withdraw-uri", {
    help: "Generate a taler://withdraw URI.",
  })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:20",
  })
  .requiredOption("bank", ["-b", "--bank"], clk.STRING, {
    default: "https://bank.test.taler.net/",
  })
  .action(async (args) => {
    const b = new Bank(args.genWithdrawUri.bank);
    const user = await b.registerRandomUser();
    const url = await b.generateWithdrawUri(user, args.genWithdrawUri.amount);
    console.log(url);
  });

testCli
  .subcommand("genRefundUri", "gen-refund-uri", {
    help: "Generate a taler://refund URI.",
  })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:5",
  })
  .requiredOption("refundAmount", ["-r", "--refund"], clk.STRING, {
    default: "TESTKUDOS:3",
  })
  .requiredOption("summary", ["-s", "--summary"], clk.STRING, {
    default: "Test Payment (for refund)",
  })
  .action(async (args) => {
    const cmdArgs = args.genRefundUri;
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
    await withWallet(args, async (wallet) => {
      await doPay(wallet, talerPayUri, { alwaysYes: true });
    });
    const refundUri = await merchantBackend.refund(
      orderResp.orderId,
      "test refund",
      cmdArgs.refundAmount,
    );
    console.log(refundUri);
  });

testCli
  .subcommand("genPayUri", "gen-pay-uri", {
    help: "Generate a taler://pay URI.",
  })
  .flag("qrcode", ["--qr"], {
    help: "Show a QR code with the taler://pay URI",
  })
  .flag("wait", ["--wait"], {
    help: "Wait until payment has completed",
  })
  .requiredOption("amount", ["-a", "--amount"], clk.STRING, {
    default: "TESTKUDOS:1",
  })
  .requiredOption("summary", ["-s", "--summary"], clk.STRING, {
    default: "Test Payment",
  })
  .requiredOption("merchant", ["-m", "--merchant"], clk.STRING, {
    default: "https://backend.test.taler.net/",
  })
  .requiredOption("merchantApiKey", ["-k", "--merchant-api-key"], clk.STRING, {
    default: "sandbox",
  })
  .action(async (args) => {
    const cmdArgs = args.genPayUri;
    console.log("creating order");
    const merchantBackend = new MerchantBackendConnection(
      cmdArgs.merchant,
      cmdArgs.merchantApiKey,
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
    if (cmdArgs.qrcode) {
      const qrcode = qrcodeGenerator(0, "M");
      qrcode.addData(talerPayUri);
      qrcode.make();
      console.log(qrcode.createASCII());
    }
    if (cmdArgs.wait) {
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
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
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
