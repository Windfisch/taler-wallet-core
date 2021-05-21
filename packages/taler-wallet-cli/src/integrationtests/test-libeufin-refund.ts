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
export async function runLibeufinRefundTest(t: GlobalTestState) {
  /**
   * User saltetd "01"
   */
  const user01nexus = new NexusUserBundle(
    "01",
    "http://localhost:5010/ebicsweb",
  );
  const user01sandbox = new SandboxUserBundle("01");

  /**
   * User saltetd "02"
   */
  const user02nexus = new NexusUserBundle(
    "02",
    "http://localhost:5010/ebicsweb",
  );
  const user02sandbox = new SandboxUserBundle("02");

  /**
   * Launch Sandbox and Nexus.
   */
  const libeufinServices = await launchLibeufinServices(
    t,
    [user01nexus, user02nexus],
    [user01sandbox, user02sandbox],
  );

  /**
   * user01 pays user02 using a invalid subject.  At the end,
   * user01 checks whether one incoming payment exists in the
   * history.  This one incoming payment will be the refund.
   */
  await LibeufinSandboxApi.bookPayment(
    libeufinServices.libeufinSandbox,
    user02sandbox,
    user01sandbox,
    "not a public key",
    "1",
    "EUR",
  );

  await LibeufinNexusApi.fetchAllTransactions(
    libeufinServices.libeufinNexus,
    user02nexus.localAccountName,
  );

  await LibeufinNexusApi.submitInitiatedPayment(
    libeufinServices.libeufinNexus,
    user02nexus.localAccountName,
    "1", // so far the only one that can exist.
  ); 

  // Counterpart checks whether the reimbursement shows up.
  let history = await LibeufinSandboxApi.getAccountTransactions(
    libeufinServices.libeufinSandbox,
    user01sandbox.ebicsBankAccount["label"]
  );

  t.assertTrue(history["payments"].length == 1)
}
runLibeufinRefundTest.suites = ["libeufin"];
