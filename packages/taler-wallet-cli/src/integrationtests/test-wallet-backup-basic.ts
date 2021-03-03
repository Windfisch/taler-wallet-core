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
import { GlobalTestState, BankApi, BankAccessApi } from "./harness";
import { createSimpleTestkudosEnvironment } from "./helpers";
import { codecForBalancesResponse } from "@gnu-taler/taler-wallet-core";
import { SyncService } from "./sync";

/**
 * Run test for basic, bank-integrated withdrawal.
 */
export async function runWalletBackupBasicTest(t: GlobalTestState) {
  // Set up test environment

  const { commonDb, merchant, wallet, bank, exchange } = await createSimpleTestkudosEnvironment(t);

  const sync = await SyncService.create(t, {
    currency: "TESTKUDOS",
    annualFee: "TESTKUDOS:0.5",
    database: commonDb.connStr,
    fulfillmentUrl: "taler://fulfillment-success",
    httpPort: 8089,
    name: "sync1",
    paymentBackendUrl: merchant.makeInstanceBaseUrl(),
    uploadLimitMb: 10,
  });

  await sync.start();
  await sync.pingUntilAvailable();

  await wallet.addBackupProvider({
    backupProviderBaseUrl: sync.baseUrl,
    activate: false,
  });

  {
    const bi = await wallet.getBackupInfo();
    t.assertDeepEqual(bi.providers[0].active, false);
  }

  await wallet.addBackupProvider({
    backupProviderBaseUrl: sync.baseUrl,
    activate: false,
  });

  {
    const bi = await wallet.getBackupInfo();
    t.assertDeepEqual(bi.providers[0].active, true);
  }
}
