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
import { Wallet } from "../wallet";
import qrcodeGenerator = require("qrcode-generator");
import * as clk from "./clk";

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

walletCli
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

    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });

    await doPay(wallet, talerPayUri, { alwaysYes: true });
  });

walletCli
  .subcommand("", "balance", { help: "Show wallet balance." })
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    console.log("balance command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    console.log("got wallet");
    const balance = await wallet.getBalances();
    console.log(JSON.stringify(balance, undefined, 2));
    process.exit(0);
  });

walletCli
  .subcommand("", "history", { help: "Show wallet event history." })
  .requiredOption("from", ["--from"], clk.STRING)
  .requiredOption("to", ["--to"], clk.STRING)
  .requiredOption("limit", ["--limit"], clk.STRING)
  .requiredOption("contEvt", ["--continue-with"], clk.STRING)
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    console.log("history command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    console.log("got wallet");
    const history = await wallet.getHistory();
    console.log(JSON.stringify(history, undefined, 2));
    process.exit(0);
  });

walletCli
  .subcommand("", "pending", { help: "Show pending operations." })
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    console.log("history command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    console.log("got wallet");
    const pending = await wallet.getPendingOperations();
    console.log(JSON.stringify(pending, undefined, 2));
    process.exit(0);
  });

async function asyncSleep(milliSeconds: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), milliSeconds);
  });
}

walletCli
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

walletCli
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
  .requiredOption("withdrawAmount", ["-b", "--bank"], clk.STRING, {
    default: "TESTKUDOS:10",
  })
  .requiredOption("spendAmount", ["-s", "--spend-amount"], clk.STRING, {
    default: "TESTKUDOS:4",
  })
  .action(async args => {
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

walletCli
  .subcommand("withdrawUriCmd", "withdraw-uri")
  .argument("withdrawUri", clk.STRING)
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    const cmdArgs = args.withdrawUriCmd;
    const withdrawUrl = cmdArgs.withdrawUri;
    console.log("withdrawing", withdrawUrl);
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });

    const withdrawInfo = await wallet.getWithdrawalInfo(withdrawUrl);

    console.log("withdraw info", withdrawInfo);

    const selectedExchange = withdrawInfo.suggestedExchange;
    if (!selectedExchange) {
      console.error("no suggested exchange!");
      process.exit(1);
      return;
    }

    const { reservePub, confirmTransferUrl } = await wallet.acceptWithdrawal(
      withdrawUrl,
      selectedExchange,
    );

    if (confirmTransferUrl) {
      console.log("please confirm the transfer at", confirmTransferUrl);
    }

    await wallet.processReserve(reservePub);

    console.log("finished withdrawing");

    wallet.stop();
  });

walletCli
  .subcommand("tipUriCmd", "tip-uri")
  .argument("uri", clk.STRING)
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    const tipUri = args.tipUriCmd.uri;
    console.log("getting tip", tipUri);
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    const res = await wallet.getTipStatus(tipUri);
    console.log("tip status", res);
    await wallet.acceptTip(tipUri);
    wallet.stop();
  });

walletCli
  .subcommand("refundUriCmd", "refund-uri")
  .argument("uri", clk.STRING)
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    const refundUri = args.refundUriCmd.uri;
    console.log("getting refund", refundUri);
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    await wallet.applyRefund(refundUri);
    wallet.stop();
  });

const exchangesCli = walletCli
  .subcommand("exchangesCmd", "exchanges", {
    help: "Manage exchanges."
  });

exchangesCli.subcommand("exchangesListCmd", "list", {
  help: "List known exchanges."
});

exchangesCli.subcommand("exchangesListCmd", "update");

walletCli
  .subcommand("payUriCmd", "pay-uri")
  .argument("url", clk.STRING)
  .flag("autoYes", ["-y", "--yes"])
  .action(async args => {
    applyVerbose(args.wallet.verbose);
    const payUrl = args.payUriCmd.url;
    console.log("paying for", payUrl);
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });

    await doPay(wallet, payUrl, { alwaysYes: args.payUriCmd.autoYes });
    wallet.stop();
  });

const testCli = walletCli.subcommand("testingArgs", "testing", {
  help: "Subcommands for testing GNU Taler deployments."
});

testCli
  .subcommand("withdrawArgs", "withdraw", {
    help: "Withdraw from a test bank (must support test registrations).",
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
    applyVerbose(args.wallet.verbose);
    console.log("balance command called");
    const wallet = await getDefaultNodeWallet({
      persistentStoragePath: walletDbPath,
    });
    console.log("got wallet");
    const balance = await wallet.getBalances();
    console.log(JSON.stringify(balance, undefined, 2));
  });

walletCli.run();
