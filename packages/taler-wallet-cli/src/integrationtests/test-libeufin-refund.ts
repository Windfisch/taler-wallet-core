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
import { getRandomIban } from "./helpers";
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

  await LibeufinSandboxApi.bookPayment(
    libeufinServices.libeufinSandbox,
    user02sandbox,
    user01sandbox,
    "not a public key",
    "1",
    "EUR",
  );
}
