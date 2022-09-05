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

import { CancellationToken, minimatch } from "@gnu-taler/taler-util";
import * as child_process from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  GlobalTestState,
  runTestWithState,
  shouldLingerInTest,
  TestRunResult,
} from "../harness/harness.js";
import { runAgeRestrictionsMerchantTest } from "./test-age-restrictions-merchant.js";
import { runBankApiTest } from "./test-bank-api.js";
import { runClaimLoopTest } from "./test-claim-loop.js";
import { runClauseSchnorrTest } from "./test-clause-schnorr.js";
import { runDenomUnofferedTest } from "./test-denom-unoffered.js";
import { runDepositTest } from "./test-deposit.js";
import { runExchangeManagementTest } from "./test-exchange-management.js";
import { runExchangeTimetravelTest } from "./test-exchange-timetravel.js";
import { runFeeRegressionTest } from "./test-fee-regression.js";
import { runForcedSelectionTest } from "./test-forced-selection.js";
import { runLibeufinApiBankaccountTest } from "./test-libeufin-api-bankaccount.js";
import { runLibeufinApiBankconnectionTest } from "./test-libeufin-api-bankconnection.js";
import { runLibeufinApiFacadeTest } from "./test-libeufin-api-facade.js";
import { runLibeufinApiFacadeBadRequestTest } from "./test-libeufin-api-facade-bad-request.js";
import { runLibeufinApiPermissionsTest } from "./test-libeufin-api-permissions.js";
import { runLibeufinApiSandboxCamtTest } from "./test-libeufin-api-sandbox-camt.js";
import { runLibeufinApiSandboxTransactionsTest } from "./test-libeufin-api-sandbox-transactions.js";
import { runLibeufinApiSchedulingTest } from "./test-libeufin-api-scheduling.js";
import { runLibeufinApiUsersTest } from "./test-libeufin-api-users.js";
import { runLibeufinBadGatewayTest } from "./test-libeufin-bad-gateway.js";
import { runLibeufinBasicTest } from "./test-libeufin-basic.js";
import { runLibeufinC5xTest } from "./test-libeufin-c5x.js";
import { runLibeufinAnastasisFacadeTest } from "./test-libeufin-facade-anastasis.js";
import { runLibeufinKeyrotationTest } from "./test-libeufin-keyrotation.js";
import { runLibeufinNexusBalanceTest } from "./test-libeufin-nexus-balance.js";
import { runLibeufinRefundTest } from "./test-libeufin-refund.js";
import { runLibeufinRefundMultipleUsersTest } from "./test-libeufin-refund-multiple-users.js";
import { runLibeufinSandboxWireTransferCliTest } from "./test-libeufin-sandbox-wire-transfer-cli.js";
import { runLibeufinTutorialTest } from "./test-libeufin-tutorial.js";
import { runMerchantExchangeConfusionTest } from "./test-merchant-exchange-confusion.js";
import { runMerchantInstancesTest } from "./test-merchant-instances.js";
import { runMerchantInstancesDeleteTest } from "./test-merchant-instances-delete";
import { runMerchantInstancesUrlsTest } from "./test-merchant-instances-urls.js";
import { runMerchantLongpollingTest } from "./test-merchant-longpolling.js";
import { runMerchantRefundApiTest } from "./test-merchant-refund-api.js";
import { runMerchantSpecPublicOrdersTest } from "./test-merchant-spec-public-orders.js";
import { runPayPaidTest } from "./test-pay-paid.js";
import { runPaymentTest } from "./test-payment.js";
import { runPaymentClaimTest } from "./test-payment-claim.js";
import { runPaymentFaultTest } from "./test-payment-fault.js";
import { runPaymentForgettableTest } from "./test-payment-forgettable.js";
import { runPaymentIdempotencyTest } from "./test-payment-idempotency.js";
import { runPaymentMultipleTest } from "./test-payment-multiple.js";
import { runPaymentDemoTest } from "./test-payment-on-demo.js";
import { runPaymentTransientTest } from "./test-payment-transient.js";
import { runPaymentZeroTest } from "./test-payment-zero.js";
import { runPaywallFlowTest } from "./test-paywall-flow.js";
import { runPeerToPeerPullTest } from "./test-peer-to-peer-pull.js";
import { runPeerToPeerPushTest } from "./test-peer-to-peer-push.js";
import { runRefundTest } from "./test-refund.js";
import { runRefundAutoTest } from "./test-refund-auto.js";
import { runRefundGoneTest } from "./test-refund-gone.js";
import { runRefundIncrementalTest } from "./test-refund-incremental.js";
import { runRevocationTest } from "./test-revocation.js";
import { runTimetravelAutorefreshTest } from "./test-timetravel-autorefresh.js";
import { runTimetravelWithdrawTest } from "./test-timetravel-withdraw.js";
import { runTippingTest } from "./test-tipping.js";
import { runWalletBackupBasicTest } from "./test-wallet-backup-basic.js";
import { runWalletBackupDoublespendTest } from "./test-wallet-backup-doublespend.js";
import { runWalletDblessTest } from "./test-wallet-dbless.js";
import { runWallettestingTest } from "./test-wallettesting.js";
import { runWithdrawalAbortBankTest } from "./test-withdrawal-abort-bank.js";
import { runWithdrawalBankIntegratedTest } from "./test-withdrawal-bank-integrated.js";
import { runWithdrawalFakebankTest } from "./test-withdrawal-fakebank.js";
import { runTestWithdrawalManualTest } from "./test-withdrawal-manual.js";
import { runAgeRestrictionsPeerTest } from "./test-age-restrictions-peer.js";

/**
 * Test runner.
 */

/**
 * Spec for one test.
 */
interface TestMainFunction {
  (t: GlobalTestState): Promise<void>;
  timeoutMs?: number;
  excludeByDefault?: boolean;
  suites?: string[];
}

const allTests: TestMainFunction[] = [
  runAgeRestrictionsMerchantTest,
  runAgeRestrictionsPeerTest,
  runBankApiTest,
  runClaimLoopTest,
  runClauseSchnorrTest,
  runDepositTest,
  runDenomUnofferedTest,
  runExchangeManagementTest,
  runExchangeTimetravelTest,
  runFeeRegressionTest,
  runForcedSelectionTest,
  runLibeufinBasicTest,
  runLibeufinKeyrotationTest,
  runLibeufinTutorialTest,
  runLibeufinRefundTest,
  runLibeufinC5xTest,
  runLibeufinNexusBalanceTest,
  runLibeufinBadGatewayTest,
  runLibeufinRefundMultipleUsersTest,
  runLibeufinApiPermissionsTest,
  runLibeufinApiFacadeTest,
  runLibeufinApiFacadeBadRequestTest,
  runLibeufinAnastasisFacadeTest,
  runLibeufinApiSchedulingTest,
  runLibeufinApiUsersTest,
  runLibeufinApiBankaccountTest,
  runLibeufinApiBankconnectionTest,
  runLibeufinApiSandboxTransactionsTest,
  runLibeufinApiSandboxCamtTest,
  runLibeufinSandboxWireTransferCliTest,
  runMerchantExchangeConfusionTest,
  runMerchantInstancesTest,
  runMerchantInstancesDeleteTest,
  runMerchantInstancesUrlsTest,
  runMerchantLongpollingTest,
  runMerchantSpecPublicOrdersTest,
  runMerchantRefundApiTest,
  runPaymentClaimTest,
  runPaymentFaultTest,
  runPaymentForgettableTest,
  runPaymentIdempotencyTest,
  runPaymentMultipleTest,
  runPaymentTest,
  runPaymentDemoTest,
  runPaymentTransientTest,
  runPaymentZeroTest,
  runPayPaidTest,
  runPaywallFlowTest,
  runPeerToPeerPushTest,
  runPeerToPeerPullTest,
  runRefundAutoTest,
  runRefundGoneTest,
  runRefundIncrementalTest,
  runRefundTest,
  runRevocationTest,
  runTestWithdrawalManualTest,
  runWithdrawalFakebankTest,
  runTimetravelAutorefreshTest,
  runTimetravelWithdrawTest,
  runTippingTest,
  runWalletBackupBasicTest,
  runWalletBackupDoublespendTest,
  runWallettestingTest,
  runWalletDblessTest,
  runWithdrawalAbortBankTest,
  runWithdrawalBankIntegratedTest,
];

export interface TestRunSpec {
  includePattern?: string;
  suiteSpec?: string;
  dryRun?: boolean;
  verbosity: number;
}

export interface TestInfo {
  name: string;
  suites: string[];
  excludeByDefault: boolean;
}

function updateCurrentSymlink(testDir: string): void {
  const currLink = path.join(
    os.tmpdir(),
    `taler-integrationtests-${os.userInfo().username}-current`,
  );
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
    .replace(/[a-z0-9][A-Z]/g, (x) => {
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
  console.log(`testsuite root directory: ${testRootDir}`);

  const testResults: TestRunResult[] = [];

  let currentChild: child_process.ChildProcess | undefined;

  const handleSignal = (s: NodeJS.Signals) => {
    console.log(`received signal ${s} in test parent`);
    if (currentChild) {
      currentChild.kill("SIGTERM");
    }
    reportAndQuit(testRootDir, testResults, true);
  };

  process.on("SIGINT", (s) => handleSignal(s));
  process.on("SIGTERM", (s) => handleSignal(s));
  //process.on("unhandledRejection", handleSignal);
  //process.on("uncaughtException", handleSignal);

  let suites: Set<string> | undefined;

  if (spec.suiteSpec) {
    suites = new Set(spec.suiteSpec.split(",").map((x) => x.trim()));
  }

  for (const [n, testCase] of allTests.entries()) {
    const testName = getTestName(testCase);
    if (spec.includePattern && !minimatch(testName, spec.includePattern)) {
      continue;
    }

    if (suites) {
      const ts = new Set(testCase.suites ?? []);
      const intersection = new Set([...suites].filter((x) => ts.has(x)));
      if (intersection.size === 0) {
        continue;
      }
    } else {
      if (testCase.excludeByDefault) {
        continue;
      }
    }

    if (spec.dryRun) {
      console.log(`dry run: would run test ${testName}`);
      continue;
    }

    const testInstr: RunTestChildInstruction = {
      testName,
      testRootDir,
    };

    currentChild = child_process.fork(__filename, ["__TWCLI_TESTWORKER"], {
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

    if (spec.verbosity > 0) {
      currentChild.stderr?.pipe(process.stderr);
      currentChild.stdout?.pipe(process.stdout);
    }

    currentChild.stdout?.pipe(harnessLogStream);
    currentChild.stderr?.pipe(harnessLogStream);

    const defaultTimeout = 60000;
    const testTimeoutMs = testCase.timeoutMs ?? defaultTimeout;

    console.log(`running ${testName} with timeout ${testTimeoutMs}ms`);

    const { token } = CancellationToken.timeout(testTimeoutMs);

    const resultPromise: Promise<TestRunResult> = new Promise(
      (resolve, reject) => {
        let msg: TestRunResult | undefined;
        currentChild!.on("message", (m) => {
          if (token.isCancelled) {
            return;
          }
          msg = m as TestRunResult;
        });
        currentChild!.on("exit", (code, signal) => {
          if (token.isCancelled) {
            return;
          }
          console.log(`process exited code=${code} signal=${signal}`);
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
          if (token.isCancelled) {
            return;
          }
          reject(err);
        });
      },
    );

    let result: TestRunResult;

    try {
      result = await token.racePromise(resultPromise);
    } catch (e: any) {
      console.error(`test ${testName} timed out`);
      if (token.isCancelled) {
        result = {
          status: "fail",
          reason: "timeout",
          timeSec: testTimeoutMs / 1000,
          name: testName,
        };
        currentChild.kill("SIGTERM");
      } else {
        throw Error(e);
      }
    }

    harnessLogStream.close();

    console.log(`parent: got result ${JSON.stringify(result)}`);

    testResults.push(result);
  }

  reportAndQuit(testRootDir, testResults);
}

export function reportAndQuit(
  testRootDir: string,
  testResults: TestRunResult[],
  interrupted: boolean = false,
): never {
  let numTotal = 0;
  let numFail = 0;
  let numSkip = 0;
  let numPass = 0;

  for (const result of testResults) {
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
    JSON.stringify({ testResults, interrupted }, undefined, 2),
  );
  if (interrupted) {
    console.log("test suite was interrupted");
  }
  console.log(`See ${resultsFile} for details`);
  console.log(`Skipped: ${numSkip}/${numTotal}`);
  console.log(`Failed: ${numFail}/${numTotal}`);
  console.log(`Passed: ${numPass}/${numTotal}`);

  if (interrupted) {
    process.exit(3);
  } else if (numPass < numTotal - numSkip) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

export function getTestInfo(): TestInfo[] {
  return allTests.map((x) => ({
    name: getTestName(x),
    suites: x.suites ?? [],
    excludeByDefault: x.excludeByDefault ?? false,
  }));
}

const runTestInstrStr = process.env["TWCLI_RUN_TEST_INSTRUCTION"];
if (runTestInstrStr && process.argv.includes("__TWCLI_TESTWORKER")) {
  // Test will call taler-wallet-cli, so we must not propagate this variable.
  delete process.env["TWCLI_RUN_TEST_INSTRUCTION"];
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

  runTest()
    .then(() => {
      console.log(`test ${testName} finished in worker`);
      if (shouldLingerInTest()) {
        console.log("lingering ...");
        return;
      }
      process.exit(0);
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
}
