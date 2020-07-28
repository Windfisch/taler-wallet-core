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

import os from "os";
import fs from "fs";
import { getDefaultNodeWallet, withdrawTestBalance } from "./helpers";
import { MerchantBackendConnection } from "./merchant";
import { runIntegrationTest, runIntegrationTestBasic } from "./integrationtest";
import { Wallet } from "../wallet";
import qrcodeGenerator from "qrcode-generator";
import * as clk from "./clk";
import { BridgeIDBFactory } from "idb-bridge";
import { Logger } from "../util/logging";
import { Amounts } from "../util/amounts";
import {
  decodeCrock,
  setupRefreshPlanchet,
  encodeCrock,
} from "../crypto/talerCrypto";
import {
  OperationFailedAndReportedError,
  OperationFailedError,
} from "../operations/errors";
import { Bank } from "./bank";
import { classifyTalerUri, TalerUriType } from "../util/taleruri";
import { Configuration } from "../util/talerconfig";
import { setDangerousTimetravel } from "../util/time";
import { makeCodecForList, codecForString } from "../util/codec";
import { NodeHttpLib } from "./NodeHttpLib";
import * as nacl from "../crypto/primitives/nacl-fast";
import { addPaytoQueryParams } from "../util/payto";
import { handleCoreApiRequest } from "../walletCoreApiHandler";
import { PreparePayResultType } from "../types/walletTypes";

const logger = new Logger("taler-wallet-cli.ts");

const defaultWalletDbPath = os.homedir + "/" + ".talerwalletdb.json";

function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}

async function doPay(
  wallet: Wallet,
  payUrl: string,
  options: { alwaysYes: boolean } = { alwaysYes: true },
): Promise<void> {
  const result = await wallet.preparePayForUri(payUrl);
  if (result.status === PreparePayResultType.InsufficientBalance) {
    console.log("contract", result.contractTermsRaw);
    console.error("insufficient balance");
    process.exit(1);
    return;
  }
  if (result.status === PreparePayResultType.AlreadyConfirmed) {
    if (result.paid) {
      console.log("already paid!");
    } else {
      console.log("payment already in progress");
    }
    
    process.exit(0);
    return;
  }
  if (result.status === "payment-possible") {
    console.log("paying ...");
  } else {
    throw Error("not reached");
  }
  console.log("contract", result.contractTermsRaw);
  console.log("total fees:", Amounts.stringify(result.totalFees));
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
    await wallet.confirmPay(result.proposalId, undefined);
  } else {
    console.log("not paying");
  }
}

function applyVerbose(verbose: boolean): void {
  if (verbose) {
    console.log("enabled verbose logging");
    BridgeIDBFactory.enableTracing = true;
  }
}

function printVersion(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  .flag("noThrottle", ["--no-throttle"], {
    help: "Don't do any request throttling.",
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
  const myHttpLib = new NodeHttpLib();
  if (walletCliArgs.wallet.noThrottle) {
    myHttpLib.setThrottling(false);
  }
  const wallet = await getDefaultNodeWallet({
    persistentStoragePath: dbPath,
    httpLib: myHttpLib,
  });
  applyVerbose(walletCliArgs.wallet.verbose);
  try {
    await wallet.fillDefaults();
    const ret = await f(wallet);
    return ret;
  } catch (e) {
    if (
      e instanceof OperationFailedAndReportedError ||
      e instanceof OperationFailedError
    ) {
      console.error("Operation failed: " + e.message);
      console.error(
        "Error details:",
        JSON.stringify(e.operationError, undefined, 2),
      );
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
      console.log(JSON.stringify(balance, undefined, 2));
    });
  });

walletCli
  .subcommand("api", "api", { help: "Call the wallet-core API directly." })
  .requiredArgument("operation", clk.STRING)
  .requiredArgument("request", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      let requestJson;
      try {
        requestJson = JSON.parse(args.api.request);
      } catch (e) {
        console.error("Invalid JSON");
        process.exit(1);
      }
      const resp = await handleCoreApiRequest(
        wallet,
        args.api.operation,
        "reqid-1",
        requestJson,
      );
      console.log(JSON.stringify(resp, undefined, 2));
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

walletCli
  .subcommand("transactions", "transactions", { help: "Show transactions." })
  .maybeOption("currency", ["--currency"], clk.STRING)
  .maybeOption("search", ["--search"], clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const pending = await wallet.getTransactions({
        currency: args.transactions.currency,
        search: args.transactions.search,
      });
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
            const withdrawInfo = await wallet.getWithdrawalDetailsForUri(uri);
            const selectedExchange = withdrawInfo.defaultExchangeBaseUrl;
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
      console.log(JSON.stringify(exchanges, undefined, 2));
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
      await wallet.updateExchangeFromUrl(
        args.exchangesUpdateCmd.url,
        args.exchangesUpdateCmd.force,
      );
    });
  });

exchangesCli
  .subcommand("exchangesAddCmd", "add", {
    help: "Add an exchange by base URL.",
  })
  .requiredArgument("url", clk.STRING, {
    help: "Base URL of the exchange.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.updateExchangeFromUrl(args.exchangesAddCmd.url);
    });
  });

exchangesCli
  .subcommand("exchangesAcceptTosCmd", "accept-tos", {
    help: "Accept terms of service.",
  })
  .requiredArgument("url", clk.STRING, {
    help: "Base URL of the exchange.",
  })
  .requiredArgument("etag", clk.STRING, {
    help: "ToS version tag to accept",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.acceptExchangeTermsOfService(
        args.exchangesAcceptTosCmd.url,
        args.exchangesAcceptTosCmd.etag,
      );
    });
  });

exchangesCli
  .subcommand("exchangesTosCmd", "tos", {
    help: "Show terms of service.",
  })
  .requiredArgument("url", clk.STRING, {
    help: "Base URL of the exchange.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const tosResult = await wallet.getExchangeTos(args.exchangesTosCmd.url);
      console.log(JSON.stringify(tosResult, undefined, 2));
    });
  });

const advancedCli = walletCli.subcommand("advancedArgs", "advanced", {
  help:
    "Subcommands for advanced operations (only use if you know what you're doing!).",
});

advancedCli
  .subcommand("manualWithdrawalDetails", "manual-withdrawal-details", {
    help: "Query withdrawal fees.",
  })
  .requiredArgument("exchange", clk.STRING)
  .requiredArgument("amount", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const details = await wallet.getWithdrawalDetailsForAmount(
        args.manualWithdrawalDetails.exchange,
        Amounts.parseOrThrow(args.manualWithdrawalDetails.amount),
      );
      console.log(JSON.stringify(details, undefined, 2));
    });
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
  .subcommand("withdrawManually", "withdraw-manually", {
    help: "Withdraw manually from an exchange.",
  })
  .requiredOption("exchange", ["--exchange"], clk.STRING, {
    help: "Base URL of the exchange.",
  })
  .requiredOption("amount", ["--amount"], clk.STRING, {
    help: "Amount to withdraw",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const exchange = await wallet.updateExchangeFromUrl(
        args.withdrawManually.exchange,
      );
      const acct = exchange.wireInfo?.accounts[0];
      if (!acct) {
        console.log("exchange has no accounts");
        return;
      }
      const reserve = await wallet.acceptManualWithdrawal(
        exchange.baseUrl,
        Amounts.parseOrThrow(args.withdrawManually.amount),
      );
      const completePaytoUri = addPaytoQueryParams(acct.payto_uri, {
        amount: args.withdrawManually.amount,
        message: `Taler top-up ${reserve.reservePub}`,
      });
      console.log("Created reserve", reserve.reservePub);
      console.log("Payto URI", completePaytoUri);
    });
  });

const reservesCli = advancedCli.subcommand("reserves", "reserves", {
  help: "Manage reserves.",
});

reservesCli
  .subcommand("list", "list", {
    help: "List reserves.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const reserves = await wallet.getReserves();
      console.log(JSON.stringify(reserves, undefined, 2));
    });
  });

reservesCli
  .subcommand("update", "update", {
    help: "Update reserve status via exchange.",
  })
  .requiredArgument("reservePub", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.updateReserve(args.update.reservePub);
    });
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
        case PreparePayResultType.InsufficientBalance:
          console.log("insufficient balance");
          break;
        case PreparePayResultType.AlreadyConfirmed:
          if (res.paid) {
            console.log("already paid!");
          } else {
            console.log("payment in progress");
          }
          break;
        case PreparePayResultType.PaymentPossible:
          console.log("payment possible");
          break;
        default:
          assertUnreachable(res);
      }
    });
  });

advancedCli
  .subcommand("payConfirm", "pay-confirm", {
    help: "Confirm payment proposed by a merchant.",
  })
  .requiredArgument("proposalId", clk.STRING)
  .maybeOption("sessionIdOverride", ["--session-id"], clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      wallet.confirmPay(
        args.payConfirm.proposalId,
        args.payConfirm.sessionIdOverride,
      );
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
          ` remaining amount ${Amounts.stringify(coin.currentAmount)}`,
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

testCli.subcommand("vectors", "vectors").action(async (args) => {
  const secretSeed = nacl.randomBytes(64);
  const coinIndex = Math.ceil(Math.random() * 100);
  const p = setupRefreshPlanchet(secretSeed, coinIndex);
  console.log("setupRefreshPlanchet");
  console.log(`  (in) secret seed: ${encodeCrock(secretSeed)}`);
  console.log(`  (in) coin index: ${coinIndex}`);
  console.log(`  (out) blinding secret: ${encodeCrock(p.bks)}`);
  console.log(`  (out) coin priv: ${encodeCrock(p.coinPriv)}`);
  console.log(`  (out) coin pub: ${encodeCrock(p.coinPub)}`);
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
  .subcommand("testPayCmd", "test-pay", { help: "Create contract and pay." })
  .requiredOption("merchant", ["-m", "--mechant-url"], clk.STRING)
  .requiredOption("apikey", ["-k", "--mechant-api-key"], clk.STRING)
  .requiredOption("amount", ["-a", "--amount"], clk.STRING)
  .requiredOption("summary", ["-s", "--summary"], clk.STRING, {
    default: "Test Payment",
  })
  .action(async (args) => {
    const cmdArgs = args.testPayCmd;
    console.log("creating order");
    const merchantBackend = new MerchantBackendConnection(
      args.testPayCmd.merchant,
      args.testPayCmd.apikey,
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
    const cmdObj = args.integrationtestCmd;

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
  .maybeOption("merchant", ["-m", "--merchant"], clk.STRING, {
    default: "https://backend.test.taler.net/",
  })
  .maybeOption("merchantApiKey", ["-k", "--merchant-api-key"], clk.STRING, {
    default: "sandbox",
  })
  .action(async (args) => {
    const merchantBackend = new MerchantBackendConnection(
      args.genTipUri.merchant ?? "https://backend.test.taler.net/",
      args.genTipUri.merchantApiKey ?? "sandbox",
    );
    const tipUri = await merchantBackend.authorizeTip(
      args.genTipUri.amount,
      "test",
    );
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
  .maybeOption("merchant", ["-m", "--merchant"], clk.STRING, {
    default: "https://backend.test.taler.net/",
  })
  .maybeOption("merchantApiKey", ["-k", "--merchant-api-key"], clk.STRING, {
    default: "sandbox",
  })
  .action(async (args) => {
    const cmdArgs = args.genRefundUri;
    const merchantBackend = new MerchantBackendConnection(
      cmdArgs.merchant ?? "https://backend.test.taler.net/",
      cmdArgs.merchantApiKey ?? "sandbox",
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
        if (checkPayResp2.order_status === "paid") {
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
      await wallet.updateExchangeFromUrl(args.withdrawArgs.exchange, true);
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
