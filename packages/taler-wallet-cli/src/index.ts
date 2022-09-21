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
import { deepStrictEqual } from "assert";
import fs from "fs";
import os from "os";
import path from "path";
// Polyfill for encoding which isn't present globally in older nodejs versions
import {
  addPaytoQueryParams,
  AgeRestriction,
  Amounts,
  classifyTalerUri,
  clk,
  codecForList,
  codecForString,
  Configuration,
  decodeCrock,
  encodeCrock,
  getRandomBytes,
  j2s,
  Logger,
  parsePaytoUri,
  PreparePayResultType,
  RecoveryMergeStrategy,
  rsaBlind,
  setDangerousTimetravel,
  setGlobalLogLevelFromString,
  TalerUriType,
} from "@gnu-taler/taler-util";
import {
  CryptoDispatcher,
  getDefaultNodeWallet,
  getErrorDetailFromException,
  nativeCrypto,
  NodeHttpLib,
  NodeThreadCryptoWorkerFactory,
  summarizeTalerErrorDetail,
  SynchronousCryptoWorkerFactory,
  Wallet,
  WalletApiOperation,
  WalletCoreApiClient,
  walletCoreDebugFlags,
} from "@gnu-taler/taler-wallet-core";
import type { TalerCryptoInterface } from "@gnu-taler/taler-wallet-core/src/crypto/cryptoImplementation";
import { TextDecoder, TextEncoder } from "util";
import { runBench1 } from "./bench1.js";
import { runBench2 } from "./bench2.js";
import { runBench3 } from "./bench3.js";
import { runEnv1 } from "./env1.js";
import { GlobalTestState, runTestWithState } from "./harness/harness.js";
import { getTestInfo, runTests } from "./integrationtests/testrunner.js";
import { lintExchangeDeployment } from "./lint.js";
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// This module also serves as the entry point for the crypto
// thread worker, and thus must expose these two handlers.
export {
  handleWorkerError,
  handleWorkerMessage,
} from "@gnu-taler/taler-wallet-core";

const logger = new Logger("taler-wallet-cli.ts");

const EXIT_EXCEPTION = 4;
const EXIT_API_ERROR = 5;
const EXIT_RETRIES_EXCEEDED = 6;

process.on("unhandledRejection", (error: any) => {
  logger.error("unhandledRejection", error.message);
  logger.error("stack", error.stack);
  process.exit(2);
});

const defaultWalletDbPath = os.homedir + "/" + ".talerwalletdb.json";

function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}

async function doPay(
  wallet: WalletCoreApiClient,
  payUrl: string,
  options: { alwaysYes: boolean } = { alwaysYes: true },
): Promise<void> {
  const result = await wallet.call(WalletApiOperation.PreparePayForUri, {
    talerPayUri: payUrl,
  });
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
    await wallet.call(WalletApiOperation.ConfirmPay, {
      proposalId: result.proposalId,
    });
  } else {
    console.log("not paying");
  }
}

function applyVerbose(verbose: boolean): void {
  // TODO
}

declare const __VERSION__: string;
function printVersion(): void {
  console.log(__VERSION__);
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
  .maybeOption("log", ["-L", "--log"], clk.STRING, {
    help: "configure log level (NONE, ..., TRACE)",
    onPresentHandler: (x) => {
      setGlobalLogLevelFromString(x);
    },
  })
  .maybeOption("inhibit", ["--inhibit"], clk.STRING, {
    help: "Inhibit running certain operations, useful for debugging and testing.",
  })
  .flag("noThrottle", ["--no-throttle"], {
    help: "Don't do any request throttling.",
  })
  .flag("version", ["-v", "--version"], {
    onPresentHandler: printVersion,
  })
  .flag("verbose", ["-V", "--verbose"], {
    help: "Enable verbose output.",
  })
  .flag("skipDefaults", ["--skip-defaults"], {
    help: "Skip configuring default exchanges.",
  });

type WalletCliArgsType = clk.GetArgType<typeof walletCli>;

function checkEnvFlag(name: string): boolean {
  const val = process.env[name];
  if (val == "1") {
    return true;
  }
  return false;
}

async function withWallet<T>(
  walletCliArgs: WalletCliArgsType,
  f: (w: { client: WalletCoreApiClient; ws: Wallet }) => Promise<T>,
): Promise<T> {
  const dbPath = walletCliArgs.wallet.walletDbFile ?? defaultWalletDbPath;
  const myHttpLib = new NodeHttpLib();
  if (walletCliArgs.wallet.noThrottle) {
    myHttpLib.setThrottling(false);
  }
  const wallet = await getDefaultNodeWallet({
    persistentStoragePath: dbPath,
    httpLib: myHttpLib,
    notifyHandler: (n) => {
      logger.info(`wallet notification: ${j2s(n)}`);
    },
  });

  if (checkEnvFlag("TALER_WALLET_BATCH_WITHDRAWAL")) {
    wallet.setBatchWithdrawal(true);
  }

  applyVerbose(walletCliArgs.wallet.verbose);
  try {
    const w = {
      ws: wallet,
      client: wallet.client,
    };
    await wallet.handleCoreApiRequest("initWallet", "native-init", {
      skipDefaults: walletCliArgs.wallet.skipDefaults,
    });
    const ret = await f(w);
    return ret;
  } catch (e) {
    const ed = getErrorDetailFromException(e);
    console.error("Operation failed: " + summarizeTalerErrorDetail(ed));
    console.error("Error details:", JSON.stringify(ed, undefined, 2));
    process.exit(1);
  } finally {
    logger.info("operation with wallet finished, stopping");
    wallet.stop();
    logger.info("stopped wallet");
  }
}

walletCli
  .subcommand("balance", "balance", { help: "Show wallet balance." })
  .flag("json", ["--json"], {
    help: "Show raw JSON.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const balance = await wallet.client.call(
        WalletApiOperation.GetBalances,
        {},
      );
      console.log(JSON.stringify(balance, undefined, 2));
    });
  });

walletCli
  .subcommand("api", "api", { help: "Call the wallet-core API directly." })
  .requiredArgument("operation", clk.STRING)
  .requiredArgument("request", clk.STRING)
  .flag("expectSuccess", ["--expect-success"], {
    help: "Exit with non-zero status code when request fails instead of returning error JSON.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      let requestJson;
      logger.info(`handling 'api' request (${args.api.operation})`);
      try {
        requestJson = JSON.parse(args.api.request);
      } catch (e) {
        console.error("Invalid JSON");
        process.exit(1);
      }
      try {
        const resp = await wallet.ws.handleCoreApiRequest(
          args.api.operation,
          "reqid-1",
          requestJson,
        );
        console.log(JSON.stringify(resp, undefined, 2));
        if (resp.type === "error") {
          if (args.api.expectSuccess) {
            process.exit(EXIT_API_ERROR);
          }
        }
      } catch (e) {
        logger.error(`Got exception while handling API request ${e}`);
        process.exit(EXIT_EXCEPTION);
      }
    });
    logger.info("finished handling API request");
  });

walletCli
  .subcommand("", "pending", { help: "Show pending operations." })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const pending = await wallet.client.call(
        WalletApiOperation.GetPendingOperations,
        {},
      );
      console.log(JSON.stringify(pending, undefined, 2));
    });
  });

walletCli
  .subcommand("transactions", "transactions", { help: "Show transactions." })
  .maybeOption("currency", ["--currency"], clk.STRING)
  .maybeOption("search", ["--search"], clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const pending = await wallet.client.call(
        WalletApiOperation.GetTransactions,
        {
          currency: args.transactions.currency,
          search: args.transactions.search,
        },
      );
      console.log(JSON.stringify(pending, undefined, 2));
    });
  });

walletCli
  .subcommand("runPendingOpt", "run-pending", {
    help: "Run pending operations.",
  })
  .flag("forceNow", ["-f", "--force-now"])
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.ws.runPending(args.runPendingOpt.forceNow);
    });
  });

walletCli
  .subcommand("retryTransaction", "retry-transaction", {
    help: "Retry a transaction.",
  })
  .requiredArgument("transactionId", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.RetryTransaction, {
        transactionId: args.retryTransaction.transactionId,
      });
    });
  });

walletCli
  .subcommand("finishPendingOpt", "run-until-done", {
    help: "Run until no more work is left.",
  })
  .maybeOption("maxRetries", ["--max-retries"], clk.INT)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      logger.info("running until pending operations are finished");
      const resp = await wallet.ws.runTaskLoop({
        maxRetries: args.finishPendingOpt.maxRetries,
        stopWhenDone: true,
      });
      wallet.ws.stop();
      if (resp.retriesExceeded) {
        process.exit(EXIT_RETRIES_EXCEEDED);
      }
    });
  });

walletCli
  .subcommand("deleteTransaction", "delete-transaction", {
    help: "Permanently delete a transaction from the transaction list.",
  })
  .requiredArgument("transactionId", clk.STRING, {
    help: "Identifier of the transaction to delete",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.DeleteTransaction, {
        transactionId: args.deleteTransaction.transactionId,
      });
    });
  });

walletCli
  .subcommand("withdraw", "withdraw", {
    help: "Withdraw with a taler://withdraw/ URI",
  })
  .requiredArgument("uri", clk.STRING)
  .maybeOption("restrictAge", ["--restrict-age"], clk.INT)
  .action(async (args) => {
    const uri = args.withdraw.uri;
    const restrictAge = args.withdraw.restrictAge;
    console.log(`age restriction requested (${restrictAge})`);
    await withWallet(args, async (wallet) => {
      const withdrawInfo = await wallet.client.call(
        WalletApiOperation.GetWithdrawalDetailsForUri,
        {
          talerWithdrawUri: uri,
          restrictAge,
        },
      );
      console.log("withdrawInfo", withdrawInfo);
      const selectedExchange = withdrawInfo.defaultExchangeBaseUrl;
      if (!selectedExchange) {
        console.error("no suggested exchange!");
        process.exit(1);
        return;
      }
      const res = await wallet.client.call(
        WalletApiOperation.AcceptBankIntegratedWithdrawal,
        {
          exchangeBaseUrl: selectedExchange,
          talerWithdrawUri: uri,
          restrictAge,
        },
      );
      console.log(j2s(res));
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
          await doPay(wallet.client, uri, {
            alwaysYes: args.handleUri.autoYes,
          });
          break;
        case TalerUriType.TalerTip:
          {
            const res = await wallet.client.call(
              WalletApiOperation.PrepareTip,
              {
                talerTipUri: uri,
              },
            );
            console.log("tip status", res);
            await wallet.client.call(WalletApiOperation.AcceptTip, {
              walletTipId: res.walletTipId,
            });
          }
          break;
        case TalerUriType.TalerRefund:
          await wallet.client.call(WalletApiOperation.ApplyRefund, {
            talerRefundUri: uri,
          });
          break;
        case TalerUriType.TalerWithdraw:
          {
            const withdrawInfo = await wallet.client.call(
              WalletApiOperation.GetWithdrawalDetailsForUri,
              {
                talerWithdrawUri: uri,
              },
            );
            console.log("withdrawInfo", withdrawInfo);
            const selectedExchange = withdrawInfo.defaultExchangeBaseUrl;
            if (!selectedExchange) {
              console.error("no suggested exchange!");
              process.exit(1);
              return;
            }
            const res = await wallet.client.call(
              WalletApiOperation.AcceptBankIntegratedWithdrawal,
              {
                exchangeBaseUrl: selectedExchange,
                talerWithdrawUri: uri,
              },
            );
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
      const exchanges = await wallet.client.call(
        WalletApiOperation.ListExchanges,
        {},
      );
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
      await wallet.client.call(WalletApiOperation.AddExchange, {
        exchangeBaseUrl: args.exchangesUpdateCmd.url,
        forceUpdate: args.exchangesUpdateCmd.force,
      });
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
      await wallet.client.call(WalletApiOperation.AddExchange, {
        exchangeBaseUrl: args.exchangesAddCmd.url,
      });
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
      await wallet.client.call(WalletApiOperation.SetExchangeTosAccepted, {
        etag: args.exchangesAcceptTosCmd.etag,
        exchangeBaseUrl: args.exchangesAcceptTosCmd.url,
      });
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
      const tosResult = await wallet.client.call(
        WalletApiOperation.GetExchangeTos,
        {
          exchangeBaseUrl: args.exchangesTosCmd.url,
        },
      );
      console.log(JSON.stringify(tosResult, undefined, 2));
    });
  });

const backupCli = walletCli.subcommand("backupArgs", "backup", {
  help: "Subcommands for backups",
});

backupCli
  .subcommand("setDeviceId", "set-device-id")
  .requiredArgument("deviceId", clk.STRING, {
    help: "new device ID",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.SetWalletDeviceId, {
        walletDeviceId: args.setDeviceId.deviceId,
      });
    });
  });

backupCli.subcommand("exportPlain", "export-plain").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const backup = await wallet.client.call(
      WalletApiOperation.ExportBackupPlain,
      {},
    );
    console.log(JSON.stringify(backup, undefined, 2));
  });
});

backupCli.subcommand("recoverySave", "save-recovery").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const recoveryJson = await wallet.client.call(
      WalletApiOperation.ExportBackupRecovery,
      {},
    );
    console.log(JSON.stringify(recoveryJson, undefined, 2));
  });
});

backupCli.subcommand("run", "run").action(async (args) => {
  await withWallet(args, async (wallet) => {
    await wallet.client.call(WalletApiOperation.RunBackupCycle, {});
  });
});

backupCli.subcommand("status", "status").action(async (args) => {
  await withWallet(args, async (wallet) => {
    const status = await wallet.client.call(
      WalletApiOperation.GetBackupInfo,
      {},
    );
    console.log(JSON.stringify(status, undefined, 2));
  });
});

backupCli
  .subcommand("recoveryLoad", "load-recovery")
  .maybeOption("strategy", ["--strategy"], clk.STRING, {
    help: "Strategy for resolving a conflict with the existing wallet key ('theirs' or 'ours')",
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
      await wallet.client.call(WalletApiOperation.ImportBackupRecovery, {
        recovery: data,
        strategy,
      });
    });
  });

backupCli
  .subcommand("addProvider", "add-provider")
  .requiredArgument("url", clk.STRING)
  .maybeArgument("name", clk.STRING)
  .flag("activate", ["--activate"])
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.AddBackupProvider, {
        backupProviderBaseUrl: args.addProvider.url,
        activate: args.addProvider.activate,
        name: args.addProvider.name || args.addProvider.url,
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
      const resp = await wallet.client.call(
        WalletApiOperation.CreateDepositGroup,
        {
          amount: args.createDepositArgs.amount,
          depositPaytoUri: args.createDepositArgs.targetPayto,
        },
      );
      console.log(`Created deposit ${resp.depositGroupId}`);
      await wallet.ws.runPending();
    });
  });

depositCli
  .subcommand("trackDepositArgs", "track")
  .requiredArgument("depositGroupId", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const resp = await wallet.client.call(
        WalletApiOperation.TrackDepositGroup,
        {
          depositGroupId: args.trackDepositArgs.depositGroupId,
        },
      );
      console.log(JSON.stringify(resp, undefined, 2));
    });
  });

const advancedCli = walletCli.subcommand("advancedArgs", "advanced", {
  help: "Subcommands for advanced operations (only use if you know what you're doing!).",
});

advancedCli
  .subcommand("bench1", "bench1", {
    help: "Run the 'bench1' benchmark",
  })
  .requiredOption("configJson", ["--config-json"], clk.STRING)
  .action(async (args) => {
    let config: any;
    try {
      config = JSON.parse(args.bench1.configJson);
    } catch (e) {
      console.log("Could not parse config JSON");
    }
    await runBench1(config);
  });

advancedCli
  .subcommand("bench2", "bench2", {
    help: "Run the 'bench2' benchmark",
  })
  .requiredOption("configJson", ["--config-json"], clk.STRING)
  .action(async (args) => {
    let config: any;
    try {
      config = JSON.parse(args.bench2.configJson);
    } catch (e) {
      console.log("Could not parse config JSON");
    }
    await runBench2(config);
  });

advancedCli
  .subcommand("bench3", "bench3", {
    help: "Run the 'bench3' benchmark",
  })
  .requiredOption("configJson", ["--config-json"], clk.STRING)
  .action(async (args) => {
    let config: any;
    try {
      config = JSON.parse(args.bench3.configJson);
    } catch (e) {
      console.log("Could not parse config JSON");
    }
    await runBench3(config);
  });

advancedCli
  .subcommand("env1", "env1", {
    help: "Run a test environment for bench1",
  })
  .action(async (args) => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "taler-env1-"));
    const testState = new GlobalTestState({
      testDir,
    });
    await runTestWithState(testState, runEnv1, "env1", true);
  });

advancedCli
  .subcommand("withdrawFakebank", "withdraw-fakebank", {
    help: "Withdraw via a fakebank.",
  })
  .requiredOption("exchange", ["--exchange"], clk.STRING, {
    help: "Base URL of the exchange to use",
  })
  .requiredOption("amount", ["--amount"], clk.STRING, {
    help: "Amount to withdraw (before fees).",
  })
  .requiredOption("bank", ["--bank"], clk.STRING, {
    help: "Base URL of the Taler fakebank service.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.WithdrawFakebank, {
        amount: args.withdrawFakebank.amount,
        bank: args.withdrawFakebank.bank,
        exchange: args.withdrawFakebank.exchange,
      });
    });
  });

advancedCli
  .subcommand("manualWithdrawalDetails", "manual-withdrawal-details", {
    help: "Query withdrawal fees.",
  })
  .requiredArgument("exchange", clk.STRING)
  .requiredArgument("amount", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const details = await wallet.client.call(
        WalletApiOperation.GetWithdrawalDetailsForAmount,
        {
          amount: args.manualWithdrawalDetails.amount,
          exchangeBaseUrl: args.manualWithdrawalDetails.exchange,
        },
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
  .subcommand("genSegwit", "gen-segwit")
  .requiredArgument("paytoUri", clk.STRING)
  .requiredArgument("reservePub", clk.STRING)
  .action(async (args) => {
    const p = parsePaytoUri(args.genSegwit.paytoUri);
    console.log(p);
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
  .maybeOption("restrictAge", ["--restrict-age"], clk.INT)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const exchangeBaseUrl = args.withdrawManually.exchange;
      const amount = args.withdrawManually.amount;
      const d = await wallet.client.call(
        WalletApiOperation.GetWithdrawalDetailsForAmount,
        {
          amount: args.withdrawManually.amount,
          exchangeBaseUrl: exchangeBaseUrl,
        },
      );
      const acct = d.paytoUris[0];
      if (!acct) {
        console.log("exchange has no accounts");
        return;
      }
      const resp = await wallet.client.call(
        WalletApiOperation.AcceptManualWithdrawal,
        {
          amount,
          exchangeBaseUrl,
          restrictAge: parseInt(String(args.withdrawManually.restrictAge), 10),
        },
      );
      const reservePub = resp.reservePub;
      const completePaytoUri = addPaytoQueryParams(acct, {
        amount: args.withdrawManually.amount,
        message: `Taler top-up ${reservePub}`,
      });
      console.log("Created reserve", reservePub);
      console.log("Payto URI", completePaytoUri);
    });
  });

const currenciesCli = walletCli.subcommand("currencies", "currencies", {
  help: "Manage currencies.",
});

currenciesCli
  .subcommand("show", "show", { help: "Show currencies." })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const currencies = await wallet.client.call(
        WalletApiOperation.ListCurrencies,
        {},
      );
      console.log(JSON.stringify(currencies, undefined, 2));
    });
  });

advancedCli
  .subcommand("clearDatabase", "clear-database", {
    help: "Clear the database, irrevocable deleting all data in the wallet.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.ClearDb, {});
    });
  });

advancedCli
  .subcommand("recycle", "recycle", {
    help: "Export, clear and re-import the database via the backup mechamism.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.Recycle, {});
    });
  });

advancedCli
  .subcommand("payPrepare", "pay-prepare", {
    help: "Claim an order but don't pay yet.",
  })
  .requiredArgument("url", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const res = await wallet.client.call(
        WalletApiOperation.PreparePayForUri,
        {
          talerPayUri: args.payPrepare.url,
        },
      );
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
      await wallet.client.call(WalletApiOperation.ConfirmPay, {
        proposalId: args.payConfirm.proposalId,
        sessionId: args.payConfirm.sessionIdOverride,
      });
    });
  });

advancedCli
  .subcommand("refresh", "force-refresh", {
    help: "Force a refresh on a coin.",
  })
  .requiredArgument("coinPub", clk.STRING)
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.ForceRefresh, {
        coinPubList: [args.refresh.coinPub],
      });
    });
  });

advancedCli
  .subcommand("dumpCoins", "dump-coins", {
    help: "Dump coins in an easy-to-process format.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const coinDump = await wallet.client.call(
        WalletApiOperation.DumpCoins,
        {},
      );
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
      } catch (e: any) {
        console.log("could not parse coin list:", e.message);
        process.exit(1);
      }
      for (const c of coinPubList) {
        await wallet.client.call(WalletApiOperation.SetCoinSuspended, {
          coinPub: c,
          suspended: true,
        });
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
      } catch (e: any) {
        console.log("could not parse coin list:", e.message);
        process.exit(1);
      }
      for (const c of coinPubList) {
        await wallet.client.call(WalletApiOperation.SetCoinSuspended, {
          coinPub: c,
          suspended: false,
        });
      }
    });
  });

advancedCli
  .subcommand("coins", "list-coins", {
    help: "List coins.",
  })
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      const coins = await wallet.client.call(WalletApiOperation.DumpCoins, {});
      for (const coin of coins.coins) {
        console.log(`coin ${coin.coin_pub}`);
        console.log(` exchange ${coin.exchange_base_url}`);
        console.log(` denomPubHash ${coin.denom_pub_hash}`);
        console.log(
          ` remaining amount ${Amounts.stringify(coin.remaining_value)}`,
        );
      }
    });
  });

const deploymentCli = walletCli.subcommand("deploymentArgs", "deployment", {
  help: "Subcommands for handling GNU Taler deployments.",
});

deploymentCli
  .subcommand("lintExchange", "lint-exchange", {
    help: "Run checks on the exchange deployment.",
  })
  .flag("cont", ["--continue"], {
    help: "Continue after errors if possible",
  })
  .flag("debug", ["--debug"], {
    help: "Output extra debug info",
  })
  .action(async (args) => {
    await lintExchangeDeployment(
      args.lintExchange.debug,
      args.lintExchange.cont,
    );
  });

deploymentCli
  .subcommand("coincfg", "gen-coin-config", {
    help: "Generate a coin/denomination configuration for the exchange.",
  })
  .requiredOption("minAmount", ["--min-amount"], clk.STRING, {
    help: "Smallest denomination",
  })
  .requiredOption("maxAmount", ["--max-amount"], clk.STRING, {
    help: "Largest denomination",
  })
  .action(async (args) => {
    let out = "";

    const stamp = Math.floor(new Date().getTime() / 1000);

    const min = Amounts.parseOrThrow(args.coincfg.minAmount);
    const max = Amounts.parseOrThrow(args.coincfg.maxAmount);
    if (min.currency != max.currency) {
      console.error("currency mismatch");
      process.exit(1);
    }
    const currency = min.currency;
    let x = min;
    let n = 1;

    out += "# Coin configuration for the exchange.\n";
    out += '# Should be placed in "/etc/taler/conf.d/exchange-coins.conf".\n';
    out += "\n";

    while (Amounts.cmp(x, max) < 0) {
      out += `[COIN-${currency}-n${n}-t${stamp}]\n`;
      out += `VALUE = ${Amounts.stringify(x)}\n`;
      out += `DURATION_WITHDRAW = 7 days\n`;
      out += `DURATION_SPEND = 2 years\n`;
      out += `DURATION_LEGAL = 6 years\n`;
      out += `FEE_WITHDRAW = ${currency}:0\n`;
      out += `FEE_DEPOSIT = ${Amounts.stringify(min)}\n`;
      out += `FEE_REFRESH = ${currency}:0\n`;
      out += `FEE_REFUND = ${currency}:0\n`;
      out += `RSA_KEYSIZE = 2048\n`;
      out += "\n";
      x = Amounts.add(x, x).amount;
      n++;
    }

    console.log(out);
  });

const deploymentConfigCli = deploymentCli.subcommand("configArgs", "config", {
  help: "Subcommands the Taler configuration.",
});

deploymentConfigCli
  .subcommand("show", "show")
  .flag("diagnostics", ["-d", "--diagnostics"])
  .maybeArgument("cfgfile", clk.STRING, {})
  .action(async (args) => {
    const cfg = Configuration.load(args.show.cfgfile);
    console.log(
      cfg.stringify({
        diagnostics: args.show.diagnostics,
      }),
    );
  });

const testCli = walletCli.subcommand("testingArgs", "testing", {
  help: "Subcommands for testing.",
});

testCli
  .subcommand("withdrawTestkudos", "withdraw-testkudos")
  .action(async (args) => {
    await withWallet(args, async (wallet) => {
      await wallet.client.call(WalletApiOperation.WithdrawTestkudos, {});
    });
  });

class PerfTimer {
  tStarted: bigint | undefined;
  tSum = BigInt(0);
  tSumSq = BigInt(0);

  start() {
    this.tStarted = process.hrtime.bigint();
  }

  stop() {
    const now = process.hrtime.bigint();
    const s = this.tStarted;
    if (s == null) {
      throw Error();
    }
    this.tSum = this.tSum + (now - s);
    this.tSumSq = this.tSumSq + (now - s) * (now - s);
  }

  mean(nRuns: number): number {
    return Number(this.tSum / BigInt(nRuns));
  }

  stdev(nRuns: number) {
    const m = this.tSum / BigInt(nRuns);
    const x = this.tSumSq / BigInt(nRuns) - m * m;
    return Math.floor(Math.sqrt(Number(x)));
  }
}

testCli
  .subcommand("benchmarkAgeRestrictions", "benchmark-age-restrictions")
  .requiredOption("reps", ["--reps"], clk.INT, {
    default: 100,
    help: "repetitions (default: 100)",
  })
  .action(async (args) => {
    const numReps = args.benchmarkAgeRestrictions.reps ?? 100;
    let tCommit = new PerfTimer();
    let tAttest = new PerfTimer();
    let tVerify = new PerfTimer();
    let tDerive = new PerfTimer();
    let tCompare = new PerfTimer();

    console.log("starting benchmark");

    for (let i = 0; i < numReps; i++) {
      console.log(`doing iteration ${i}`);
      tCommit.start();
      const commitProof = await AgeRestriction.restrictionCommit(
        0b1000001010101010101001,
        21,
      );
      tCommit.stop();

      tAttest.start();
      const attest = AgeRestriction.commitmentAttest(commitProof, 18);
      tAttest.stop();

      tVerify.start();
      const attestRes = AgeRestriction.commitmentVerify(
        commitProof.commitment,
        encodeCrock(attest),
        18,
      );
      tVerify.stop();
      if (!attestRes) {
        throw Error();
      }

      const salt = getRandomBytes(32);
      tDerive.start();
      const deriv = await AgeRestriction.commitmentDerive(commitProof, salt);
      tDerive.stop();

      tCompare.start();
      const res2 = await AgeRestriction.commitCompare(
        deriv.commitment,
        commitProof.commitment,
        salt,
      );
      tCompare.stop();
      if (!res2) {
        throw Error();
      }
    }

    console.log(
      `edx25519-commit (ns): ${tCommit.mean(numReps)} (stdev ${tCommit.stdev(
        numReps,
      )})`,
    );
    console.log(
      `edx25519-attest (ns): ${tAttest.mean(numReps)} (stdev ${tAttest.stdev(
        numReps,
      )})`,
    );
    console.log(
      `edx25519-verify (ns): ${tVerify.mean(numReps)} (stdev ${tVerify.stdev(
        numReps,
      )})`,
    );
    console.log(
      `edx25519-derive (ns): ${tDerive.mean(numReps)} (stdev ${tDerive.stdev(
        numReps,
      )})`,
    );
    console.log(
      `edx25519-compare (ns): ${tCompare.mean(numReps)} (stdev ${tCompare.stdev(
        numReps,
      )})`,
    );
  });

testCli.subcommand("logtest", "logtest").action(async (args) => {
  logger.trace("This is a trace message.");
  logger.info("This is an info message.");
  logger.warn("This is an warning message.");
  logger.error("This is an error message.");
});

testCli
  .subcommand("listIntegrationtests", "list-integrationtests")
  .action(async (args) => {
    for (const t of getTestInfo()) {
      let s = t.name;
      if (t.suites.length > 0) {
        s += ` (suites: ${t.suites.join(",")})`;
      }
      if (t.excludeByDefault) {
        s += ` [excluded by default]`;
      }
      console.log(s);
    }
  });

testCli
  .subcommand("runIntegrationtests", "run-integrationtests")
  .maybeArgument("pattern", clk.STRING, {
    help: "Glob pattern to select which tests to run",
  })
  .maybeOption("suites", ["--suites"], clk.STRING, {
    help: "Only run selected suites (comma-separated list)",
  })
  .flag("dryRun", ["--dry"], {
    help: "Only print tests that will be selected to run.",
  })
  .flag("quiet", ["--quiet"], {
    help: "Produce less output.",
  })
  .action(async (args) => {
    await runTests({
      includePattern: args.runIntegrationtests.pattern,
      suiteSpec: args.runIntegrationtests.suites,
      dryRun: args.runIntegrationtests.dryRun,
      verbosity: args.runIntegrationtests.quiet ? 0 : 1,
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

testCli
  .subcommand("cryptoworker", "cryptoworker")
  .maybeOption("impl", ["--impl"], clk.STRING)
  .action(async (args) => {
    let cryptoApi: TalerCryptoInterface;
    if (!args.cryptoworker.impl || args.cryptoworker.impl === "node") {
      const workerFactory = new NodeThreadCryptoWorkerFactory();
      const cryptoDisp = new CryptoDispatcher(workerFactory);
      cryptoApi = cryptoDisp.cryptoApi;
    } else if (args.cryptoworker.impl === "sync") {
      const workerFactory = new SynchronousCryptoWorkerFactory();
      const cryptoDisp = new CryptoDispatcher(workerFactory);
      cryptoApi = cryptoDisp.cryptoApi;
    } else if (args.cryptoworker.impl === "none") {
      cryptoApi = nativeCrypto;
    } else {
      throw Error("invalid impl");
    }

    const input = "foo";
    console.log(`testing crypto worker by hashing string '${input}'`);
    const res = await cryptoApi.hashString({ str: input });
    console.log(res);
  });

export function main() {
  if (process.env["TALER_WALLET_DEBUG_DENOMSEL_ALLOW_LATE"]) {
    logger.warn("Allowing withdrawal of late denominations for debugging");
    walletCoreDebugFlags.denomselAllowLate = true;
  }
  walletCli.run();
}
