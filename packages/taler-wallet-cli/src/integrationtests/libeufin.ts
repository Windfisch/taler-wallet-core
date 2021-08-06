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
import { URL } from "@gnu-taler/taler-util";
import { getRandomIban, getRandomString } from "./helpers";
import {
  GlobalTestState,
  DbInfo,
  pingProc,
  ProcessWrapper,
  runCommand,
  setupDb,
  sh,
} from "./harness";

export interface LibeufinSandboxServiceInterface {
  baseUrl: string;
}

export interface LibeufinNexusServiceInterface {
  baseUrl: string;
}

export interface LibeufinServices {
  libeufinSandbox: LibeufinSandboxService;
  libeufinNexus: LibeufinNexusService;
  commonDb: DbInfo;
}

export interface LibeufinSandboxConfig {
  httpPort: number;
  databaseJdbcUri: string;
}

export interface LibeufinNexusConfig {
  httpPort: number;
  databaseJdbcUri: string;
}

export interface DeleteBankConnectionRequest {
  bankConnectionId: string;
}

interface LibeufinNexusMoneyMovement {
  amount: string;
  creditDebitIndicator: string;
  details: {
    debtor: {
      name: string;
    };
    debtorAccount: {
      iban: string;
    };
    debtorAgent: {
      bic: string;
    };
    creditor: {
      name: string;
    };
    creditorAccount: {
      iban: string;
    };
    creditorAgent: {
      bic: string;
    };
    endToEndId: string;
    unstructuredRemittanceInformation: string;
  };
}

interface LibeufinNexusBatches {
  batchTransactions: Array<LibeufinNexusMoneyMovement>;
}

interface LibeufinNexusTransaction {
  amount: string;
  creditDebitIndicator: string;
  status: string;
  bankTransactionCode: string;
  valueDate: string;
  bookingDate: string;
  accountServicerRef: string;
  batches: Array<LibeufinNexusBatches>;
}

interface LibeufinNexusTransactions {
  transactions: Array<LibeufinNexusTransaction>;
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

export interface LibeufinBankAccountImportDetails {
  offeredBankAccountName: string;
  nexusBankAccountName: string;
  connectionName: string;
}

export interface LibeufinPreparedPaymentDetails {
  creditorIban: string;
  creditorBic: string;
  creditorName: string;
  subject: string;
  amount: string;
  currency: string;
  nexusBankAccountName: string;
}

export interface LibeufinSandboxAddIncomingRequest {
  creditorIban: string;
  creditorBic: string;
  creditorName: string;
  debtorIban: string;
  debtorBic: string;
  debtorName: string;
  subject: string;
  amount: string;
  currency: string;
  uid: string;
  direction: string;
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
    const stdout = await sh(
      this.globalTestState,
      "libeufin-sandbox-config",
      "libeufin-sandbox config localhost",
      {
        ...process.env,
        LIBEUFIN_SANDBOX_DB_CONNECTION: this.sandboxConfig.databaseJdbcUri,
      },
    );
    this.sandboxProc = this.globalTestState.spawnService(
      "libeufin-sandbox",
      ["serve", "--port", `${this.sandboxConfig.httpPort}`],
      "libeufin-sandbox",
      {
        ...process.env,
        LIBEUFIN_SANDBOX_DB_CONNECTION: this.sandboxConfig.databaseJdbcUri,
      },
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
      {
        ...process.env,
        LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusConfig.databaseJdbcUri,
      },
    );

    this.nexusProc = this.globalTestState.spawnService(
      "libeufin-nexus",
      ["serve", "--port", `${this.nexusConfig.httpPort}`],
      "libeufin-nexus",
      {
        ...process.env,
        LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusConfig.databaseJdbcUri,
      },
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
      {
        ...process.env,
        LIBEUFIN_NEXUS_DB_CONNECTION: this.nexusConfig.databaseJdbcUri,
      },
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

export interface TwgAddIncomingRequest {
  amount: string;
  reserve_pub: string;
  debit_account: string;
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
}

/**
 * The bundle aims at minimizing the amount of input
 * data that is required to initialize a new user + Ebics
 * connection.
 */
export class NexusUserBundle {
  userReq: CreateNexusUserRequest;
  connReq: CreateEbicsBankConnectionRequest;
  twgReq: CreateTalerWireGatewayFacadeRequest;
  twgTransferPermission: PostNexusPermissionRequest;
  twgHistoryPermission: PostNexusPermissionRequest;
  twgAddIncomingPermission: PostNexusPermissionRequest;
  localAccountName: string;
  remoteAccountName: string;

  constructor(salt: string, ebicsURL: string) {
    this.userReq = {
      username: `username-${salt}`,
      password: `password-${salt}`,
    };

    this.connReq = {
      name: `connection-${salt}`,
      ebicsURL: ebicsURL,
      hostID: `ebicshost,${salt}`,
      partnerID: `ebicspartner,${salt}`,
      userID: `ebicsuser,${salt}`,
    };

    this.twgReq = {
      currency: "EUR",
      name: `twg-${salt}`,
      reserveTransferLevel: "report",
      accountName: `local-account-${salt}`,
      connectionName: `connection-${salt}`,
    };
    this.remoteAccountName = `remote-account-${salt}`;
    this.localAccountName = `local-account-${salt}`;
    this.twgTransferPermission = {
      action: "grant",
      permission: {
        subjectId: `username-${salt}`,
        subjectType: "user",
        resourceType: "facade",
        resourceId: `twg-${salt}`,
        permissionName: "facade.talerWireGateway.transfer",
      },
    };
    this.twgHistoryPermission = {
      action: "grant",
      permission: {
        subjectId: `username-${salt}`,
        subjectType: "user",
        resourceType: "facade",
        resourceId: `twg-${salt}`,
        permissionName: "facade.talerWireGateway.history",
      },
    };
  }
}

/**
 * The bundle aims at minimizing the amount of input
 * data that is required to initialize a new Sandbox
 * customer, associating their bank account with a Ebics
 * subscriber.
 */
export class SandboxUserBundle {
  ebicsBankAccount: CreateEbicsBankAccountRequest;
  constructor(salt: string) {
    this.ebicsBankAccount = {
      currency: "EUR",
      bic: "BELADEBEXXX",
      iban: getRandomIban("DE"),
      label: `remote-account-${salt}`,
      name: `Taler Exchange: ${salt}`,
      subscriber: {
        hostID: `ebicshost,${salt}`,
        partnerID: `ebicspartner,${salt}`,
        userID: `ebicsuser,${salt}`,
      },
    };
  }
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
        ` --ebics-user-id=${connectionDetails.subscriberDetails.userId}` +
        ` ${connectionDetails.connectionName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
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
        ` ${details.connectionName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
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
        ` ${details.connectionName} ${details.outputFile}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async connect(connectionName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-connect",
      `libeufin-cli connections connect ${connectionName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async downloadBankAccounts(connectionName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-downloadbankaccounts",
      `libeufin-cli connections download-bank-accounts ${connectionName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async listOfferedBankAccounts(connectionName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-listofferedbankaccounts",
      `libeufin-cli connections list-offered-bank-accounts ${connectionName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async importBankAccount(
    importDetails: LibeufinBankAccountImportDetails,
  ): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-importbankaccount",
      "libeufin-cli connections import-bank-account" +
        ` --offered-account-id=${importDetails.offeredBankAccountName}` +
        ` --nexus-bank-account-id=${importDetails.nexusBankAccountName}` +
        ` ${importDetails.connectionName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async fetchTransactions(bankAccountName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-fetchtransactions",
      `libeufin-cli accounts fetch-transactions ${bankAccountName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async transactions(bankAccountName: string): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-transactions",
      `libeufin-cli accounts transactions ${bankAccountName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async preparePayment(details: LibeufinPreparedPaymentDetails): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-preparepayment",
      `libeufin-cli accounts prepare-payment` +
        ` --creditor-iban=${details.creditorIban}` +
        ` --creditor-bic=${details.creditorBic}` +
        ` --creditor-name='${details.creditorName}'` +
        ` --payment-subject='${details.subject}'` +
        ` --payment-amount=${details.currency}:${details.amount}` +
        ` ${details.nexusBankAccountName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async submitPayment(
    details: LibeufinPreparedPaymentDetails,
    paymentUuid: string,
  ): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-submitpayment",
      `libeufin-cli accounts submit-payment` +
        ` --payment-uuid=${paymentUuid}` +
        ` ${details.nexusBankAccountName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async newTalerWireGatewayFacade(req: NewTalerWireGatewayReq): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-new-taler-wire-gateway-facade",
      `libeufin-cli facades new-taler-wire-gateway-facade` +
        ` --currency ${req.currency}` +
        ` --facade-name ${req.facadeName}` +
        ` ${req.connectionName} ${req.accountName}`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }

  async listFacades(): Promise<void> {
    const stdout = await sh(
      this.globalTestState,
      "libeufin-cli-facades-list",
      `libeufin-cli facades list`,
      {
        ...process.env,
        LIBEUFIN_NEXUS_URL: this.cliDetails.nexusUrl,
        LIBEUFIN_NEXUS_USERNAME: this.cliDetails.user.username,
        LIBEUFIN_NEXUS_PASSWORD: this.cliDetails.user.password,
      },
    );
    console.log(stdout);
  }
}

interface NewTalerWireGatewayReq {
  facadeName: string;
  connectionName: string;
  accountName: string;
  currency: string;
}

export namespace LibeufinSandboxApi {
  export async function rotateKeys(
    libeufinSandboxService: LibeufinSandboxServiceInterface,
    hostID: string,
  ) {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL(`admin/ebics/hosts/${hostID}/rotate-keys`, baseUrl);
    await axios.post(url.href);
  }
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

  export async function bookPayment2(
    libeufinSandboxService: LibeufinSandboxService,
    req: LibeufinSandboxAddIncomingRequest,
  ) {
    const baseUrl = libeufinSandboxService.baseUrl;
    let url = new URL("admin/payments", baseUrl);
    await axios.post(url.href, req);
  }

  export async function bookPayment(
    libeufinSandboxService: LibeufinSandboxService,
    creditorBundle: SandboxUserBundle,
    debitorBundle: SandboxUserBundle,
    subject: string,
    amount: string,
    currency: string,
  ) {
    let req: LibeufinSandboxAddIncomingRequest = {
      creditorIban: creditorBundle.ebicsBankAccount.iban,
      creditorBic: creditorBundle.ebicsBankAccount.bic,
      creditorName: creditorBundle.ebicsBankAccount.name,
      debtorIban: debitorBundle.ebicsBankAccount.iban,
      debtorBic: debitorBundle.ebicsBankAccount.bic,
      debtorName: debitorBundle.ebicsBankAccount.name,
      subject: subject,
      amount: amount,
      currency: currency,
      uid: getRandomString(),
      direction: "CRDT",
    };
    await bookPayment2(libeufinSandboxService, req);
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

export interface UpdateNexusUserRequest {
  newPassword: string;
}

export interface NexusAuth {
  auth: {
    username: string;
    password: string;
  };
}

export interface CreateNexusUserRequest {
  username: string;
  password: string;
}

export interface PostNexusTaskRequest {
  name: string;
  cronspec: string;
  type: string; // fetch | submit
  params:
    | {
        level: string; // report | statement | all
        rangeType: string; // all | since-last | previous-days | latest
      }
    | {};
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
  export async function getAllConnections(
    nexus: LibeufinNexusServiceInterface,
  ): Promise<any> {
    let url = new URL("bank-connections", nexus.baseUrl);
    const res = await axios.get(url.href, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
    return res;
  }

  export async function deleteBankConnection(
    libeufinNexusService: LibeufinNexusServiceInterface,
    req: DeleteBankConnectionRequest,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL("bank-connections/delete-connection", baseUrl);
    return await axios.post(url.href, req, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

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

  export async function submitInitiatedPayment(
    libeufinNexusService: LibeufinNexusServiceInterface,
    accountName: string,
    paymentId: string,
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `bank-accounts/${accountName}/payment-initiations/${paymentId}/submit`,
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

  export async function getPaymentInitiations(
    libeufinNexusService: LibeufinNexusService,
    accountName: string,
    username: string = "admin",
    password: string = "test",
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `/bank-accounts/${accountName}/payment-initiations`,
      baseUrl,
    );
    let response = await axios.get(url.href, {
      auth: {
        username: username,
        password: password,
      },
    });
    console.log(
      `Payment initiations of: ${accountName}`,
      JSON.stringify(response.data, null, 2),
    );
  }

  export async function getConfig(
    libeufinNexusService: LibeufinNexusService,
  ): Promise<void> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/config`, baseUrl);
    let response = await axios.get(url.href);
  }

  // FIXME: this function should return some structured
  // object that represents a history.
  export async function getAccountTransactions(
    libeufinNexusService: LibeufinNexusService,
    accountName: string,
    username: string = "admin",
    password: string = "test",
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/bank-accounts/${accountName}/transactions`, baseUrl);
    let response = await axios.get(url.href, {
      auth: {
        username: username,
        password: password,
      },
    });
    return response;
  }

  export async function fetchAllTransactions(
    libeufinNexusService: LibeufinNexusService,
    accountName: string,
    username: string = "admin",
    password: string = "test",
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `/bank-accounts/${accountName}/fetch-transactions`,
      baseUrl,
    );
    return await axios.post(
      url.href,
      {
        rangeType: "all",
        level: "report",
      },
      {
        auth: {
          username: username,
          password: password,
        },
        validateStatus: () => true,
      },
    );
  }

  export async function changePassword(
    libeufinNexusService: LibeufinNexusServiceInterface,
    req: UpdateNexusUserRequest,
    auth: NexusAuth,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/users/password`, baseUrl);
    await axios.post(url.href, req, auth);
  }

  export async function getUser(
    libeufinNexusService: LibeufinNexusServiceInterface,
    auth: NexusAuth,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/user`, baseUrl);
    return await axios.get(url.href, auth);
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

  export async function getAllPermissions(
    libeufinNexusService: LibeufinNexusServiceInterface,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/permissions`, baseUrl);
    return await axios.get(url.href, {
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

  export async function getTasks(
    libeufinNexusService: LibeufinNexusServiceInterface,
    bankAccountName: string,
    // When void, the request returns the list of all the
    // tasks under this bank account.
    taskName: string | void,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/bank-accounts/${bankAccountName}/schedule`, baseUrl);
    if (taskName) url = new URL(taskName, `${url}/`);

    // It's caller's responsibility to interpret the response.
    return await axios.get(url.href, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

  export async function deleteTask(
    libeufinNexusService: LibeufinNexusServiceInterface,
    bankAccountName: string,
    taskName: string,
  ) {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(
      `/bank-accounts/${bankAccountName}/schedule/${taskName}`,
      baseUrl,
    );
    await axios.delete(url.href, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

  export async function postTask(
    libeufinNexusService: LibeufinNexusServiceInterface,
    bankAccountName: string,
    req: PostNexusTaskRequest,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`/bank-accounts/${bankAccountName}/schedule`, baseUrl);
    return await axios.post(url.href, req, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

  export async function deleteFacade(
    libeufinNexusService: LibeufinNexusServiceInterface,
    facadeName: string,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL(`facades/${facadeName}`, baseUrl);
    return await axios.delete(url.href, {
      auth: {
        username: "admin",
        password: "test",
      },
    });
  }

  export async function getAllFacades(
    libeufinNexusService: LibeufinNexusServiceInterface,
  ): Promise<any> {
    const baseUrl = libeufinNexusService.baseUrl;
    let url = new URL("facades", baseUrl);
    return await axios.get(url.href, {
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

/**
 * Launch Nexus and Sandbox AND creates users / facades / bank accounts /
 * .. all that's required to start making banking traffic.
 */
export async function launchLibeufinServices(
  t: GlobalTestState,
  nexusUserBundle: NexusUserBundle[],
  sandboxUserBundle: SandboxUserBundle[],
): Promise<LibeufinServices> {
  const db = await setupDb(t);

  const libeufinSandbox = await LibeufinSandboxService.create(t, {
    httpPort: 5010,
    databaseJdbcUri: `jdbc:sqlite:${t.testDir}/libeufin-sandbox.sqlite3`,
  });

  await libeufinSandbox.start();
  await libeufinSandbox.pingUntilAvailable();

  const libeufinNexus = await LibeufinNexusService.create(t, {
    httpPort: 5011,
    databaseJdbcUri: `jdbc:sqlite:${t.testDir}/libeufin-nexus.sqlite3`,
  });

  await libeufinNexus.start();
  await libeufinNexus.pingUntilAvailable();
  console.log("Libeufin services launched!");

  for (let sb of sandboxUserBundle) {
    await LibeufinSandboxApi.createEbicsHost(
      libeufinSandbox,
      sb.ebicsBankAccount.subscriber.hostID,
    );
    await LibeufinSandboxApi.createEbicsSubscriber(
      libeufinSandbox,
      sb.ebicsBankAccount.subscriber,
    );
    await LibeufinSandboxApi.createEbicsBankAccount(
      libeufinSandbox,
      sb.ebicsBankAccount,
    );
  }
  console.log("Sandbox user(s) / account(s) / subscriber(s): created");

  for (let nb of nexusUserBundle) {
    await LibeufinNexusApi.createEbicsBankConnection(libeufinNexus, nb.connReq);
    await LibeufinNexusApi.connectBankConnection(
      libeufinNexus,
      nb.connReq.name,
    );
    await LibeufinNexusApi.fetchAccounts(libeufinNexus, nb.connReq.name);
    await LibeufinNexusApi.importConnectionAccount(
      libeufinNexus,
      nb.connReq.name,
      nb.remoteAccountName,
      nb.localAccountName,
    );
    await LibeufinNexusApi.createTwgFacade(libeufinNexus, nb.twgReq);
    await LibeufinNexusApi.createUser(libeufinNexus, nb.userReq);
    await LibeufinNexusApi.postPermission(
      libeufinNexus,
      nb.twgTransferPermission,
    );
    await LibeufinNexusApi.postPermission(
      libeufinNexus,
      nb.twgHistoryPermission,
    );
  }
  console.log(
    "Nexus user(s) / connection(s) / facade(s) / permission(s): created",
  );

  return {
    commonDb: db,
    libeufinNexus: libeufinNexus,
    libeufinSandbox: libeufinSandbox,
  };
}

/**
 * Helper function that searches a payment among
 * a list, as returned by Nexus.  The key is just
 * the payment subject.
 */
export function findNexusPayment(
  key: string,
  payments: LibeufinNexusTransactions,
): LibeufinNexusMoneyMovement | void {
  let transactions = payments["transactions"];
  for (let i = 0; i < transactions.length; i++) {
    let batches = transactions[i]["batches"];
    for (let y = 0; y < batches.length; y++) {
      let movements = batches[y]["batchTransactions"];
      for (let z = 0; z < movements.length; z++) {
        let movement = movements[z];
        if (movement["details"]["unstructuredRemittanceInformation"] == key)
          return movement;
      }
    }
  }
}
