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
import { GlobalTestState } from "./harness";
import {
  SandboxUserBundle,
  NexusUserBundle,
  launchLibeufinServices,
  LibeufinSandboxApi,
  LibeufinNexusApi,
} from "./libeufin";

/**
 * Run basic test with LibEuFin.
 */
export async function runLibeufinKeyrotationTest(t: GlobalTestState) {
  /**
   * User saltetd "01"
   */
  const user01nexus = new NexusUserBundle(
    "01",
    "http://localhost:5010/ebicsweb",
  );
  const user01sandbox = new SandboxUserBundle("01");

  /**
   * Launch Sandbox and Nexus.
   */
  const libeufinServices = await launchLibeufinServices(
    t, [user01nexus], [user01sandbox],
  );

  await LibeufinNexusApi.fetchAllTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
  );

  /* Rotate the Sandbox keys, and fetch the transactions again */
  await LibeufinSandboxApi.rotateKeys(
    libeufinServices.libeufinSandbox,
    user01sandbox.ebicsBankAccount.subscriber.hostID,
  );

  const resp = await LibeufinNexusApi.fetchAllTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
  );
  console.log("Attempted fetch after key rotation", resp.data);
  t.assertTrue(resp.status == 500);
}
runLibeufinKeyrotationTest.suites = ["libeufin"];
