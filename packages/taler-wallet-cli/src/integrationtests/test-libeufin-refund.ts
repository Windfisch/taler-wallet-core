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
  const user01nexus = new NexusUserBundle(
    "01",
    "http://localhost:5010/ebicsweb",
  );
  const user01sandbox = new SandboxUserBundle("01");
  const user02nexus = new NexusUserBundle(
    "02",
    "http://localhost:5010/ebicsweb",
  );
  const user02sandbox = new SandboxUserBundle("02");

  const libeufinServices = await launchLibeufinServices(
    t,
    [user01nexus, user02nexus],
    [user01sandbox, user02sandbox],
  );

  // user02 - acting as the Exchange - gets money from user01,
  // but this one gets the subject wrong - not a valid public key.
  // The result should be a reimbursement - minus a small fee - of
  // the paid money to user01.
  await LibeufinSandboxApi.bookPayment(
    libeufinServices.libeufinSandbox,
    user02sandbox,
    user01sandbox,
    "not a public key",
    "1",
    "EUR",
  );

  // STEPS.

  // 1.  Exchange must fetch this payment into its Nexus / Facade.
  // 2.  Facade logic should process incoming payments.
  // 3.  A reimbursement should be prepared.
  // 4.  The reimbursement payment should be sent.

  // Steps 1-3 should happen all-at-once when triggering the import
  // logic.  4 needs to be explicitly triggered (because here there's
  // no background task activated, yet?)
  
  await LibeufinNexusApi.fetchAllTransactions(
    libeufinServices.libeufinNexus,
    user02nexus.localAccountName,
  );
  
  await LibeufinNexusApi.getAccountTransactions(
    libeufinServices.libeufinNexus,
    user02nexus.localAccountName,
  );
}
