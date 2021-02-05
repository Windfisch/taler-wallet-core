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

/**
 * Imports.
 */
import axios from "axios";
import { URL } from "@gnu-taler/taler-wallet-core";
import {
  GlobalTestState,
  pingProc,
  ProcessWrapper,
  runCommand,
  sh,
} from "./harness";

export interface LibeufinSandboxServiceInterface {
  baseUrl: string;
}

export interface LibeufinNexusServiceInterface {
  baseUrl: string;
}

export interface LibeufinSandboxConfig {
  httpPort: number;
  databaseJdbcUri: string;
}

export interface LibeufinNexusConfig {
  httpPort: number;
  databaseJdbcUri: string;
}

export interface LibeufinCliDetails {
  nexusUrl: string;
  sandboxUrl: string;
  nexusDatabaseUri: string;
  sandboxDatabaseUri: string;
  user: LibeufinNexusUser;
}

export interface LibeufinEbicsSubscriberDetails {
  hostId: string;
  partnerId: string;
  userId: string;
}

export interface LibeufinEbicsConnectionDetails {
  subscriberDetails: LibeufinEbicsSubscriberDetails;
  ebicsUrl: string;
  connectionName: string;
}

export interface LibeufinBankAccountDetails {
  currency: string;
  iban: string;
  bic: string;
  personName: string;
  accountName: string;
}

export interface LibeufinNexusUser {
  username: string;
  password: string;
}

export interface LibeufinBackupFileDetails {
  passphrase: string;
  outputFile: string;
  connectionName: string;
}

export interface LibeufinKeyLetterDetails {
  outputFile: string;
  connectionName: string;
}

export class LibeufinSandboxService implements LibeufinSandboxServiceInterface {
  static async create(
    gc: GlobalTestState,
    sandboxConfig: LibeufinSandboxConfig,
  ): Promise<LibeufinSandboxService> {
    return new LibeufinSandboxService(gc, sandboxConfig);
  }

  sandboxProc: ProcessWrapper | undefined;
  globalTestState: GlobalTestState;

  constructor(
    gc: GlobalTestState,
    private sandboxConfig: LibeufinSandboxConfig,
  ) {
    this.globalTestState = gc;
  }

  get baseUrl(): string {
    return `http://localhost:${this.sandboxConfig.httpPort}/`;
  }

  async start(): Promise<void> {
    this.sandboxProc = this.globalTestState.spawnService(
      "libeufin-sandbox",
      ["serve", "--port", `${this.sandboxConfig.httpPort}`],
      "libeufin-sandbox",
      { ...process.env, LIBEUFIN_SANDBOX_DB_CONNECTION: this.sandboxConfig.databaseJdbcUri },
    );
  }

  async pingUntilAvailable(): Promise<void> {
    const url = `${this.baseUrl}config`;
    await pingProc(this.sandboxProc, url, "libeufin-sandbox");
  }
}

export class LibeufinNexusService {
  static async create(
    gc: GlobalTestState,
    nexusConfig: LibeufinNexusConfig,
  ): Promise<LibeufinNexusService> {
    return new LibeufinNexusService(gc, nexusConfig);
  }

  nexusProc: ProcessWrapper | undefined;
  globalTestState: GlobalTestState;

  constructor(gc: GlobalTestState, private nexusConfig: LibeufinNexusConfig) {
    this.globalTestState = gc;
  }

  get baseUrl(): string {
    return `http://localhost:${this.nexusConfig.httpPort}/`;
  }

  async start(): Promise<void> {
    await runCommand(
      this.globalTestState,
      "libeufin-nexus-superuser",
      "libeufin-nexus",
      ["superuser", "admin", "--password", "test"],
      { ...process.env, LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusConfig.databaseJdbcUri }
    );

    this.nexusProc = this.globalTestState.spawnService(
      "libeufin-nexus",
      ["serve", "--port", `${this.nexusConfig.httpPort}`],
      "libeufin-nexus",
      { ...process.env, LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusConfig.databaseJdbcUri }
    );
  }

  async pingUntilAvailable(): Promise<void> {
    const url = `${this.baseUrl}config`;
    await pingProc(this.nexusProc, url, "libeufin-nexus");
  }

  async createNexusSuperuser(details: LibeufinNexusUser): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-nexus",
      `libeufin-nexus superuser ${details.username} --password=${details.password}`,
      { ...process.env, LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusConfig.databaseJdbcUri }
    );
    console.log(stdout);
  }
}

export interface CreateEbicsSubscriberRequest {
  hostID: string;
  userID: string;
  partnerID: string;
  systemID?: string;
}

interface CreateEbicsBankAccountRequest {
  subscriber: {
    hostID: string;
    partnerID: string;
    userID: string;
    systemID?: string;
  };
  // IBAN
  iban: string;
  // BIC
  bic: string;
  // human name
  name: string;
  currency: string;
  label: string;
}

export interface SimulateIncomingTransactionRequest {
  debtorIban: string;
  debtorBic: string;
  debtorName: string;

  /**
   * Subject / unstructured remittance info.
   */
  subject: string;

  /**
   * Decimal amount without currency.
   */
  amount: string;
  currency: string;
}

export class LibeufinCli {
  cliDetails: LibeufinCliDetails;
  globalTestState: GlobalTestState;

  constructor(gc: GlobalTestState, cd: LibeufinCliDetails) {
    this.globalTestState = gc;
    this.cliDetails = cd;
  }

  async checkSandbox(): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-checksandbox",
      "libeufin-cli sandbox check",
      { ...process.env, LIBEUFIN_SANDBOX_URL: this.cliDetails.sandboxUrl },
    );
    console.log(stdout);
  }

  async createEbicsHost(hostId: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-createebicshost",
      `libeufin-cli sandbox ebicshost create --host-id=${hostId}`,
      { ...process.env, LIBEUFIN_SANDBOX_URL: this.cliDetails.sandboxUrl },
    );
    console.log(stdout);
  }

  async createEbicsSubscriber(
    details: LibeufinEbicsSubscriberDetails,
  ): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-createebicssubscriber",
      "libeufin-cli sandbox ebicssubscriber create" +
        ` --host-id=${details.hostId}` +
        ` --partner-id=${details.partnerId}` +
        ` --user-id=${details.userId}`,
      { ...process.env, LIBEUFIN_SANDBOX_URL: this.cliDetails.sandboxUrl },
    );
    console.log(stdout);
  }

  async createEbicsBankAccount(
    sd: LibeufinEbicsSubscriberDetails,
    bankAccountDetails: LibeufinBankAccountDetails,
  ): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-createebicsbankaccount",
      "libeufin-cli sandbox ebicsbankaccount create" +
        ` --currency=${bankAccountDetails.currency}` +
        ` --iban=${bankAccountDetails.iban}` +
        ` --bic=${bankAccountDetails.bic}` +
        ` --person-name='${bankAccountDetails.personName}'` +
        ` --account-name=${bankAccountDetails.accountName}` +
        ` --ebics-host-id=${sd.hostId}` +
        ` --ebics-partner-id=${sd.partnerId}` +
        ` --ebics-user-id=${sd.userId}`,
      { ...process.env, LIBEUFIN_SANDBOX_URL: this.cliDetails.sandboxUrl },
    );
    console.log(stdout);
  }

  async generateTransactions(accountName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-generatetransactions",
      `libeufin-cli sandbox bankaccount generate-transactions ${accountName}`,
      { ...process.env, LIBEUFIN_SANDBOX_URL: this.cliDetails.sandboxUrl },
    );
    console.log(stdout);
  }

  async showSandboxTransactions(accountName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-showsandboxtransactions",
      `libeufin-cli sandbox bankaccount transactions ${accountName}`,
      { ...process.env, LIBEUFIN_SANDBOX_URL: this.cliDetails.sandboxUrl },
    );
    console.log(stdout);
  }

  async createEbicsConnection(
    connectionDetails: LibeufinEbicsConnectionDetails,
  ): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-createebicsconnection",
      `libeufin-cli connections new-ebics-connection` +
        ` --ebics-url=${connectionDetails.ebicsUrl}` +
        ` --host-id=${connectionDetails.subscriberDetails.hostId}` +
        ` --partner-id=${connectionDetails.subscriberDetails.partnerId}` +
        ` --ebics-user-id=${connectionDetails.subscriberDetails.partnerId}` +
        ` ${connectionDetails.connectionName}`, {
          ...process.env, LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
          LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
          LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async createBackupFile(details: LibeufinBackupFileDetails): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-createbackupfile",
      `libeufin-cli connections export-backup` +
        ` --passphrase=${details.passphrase}` +
        ` --output-file=${details.outputFile}` +
        ` ${details.connectionName}`, {
          ...process.env, LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
          LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
          LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async createKeyLetter(details: LibeufinKeyLetterDetails): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-createkeyletter",
      `libeufin-cli connections get-key-letter` +
        ` ${details.connectionName} ${details.outputFile}`, {
          ...process.env, LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
          LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
          LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }
}

export namespace LibeufinSandboxApi {
  export async function createEbicsHost(
    libeufinSandboxService: LibeufinSandboxServiceInterface,
    hostID: string,
  ) {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL("admin/ebics/hosts", baseUrl);
    await axios.post(url.href, {
      hostID,
      ebicsVersion: "2.5",
    });
  }

  export async function createEbicsSubscriber(
    libeufinSandboxService: LibeufinSandboxServiceInterface,
    req: CreateEbicsSubscriberRequest,
  ) {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL("admin/ebics/subscribers", baseUrl);
    await axios.post(url.href, req);
  }

  export async function createEbicsBankAccount(
    libeufinSandboxService: LibeufinSandboxServiceInterface,
    req: CreateEbicsBankAccountRequest,
  ) {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL("admin/ebics/bank-accounts", baseUrl);
    await axios.post(url.href, req);
  }

  export async function simulateIncomingTransaction(
    libeufinSandboxService: LibeufinSandboxServiceInterface,
    accountLabel: string,
    req: SimulateIncomingTransactionRequest,
  ) {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL(
      `admin/bank-accounts/${accountLabel}/simulate-incoming-transaction`,
      baseUrl,
    );
    await axios.post(url.href, req);
  }

  export async function getAccountTransactions(
    libeufinSandboxService: LibeufinSandboxServiceInterface,
    accountLabel: string,
  ): Promise<SandboxAccountTransactions> {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL(
      `admin/bank-accounts/${accountLabel}/transactions`,
      baseUrl,
    );
    const res = await axios.get(url.href);
    return res.data as SandboxAccountTransactions;
  }
}

export interface SandboxAccountTransactions {
  payments: {
    accountLabel: string;
    creditorIban: string;
    creditorBic?: string;
    creditorName: string;
    debtorIban: string;
    debtorBic: string;
    debtorName: string;
    amount: string;
    currency: string;
    subject: string;
    date: string;
    creditDebitIndicator: "debit" | "credit";
    accountServicerReference: string;
  }[];
}

export interface CreateEbicsBankConnectionRequest {
  name: string;
  ebicsURL: string;
  hostID: string;
  userID: string;
  partnerID: string;
  systemID?: string;
}

export interface CreateTalerWireGatewayFacadeRequest {
  name: string;
  connectionName: string;
  accountName: string;
  currency: string;
  reserveTransferLevel: "report" | "statement" | "notification";
}

export interface CreateNexusUserRequest {
  username: string;
  password: string;
}

export interface PostNexusPermissionRequest {
  action: "revoke" | "grant";
  permission: {
    subjectType: string;
    subjectId: string;
    resourceType: string;
    resourceId: string;
    permissionName: string;
  };
}

export namespace LibeufinNexusApi {
  export async function createEbicsBankConnection(
    libeufinNexusService: LibeufinNexusServiceInterface,
    req: CreateEbicsBankConnectionRequest,
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL("bank-connections", baseUrl);
    await axios.post(
      url.href,
      {
        source: "new",
        type: "ebics",
        name: req.name,
        data: {
          ebicsURL: req.ebicsURL,
          hostID: req.hostID,
          userID: req.userID,
          partnerID: req.partnerID,
          systemID: req.systemID,
        },
      },
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }

  export async function fetchAccounts(
    libeufinNexusService: LibeufinNexusServiceInterface,
    connectionName: string,
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `bank-connections/${connectionName}/fetch-accounts`,
      baseUrl,
    );
    await axios.post(
      url.href,
      {},
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }

  export async function importConnectionAccount(
    libeufinNexusService: LibeufinNexusServiceInterface,
    connectionName: string,
    offeredAccountId: string,
    nexusBankAccountId: string,
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `bank-connections/${connectionName}/import-account`,
      baseUrl,
    );
    await axios.post(
      url.href,
      {
        offeredAccountId,
        nexusBankAccountId,
      },
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }

  export async function connectBankConnection(
    libeufinNexusService: LibeufinNexusServiceInterface,
    connectionName: string,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`bank-connections/${connectionName}/connect`, baseUrl);
    await axios.post(
      url.href,
      {},
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }

  export async function fetchAllTransactions(
    libeufinNexusService: LibeufinNexusService,
    accountName: string,
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `/bank-accounts/${accountName}/fetch-transactions`,
      baseUrl,
    );
    await axios.post(
      url.href,
      {
        rangeType: "all",
        level: "report",
      },
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }

  export async function createUser(
    libeufinNexusService: LibeufinNexusServiceInterface,
    req: CreateNexusUserRequest,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/users`, baseUrl);
    await axios.post(url.href, req, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

  export async function postPermission(
    libeufinNexusService: LibeufinNexusServiceInterface,
    req: PostNexusPermissionRequest,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/permissions`, baseUrl);
    await axios.post(url.href, req, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

  export async function createTwgFacade(
    libeufinNexusService: LibeufinNexusServiceInterface,
    req: CreateTalerWireGatewayFacadeRequest,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL("facades", baseUrl);
    await axios.post(
      url.href,
      {
        name: req.name,
        type: "taler-wire-gateway",
        config: {
          bankAccount: req.accountName,
          bankConnection: req.connectionName,
          currency: req.currency,
          reserveTransferLevel: req.reserveTransferLevel,
        },
      },
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }

  export async function submitAllPaymentInitiations(
    libeufinNexusService: LibeufinNexusServiceInterface,
    accountId: string,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `/bank-accounts/${accountId}/submit-all-payment-initiations`,
      baseUrl,
    );
    await axios.post(
      url.href,
      {},
      {
        auth: {
          username: "admin",
          password: "test",
        },
      },
    );
  }
}
