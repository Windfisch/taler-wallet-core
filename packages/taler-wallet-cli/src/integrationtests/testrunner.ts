/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { GlobalTestState, runTestWithState, TestRunResult } from "./harness";
import { runPaymentTest } from "./test-payment";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as child_process from "child_process";
import { runBankApiTest } from "./test-bank-api";
import { runClaimLoopTest } from "./test-claim-loop";
import { runExchangeManagementTest } from "./test-exchange-management";
import { runFeeRegressionTest } from "./test-fee-regression";
import { runMerchantLongpollingTest } from "./test-merchant-longpolling";
import { runMerchantRefundApiTest } from "./test-merchant-refund-api";
import { runPayAbortTest } from "./test-pay-abort";
import { runPayPaidTest } from "./test-pay-paid";
import { runPaymentClaimTest } from "./test-payment-claim";
import { runPaymentFaultTest } from "./test-payment-fault";
import { runPaymentIdempotencyTest } from "./test-payment-idempotency";
import { runPaymentMultipleTest } from "./test-payment-multiple";
import { runPaymentTransientTest } from "./test-payment-transient";
import { runPaywallFlowTest } from "./test-paywall-flow";
import { runRefundAutoTest } from "./test-refund-auto";
import { runRefundGoneTest } from "./test-refund-gone";
import { runRefundIncrementalTest } from "./test-refund-incremental";
import { runRefundTest } from "./test-refund";
import { runRevocationTest } from "./test-revocation";
import { runTimetravelAutorefreshTest } from "./test-timetravel-autorefresh";
import { runTimetravelWithdrawTest } from "./test-timetravel-withdraw";
import { runTippingTest } from "./test-tipping";
import { runWallettestingTest } from "./test-wallettesting";
import { runTestWithdrawalManualTest } from "./test-withdrawal-manual";
import { runWithdrawalAbortBankTest } from "./test-withdrawal-abort-bank";
import { runWithdrawalBankIntegratedTest } from "./test-withdrawal-bank-integrated";
import M from "minimatch";

/**
 * Test runner.
 */

/**
 * Spec for one test.
 */
interface TestMainFunction {
  (t: GlobalTestState): Promise<void>;
}

const allTests: TestMainFunction[] = [
  runBankApiTest,
  runClaimLoopTest,
  runExchangeManagementTest,
  runFeeRegressionTest,
  runMerchantLongpollingTest,
  runMerchantRefundApiTest,
  runPayAbortTest,
  runPaymentClaimTest,
  runPaymentFaultTest,
  runPaymentIdempotencyTest,
  runPaymentMultipleTest,
  runPaymentTest,
  runPaymentTransientTest,
  runPayPaidTest,
  runPaywallFlowTest,
  runRefundAutoTest,
  runRefundGoneTest,
  runRefundIncrementalTest,
  runRefundTest,
  runRevocationTest,
  runTimetravelAutorefreshTest,
  runTimetravelWithdrawTest,
  runTippingTest,
  runWallettestingTest,
  runTestWithdrawalManualTest,
  runWithdrawalAbortBankTest,
  runWithdrawalBankIntegratedTest,
];

export interface TestRunSpec {
  include_pattern?: string;
}

export interface TestInfo {
  name: string;
}

function updateCurrentSymlink(testDir: string): void {
  const currLink = path.join(os.tmpdir(), "taler-integrationtests-current");
  try {
    fs.unlinkSync(currLink);
  } catch (e) {
    // Ignore
  }
  try {
    fs.symlinkSync(testDir, currLink);
  } catch (e) {
    console.log(e);
    // Ignore
  }
}

export function getTestName(tf: TestMainFunction): string {
  const res = tf.name.match(/run([a-zA-Z0-9]*)Test/);
  if (!res) {
    throw Error("invalid test name, must be 'run${NAME}Test'");
  }
  return res[1]
    .replace(/[a-z0-9][A-Z]/, (x) => {
      return x[0] + "-" + x[1];
    })
    .toLowerCase();
}

interface RunTestChildInstruction {
  testName: string;
  testRootDir: string;
}

export async function runTests(spec: TestRunSpec) {
  const testRootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "taler-integrationtests-"),
  );
  updateCurrentSymlink(testRootDir);
  console.log("testsuite root directory: ", testRootDir);

  let numTotal = 0;
  let numFail = 0;
  let numSkip = 0;
  let numPass = 0;

  const testResults: TestRunResult[] = [];

  let currentChild: child_process.ChildProcess | undefined;

  const handleSignal = () => {
    if (currentChild) {
      currentChild.kill("SIGTERM");
    }
    process.exit(3);
  };

  process.on("SIGINT", () => handleSignal);
  process.on("SIGTERM", () => handleSignal);
  //process.on("unhandledRejection", handleSignal);
  //process.on("uncaughtException", handleSignal);

  for (const [n, testCase] of allTests.entries()) {
    const testName = getTestName(testCase);
    if (spec.include_pattern && !M(testName, spec.include_pattern)) {
      continue;
    }

    const testInstr: RunTestChildInstruction = {
      testName,
      testRootDir,
    };

    currentChild = child_process.fork(__filename, {
      env: {
        TWCLI_RUN_TEST_INSTRUCTION: JSON.stringify(testInstr),
        ...process.env,
      },
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });

    const testDir = path.join(testRootDir, testName);
    fs.mkdirSync(testDir, { recursive: true });

    const harnessLogFilename = path.join(testRootDir, testName, "harness.log");
    const harnessLogStream = fs.createWriteStream(harnessLogFilename);

    currentChild.stderr?.pipe(process.stderr);
    currentChild.stdout?.pipe(process.stdout);

    currentChild.stdout?.pipe(harnessLogStream);
    currentChild.stderr?.pipe(harnessLogStream);

    const result: TestRunResult = await new Promise((resolve, reject) => {
      let msg: TestRunResult | undefined;
      currentChild!.on("message", (m) => {
        msg = m as TestRunResult;
      });
      currentChild!.on("exit", (code, signal) => {
        if (signal) {
          reject(new Error(`test worker exited with signal ${signal}`));
        } else if (code != 0) {
          reject(new Error(`test worker exited with code ${code}`));
        } else if (!msg) {
          reject(
            new Error(
              `test worker exited without giving back the test results`,
            ),
          );
        } else {
          resolve(msg);
        }
      });
      currentChild!.on("error", (err) => {
        reject(err);
      });
    });

    harnessLogStream.close();

    console.log(`parent: got result ${JSON.stringify(result)}`);

    testResults.push(result);
    numTotal++;
    if (result.status === "fail") {
      numFail++;
    } else if (result.status === "skip") {
      numSkip++;
    } else if (result.status === "pass") {
      numPass++;
    }
  }

  const resultsFile = path.join(testRootDir, "results.json");
  fs.writeFileSync(
    path.join(testRootDir, "results.json"),
    JSON.stringify({ testResults }, undefined, 2),
  );
  console.log(`See ${resultsFile} for details`);
  console.log(`Skipped: ${numSkip}/${numTotal}`);
  console.log(`Failed: ${numFail}/${numTotal}`);
  console.log(`Passed: ${numPass}/${numTotal}`);
  if (numPass < numTotal - numSkip) {
    process.exit(1);
  }
}

export function getTestInfo(): TestInfo[] {
  return allTests.map((x) => ({
    name: getTestName(x),
  }));
}

const runTestInstrStr = process.env["TWCLI_RUN_TEST_INSTRUCTION"];
if (runTestInstrStr) {
  // Test will call taler-wallet-cli, so we must not propagate this variable.
  delete process.env["TWCLI_RUN_TEST_NAME"];
  const { testRootDir, testName } = JSON.parse(
    runTestInstrStr,
  ) as RunTestChildInstruction;
  console.log(`running test ${testName} in worker process`);

  process.on("disconnect", () => {
    console.log("got disconnect from parent");
    process.exit(3);
  });

  try {
    require("source-map-support").install();
  } catch (e) {
    // Do nothing.
  }

  const runTest = async () => {
    let testMain: TestMainFunction | undefined;
    for (const t of allTests) {
      if (getTestName(t) === testName) {
        testMain = t;
        break;
      }
    }

    if (!process.send) {
      console.error("can't communicate with parent");
      process.exit(2);
    }

    if (!testMain) {
      console.log(`test ${testName} not found`);
      process.exit(2);
    }

    const testDir = path.join(testRootDir, testName);
    console.log(`running test ${testName}`);
    const gc = new GlobalTestState({
      testDir,
    });
    const testResult = await runTestWithState(gc, testMain, testName);
    process.send(testResult);
  };

  runTest().catch((e) => {
    console.log(e);
    process.exit(1);
  });
}
