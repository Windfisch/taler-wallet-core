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

/**
 * Imports.
 */
import os from "os";
import fs from "fs";
import * as clk from "./clk.js";
import { deepStrictEqual } from "assert";
import { getTestInfo, runTests } from "./integrationtests/testrunner.js";
import {
  PreparePayResultType,
  setDangerousTimetravel,
  classifyTalerUri,
  TalerUriType,
  RecoveryMergeStrategy,
  Amounts,
  addPaytoQueryParams,
  codecForList,
  codecForString,
} from "@gnu-taler/taler-util";
import {
  Logger,
  Wallet,
  NodeHttpLib,
  getDefaultNodeWallet,
  OperationFailedAndReportedError,
  OperationFailedError,
  decodeCrock,
  rsaBlind,
  NodeThreadCryptoWorkerFactory,
  CryptoApi,
  walletCoreDebugFlags,
} from "@gnu-taler/taler-wallet-core";

// This module also serves as the entry point for the crypto
// thread worker, and thus must expose these two handlers.
export {
  handleWorkerError,
  handleWorkerMessage,
} from "@gnu-taler/taler-wallet-core";

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
    console.log("contract", result.contractTerms);
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
  console.log("contract", result.contractTerms);
  console.log("raw amount:", result.amountRaw);
  console.log("effective amount:", result.amountEffective);
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
  // TODO
}

function printVersion(): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const info = require("../package.json");
  console.log(`${info.version}`);
  process.exit(0);
}

export const walletCli = clk
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
      const resp = await wallet.handleCoreApiRequest(
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
  .maybeOption("maxRetries", ["--max-retries"], clk.INT)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.runUntilDone({
        maxRetries: args.finishPendingOpt.maxRetries,
      });
      wallet.stop();
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
            const res = await wallet.prepareTip(uri);
            console.log("tip status", res);
            await wallet.acceptTip(res.walletTipId);
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

const backupCli = walletCli.subcommand("backupArgs", "backup", {
  help: "Subcommands for backups",
});

backupCli.subcommand("exportPlain", "export-plain").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const backup = await wallet.exportBackupPlain();
    console.log(JSON.stringify(backup, undefined, 2));
  });
});

backupCli
  .subcommand("export", "export")
  .requiredArgument("filename", clk.STRING, {
    help: "backup filename",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const backup = await wallet.exportBackupEncrypted();
      fs.writeFileSync(args.export.filename, backup);
    });
  });

backupCli
  .subcommand("import", "import")
  .requiredArgument("filename", clk.STRING, {
    help: "backup filename",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const backupEncBlob = fs.readFileSync(args.import.filename);
      await wallet.importBackupEncrypted(backupEncBlob);
    });
  });

backupCli.subcommand("importPlain", "import-plain").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const data = JSON.parse(await read(process.stdin));
    await wallet.importBackupPlain(data);
  });
});

backupCli.subcommand("recoverySave", "save-recovery").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const recoveryJson = await wallet.getBackupRecovery();
    console.log(JSON.stringify(recoveryJson, undefined, 2));
  });
});

backupCli.subcommand("run", "run").action(async (args) => {
  await withWallet(args, async (wallet) => {
    await wallet.runBackupCycle();
  });
});

backupCli.subcommand("status", "status").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const status = await wallet.getBackupStatus();
    console.log(JSON.stringify(status, undefined, 2));
  });
});

backupCli
  .subcommand("recoveryLoad", "load-recovery")
  .maybeOption("strategy", ["--strategy"], clk.STRING, {
    help:
      "Strategy for resolving a conflict with the existing wallet key ('theirs' or 'ours')",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const data = JSON.parse(await read(process.stdin));
      let strategy: RecoveryMergeStrategy | undefined;
      const stratStr = args.recoveryLoad.strategy;
      if (stratStr) {
        if (stratStr === "theirs") {
          strategy = RecoveryMergeStrategy.Theirs;
        } else if (stratStr === "ours") {
          strategy = RecoveryMergeStrategy.Theirs;
        } else {
          throw Error("invalid recovery strategy");
        }
      }
      await wallet.loadBackupRecovery({
        recovery: data,
        strategy,
      });
    });
  });

backupCli
  .subcommand("addProvider", "add-provider")
  .requiredArgument("url", clk.STRING)
  .flag("activate", ["--activate"])
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      wallet.addBackupProvider({
        backupProviderBaseUrl: args.addProvider.url,
        activate: args.addProvider.activate,
      });
    });
  });

const depositCli = walletCli.subcommand("depositArgs", "deposit", {
  help: "Subcommands for depositing money to payto:// accounts",
});

depositCli
  .subcommand("createDepositArgs", "create")
  .requiredArgument("amount", clk.STRING)
  .requiredArgument("targetPayto", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const resp = await wallet.createDepositGroup({
        amount: args.createDepositArgs.amount,
        depositPaytoUri: args.createDepositArgs.targetPayto,
      });
      console.log(`Created deposit ${resp.depositGroupId}`);
      await wallet.runPending();
    });
  });

depositCli
  .subcommand("trackDepositArgs", "track")
  .requiredArgument("depositGroupId", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const resp = await wallet.trackDepositGroup({
        depositGroupId: args.trackDepositArgs.depositGroupId,
      });
      console.log(JSON.stringify(resp, undefined, 2));
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

const currenciesCli = walletCli.subcommand("currencies", "currencies", {
  help: "Manage currencies.",
});

currenciesCli
  .subcommand("show", "show", { help: "Show currencies."})
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const currencies = await wallet.getCurrencies();
      console.log(JSON.stringify(currencies, undefined, 2));
    });
  })

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

const coinPubListCodec = codecForList(codecForString());

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

testCli
  .subcommand("listIntegrationtests", "list-integrationtests")
  .action(async (args) => {
    for (const t of getTestInfo()) {
      console.log(t.name);
    }
  });

testCli
  .subcommand("runIntegrationtests", "run-integrationtests")
  .maybeArgument("pattern", clk.STRING, {
    help: "Glob pattern to select which tests to run",
  })
  .maybeOption("suites", ["--suites"], clk.STRING, {
    help: "Only run selected suites (string-separated list)",
  })
  .flag("dryRun", ["--dry"], {
    help: "Only print tests that will be selected to run.",
  })
  .action(async (args) => {
    await runTests({
      includePattern: args.runIntegrationtests.pattern,
      suiteSpec: args.runIntegrationtests.suites,
      dryRun: args.runIntegrationtests.dryRun,
    });
  });

async function read(stream: NodeJS.ReadStream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

testCli.subcommand("tvgcheck", "tvgcheck").action(async (args) => {
  const data = await read(process.stdin);

  const lines = data.match(/[^\r\n]+/g);

  if (!lines) {
    throw Error("can't split lines");
  }

  const vals: Record<string, string> = {};

  let inBlindSigningSection = false;

  for (const line of lines) {
    if (line === "blind signing:") {
      inBlindSigningSection = true;
      continue;
    }
    if (line[0] !== " ") {
      inBlindSigningSection = false;
      continue;
    }
    if (inBlindSigningSection) {
      const m = line.match(/  (\w+) (\w+)/);
      if (!m) {
        console.log("bad format");
        process.exit(2);
      }
      vals[m[1]] = m[2];
    }
  }

  console.log(vals);

  const req = (k: string) => {
    if (!vals[k]) {
      throw Error(`no value for ${k}`);
    }
    return decodeCrock(vals[k]);
  };

  const myBm = rsaBlind(
    req("message_hash"),
    req("blinding_key_secret"),
    req("rsa_public_key"),
  );

  deepStrictEqual(req("blinded_message"), myBm);

  console.log("check passed!");
});

testCli.subcommand("cryptoworker", "cryptoworker").action(async (args) => {
  const workerFactory = new NodeThreadCryptoWorkerFactory();
  const cryptoApi = new CryptoApi(workerFactory);
  const res = await cryptoApi.hashString("foo");
  console.log(res);
});

export function main() {
  if (process.env["TALER_WALLET_DEBUG_DENOMSEL_ALLOW_LATE"]) {
    logger.warn("Allowing withdrawal of late denominations for debugging");
    walletCoreDebugFlags.denomselAllowLate = true;
  }
  walletCli.run();
}
