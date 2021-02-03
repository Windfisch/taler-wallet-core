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
 * Imports.
 */
import { CoreApiResponse } from "@gnu-taler/taler-wallet-core";
import { CoinConfig, defaultCoinConfig } from "./denomStructures";
import { GlobalTestState } from "./harness";
import {
  LibeufinNexusApi,
  LibeufinNexusService,
  LibeufinSandboxApi,
  LibeufinSandboxService,
  LibeufinCli,
} from "./libeufin";

/**
 * Run basic test with LibEuFin.
 */
export async function runLibeufinTutorialTest(t: GlobalTestState) {
  // Set up test environment

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

  const libeufinCli = new LibeufinCli(t, {
    sandboxUrl: libeufinSandbox.baseUrl,
    nexusUrl: libeufinNexus.baseUrl,
    sandboxDatabaseUri: `jdbc:sqlite:${t.testDir}/libeufin-sandbox.sqlite3`,
    nexusDatabaseUri: `jdbc:sqlite:${t.testDir}/libeufin-nexus.sqlite3`,
  });

  await libeufinCli.checkSandbox();
  await libeufinCli.createEbicsHost("testhost");
}
