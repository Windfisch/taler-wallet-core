/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems SA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Implementation of dev experiments, i.e. scenarios
 * triggered by taler://dev-experiment URIs.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */

import { Logger, parseDevExperimentUri } from "@gnu-taler/taler-util";
import { ConfigRecordKey } from "./db.js";
import { InternalWalletState } from "./internal-wallet-state.js";
import {
  HttpRequestLibrary,
  HttpRequestOptions,
  HttpResponse,
} from "./util/http.js";

const logger = new Logger("dev-experiments.ts");

export async function setDevMode(
  ws: InternalWalletState,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    logger.info("enabling devmode");
    await ws.db
      .mktx((x) => [x.config])
      .runReadWrite(async (tx) => {
        tx.config.put({
          key: ConfigRecordKey.DevMode,
          value: true,
        });
      });
    await maybeInitDevMode(ws);
  } else {
    logger.info("disabling devmode");
    await ws.db
      .mktx((x) => [x.config])
      .runReadWrite(async (tx) => {
        tx.config.put({
          key: ConfigRecordKey.DevMode,
          value: false,
        });
      });
    await leaveDevMode(ws);
  }
}

/**
 * Apply a dev experiment to the wallet database / state.
 */
export async function applyDevExperiment(
  ws: InternalWalletState,
  uri: string,
): Promise<void> {
  logger.info(`applying dev experiment ${uri}`);
  const parsedUri = parseDevExperimentUri(uri);
  if (!parsedUri) {
    logger.info("unable to parse dev experiment URI");
    return;
  }
  if (!ws.devModeActive) {
    throw Error(
      "can't handle devmode URI (other than enable-devmode) unless devmode is active",
    );
  }
  throw Error(`dev-experiment id not understood ${parsedUri.devExperimentId}`);
}

/**
 * Enter dev mode, if the wallet's config entry in the DB demands it.
 */
export async function maybeInitDevMode(ws: InternalWalletState): Promise<void> {
  const devMode = await ws.db
    .mktx((x) => [x.config])
    .runReadOnly(async (tx) => {
      const rec = await tx.config.get(ConfigRecordKey.DevMode);
      if (!rec || rec.key !== ConfigRecordKey.DevMode) {
        return false;
      }
      return rec.value;
    });
  if (!devMode) {
    ws.devModeActive = false;
    return;
  }
  ws.devModeActive = true;
  if (ws.http instanceof DevExperimentHttpLib) {
    return;
  }
  ws.http = new DevExperimentHttpLib(ws.http);
}

export async function leaveDevMode(ws: InternalWalletState): Promise<void> {
  if (ws.http instanceof DevExperimentHttpLib) {
    ws.http = ws.http.underlyingLib;
  }
  ws.devModeActive = false;
}

export class DevExperimentHttpLib implements HttpRequestLibrary {
  _isDevExperimentLib = true;
  underlyingLib: HttpRequestLibrary;

  constructor(lib: HttpRequestLibrary) {
    this.underlyingLib = lib;
  }

  get(
    url: string,
    opt?: HttpRequestOptions | undefined,
  ): Promise<HttpResponse> {
    logger.info(`devexperiment httplib ${url}`);
    return this.underlyingLib.get(url, opt);
  }

  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions | undefined,
  ): Promise<HttpResponse> {
    logger.info(`devexperiment httplib ${url}`);
    return this.underlyingLib.postJson(url, body, opt);
  }

  fetch(
    url: string,
    opt?: HttpRequestOptions | undefined,
  ): Promise<HttpResponse> {
    logger.info(`devexperiment httplib ${url}`);
    return this.underlyingLib.fetch(url, opt);
  }
}
