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

/**
 * Imports
 */
import * as util from "util";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { deepStrictEqual } from "assert";
import { ChildProcess, spawn } from "child_process";
import { URL } from "url";
import axios, { AxiosError } from "axios";
import {
  codecForMerchantOrderPrivateStatusResponse,
  codecForPostOrderResponse,
  PostOrderRequest,
  PostOrderResponse,
  MerchantOrderPrivateStatusResponse,
  TippingReserveStatus,
  TipCreateConfirmation,
  TipCreateRequest,
  MerchantInstancesResponse,
} from "./merchantApiTypes";
import {
  createEddsaKeyPair,
  eddsaGetPublic,
  EddsaKeyPair,
  encodeCrock,
  getRandomBytes,
  openPromise,
  OperationFailedError,
  WalletApiOperation,
  WalletCoreApiClient,
} from "@gnu-taler/taler-wallet-core";
import {
  AmountJson,
  Amounts,
  Configuration,
  AmountString,
  Codec,
  buildCodecForObject,
  codecForString,
  Duration,
  parsePaytoUri,
  CoreApiResponse,
  ApplyRefundRequest,
  ApplyRefundResponse,
  codecForApplyRefundResponse,
  PreparePayRequest,
  PreparePayResult,
  codecForPreparePayResult,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  AbortPayWithRefundRequest,
  ConfirmPayRequest,
  ConfirmPayResult,
  codecForConfirmPayResult,
  PrepareTipRequest,
  PrepareTipResult,
  codecForPrepareTipResult,
  AcceptTipRequest,
  CoinDumpJson,
  codecForAny,
  AddExchangeRequest,
  ForceExchangeUpdateRequest,
  ForceRefreshRequest,
  ExchangesListRespose,
  codecForExchangesListResponse,
  BalancesResponse,
  codecForBalancesResponse,
  TransactionsResponse,
  codecForTransactionsResponse,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
  IntegrationTestArgs,
  TestPayArgs,
  WithdrawTestBalanceRequest,
  GetWithdrawalDetailsForUriRequest,
  WithdrawUriInfoResponse,
  codecForWithdrawUriInfoResponse,
  BackupRecovery,
  RecoveryLoadRequest,
} from "@gnu-taler/taler-util";
import {
  AddBackupProviderRequest,
  BackupInfo,
} from "@gnu-taler/taler-wallet-core/src/operations/backup";
import { PendingOperationsResponse } from "@gnu-taler/taler-wallet-core/src/pending-types";
import { CoinConfig } from "./denomStructures.js";

const exec = util.promisify(require("child_process").exec);

export async function delayMs(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms);
  });
}

export interface WithAuthorization {
  Authorization?: string,
} ;

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
  console.log("running command", command);
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
      console.log(`child process exited (${code} / ${signal})`);
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
  console.log("running command", shellescape([command, ...args]));
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
      console.log(`child process exited (${code} / ${signal})`);
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

  async assertThrowsOperationErrorAsync(
    block: () => Promise<void>,
  ): Promise<OperationFailedError> {
    try {
      await block();
    } catch (e) {
      if (e instanceof OperationFailedError) {
        return e;
      }
      throw Error(`expected OperationFailedError to be thrown, but got ${e}`);
    }
    throw Error(
      `expected OperationFailedError to be thrown, but block finished without throwing`,
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
    console.log(
      `spawning process (${logName}): ${shellescape([command, ...args])}`,
    );
    const proc = spawn(command, args, {
      stdio: ["inherit", "pipe", "pipe"],
      env: env,
    });
    console.log(`spawned process (${logName}) with pid ${proc.pid}`);
    proc.on("error", (err) => {
      console.log(`could not start process (${command})`, err);
    });
    proc.on("exit", (code, signal) => {
      console.log(`process ${logName} exited`);
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
      console.log("refusing to shut down, lingering was requested");
      return;
    }
    this.inShutdown = true;
    console.log("shutting down");
    for (const s of this.servers) {
      s.close();
      s.removeAllListeners();
    }
    for (const p of this.procs) {
      if (p.proc.exitCode == null) {
        console.log("killing process", p.proc.pid);
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
  config.setString(s, "rsa_keysize", `${c.rsaKeySize}`);
}

/**
 * Send an HTTP request until it succeeds or the
 * process dies.
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
      console.log(`pinging ${serviceName}`);
      const resp = await axios.get(url);
      console.log(`service ${serviceName} available`);
      return;
    } catch (e) {
      console.log(`service ${serviceName} not ready:`, e.toString());
      await delayMs(1000);
    }
    if (!proc || proc.proc.exitCode !== null) {
      throw Error(`service process ${serviceName} stopped unexpectedly`);
    }
  }
}

export interface HarnessExchangeBankAccount {
  accountName: string;
  accountPassword: string;
  accountPaytoUri: string;
  wireGatewayApiBaseUrl: string;
}

export interface BankServiceInterface {
  readonly baseUrl: string;
  readonly port: number;
}

export enum CreditDebitIndicator {
  Credit = "credit",
  Debit = "debit",
}

export interface BankAccountBalanceResponse {
  balance: {
    amount: AmountString;
    credit_debit_indicator: CreditDebitIndicator;
  };
}

export namespace BankAccessApi {
  export async function getAccountBalance(
    bank: BankServiceInterface,
    bankUser: BankUser,
  ): Promise<BankAccountBalanceResponse> {
    const url = new URL(`accounts/${bankUser.username}`, bank.baseUrl);
    const resp = await axios.get(url.href, {
      auth: bankUser,
    });
    return resp.data;
  }

  export async function createWithdrawalOperation(
    bank: BankServiceInterface,
    bankUser: BankUser,
    amount: string,
  ): Promise<WithdrawalOperationInfo> {
    const url = new URL(
      `accounts/${bankUser.username}/withdrawals`,
      bank.baseUrl,
    );
    const resp = await axios.post(
      url.href,
      {
        amount,
      },
      {
        auth: bankUser,
      },
    );
    return codecForWithdrawalOperationInfo().decode(resp.data);
  }
}

export namespace BankApi {
  export async function registerAccount(
    bank: BankServiceInterface,
    username: string,
    password: string,
  ): Promise<BankUser> {
    const url = new URL("testing/register", bank.baseUrl);
    await axios.post(url.href, {
      username,
      password,
    });
    return {
      password,
      username,
      accountPaytoUri: `payto://x-taler-bank/localhost/${username}`,
    };
  }

  export async function createRandomBankUser(
    bank: BankServiceInterface,
  ): Promise<BankUser> {
    const username = "user-" + encodeCrock(getRandomBytes(10));
    const password = "pw-" + encodeCrock(getRandomBytes(10));
    return await registerAccount(bank, username, password);
  }

  export async function adminAddIncoming(
    bank: BankServiceInterface,
    params: {
      exchangeBankAccount: HarnessExchangeBankAccount;
      amount: string;
      reservePub: string;
      debitAccountPayto: string;
    },
  ) {
    const url = new URL(
      `taler-wire-gateway/${params.exchangeBankAccount.accountName}/admin/add-incoming`,
      bank.baseUrl,
    );
    await axios.post(
      url.href,
      {
        amount: params.amount,
        reserve_pub: params.reservePub,
        debit_account: params.debitAccountPayto,
      },
      {
        auth: {
          username: params.exchangeBankAccount.accountName,
          password: params.exchangeBankAccount.accountPassword,
        },
      },
    );
  }

  export async function confirmWithdrawalOperation(
    bank: BankServiceInterface,
    bankUser: BankUser,
    wopi: WithdrawalOperationInfo,
  ): Promise<void> {
    const url = new URL(
      `accounts/${bankUser.username}/withdrawals/${wopi.withdrawal_id}/confirm`,
      bank.baseUrl,
    );
    await axios.post(
      url.href,
      {},
      {
        auth: bankUser,
      },
    );
  }

  export async function abortWithdrawalOperation(
    bank: BankServiceInterface,
    bankUser: BankUser,
    wopi: WithdrawalOperationInfo,
  ): Promise<void> {
    const url = new URL(
      `accounts/${bankUser.username}/withdrawals/${wopi.withdrawal_id}/abort`,
      bank.baseUrl,
    );
    await axios.post(
      url.href,
      {},
      {
        auth: bankUser,
      },
    );
  }
}

export class BankService implements BankServiceInterface {
  proc: ProcessWrapper | undefined;

  static fromExistingConfig(gc: GlobalTestState): BankService {
    const cfgFilename = gc.testDir + "/bank.conf";
    console.log("reading bank config from", cfgFilename);
    const config = Configuration.load(cfgFilename);
    const bc: BankConfig = {
      allowRegistrations: config
        .getYesNo("bank", "allow_registrations")
        .required(),
      currency: config.getString("taler", "currency").required(),
      database: config.getString("bank", "database").required(),
      httpPort: config.getNumber("bank", "http_port").required(),
    };
    return new BankService(gc, bc, cfgFilename);
  }

  static async create(
    gc: GlobalTestState,
    bc: BankConfig,
  ): Promise<BankService> {
    const config = new Configuration();
    setTalerPaths(config, gc.testDir + "/talerhome");
    config.setString("taler", "currency", bc.currency);
    config.setString("bank", "database", bc.database);
    config.setString("bank", "http_port", `${bc.httpPort}`);
    config.setString("bank", "serve", "http");
    config.setString("bank", "max_debt_bank", `${bc.currency}:999999`);
    config.setString("bank", "max_debt", bc.maxDebt ?? `${bc.currency}:100`);
    config.setString(
      "bank",
      "allow_registrations",
      bc.allowRegistrations ? "yes" : "no",
    );
    const cfgFilename = gc.testDir + "/bank.conf";
    config.write(cfgFilename);

    await sh(
      gc,
      "taler-bank-manage_django",
      `taler-bank-manage -c '${cfgFilename}' django migrate`,
    );
    await sh(
      gc,
      "taler-bank-manage_django",
      `taler-bank-manage -c '${cfgFilename}' django provide_accounts`,
    );

    return new BankService(gc, bc, cfgFilename);
  }

  setSuggestedExchange(e: ExchangeServiceInterface, exchangePayto: string) {
    const config = Configuration.load(this.configFile);
    config.setString("bank", "suggested_exchange", e.baseUrl);
    config.setString("bank", "suggested_exchange_payto", exchangePayto);
  }

  get baseUrl(): string {
    return `http://localhost:${this.bankConfig.httpPort}/`;
  }

  async createExchangeAccount(
    accountName: string,
    password: string,
  ): Promise<HarnessExchangeBankAccount> {
    await sh(
      this.globalTestState,
      "taler-bank-manage_django",
      `taler-bank-manage -c '${this.configFile}' django add_bank_account ${accountName}`,
    );
    await sh(
      this.globalTestState,
      "taler-bank-manage_django",
      `taler-bank-manage -c '${this.configFile}' django changepassword_unsafe ${accountName} ${password}`,
    );
    await sh(
      this.globalTestState,
      "taler-bank-manage_django",
      `taler-bank-manage -c '${this.configFile}' django top_up ${accountName} ${this.bankConfig.currency}:100000`,
    );
    return {
      accountName: accountName,
      accountPassword: password,
      accountPaytoUri: `payto://x-taler-bank/${accountName}`,
      wireGatewayApiBaseUrl: `http://localhost:${this.bankConfig.httpPort}/taler-wire-gateway/${accountName}/`,
    };
  }

  get port() {
    return this.bankConfig.httpPort;
  }

  private constructor(
    private globalTestState: GlobalTestState,
    private bankConfig: BankConfig,
    private configFile: string,
  ) {}

  async start(): Promise<void> {
    this.proc = this.globalTestState.spawnService(
      "taler-bank-manage",
      ["-c", this.configFile, "serve"],
      "bank",
    );
  }

  async pingUntilAvailable(): Promise<void> {
    const url = `http://localhost:${this.bankConfig.httpPort}/config`;
    await pingProc(this.proc, url, "bank");
  }
}

export interface BankUser {
  username: string;
  password: string;
  accountPaytoUri: string;
}

export interface WithdrawalOperationInfo {
  withdrawal_id: string;
  taler_withdraw_uri: string;
}

const codecForWithdrawalOperationInfo = (): Codec<WithdrawalOperationInfo> =>
  buildCodecForObject<WithdrawalOperationInfo>()
    .property("withdrawal_id", codecForString())
    .property("taler_withdraw_uri", codecForString())
    .build("WithdrawalOperationInfo");

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
    await runCommand(
      this.globalState,
      `exchange-${this.name}-wirewatch-once`,
      "taler-exchange-wirewatch",
      [...this.timetravelArgArr, "-c", this.configFilename, "-t"],
    );
  }

  async runAggregatorOnce() {
    await runCommand(
      this.globalState,
      `exchange-${this.name}-aggregator-once`,
      "taler-exchange-aggregator",
      [...this.timetravelArgArr, "-c", this.configFilename, "-t"],
    );
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
      "keydir",
      "${TALER_DATA_HOME}/exchange/live-keys/",
    );
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
      `exchange-account-${localName}`,
      "wire_gateway_url",
      exchangeBankAccount.wireGatewayApiBaseUrl,
    );
    config.setString(
      `exchange-account-${localName}`,
      "wire_gateway_auth_method",
      "basic",
    );
    config.setString(
      `exchange-account-${localName}`,
      "username",
      exchangeBankAccount.accountName,
    );
    config.setString(
      `exchange-account-${localName}`,
      "password",
      exchangeBankAccount.accountPassword,
    );
    config.write(this.configFilename);
  }

  exchangeHttpProc: ProcessWrapper | undefined;
  exchangeWirewatchProc: ProcessWrapper | undefined;

  helperCryptoRsaProc: ProcessWrapper | undefined;
  helperCryptoEddsaProc: ProcessWrapper | undefined;

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
      if (sectionName.startsWith("exchange-account")) {
        const paytoUri = config.getString(sectionName, "payto_uri").required();
        const p = parsePaytoUri(paytoUri);
        if (!p) {
          throw Error(`invalid payto uri in exchange config: ${paytoUri}`);
        }
        accountTargetTypes.add(p?.targetType);
        accounts.push(paytoUri);
      }
    }

    console.log("configuring bank accounts", accounts);

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
            "upload",
          ],
        );
      }
    }
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

  async start(): Promise<void> {
    if (this.isRunning()) {
      throw Error("exchange is already running");
    }
    await sh(
      this.globalState,
      "exchange-dbinit",
      `taler-exchange-dbinit -r -c "${this.configFilename}"`,
    );

    this.helperCryptoEddsaProc = this.globalState.spawnService(
      "taler-exchange-secmod-eddsa",
      ["-c", this.configFilename, "-LDEBUG", ...this.timetravelArgArr],
      `exchange-crypto-eddsa-${this.name}`,
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
      [
        "-c",
        this.configFilename,
        "--num-threads",
        "1",
        ...this.timetravelArgArr,
      ],
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
    const baseUrl = this.baseUrl;
    const url = new URL("private/auth", baseUrl);
    await axios.post(url.href, auth, {
      headers: this.makeAuthHeader(),
    });
  }

  async deleteInstance(instanceId: string) {
    const baseUrl = this.baseUrl;
    const url = new URL(`private/instances/${instanceId}`, this.baseUrl);
    await axios.delete(url.href, {
      headers: this.makeAuthHeader(),
    });
  }

  async createInstance(req: MerchantInstanceConfig): Promise<void> {
    const baseUrl = this.baseUrl;
    const url = new URL("private/instances", baseUrl);
    await axios.post(url.href, req, {
      headers: this.makeAuthHeader(),
    });
  }

  async getInstances(): Promise<MerchantInstancesResponse> {
    const url = new URL("private/instances", this.baseUrl);
    const resp = await axios.get(url.href, {
      headers: this.makeAuthHeader(),
    });
    return resp.data;
  }

  async getInstanceFullDetails(instanceId: string): Promise<any> {
    const url = new URL(`private/instances/${instanceId}`, this.baseUrl);
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
    const resp = await axios.post(url.href, req, { headers: withAuthorization });
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
    const resp = await axios.get(reqUrl.href, { headers: withAuthorization });
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
    await exec(`taler-merchant-dbinit -r -c "${this.configFilename}"`);

    this.proc = this.globalState.spawnService(
      "taler-merchant-httpd",
      ["-LDEBUG", "-c", this.configFilename, ...this.timetravelArgArr],
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

  async addInstance(
    instanceConfig: PartialMerchantInstanceConfig,
  ): Promise<void> {
    if (!this.proc) {
      throw Error("merchant must be running to add instance");
    }
    console.log("adding instance");
    const url = `http://localhost:${this.merchantConfig.httpPort}/private/instances`;
    const auth = instanceConfig.auth ?? { method: "external" };
    await axios.post(url, {
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
      default_wire_transfer_delay: instanceConfig.defaultWireTransferDelay ?? {
        d_ms: "forever",
      },
      default_pay_delay: instanceConfig.defaultPayDelay ?? { d_ms: "forever" },
    });
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
  defaultWireTransferDelay?: Duration;
  defaultPayDelay?: Duration;
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
  default_wire_transfer_delay: Duration;
  default_pay_delay: Duration;
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
): Promise<TestRunResult> {
  const startMs = new Date().getTime();

  const p = openPromise();
  let status: TestStatus;

  const handleSignal = (s: string) => {
    console.warn(
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
    console.log("running test in directory", gc.testDir);
    await Promise.race([testMain(gc), p.promise]);
    status = "pass";
  } catch (e) {
    console.error("FATAL: test failed with exception", e);
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
  ) {
    const self = this;
    this._client = {
      async call(op: any, payload: any): Promise<any> {
        const resp = await sh(
          self.globalTestState,
          `wallet-${self.name}`,
          `taler-wallet-cli ${
            self.timetravelArg ?? ""
          } --no-throttle --wallet-db '${self.dbfile}' api '${op}' ${shellWrap(
            JSON.stringify(payload),
          )}`,
        );
        console.log(resp);
        const ar = JSON.parse(resp) as CoreApiResponse;
        if (ar.type === "error") {
          throw new OperationFailedError(ar.error);
        } else {
          return ar.result;
        }
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
        ...this.timetravelArgArr,
        "--wallet-db",
        this.dbfile,
        "run-pending",
      ],
    );
  }
}
