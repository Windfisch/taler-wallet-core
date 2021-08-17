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
  LibeufinNexusApi,
  LibeufinSandboxApi,
} from "./libeufin";

/**
 * Run basic test with LibEuFin.
 */
export async function runLibeufinAnastasisFacadeTest(t: GlobalTestState) {
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
    t,
    [user01nexus],
    [user01sandbox],
    ["anastasis"],
  );
  let resp = await LibeufinNexusApi.getAllFacades(
    libeufinServices.libeufinNexus,
  );
  // check that original facade shows up.
  t.assertTrue(resp.data["facades"][0]["name"] == user01nexus.anastasisReq["name"]);
  const anastasisBaseUrl: string = resp.data["facades"][0]["baseUrl"];
  t.assertTrue(typeof anastasisBaseUrl === "string");
  t.assertTrue(anastasisBaseUrl.startsWith("http://"));
  t.assertTrue(anastasisBaseUrl.endsWith("/"));

  LibeufinSandboxApi.simulateIncomingTransaction(
    libeufinServices.libeufinSandbox,
    user01sandbox.ebicsBankAccount.label,
    {
      debtorIban: "ES3314655813489414469157",
      debtorBic: "BCMAESM1XXX",
      debtorName: "Mock Donor",
      subject: "Anastasis donation",
      amount: "3", // Sandbox takes currency from its "config"
    },
  )

  await LibeufinNexusApi.fetchAllTransactions(
    libeufinServices.libeufinNexus,
    user01nexus.localAccountName,
  );

  let txs = await LibeufinNexusApi.getAnastasisTransactions(
    libeufinServices.libeufinNexus,
    anastasisBaseUrl, {delta: 5})

    // FIXME: test more!
}

runLibeufinAnastasisFacadeTest.suites = ["libeufin"];
