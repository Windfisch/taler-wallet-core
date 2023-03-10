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
import { GlobalTestState } from "../harness/harness.js";
import {
  LibeufinSandboxApi,
  LibeufinSandboxService,
} from "../harness/libeufin.js";

export async function runLibeufinSandboxWireTransferCliTest(
  t: GlobalTestState,
) {
  const sandbox = await LibeufinSandboxService.create(t, {
    httpPort: 5012,
    databaseJdbcUri: `jdbc:sqlite:${t.testDir}/libeufin-sandbox.sqlite3`,
  });
  await sandbox.start();
  await sandbox.pingUntilAvailable();
  await LibeufinSandboxApi.createDemobankAccount(
    "mock-account",
    "password-unused",
    { baseUrl: sandbox.baseUrl + "/demobanks/default/access-api/" },
    "DE71500105179674997361"
  );
  await LibeufinSandboxApi.createDemobankAccount(
    "mock-account-2",
    "password-unused",
    { baseUrl: sandbox.baseUrl + "/demobanks/default/access-api/" },
    "DE71500105179674997364"
  );

  await sandbox.makeTransaction(
    "mock-account",
    "mock-account-2",
    "EUR:1",
    "one!",
  );
  await sandbox.makeTransaction(
    "mock-account",
    "mock-account-2",
    "EUR:1",
    "two!",
  );
  await sandbox.makeTransaction(
    "mock-account",
    "mock-account-2",
    "EUR:1",
    "three!",
  );
  await sandbox.makeTransaction(
    "mock-account-2",
    "mock-account",
    "EUR:1",
    "Give one back.",
  );
  await sandbox.makeTransaction(
    "mock-account-2",
    "mock-account",
    "EUR:0.11",
    "Give fraction back.",
  );
  let ret = await LibeufinSandboxApi.getAccountInfoWithBalance(
    sandbox,
    "mock-account-2",
  );
  console.log(ret.data.balance);
  t.assertTrue(ret.data.balance == "EUR:1.89");
}
runLibeufinSandboxWireTransferCliTest.suites = ["libeufin"];
