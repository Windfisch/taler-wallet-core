/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
 * Test harness for various GNU Taler components.
 * Also provides a fault-injection proxy.
 *
 * @author Florian Dold <dold@taler.net>
 */

const logger = new Logger("harness.ts");

/**
 * Imports
 */
import {
  AmountJson,
  Amounts,
  AmountString,
  Configuration,
  CoreApiResponse,
  createEddsaKeyPair,
  Duration,
  eddsaGetPublic,
  EddsaKeyPair,
  encodeCrock,
  hash,
  j2s,
  Logger,
  parsePaytoUri,
  stringToBytes,
  TalerProtocolDuration,
} from "@gnu-taler/taler-util";
import {
  BankAccessApi,
  BankApi,
  BankServiceHandle,
  HarnessExchangeBankAccount,
  NodeHttpLib,
  openPromise,
  TalerError,
  WalletCoreApiClient,
} from "@gnu-taler/taler-wallet-core";
import { deepStrictEqual } from "assert";
import axiosImp, { AxiosError } from "axios";
import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import * as readline from "readline";
import { URL } from "url";
import * as util from "util";
import { CoinConfig } from "./denomStructures.js";
import { LibeufinNexusApi, LibeufinSandboxApi } from "./libeufin-apis.js";
import {
  codecForMerchantOrderPrivateStatusResponse,
  codecForPostOrderResponse,
  MerchantInstancesResponse,
  MerchantOrderPrivateStatusResponse,
  PostOrderRequest,
  PostOrderResponse,
  TipCreateConfirmation,
  TipCreateRequest,
  TippingReserveStatus,
} from "./merchantApiTypes.js";

const exec = util.promisify(require("child_process").exec);

const axios = axiosImp.default;

export async function delayMs(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms);
  });
}

export interface WithAuthorization {
  Authorization?: string;
}

interface WaitResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

/**
 * Run a shell command, return stdout.
 */
export async function sh(
  t: GlobalTestState,
  logName: string,
  command: string,
  env: { [index: string]: string | undefined } = process.env,
): Promise<string> {
  logger.info(`running command ${command}`);
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const proc = spawn(command, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
      env: env,
    });
    proc.stdout.on("data", (x) => {
      if (x instanceof Buffer) {
        stdoutChunks.push(x);
      } else {
        throw Error("unexpected data chunk type");
      }
    });
    const stderrLogFileName = path.join(t.testDir, `${logName}-stderr.log`);
    const stderrLog = fs.createWriteStream(stderrLogFileName, {
      flags: "a",
    });
    proc.stderr.pipe(stderrLog);
    proc.on("exit", (code, signal) => {
      logger.info(`child process exited (${code} / ${signal})`);
      if (code != 0) {
        reject(Error(`Unexpected exit code ${code} for '${command}'`));
        return;
      }
      const b = Buffer.concat(stdoutChunks).toString("utf-8");
      resolve(b);
    });
    proc.on("error", () => {
      reject(Error("Child process had error"));
    });
  });
}

function shellescape(args: string[]) {
  const ret = args.map((s) => {
    if (/[^A-Za-z0-9_\/:=-]/.test(s)) {
      s = "'" + s.replace(/'/g, "'\\''") + "'";
      s = s.replace(/^(?:'')+/g, "").replace(/\\'''/g, "\\'");
    }
    return s;
  });
  return ret.join(" ");
}

/**
 * Run a shell command, return stdout.
 *
 * Log stderr to a log file.
 */
export async function runCommand(
  t: GlobalTestState,
  logName: string,
  command: string,
  args: string[],
  env: { [index: string]: string | undefined } = process.env,
): Promise<string> {
  logger.info(`running command ${shellescape([command, ...args])}`);
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const proc = spawn(command, args, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
      env: env,
    });
    proc.stdout.on("data", (x) => {
      if (x instanceof Buffer) {
        stdoutChunks.push(x);
      } else {
        throw Error("unexpected data chunk type");
      }
    });
    const stderrLogFileName = path.join(t.testDir, `${logName}-stderr.log`);
    const stderrLog = fs.createWriteStream(stderrLogFileName, {
      flags: "a",
    });
    proc.stderr.pipe(stderrLog);
    proc.on("exit", (code, signal) => {
      logger.info(`child process exited (${code} / ${signal})`);
      if (code != 0) {
        reject(Error(`Unexpected exit code ${code} for '${command}'`));
        return;
      }
      const b = Buffer.concat(stdoutChunks).toString("utf-8");
      resolve(b);
    });
    proc.on("error", () => {
      reject(Error("Child process had error"));
    });
  });
}

export class ProcessWrapper {
  private waitPromise: Promise<WaitResult>;
  constructor(public proc: ChildProcess) {
    this.waitPromise = new Promise((resolve, reject) => {
      proc.on("exit", (code, signal) => {
        resolve({ code, signal });
      });
      proc.on("error", (err) => {
        reject(err);
      });
    });
  }

  wait(): Promise<WaitResult> {
    return this.waitPromise;
  }
}

export class GlobalTestParams {
  testDir: string;
}

export class GlobalTestState {
  testDir: string;
  procs: ProcessWrapper[];
  servers: http.Server[];
  inShutdown: boolean = false;
  constructor(params: GlobalTestParams) {
    this.testDir = params.testDir;
    this.procs = [];
    this.servers = [];
  }

  async assertThrowsTalerErrorAsync(
    block: () => Promise<void>,
  ): Promise<TalerError> {
    try {
      await block();
    } catch (e) {
      if (e instanceof TalerError) {
        return e;
      }
      throw Error(`expected TalerError to be thrown, but got ${e}`);
    }
    throw Error(
      `expected TalerError to be thrown, but block finished without throwing`,
    );
  }

  async assertThrowsAsync(block: () => Promise<void>): Promise<any> {
    try {
      await block();
    } catch (e) {
      return e;
    }
    throw Error(
      `expected exception to be thrown, but block finished without throwing`,
    );
  }

  assertAxiosError(e: any): asserts e is AxiosError {
    if (!e.isAxiosError) {
      throw Error("expected axios error");
    }
  }

  assertTrue(b: boolean): asserts b {
    if (!b) {
      throw Error("test assertion failed");
    }
  }

  assertDeepEqual<T>(actual: any, expected: T): asserts actual is T {
    deepStrictEqual(actual, expected);
  }

  assertAmountEquals(
    amtActual: string | AmountJson,
    amtExpected: string | AmountJson,
  ): void {
    if (Amounts.cmp(amtActual, amtExpected) != 0) {
      throw Error(
        `test assertion failed: expected ${Amounts.stringify(
          amtExpected,
        )} but got ${Amounts.stringify(amtActual)}`,
      );
    }
  }

  assertAmountLeq(a: string | AmountJson, b: string | AmountJson): void {
    if (Amounts.cmp(a, b) > 0) {
      throw Error(
        `test assertion failed: expected ${Amounts.stringify(
          a,
        )} to be less or equal (leq) than ${Amounts.stringify(b)}`,
      );
    }
  }

  shutdownSync(): void {
    for (const s of this.servers) {
      s.close();
      s.removeAllListeners();
    }
    for (const p of this.procs) {
      if (p.proc.exitCode == null) {
        p.proc.kill("SIGTERM");
      }
    }
  }

  spawnService(
    command: string,
    args: string[],
    logName: string,
    env: { [index: string]: string | undefined } = process.env,
  ): ProcessWrapper {
    logger.info(
      `spawning process (${logName}): ${shellescape([command, ...args])}`,
    );
    const proc = spawn(command, args, {
      stdio: ["inherit", "pipe", "pipe"],
      env: env,
    });
    logger.info(`spawned process (${logName}) with pid ${proc.pid}`);
    proc.on("error", (err) => {
      logger.warn(`could not start process (${command})`, err);
    });
    proc.on("exit", (code, signal) => {
      logger.warn(`process ${logName} exited ${j2s({ code, signal })}`);
    });
    const stderrLogFileName = this.testDir + `/${logName}-stderr.log`;
    const stderrLog = fs.createWriteStream(stderrLogFileName, {
      flags: "a",
    });
    proc.stderr.pipe(stderrLog);
    const stdoutLogFileName = this.testDir + `/${logName}-stdout.log`;
    const stdoutLog = fs.createWriteStream(stdoutLogFileName, {
      flags: "a",
    });
    proc.stdout.pipe(stdoutLog);
    const procWrap = new ProcessWrapper(proc);
    this.procs.push(procWrap);
    return procWrap;
  }

  async shutdown(): Promise<void> {
    if (this.inShutdown) {
      return;
    }
    if (shouldLingerInTest()) {
      logger.info("refusing to shut down, lingering was requested");
      return;
    }
    this.inShutdown = true;
    logger.info("shutting down");
    for (const s of this.servers) {
      s.close();
      s.removeAllListeners();
    }
    for (const p of this.procs) {
      if (p.proc.exitCode == null) {
        logger.info(`killing process ${p.proc.pid}`);
        p.proc.kill("SIGTERM");
        await p.wait();
      }
    }
  }
}

export function shouldLingerInTest(): boolean {
  return !!process.env["TALER_TEST_LINGER"];
}

export interface TalerConfigSection {
  options: Record<string, string | undefined>;
}

export interface TalerConfig {
  sections: Record<string, TalerConfigSection>;
}

export interface DbInfo {
  /**
   * Postgres connection string.
   */
  connStr: string;

  dbname: string;
}

export async function setupDb(gc: GlobalTestState): Promise<DbInfo> {
  const dbname = "taler-integrationtest";
  await exec(`dropdb "${dbname}" || true`);
  await exec(`createdb "${dbname}"`);
  return {
    connStr: `postgres:///${dbname}`,
    dbname,
  };
}

export interface BankConfig {
  currency: string;
  httpPort: number;
  database: string;
  allowRegistrations: boolean;
  maxDebt?: string;
}

export interface FakeBankConfig {
  currency: string;
  httpPort: number;
}

function setTalerPaths(config: Configuration, home: string) {
  config.setString("paths", "taler_home", home);
  // We need to make sure that the path of taler_runtime_dir isn't too long,
  // as it contains unix domain sockets (108 character limit).
  const runDir = fs.mkdtempSync("/tmp/taler-test-");
  config.setString("paths", "taler_runtime_dir", runDir);
  config.setString(
    "paths",
    "taler_data_home",
    "$TALER_HOME/.local/share/taler/",
  );
  config.setString("paths", "taler_config_home", "$TALER_HOME/.config/taler/");
  config.setString("paths", "taler_cache_home", "$TALER_HOME/.config/taler/");
}

function setCoin(config: Configuration, c: CoinConfig) {
  const s = `coin_${c.name}`;
  config.setString(s, "value", c.value);
  config.setString(s, "duration_withdraw", c.durationWithdraw);
  config.setString(s, "duration_spend", c.durationSpend);
  config.setString(s, "duration_legal", c.durationLegal);
  config.setString(s, "fee_deposit", c.feeDeposit);
  config.setString(s, "fee_withdraw", c.feeWithdraw);
  config.setString(s, "fee_refresh", c.feeRefresh);
  config.setString(s, "fee_refund", c.feeRefund);
  if (c.ageRestricted) {
    config.setString(s, "age_restricted", "yes");
  }
  if (c.cipher === "RSA") {
    config.setString(s, "rsa_keysize", `${c.rsaKeySize}`);
    config.setString(s, "cipher", "RSA");
  } else if (c.cipher === "CS") {
    config.setString(s, "cipher", "CS");
  } else {
    throw new Error();
  }
}

/**
 * Send an HTTP request until it succeeds or the process dies.
 */
export async function pingProc(
  proc: ProcessWrapper | undefined,
  url: string,
  serviceName: string,
): Promise<void> {
  if (!proc || proc.proc.exitCode !== null) {
    throw Error(`service process ${serviceName} not started, can't ping`);
  }
  while (true) {
    try {
      logger.info(`pinging ${serviceName} at ${url}`);
      const resp = await axios.get(url);
      logger.info(`service ${serviceName} available`);
      return;
    } catch (e: any) {
      logger.info(`service ${serviceName} not ready:`, e.toString());
      //console.log(e);
      await delayMs(1000);
    }
    if (!proc || proc.proc.exitCode != null || proc.proc.signalCode != null) {
      throw Error(`service process ${serviceName} stopped unexpectedly`);
    }
  }
}

class BankServiceBase {
  proc: ProcessWrapper | undefined;

  protected constructor(
    protected globalTestState: GlobalTestState,
    protected bankConfig: BankConfig,
    protected configFile: string,
  ) {}
}

/**
 * Work in progress.  The key point is that both Sandbox and Nexus
 * will be configured and started by this class.
 */
class LibEuFinBankService extends BankServiceBase implements BankServiceHandle {
  sandboxProc: ProcessWrapper | undefined;
  nexusProc: ProcessWrapper | undefined;

  http = new NodeHttpLib();

  static async create(
    gc: GlobalTestState,
    bc: BankConfig,
  ): Promise<LibEuFinBankService> {
    return new LibEuFinBankService(gc, bc, "foo");
  }

  get port() {
    return this.bankConfig.httpPort;
  }
  get nexusPort() {
    return this.bankConfig.httpPort + 1000;
  }

  get nexusDbConn(): string {
    return `jdbc:sqlite:${this.globalTestState.testDir}/libeufin-nexus.sqlite3`;
  }

  get sandboxDbConn(): string {
    return `jdbc:sqlite:${this.globalTestState.testDir}/libeufin-sandbox.sqlite3`;
  }

  get nexusBaseUrl(): string {
    return `http://localhost:${this.nexusPort}`;
  }

  get baseUrlDemobank(): string {
    let url = new URL("demobanks/default/", this.baseUrlNetloc);
    return url.href;
  }

  // FIXME: Duplicate?  Where is this needed?
  get baseUrlAccessApi(): string {
    let url = new URL("access-api/", this.baseUrlDemobank);
    return url.href;
  }

  get bankAccessApiBaseUrl(): string {
    let url = new URL("access-api/", this.baseUrlDemobank);
    return url.href;
  }

  get baseUrlNetloc(): string {
    return `http://localhost:${this.bankConfig.httpPort}/`;
  }

  get baseUrl(): string {
    return this.baseUrlAccessApi;
  }

  async setSuggestedExchange(
    e: ExchangeServiceInterface,
    exchangePayto: string,
  ) {
    await sh(
      this.globalTestState,
      "libeufin-sandbox-set-default-exchange",
      `libeufin-sandbox default-exchange ${e.baseUrl} ${exchangePayto}`,
      {
        ...process.env,
        LIBEUFIN_SANDBOX_DB_CONNECTION: this.sandboxDbConn,
      },
    );
  }

  // Create one at both sides: Sandbox and Nexus.
  async createExchangeAccount(
    accountName: string,
    password: string,
  ): Promise<HarnessExchangeBankAccount> {
    logger.info("Create Exchange account(s)!");
    /**
     * Many test cases try to create a Exchange account before
     * starting the bank;  that's because the Pybank did it entirely
     * via the configuration file.
     */
    await this.start();
    await this.pingUntilAvailable();
    await LibeufinSandboxApi.createDemobankAccount(accountName, password, {
      baseUrl: this.baseUrlAccessApi,
    });
    let bankAccountLabel = accountName;
    await LibeufinSandboxApi.createDemobankEbicsSubscriber(
      {
        hostID: "talertestEbicsHost",
        userID: "exchangeEbicsUser",
        partnerID: "exchangeEbicsPartner",
      },
      bankAccountLabel,
      { baseUrl: this.baseUrlDemobank },
    );

    await LibeufinNexusApi.createUser(
      { baseUrl: this.nexusBaseUrl },
      {
        username: accountName,
        password: password,
      },
    );
    await LibeufinNexusApi.createEbicsBankConnection(
      { baseUrl: this.nexusBaseUrl },
      {
        name: "ebics-connection", // connection name.
        ebicsURL: new URL("ebicsweb", this.baseUrlNetloc).href,
        hostID: "talertestEbicsHost",
        userID: "exchangeEbicsUser",
        partnerID: "exchangeEbicsPartner",
      },
    );
    await LibeufinNexusApi.connectBankConnection(
      { baseUrl: this.nexusBaseUrl },
      "ebics-connection",
    );
    await LibeufinNexusApi.fetchAccounts(
      { baseUrl: this.nexusBaseUrl },
      "ebics-connection",
    );
    await LibeufinNexusApi.importConnectionAccount(
      { baseUrl: this.nexusBaseUrl },
      "ebics-connection", // connection name
      accountName, // offered account label
      `${accountName}-nexus-label`, // bank account label at Nexus
    );
    await LibeufinNexusApi.createTwgFacade(
      { baseUrl: this.nexusBaseUrl },
      {
        name: "exchange-facade",
        connectionName: "ebics-connection",
        accountName: `${accountName}-nexus-label`,
        currency: "EUR",
        reserveTransferLevel: "report",
      },
    );
    await LibeufinNexusApi.postPermission(
      { baseUrl: this.nexusBaseUrl },
      {
        action: "grant",
        permission: {
          subjectId: accountName,
          subjectType: "user",
          resourceType: "facade",
          resourceId: "exchange-facade", // facade name
          permissionName: "facade.talerWireGateway.transfer",
        },
      },
    );
    await LibeufinNexusApi.postPermission(
      { baseUrl: this.nexusBaseUrl },
      {
        action: "grant",
        permission: {
          subjectId: accountName,
          subjectType: "user",
          resourceType: "facade",
          resourceId: "exchange-facade", // facade name
          permissionName: "facade.talerWireGateway.history",
        },
      },
    );
    // Set fetch task.
    await LibeufinNexusApi.postTask(
      { baseUrl: this.nexusBaseUrl },
      `${accountName}-nexus-label`,
      {
        name: "wirewatch-task",
        cronspec: "* * *",
        type: "fetch",
        params: {
          level: "all",
          rangeType: "all",
        },
      },
    );
    await LibeufinNexusApi.postTask(
      { baseUrl: this.nexusBaseUrl },
      `${accountName}-nexus-label`,
      {
        name: "aggregator-task",
        cronspec: "* * *",
        type: "submit",
        params: {},
      },
    );
    let facadesResp = await LibeufinNexusApi.getAllFacades({
      baseUrl: this.nexusBaseUrl,
    });
    let accountInfoResp = await LibeufinSandboxApi.demobankAccountInfo(
      "admin",
      "secret",
      { baseUrl: this.baseUrlAccessApi },
      accountName, // bank account label.
    );
    return {
      accountName: accountName,
      accountPassword: password,
      accountPaytoUri: accountInfoResp.data.paytoUri,
      wireGatewayApiBaseUrl: facadesResp.data.facades[0].baseUrl,
    };
  }

  async start(): Promise<void> {
    /**
     * Because many test cases try to create a Exchange bank
     * account _before_ starting the bank (Pybank did it only via
     * the config), it is possible that at this point Sandbox and
     * Nexus are already running.  Hence, this method only launches
     * them if they weren't launched earlier.
     */

    // Only go ahead if BOTH aren't running.
    if (this.sandboxProc || this.nexusProc) {
      logger.info("Nexus or Sandbox already running, not taking any action.");
      return;
    }
    await sh(
      this.globalTestState,
      "libeufin-sandbox-config-demobank",
      `libeufin-sandbox config --currency=${this.bankConfig.currency} default`,
      {
        ...process.env,
        LIBEUFIN_SANDBOX_DB_CONNECTION: this.sandboxDbConn,
        LIBEUFIN_SANDBOX_ADMIN_PASSWORD: "secret",
      },
    );
    this.sandboxProc = this.globalTestState.spawnService(
      "libeufin-sandbox",
      ["serve", "--port", `${this.port}`],
      "libeufin-sandbox",
      {
        ...process.env,
        LIBEUFIN_SANDBOX_DB_CONNECTION: this.sandboxDbConn,
        LIBEUFIN_SANDBOX_ADMIN_PASSWORD: "secret",
      },
    );
    await runCommand(
      this.globalTestState,
      "libeufin-nexus-superuser",
      "libeufin-nexus",
      ["superuser", "admin", "--password", "test"],
      {
        ...process.env,
        LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusDbConn,
      },
    );
    this.nexusProc = this.globalTestState.spawnService(
      "libeufin-nexus",
      ["serve", "--port", `${this.nexusPort}`],
      "libeufin-nexus",
      {
        ...process.env,
        LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusDbConn,
      },
    );
    // need to wait here, because at this point
    // a Ebics host needs to be created (RESTfully)
    await this.pingUntilAvailable();
    LibeufinSandboxApi.createEbicsHost(
      { baseUrl: this.baseUrlNetloc },
      "talertestEbicsHost",
    );
  }

  async pingUntilAvailable(): Promise<void> {
    await pingProc(
      this.sandboxProc,
      `http://localhost:${this.bankConfig.httpPort}`,
      "libeufin-sandbox",
    );
    await pingProc(
      this.nexusProc,
      `${this.nexusBaseUrl}/config`,
      "libeufin-nexus",
    );
  }
}

/**
 * Implementation of the bank service using the "taler-fakebank-run" tool.
 */
export class FakebankService
  extends BankServiceBase
  implements BankServiceHandle
{
  proc: ProcessWrapper | undefined;

  http = new NodeHttpLib();

  // We store "created" accounts during setup and
  // register them after startup.
  private accounts: {
    accountName: string;
    accountPassword: string;
  }[] = [];

  static async create(
    gc: GlobalTestState,
    bc: BankConfig,
  ): Promise<FakebankService> {
    const config = new Configuration();
    setTalerPaths(config, gc.testDir + "/talerhome");
    config.setString("taler", "currency", bc.currency);
    config.setString("bank", "http_port", `${bc.httpPort}`);
    config.setString("bank", "serve", "http");
    config.setString("bank", "max_debt_bank", `${bc.currency}:999999`);
    config.setString("bank", "max_debt", bc.maxDebt ?? `${bc.currency}:100`);
    config.setString("bank", "ram_limit", `${1024}`);
    const cfgFilename = gc.testDir + "/bank.conf";
    config.write(cfgFilename);

    return new FakebankService(gc, bc, cfgFilename);
  }

  setSuggestedExchange(e: ExchangeServiceInterface, exchangePayto: string) {
    if (!!this.proc) {
      throw Error("Can't set suggested exchange while bank is running.");
    }
    const config = Configuration.load(this.configFile);
    config.setString("bank", "suggested_exchange", e.baseUrl);
    config.write(this.configFile);
  }

  get baseUrl(): string {
    return `http://localhost:${this.bankConfig.httpPort}/`;
  }

  get bankAccessApiBaseUrl(): string {
    let url = new URL("taler-bank-access/", this.baseUrl);
    return url.href;
  }

  async createExchangeAccount(
    accountName: string,
    password: string,
  ): Promise<HarnessExchangeBankAccount> {
    this.accounts.push({
      accountName,
      accountPassword: password,
    });
    return {
      accountName: accountName,
      accountPassword: password,
      accountPaytoUri: getPayto(accountName),
      wireGatewayApiBaseUrl: `http://localhost:${this.bankConfig.httpPort}/taler-wire-gateway/${accountName}/`,
    };
  }

  get port() {
    return this.bankConfig.httpPort;
  }

  async start(): Promise<void> {
    logger.info("starting fakebank");
    if (this.proc) {
      logger.info("fakebank already running, not starting again");
      return;
    }
    this.proc = this.globalTestState.spawnService(
      "taler-fakebank-run",
      [
        "-c",
        this.configFile,
        "--signup-bonus",
        `${this.bankConfig.currency}:100`,
      ],
      "bank",
    );
    await this.pingUntilAvailable();
    for (const acc of this.accounts) {
      await BankApi.registerAccount(this, acc.accountName, acc.accountPassword);
    }
  }

  async pingUntilAvailable(): Promise<void> {
    const url = `http://localhost:${this.bankConfig.httpPort}/taler-bank-integration/config`;
    await pingProc(this.proc, url, "bank");
  }
}

// Use libeufin bank instead of pybank.
const useLibeufinBank = false;

export type BankService = BankServiceHandle;
export const BankService = FakebankService;

export interface ExchangeConfig {
  name: string;
  currency: string;
  roundUnit?: string;
  httpPort: number;
  database: string;
}

export interface ExchangeServiceInterface {
  readonly baseUrl: string;
  readonly port: number;
  readonly name: string;
  readonly masterPub: string;
}

export class ExchangeService implements ExchangeServiceInterface {
  static fromExistingConfig(gc: GlobalTestState, exchangeName: string) {
    const cfgFilename = gc.testDir + `/exchange-${exchangeName}.conf`;
    const config = Configuration.load(cfgFilename);
    const ec: ExchangeConfig = {
      currency: config.getString("taler", "currency").required(),
      database: config.getString("exchangedb-postgres", "config").required(),
      httpPort: config.getNumber("exchange", "port").required(),
      name: exchangeName,
      roundUnit: config.getString("taler", "currency_round_unit").required(),
    };
    const privFile = config.getPath("exchange", "master_priv_file").required();
    const eddsaPriv = fs.readFileSync(privFile);
    const keyPair: EddsaKeyPair = {
      eddsaPriv,
      eddsaPub: eddsaGetPublic(eddsaPriv),
    };
    return new ExchangeService(gc, ec, cfgFilename, keyPair);
  }

  private currentTimetravel: Duration | undefined;

  setTimetravel(t: Duration | undefined): void {
    if (this.isRunning()) {
      throw Error("can't set time travel while the exchange is running");
    }
    this.currentTimetravel = t;
  }

  private get timetravelArg(): string | undefined {
    if (this.currentTimetravel && this.currentTimetravel.d_ms !== "forever") {
      // Convert to microseconds
      return `--timetravel=+${this.currentTimetravel.d_ms * 1000}`;
    }
    return undefined;
  }

  /**
   * Return an empty array if no time travel is set,
   * and an array with the time travel command line argument
   * otherwise.
   */
  private get timetravelArgArr(): string[] {
    const tta = this.timetravelArg;
    if (tta) {
      return [tta];
    }
    return [];
  }

  async runWirewatchOnce() {
    if (useLibeufinBank) {
      // Not even 2 secods showed to be enough!
      await waitMs(4000);
    }
    await runCommand(
      this.globalState,
      `exchange-${this.name}-wirewatch-once`,
      "taler-exchange-wirewatch",
      [...this.timetravelArgArr, "-c", this.configFilename, "-t"],
    );
  }

  async runAggregatorOnce() {
    try {
      await runCommand(
        this.globalState,
        `exchange-${this.name}-aggregator-once`,
        "taler-exchange-aggregator",
        [...this.timetravelArgArr, "-c", this.configFilename, "-t", "-y"],
      );
    } catch (e) {
      logger.info(
        "running aggregator with KYC off didn't work, might be old version, running again",
      );
      await runCommand(
        this.globalState,
        `exchange-${this.name}-aggregator-once`,
        "taler-exchange-aggregator",
        [...this.timetravelArgArr, "-c", this.configFilename, "-t"],
      );
    }
  }

  async runTransferOnce() {
    await runCommand(
      this.globalState,
      `exchange-${this.name}-transfer-once`,
      "taler-exchange-transfer",
      [...this.timetravelArgArr, "-c", this.configFilename, "-t"],
    );
  }

  changeConfig(f: (config: Configuration) => void) {
    const config = Configuration.load(this.configFilename);
    f(config);
    config.write(this.configFilename);
  }

  static create(gc: GlobalTestState, e: ExchangeConfig) {
    const config = new Configuration();
    config.setString("taler", "currency", e.currency);
    config.setString(
      "taler",
      "currency_round_unit",
      e.roundUnit ?? `${e.currency}:0.01`,
    );
    setTalerPaths(config, gc.testDir + "/talerhome");
    config.setString(
      "exchange",
      "revocation_dir",
      "${TALER_DATA_HOME}/exchange/revocations",
    );
    config.setString("exchange", "max_keys_caching", "forever");
    config.setString("exchange", "db", "postgres");
    config.setString(
      "exchange-offline",
      "master_priv_file",
      "${TALER_DATA_HOME}/exchange/offline-keys/master.priv",
    );
    config.setString("exchange", "serve", "tcp");
    config.setString("exchange", "port", `${e.httpPort}`);

    config.setString("exchangedb-postgres", "config", e.database);

    config.setString("taler-exchange-secmod-eddsa", "lookahead_sign", "20 s");
    config.setString("taler-exchange-secmod-rsa", "lookahead_sign", "20 s");

    const exchangeMasterKey = createEddsaKeyPair();

    config.setString(
      "exchange",
      "master_public_key",
      encodeCrock(exchangeMasterKey.eddsaPub),
    );

    const masterPrivFile = config
      .getPath("exchange-offline", "master_priv_file")
      .required();

    fs.mkdirSync(path.dirname(masterPrivFile), { recursive: true });

    fs.writeFileSync(masterPrivFile, Buffer.from(exchangeMasterKey.eddsaPriv));

    const cfgFilename = gc.testDir + `/exchange-${e.name}.conf`;
    config.write(cfgFilename);
    return new ExchangeService(gc, e, cfgFilename, exchangeMasterKey);
  }

  addOfferedCoins(offeredCoins: ((curr: string) => CoinConfig)[]) {
    const config = Configuration.load(this.configFilename);
    offeredCoins.forEach((cc) =>
      setCoin(config, cc(this.exchangeConfig.currency)),
    );
    config.write(this.configFilename);
  }

  addCoinConfigList(ccs: CoinConfig[]) {
    const config = Configuration.load(this.configFilename);
    ccs.forEach((cc) => setCoin(config, cc));
    config.write(this.configFilename);
  }

  enableAgeRestrictions(maskStr: string) {
    const config = Configuration.load(this.configFilename);
    config.setString("exchange-extension-age_restriction", "enabled", "yes");
    config.setString(
      "exchange-extension-age_restriction",
      "age_groups",
      maskStr,
    );
    config.write(this.configFilename);
  }

  get masterPub() {
    return encodeCrock(this.keyPair.eddsaPub);
  }

  get port() {
    return this.exchangeConfig.httpPort;
  }

  async addBankAccount(
    localName: string,
    exchangeBankAccount: HarnessExchangeBankAccount,
  ): Promise<void> {
    const config = Configuration.load(this.configFilename);
    config.setString(
      `exchange-account-${localName}`,
      "wire_response",
      `\${TALER_DATA_HOME}/exchange/account-${localName}.json`,
    );
    config.setString(
      `exchange-account-${localName}`,
      "payto_uri",
      exchangeBankAccount.accountPaytoUri,
    );
    config.setString(`exchange-account-${localName}`, "enable_credit", "yes");
    config.setString(`exchange-account-${localName}`, "enable_debit", "yes");
    config.setString(
      `exchange-accountcredentials-${localName}`,
      "wire_gateway_url",
      exchangeBankAccount.wireGatewayApiBaseUrl,
    );
    config.setString(
      `exchange-accountcredentials-${localName}`,
      "wire_gateway_auth_method",
      "basic",
    );
    config.setString(
      `exchange-accountcredentials-${localName}`,
      "username",
      exchangeBankAccount.accountName,
    );
    config.setString(
      `exchange-accountcredentials-${localName}`,
      "password",
      exchangeBankAccount.accountPassword,
    );
    config.write(this.configFilename);
  }

  exchangeHttpProc: ProcessWrapper | undefined;
  exchangeWirewatchProc: ProcessWrapper | undefined;

  helperCryptoRsaProc: ProcessWrapper | undefined;
  helperCryptoEddsaProc: ProcessWrapper | undefined;
  helperCryptoCsProc: ProcessWrapper | undefined;

  constructor(
    private globalState: GlobalTestState,
    private exchangeConfig: ExchangeConfig,
    private configFilename: string,
    private keyPair: EddsaKeyPair,
  ) {}

  get name() {
    return this.exchangeConfig.name;
  }

  get baseUrl() {
    return `http://localhost:${this.exchangeConfig.httpPort}/`;
  }

  isRunning(): boolean {
    return !!this.exchangeWirewatchProc || !!this.exchangeHttpProc;
  }

  async stop(): Promise<void> {
    const wirewatch = this.exchangeWirewatchProc;
    if (wirewatch) {
      wirewatch.proc.kill("SIGTERM");
      await wirewatch.wait();
      this.exchangeWirewatchProc = undefined;
    }
    const httpd = this.exchangeHttpProc;
    if (httpd) {
      httpd.proc.kill("SIGTERM");
      await httpd.wait();
      this.exchangeHttpProc = undefined;
    }
    const cryptoRsa = this.helperCryptoRsaProc;
    if (cryptoRsa) {
      cryptoRsa.proc.kill("SIGTERM");
      await cryptoRsa.wait();
      this.helperCryptoRsaProc = undefined;
    }
    const cryptoEddsa = this.helperCryptoEddsaProc;
    if (cryptoEddsa) {
      cryptoEddsa.proc.kill("SIGTERM");
      await cryptoEddsa.wait();
      this.helperCryptoRsaProc = undefined;
    }
    const cryptoCs = this.helperCryptoCsProc;
    if (cryptoCs) {
      cryptoCs.proc.kill("SIGTERM");
      await cryptoCs.wait();
      this.helperCryptoCsProc = undefined;
    }
  }

  /**
   * Update keys signing the keys generated by the security module
   * with the offline signing key.
   */
  async keyup(): Promise<void> {
    await runCommand(
      this.globalState,
      "exchange-offline",
      "taler-exchange-offline",
      ["-c", this.configFilename, "download", "sign", "upload"],
    );

    const accounts: string[] = [];
    const accountTargetTypes: Set<string> = new Set();

    const config = Configuration.load(this.configFilename);
    for (const sectionName of config.getSectionNames()) {
      if (sectionName.startsWith("EXCHANGE-ACCOUNT-")) {
        const paytoUri = config.getString(sectionName, "payto_uri").required();
        const p = parsePaytoUri(paytoUri);
        if (!p) {
          throw Error(`invalid payto uri in exchange config: ${paytoUri}`);
        }
        accountTargetTypes.add(p?.targetType);
        accounts.push(paytoUri);
      }
    }

    logger.info("configuring bank accounts", accounts);

    for (const acc of accounts) {
      await runCommand(
        this.globalState,
        "exchange-offline",
        "taler-exchange-offline",
        ["-c", this.configFilename, "enable-account", acc, "upload"],
      );
    }

    const year = new Date().getFullYear();
    for (const accTargetType of accountTargetTypes.values()) {
      for (let i = year; i < year + 5; i++) {
        await runCommand(
          this.globalState,
          "exchange-offline",
          "taler-exchange-offline",
          [
            "-c",
            this.configFilename,
            "wire-fee",
            `${i}`,
            accTargetType,
            `${this.exchangeConfig.currency}:0.01`,
            `${this.exchangeConfig.currency}:0.01`,
            `${this.exchangeConfig.currency}:0.01`,
            "upload",
          ],
        );
      }
    }

    await runCommand(
      this.globalState,
      "exchange-offline",
      "taler-exchange-offline",
      [
        "-c",
        this.configFilename,
        "global-fee",
        // year
        "now",
        // history fee
        `${this.exchangeConfig.currency}:0.01`,
        // kyc fee
        `${this.exchangeConfig.currency}:0.01`,
        // account fee
        `${this.exchangeConfig.currency}:0.01`,
        // purse fee
        `${this.exchangeConfig.currency}:0.00`,
        // purse timeout
        "1h",
        // kyc timeout
        "1h",
        // history expiration
        "1year",
        // free purses per account
        "5",
        "upload",
      ],
    );
  }

  async revokeDenomination(denomPubHash: string) {
    if (!this.isRunning()) {
      throw Error("exchange must be running when revoking denominations");
    }
    await runCommand(
      this.globalState,
      "exchange-offline",
      "taler-exchange-offline",
      [
        "-c",
        this.configFilename,
        "revoke-denomination",
        denomPubHash,
        "upload",
      ],
    );
  }

  async purgeSecmodKeys(): Promise<void> {
    const cfg = Configuration.load(this.configFilename);
    const rsaKeydir = cfg
      .getPath("taler-exchange-secmod-rsa", "KEY_DIR")
      .required();
    const eddsaKeydir = cfg
      .getPath("taler-exchange-secmod-eddsa", "KEY_DIR")
      .required();
    // Be *VERY* careful when changing this, or you will accidentally delete user data.
    await sh(this.globalState, "rm-secmod-keys", `rm -rf ${rsaKeydir}/COIN_*`);
    await sh(this.globalState, "rm-secmod-keys", `rm ${eddsaKeydir}/*`);
  }

  async purgeDatabase(): Promise<void> {
    await sh(
      this.globalState,
      "exchange-dbinit",
      `taler-exchange-dbinit -r -c "${this.configFilename}"`,
    );
  }

  async start(): Promise<void> {
    if (this.isRunning()) {
      throw Error("exchange is already running");
    }
    await sh(
      this.globalState,
      "exchange-dbinit",
      `taler-exchange-dbinit -c "${this.configFilename}"`,
    );

    this.helperCryptoEddsaProc = this.globalState.spawnService(
      "taler-exchange-secmod-eddsa",
      ["-c", this.configFilename, "-LDEBUG", ...this.timetravelArgArr],
      `exchange-crypto-eddsa-${this.name}`,
    );

    this.helperCryptoCsProc = this.globalState.spawnService(
      "taler-exchange-secmod-cs",
      ["-c", this.configFilename, "-LDEBUG", ...this.timetravelArgArr],
      `exchange-crypto-cs-${this.name}`,
    );

    this.helperCryptoRsaProc = this.globalState.spawnService(
      "taler-exchange-secmod-rsa",
      ["-c", this.configFilename, "-LDEBUG", ...this.timetravelArgArr],
      `exchange-crypto-rsa-${this.name}`,
    );

    this.exchangeWirewatchProc = this.globalState.spawnService(
      "taler-exchange-wirewatch",
      ["-c", this.configFilename, ...this.timetravelArgArr],
      `exchange-wirewatch-${this.name}`,
    );

    this.exchangeHttpProc = this.globalState.spawnService(
      "taler-exchange-httpd",
      ["-LINFO", "-c", this.configFilename, ...this.timetravelArgArr],
      `exchange-httpd-${this.name}`,
    );

    await this.pingUntilAvailable();
    await this.keyup();
  }

  async pingUntilAvailable(): Promise<void> {
    // We request /management/keys, since /keys can block
    // when we didn't do the key setup yet.
    const url = `http://localhost:${this.exchangeConfig.httpPort}/management/keys`;
    await pingProc(this.exchangeHttpProc, url, `exchange (${this.name})`);
  }
}

export interface MerchantConfig {
  name: string;
  currency: string;
  httpPort: number;
  database: string;
}

export interface PrivateOrderStatusQuery {
  instance?: string;
  orderId: string;
  sessionId?: string;
}

export interface MerchantServiceInterface {
  makeInstanceBaseUrl(instanceName?: string): string;
  readonly port: number;
  readonly name: string;
}

export class MerchantApiClient {
  constructor(
    private baseUrl: string,
    public readonly auth: MerchantAuthConfiguration,
  ) {}

  async changeAuth(auth: MerchantAuthConfiguration): Promise<void> {
    const url = new URL("private/auth", this.baseUrl);
    await axios.post(url.href, auth, {
      headers: this.makeAuthHeader(),
    });
  }

  async deleteInstance(instanceId: string) {
    const url = new URL(`management/instances/${instanceId}`, this.baseUrl);
    await axios.delete(url.href, {
      headers: this.makeAuthHeader(),
    });
  }

  async createInstance(req: MerchantInstanceConfig): Promise<void> {
    const url = new URL("management/instances", this.baseUrl);
    await axios.post(url.href, req, {
      headers: this.makeAuthHeader(),
    });
  }

  async getInstances(): Promise<MerchantInstancesResponse> {
    const url = new URL("management/instances", this.baseUrl);
    const resp = await axios.get(url.href, {
      headers: this.makeAuthHeader(),
    });
    return resp.data;
  }

  async getInstanceFullDetails(instanceId: string): Promise<any> {
    const url = new URL(`management/instances/${instanceId}`, this.baseUrl);
    try {
      const resp = await axios.get(url.href, {
        headers: this.makeAuthHeader(),
      });
      return resp.data;
    } catch (e) {
      throw e;
    }
  }

  makeAuthHeader(): Record<string, string> {
    switch (this.auth.method) {
      case "external":
        return {};
      case "token":
        return {
          Authorization: `Bearer ${this.auth.token}`,
        };
    }
  }
}

/**
 * FIXME:  This should be deprecated in favor of MerchantApiClient
 */
export namespace MerchantPrivateApi {
  export async function createOrder(
    merchantService: MerchantServiceInterface,
    instanceName: string,
    req: PostOrderRequest,
    withAuthorization: WithAuthorization = {},
  ): Promise<PostOrderResponse> {
    const baseUrl = merchantService.makeInstanceBaseUrl(instanceName);
    let url = new URL("private/orders", baseUrl);
    const resp = await axios.post(url.href, req, {
      headers: withAuthorization as Record<string, string>,
    });
    return codecForPostOrderResponse().decode(resp.data);
  }

  export async function queryPrivateOrderStatus(
    merchantService: MerchantServiceInterface,
    query: PrivateOrderStatusQuery,
    withAuthorization: WithAuthorization = {},
  ): Promise<MerchantOrderPrivateStatusResponse> {
    const reqUrl = new URL(
      `private/orders/${query.orderId}`,
      merchantService.makeInstanceBaseUrl(query.instance),
    );
    if (query.sessionId) {
      reqUrl.searchParams.set("session_id", query.sessionId);
    }
    const resp = await axios.get(reqUrl.href, {
      headers: withAuthorization as Record<string, string>,
    });
    return codecForMerchantOrderPrivateStatusResponse().decode(resp.data);
  }

  export async function giveRefund(
    merchantService: MerchantServiceInterface,
    r: {
      instance: string;
      orderId: string;
      amount: string;
      justification: string;
    },
  ): Promise<{ talerRefundUri: string }> {
    const reqUrl = new URL(
      `private/orders/${r.orderId}/refund`,
      merchantService.makeInstanceBaseUrl(r.instance),
    );
    const resp = await axios.post(reqUrl.href, {
      refund: r.amount,
      reason: r.justification,
    });
    return {
      talerRefundUri: resp.data.taler_refund_uri,
    };
  }

  export async function createTippingReserve(
    merchantService: MerchantServiceInterface,
    instance: string,
    req: CreateMerchantTippingReserveRequest,
  ): Promise<CreateMerchantTippingReserveConfirmation> {
    const reqUrl = new URL(
      `private/reserves`,
      merchantService.makeInstanceBaseUrl(instance),
    );
    const resp = await axios.post(reqUrl.href, req);
    // FIXME: validate
    return resp.data;
  }

  export async function queryTippingReserves(
    merchantService: MerchantServiceInterface,
    instance: string,
  ): Promise<TippingReserveStatus> {
    const reqUrl = new URL(
      `private/reserves`,
      merchantService.makeInstanceBaseUrl(instance),
    );
    const resp = await axios.get(reqUrl.href);
    // FIXME: validate
    return resp.data;
  }

  export async function giveTip(
    merchantService: MerchantServiceInterface,
    instance: string,
    req: TipCreateRequest,
  ): Promise<TipCreateConfirmation> {
    const reqUrl = new URL(
      `private/tips`,
      merchantService.makeInstanceBaseUrl(instance),
    );
    const resp = await axios.post(reqUrl.href, req);
    // FIXME: validate
    return resp.data;
  }
}

export interface CreateMerchantTippingReserveRequest {
  // Amount that the merchant promises to put into the reserve
  initial_balance: AmountString;

  // Exchange the merchant intends to use for tipping
  exchange_url: string;

  // Desired wire method, for example "iban" or "x-taler-bank"
  wire_method: string;
}

export interface CreateMerchantTippingReserveConfirmation {
  // Public key identifying the reserve
  reserve_pub: string;

  // Wire account of the exchange where to transfer the funds
  payto_uri: string;
}

export class MerchantService implements MerchantServiceInterface {
  static fromExistingConfig(gc: GlobalTestState, name: string) {
    const cfgFilename = gc.testDir + `/merchant-${name}.conf`;
    const config = Configuration.load(cfgFilename);
    const mc: MerchantConfig = {
      currency: config.getString("taler", "currency").required(),
      database: config.getString("merchantdb-postgres", "config").required(),
      httpPort: config.getNumber("merchant", "port").required(),
      name,
    };
    return new MerchantService(gc, mc, cfgFilename);
  }

  proc: ProcessWrapper | undefined;

  constructor(
    private globalState: GlobalTestState,
    private merchantConfig: MerchantConfig,
    private configFilename: string,
  ) {}

  private currentTimetravel: Duration | undefined;

  private isRunning(): boolean {
    return !!this.proc;
  }

  setTimetravel(t: Duration | undefined): void {
    if (this.isRunning()) {
      throw Error("can't set time travel while the exchange is running");
    }
    this.currentTimetravel = t;
  }

  private get timetravelArg(): string | undefined {
    if (this.currentTimetravel && this.currentTimetravel.d_ms !== "forever") {
      // Convert to microseconds
      return `--timetravel=+${this.currentTimetravel.d_ms * 1000}`;
    }
    return undefined;
  }

  /**
   * Return an empty array if no time travel is set,
   * and an array with the time travel command line argument
   * otherwise.
   */
  private get timetravelArgArr(): string[] {
    const tta = this.timetravelArg;
    if (tta) {
      return [tta];
    }
    return [];
  }

  get port(): number {
    return this.merchantConfig.httpPort;
  }

  get name(): string {
    return this.merchantConfig.name;
  }

  async stop(): Promise<void> {
    const httpd = this.proc;
    if (httpd) {
      httpd.proc.kill("SIGTERM");
      await httpd.wait();
      this.proc = undefined;
    }
  }

  async start(): Promise<void> {
    await exec(`taler-merchant-dbinit -c "${this.configFilename}"`);

    this.proc = this.globalState.spawnService(
      "taler-merchant-httpd",
      [
        "taler-merchant-httpd",
        "-LDEBUG",
        "-c",
        this.configFilename,
        ...this.timetravelArgArr,
      ],
      `merchant-${this.merchantConfig.name}`,
    );
  }

  static async create(
    gc: GlobalTestState,
    mc: MerchantConfig,
  ): Promise<MerchantService> {
    const config = new Configuration();
    config.setString("taler", "currency", mc.currency);

    const cfgFilename = gc.testDir + `/merchant-${mc.name}.conf`;
    setTalerPaths(config, gc.testDir + "/talerhome");
    config.setString("merchant", "serve", "tcp");
    config.setString("merchant", "port", `${mc.httpPort}`);
    config.setString(
      "merchant",
      "keyfile",
      "${TALER_DATA_HOME}/merchant/merchant.priv",
    );
    config.setString("merchantdb-postgres", "config", mc.database);
    config.write(cfgFilename);

    return new MerchantService(gc, mc, cfgFilename);
  }

  addExchange(e: ExchangeServiceInterface): void {
    const config = Configuration.load(this.configFilename);
    config.setString(
      `merchant-exchange-${e.name}`,
      "exchange_base_url",
      e.baseUrl,
    );
    config.setString(
      `merchant-exchange-${e.name}`,
      "currency",
      this.merchantConfig.currency,
    );
    config.setString(`merchant-exchange-${e.name}`, "master_key", e.masterPub);
    config.write(this.configFilename);
  }

  async addDefaultInstance(): Promise<void> {
    return await this.addInstance({
      id: "default",
      name: "Default Instance",
      paytoUris: [getPayto("merchant-default")],
      auth: {
        method: "external",
      },
    });
  }

  async addInstance(
    instanceConfig: PartialMerchantInstanceConfig,
  ): Promise<void> {
    if (!this.proc) {
      throw Error("merchant must be running to add instance");
    }
    logger.info("adding instance");
    const url = `http://localhost:${this.merchantConfig.httpPort}/management/instances`;
    const auth = instanceConfig.auth ?? { method: "external" };

    const body: MerchantInstanceConfig = {
      auth,
      payto_uris: instanceConfig.paytoUris,
      id: instanceConfig.id,
      name: instanceConfig.name,
      address: instanceConfig.address ?? {},
      jurisdiction: instanceConfig.jurisdiction ?? {},
      default_max_wire_fee:
        instanceConfig.defaultMaxWireFee ??
        `${this.merchantConfig.currency}:1.0`,
      default_wire_fee_amortization:
        instanceConfig.defaultWireFeeAmortization ?? 3,
      default_max_deposit_fee:
        instanceConfig.defaultMaxDepositFee ??
        `${this.merchantConfig.currency}:1.0`,
      default_wire_transfer_delay:
        instanceConfig.defaultWireTransferDelay ??
        Duration.toTalerProtocolDuration(
          Duration.fromSpec({
            days: 1,
          }),
        ),
      default_pay_delay:
        instanceConfig.defaultPayDelay ??
        Duration.toTalerProtocolDuration(Duration.getForever()),
    };
    await axios.post(url, body);
  }

  makeInstanceBaseUrl(instanceName?: string): string {
    if (instanceName === undefined || instanceName === "default") {
      return `http://localhost:${this.merchantConfig.httpPort}/`;
    } else {
      return `http://localhost:${this.merchantConfig.httpPort}/instances/${instanceName}/`;
    }
  }

  async pingUntilAvailable(): Promise<void> {
    const url = `http://localhost:${this.merchantConfig.httpPort}/config`;
    await pingProc(this.proc, url, `merchant (${this.merchantConfig.name})`);
  }
}

export interface MerchantAuthConfiguration {
  method: "external" | "token";
  token?: string;
}

export interface PartialMerchantInstanceConfig {
  auth?: MerchantAuthConfiguration;
  id: string;
  name: string;
  paytoUris: string[];
  address?: unknown;
  jurisdiction?: unknown;
  defaultMaxWireFee?: string;
  defaultMaxDepositFee?: string;
  defaultWireFeeAmortization?: number;
  defaultWireTransferDelay?: TalerProtocolDuration;
  defaultPayDelay?: TalerProtocolDuration;
}

export interface MerchantInstanceConfig {
  auth: MerchantAuthConfiguration;
  id: string;
  name: string;
  payto_uris: string[];
  address: unknown;
  jurisdiction: unknown;
  default_max_wire_fee: string;
  default_max_deposit_fee: string;
  default_wire_fee_amortization: number;
  default_wire_transfer_delay: TalerProtocolDuration;
  default_pay_delay: TalerProtocolDuration;
}

type TestStatus = "pass" | "fail" | "skip";

export interface TestRunResult {
  /**
   * Name of the test.
   */
  name: string;

  /**
   * How long did the test run?
   */
  timeSec: number;

  status: TestStatus;

  reason?: string;
}

export async function runTestWithState(
  gc: GlobalTestState,
  testMain: (t: GlobalTestState) => Promise<void>,
  testName: string,
  linger: boolean = false,
): Promise<TestRunResult> {
  const startMs = new Date().getTime();

  const p = openPromise();
  let status: TestStatus;

  const handleSignal = (s: string) => {
    logger.warn(
      `**** received fatal process event, terminating test ${testName}`,
    );
    gc.shutdownSync();
    process.exit(1);
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
  process.on("unhandledRejection", handleSignal);
  process.on("uncaughtException", handleSignal);

  try {
    logger.info("running test in directory", gc.testDir);
    await Promise.race([testMain(gc), p.promise]);
    status = "pass";
    if (linger) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });
      await new Promise<void>((resolve, reject) => {
        rl.question("Press enter to shut down test.", () => {
          logger.error("Requested shutdown");
          resolve();
        });
      });
      rl.close();
    }
  } catch (e) {
    console.error("FATAL: test failed with exception", e);
    if (e instanceof TalerError) {
      console.error(`error detail: ${j2s(e.errorDetail)}`);
    }
    status = "fail";
  } finally {
    await gc.shutdown();
  }
  const afterMs = new Date().getTime();
  return {
    name: testName,
    timeSec: (afterMs - startMs) / 1000,
    status,
  };
}

function shellWrap(s: string) {
  return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'";
}

export interface WalletCliOpts {
  cryptoWorkerType?: "sync" | "node-worker-thread";
}

export class WalletCli {
  private currentTimetravel: Duration | undefined;
  private _client: WalletCoreApiClient;

  setTimetravel(d: Duration | undefined) {
    this.currentTimetravel = d;
  }

  private get timetravelArg(): string | undefined {
    if (this.currentTimetravel && this.currentTimetravel.d_ms !== "forever") {
      // Convert to microseconds
      return `--timetravel=${this.currentTimetravel.d_ms * 1000}`;
    }
    return undefined;
  }

  constructor(
    private globalTestState: GlobalTestState,
    private name: string = "default",
    cliOpts: WalletCliOpts = {},
  ) {
    const self = this;
    this._client = {
      async call(op: any, payload: any): Promise<any> {
        logger.info(
          `calling wallet with timetravel arg ${j2s(self.timetravelArg)}`,
        );
        const cryptoWorkerArg = cliOpts.cryptoWorkerType
          ? `--crypto-worker=${cliOpts.cryptoWorkerType}`
          : "";
        const resp = await sh(
          self.globalTestState,
          `wallet-${self.name}`,
          `taler-wallet-cli ${
            self.timetravelArg ?? ""
          } ${cryptoWorkerArg} --no-throttle -LTRACE --skip-defaults --wallet-db '${
            self.dbfile
          }' api '${op}' ${shellWrap(JSON.stringify(payload))}`,
        );
        logger.info("--- wallet core response ---");
        logger.info(resp);
        logger.info("--- end of response ---");
        let ar: any;
        try {
          ar = JSON.parse(resp) as CoreApiResponse;
        } catch (e) {
          throw new Error("wallet CLI did not return a proper JSON response");
        }
        if (ar.type === "error") {
          throw TalerError.fromUncheckedDetail(ar.error);
        }
        return ar.result;
      },
    };
  }

  get dbfile(): string {
    return this.globalTestState.testDir + `/walletdb-${this.name}.json`;
  }

  deleteDatabase() {
    fs.unlinkSync(this.dbfile);
  }

  private get timetravelArgArr(): string[] {
    const tta = this.timetravelArg;
    if (tta) {
      return [tta];
    }
    return [];
  }

  get client(): WalletCoreApiClient {
    return this._client;
  }

  async runUntilDone(args: { maxRetries?: number } = {}): Promise<void> {
    await runCommand(
      this.globalTestState,
      `wallet-${this.name}`,
      "taler-wallet-cli",
      [
        "--no-throttle",
        ...this.timetravelArgArr,
        "-LTRACE",
        "--skip-defaults",
        "--wallet-db",
        this.dbfile,
        "run-until-done",
        ...(args.maxRetries ? ["--max-retries", `${args.maxRetries}`] : []),
      ],
    );
  }

  async runPending(): Promise<void> {
    await runCommand(
      this.globalTestState,
      `wallet-${this.name}`,
      "taler-wallet-cli",
      [
        "--no-throttle",
        "--skip-defaults",
        "-LTRACE",
        ...this.timetravelArgArr,
        "--wallet-db",
        this.dbfile,
        "advanced",
        "run-pending",
      ],
    );
  }
}

export function getRandomIban(salt: string | null = null): string {
  function getBban(salt: string | null): string {
    if (!salt) return Math.random().toString().substring(2, 6);
    let hashed = hash(stringToBytes(salt));
    let ret = "";
    for (let i = 0; i < hashed.length; i++) {
      ret += hashed[i].toString();
    }
    return ret.substring(0, 4);
  }

  let cc_no_check = "131400"; // == DE00
  let bban = getBban(salt);
  let check_digits = (
    98 -
    (Number.parseInt(`${bban}${cc_no_check}`) % 97)
  ).toString();
  if (check_digits.length == 1) {
    check_digits = `0${check_digits}`;
  }
  return `DE${check_digits}${bban}`;
}

export function getWireMethodForTest(): string {
  if (useLibeufinBank) return "iban";
  return "x-taler-bank";
}

/**
 * Generate a payto address, whose authority depends
 * on whether the banking is served by euFin or Pybank.
 */
export function getPayto(label: string): string {
  if (useLibeufinBank)
    return `payto://iban/SANDBOXX/${getRandomIban(
      label,
    )}?receiver-name=${label}`;
  return `payto://x-taler-bank/localhost/${label}`;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
