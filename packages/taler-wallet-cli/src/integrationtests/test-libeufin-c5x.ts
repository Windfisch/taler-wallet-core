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
  launchLibeufinServices,
  LibeufinNexusApi,
  NexusUserBundle,
  SandboxUserBundle,
} from "../harness/libeufin.js";

/**
 * This test checks how the C52 and C53 coordinate.  It'll test
 * whether fresh transactions stop showing as C52 after they get
 * included in a bank statement.
 */
export async function runLibeufinC5xTest(t: GlobalTestState) {
  /**
   * User saltetd "01"
   */
  const user01nexus = new NexusUserBundle(
    "01",
    "http://localhost:5010/ebicsweb",
  );
  const user01sandbox = new SandboxUserBundle("01");

  /**
   * User saltetd "02".
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
    ["twg"],
  );

  // Check that C52 and C53 have zero entries.

  // C52
  await LibeufinNexusApi.fetchTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
    "all", // range
    "report", // level
  );
  // C53
  await LibeufinNexusApi.fetchTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
    "all", // range
    "statement", // level
  );
  const nexusTxs = await LibeufinNexusApi.getAccountTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
  );
  t.assertTrue(nexusTxs.data["transactions"].length == 0);

  // Addressing one payment to user 01
  await libeufinServices.libeufinSandbox.makeTransaction(
    user02sandbox.ebicsBankAccount.label, // debit
    user01sandbox.ebicsBankAccount.label, // credit
    "EUR:10",
    "first payment",
  );

  let expectOne = await LibeufinNexusApi.fetchTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
    "all", // range
    "report", // C52
  );
  t.assertTrue(expectOne.data.newTransactions == 1);
  t.assertTrue(expectOne.data.downloadedTransactions == 1);

  /* Expect zero payments being downloaded because the
   * previous request consumed already the one pending
   * payment.
   */
  let expectZero = await LibeufinNexusApi.fetchTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
    "all", // range
    "report", // C52
  );
  t.assertTrue(expectZero.data.newTransactions == 0);
  t.assertTrue(expectZero.data.downloadedTransactions == 0);

  /**
   * A statement should still account zero payments because
   * so far the payment made before is still pending. 
   */
  expectZero = await LibeufinNexusApi.fetchTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
    "all", // range
    "statement", // C53
  );
  t.assertTrue(expectZero.data.newTransactions == 0);
  t.assertTrue(expectZero.data.downloadedTransactions == 0);

  /**
   * Ticking now.  That books any pending transaction.
   */
  await libeufinServices.libeufinSandbox.c53tick();

  /**
   * A statement is now expected to download the transaction,
   * although that got already ingested along the report
   * earlier.  Thus the transaction counts as downloaded but
   * not as new.
   */
  expectOne = await LibeufinNexusApi.fetchTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
    "all", // range
    "statement", // C53
  );
  t.assertTrue(expectOne.data.downloadedTransactions == 1);
  t.assertTrue(expectOne.data.newTransactions == 0);
}
runLibeufinC5xTest.suites = ["libeufin"];
