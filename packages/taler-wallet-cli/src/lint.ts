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
import {
  buildCodecForObject,
  Codec,
  codecForAny,
  codecForExchangeKeysJson,
  codecForKeysManagementResponse,
  codecForList,
  codecForString,
  Configuration,
} from "@gnu-taler/taler-util";
import {
  decodeCrock,
  NodeHttpLib,
  readSuccessResponseJsonOrThrow,
} from "@gnu-taler/taler-wallet-core";
import { URL } from "url";
import * as fs from "fs";
import * as path from "path";
import { ChildProcess, spawn } from "child_process";

interface BasicConf {
  mainCurrency: string;
}

interface PubkeyConf {
  masterPublicKey: string;
}

const httpLib = new NodeHttpLib();

interface ShellResult {
  stdout: string;
  stderr: string;
  status: number;
}

/**
 * Run a shell command, return stdout.
 */
export async function sh(
  command: string,
  env: { [index: string]: string | undefined } = process.env,
): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
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
    proc.stderr.on("data", (x) => {
      if (x instanceof Buffer) {
        stderrChunks.push(x);
      } else {
        throw Error("unexpected data chunk type");
      }
    });
    proc.on("exit", (code, signal) => {
      console.log(`child process exited (${code} / ${signal})`);
      const bOut = Buffer.concat(stdoutChunks).toString("utf-8");
      const bErr = Buffer.concat(stderrChunks).toString("utf-8");
      resolve({
        status: code ?? -1,
        stderr: bErr,
        stdout: bOut,
      });
    });
    proc.on("error", () => {
      reject(Error("Child process had error"));
    });
  });
}

function checkBasicConf(cfg: Configuration): BasicConf {
  const currencyEntry = cfg.getString("taler", "currency");
  let mainCurrency: string | undefined;

  if (!currencyEntry.value) {
    console.log("error: currency not defined in section TALER option CURRENCY");
    process.exit(1);
  } else {
    mainCurrency = currencyEntry.value.toUpperCase();
  }

  if (mainCurrency === "KUDOS") {
    console.log(
      "warning: section TALER option CURRENCY contains toy currency value KUDOS",
    );
  }

  const roundUnit = cfg.getAmount("taler", "currency_round_unit");
  if (!roundUnit.isDefined) {
    console.log(
      "error: configuration incomplete, section TALER option CURRENCY_ROUND_UNIT missing",
    );
  }
  return { mainCurrency };
}

function checkCoinConfig(cfg: Configuration, basic: BasicConf): void {
  const coinPrefix1 = "COIN_";
  const coinPrefix2 = "COIN-";
  let numCoins = 0;

  for (const secName of cfg.getSectionNames()) {
    if (!secName.startsWith(coinPrefix1) && !secName.startsWith(coinPrefix2)) {
      continue;
    }
    numCoins++;

    // FIXME: check that section is well-formed
  }

  console.log(
    "error: no coin denomination configured, please configure [coin_*] sections",
  );
}

function checkWireConfig(cfg: Configuration): void {
  const accountPrefix = "EXCHANGE-ACCOUNT-";
  const accountCredentialsPrefix = "EXCHANGE-ACCOUNTCREDENTIALS-";

  let accounts = new Set<string>();
  let credentials = new Set<string>();

  for (const secName of cfg.getSectionNames()) {
    if (secName.startsWith(accountPrefix)) {
      accounts.add(secName.slice(accountPrefix.length));
      // FIXME: check settings
    }

    if (secName.startsWith(accountCredentialsPrefix)) {
      credentials.add(secName.slice(accountCredentialsPrefix.length));
      // FIXME: check settings
    }
  }

  for (const acc of accounts) {
    if (!credentials.has(acc)) {
      console.log(
        `warning: no credentials configured for exchange-account-${acc}`,
      );
    }
  }

  // FIXME: now try to use taler-exchange-wire-gateway-client to connect!
  // FIXME: run wirewatch in test mode here?
  // FIXME: run transfer in test mode here?
}

function checkAggregatorConfig(cfg: Configuration) {
  // FIXME: run aggregator in test mode here
}

function checkCloserConfig(cfg: Configuration) {
  // FIXME: run closer in test mode here
}

function checkMasterPublicKeyConfig(cfg: Configuration): PubkeyConf {
  const pub = cfg.getString("exchange", "master_public_key");

  const pubDecoded = decodeCrock(pub.required());

  if (pubDecoded.length != 32) {
    console.log("error: invalid master public key");
    process.exit(1);
  }

  return {
    masterPublicKey: pub.required(),
  };
}

export async function checkExchangeHttpd(
  cfg: Configuration,
  pubConf: PubkeyConf,
): Promise<void> {
  const baseUrlEntry = cfg.getString("exchange", "base_url");

  if (!baseUrlEntry.isDefined) {
    console.log(
      "error: configuration needs to specify section EXCHANGE option BASE_URL",
    );
    process.exit(1);
  }

  const baseUrl = baseUrlEntry.required();

  if (!baseUrl.startsWith("http")) {
    console.log(
      "error: section EXCHANGE option BASE_URL needs to be an http or https URL",
    );
    process.exit(1);
  }

  if (!baseUrl.endsWith("/")) {
    console.log(
      "error: section EXCHANGE option BASE_URL needs to end with a slash",
    );
    process.exit(1);
  }

  if (!baseUrl.startsWith("https://")) {
    console.log(
      "warning: section EXCHANGE option BASE_URL: it is recommended to serve the exchange via HTTPS",
    );
    process.exit(1);
  }

  {
    const mgmtUrl = new URL("management/keys", baseUrl);
    const resp = await httpLib.get(mgmtUrl.href);

    const futureKeys = await readSuccessResponseJsonOrThrow(
      resp,
      codecForKeysManagementResponse(),
    );

    if (futureKeys.future_denoms.length > 0) {
      console.log(
        `warning: exchange has denomination keys that need to be signed by the offline signing procedure`,
      );
    }

    if (futureKeys.future_signkeys.length > 0) {
      console.log(
        `warning: exchange has signing keys that need to be signed by the offline signing procedure`,
      );
    }
  }

  {
    const keysUrl = new URL("keys", baseUrl);
    const resp = await httpLib.get(keysUrl.href);
    const keys = await readSuccessResponseJsonOrThrow(
      resp,
      codecForExchangeKeysJson(),
    );

    if (keys.master_public_key !== pubConf.masterPublicKey) {
      console.log("error: master public key of exchange does not match public key of live exchange");
    }
  }
}

/**
 * Do some basic checks in the configuration of a Taler deployment.
 */
export async function lintExchangeDeployment(): Promise<void> {
  if (process.getuid() != 0) {
    console.log(
      "warning: the exchange deployment linter is designed to be run as root",
    );
  }

  const cfg = Configuration.load();

  const basic = checkBasicConf(cfg);

  checkCoinConfig(cfg, basic);

  checkWireConfig(cfg);

  checkAggregatorConfig(cfg);

  checkCloserConfig(cfg);

  const pubConf = checkMasterPublicKeyConfig(cfg);

  await checkExchangeHttpd(cfg, pubConf);
}
