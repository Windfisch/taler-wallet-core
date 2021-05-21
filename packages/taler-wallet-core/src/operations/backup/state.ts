/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems SA

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { Timestamp } from "@gnu-taler/taler-util";
import { ConfigRecord, Stores } from "../../db.js";
import { getRandomBytes, encodeCrock, TransactionHandle } from "../../index.js";
import { checkDbInvariant } from "../../util/invariants";
import { InternalWalletState } from "../state";

export interface WalletBackupConfState {
  deviceId: string;
  walletRootPub: string;
  walletRootPriv: string;
  clocks: { [device_id: string]: number };

  /**
   * Last hash of the canonicalized plain-text backup.
   */
  lastBackupPlainHash?: string;

  /**
   * Timestamp stored in the last backup.
   */
  lastBackupTimestamp?: Timestamp;

  /**
   * Last time we tried to do a backup.
   */
  lastBackupCheckTimestamp?: Timestamp;
  lastBackupNonce?: string;
}

export const WALLET_BACKUP_STATE_KEY = "walletBackupState";

export async function provideBackupState(
  ws: InternalWalletState,
): Promise<WalletBackupConfState> {
  const bs: ConfigRecord<WalletBackupConfState> | undefined = await ws.db.get(
    Stores.config,
    WALLET_BACKUP_STATE_KEY,
  );
  if (bs) {
    return bs.value;
  }
  // We need to generate the key outside of the transaction
  // due to how IndexedDB works.
  const k = await ws.cryptoApi.createEddsaKeypair();
  const d = getRandomBytes(5);
  // FIXME: device ID should be configured when wallet is initialized
  // and be based on hostname
  const deviceId = `wallet-core-${encodeCrock(d)}`;
  return await ws.db.runWithWriteTransaction([Stores.config], async (tx) => {
    let backupStateEntry:
      | ConfigRecord<WalletBackupConfState>
      | undefined = await tx.get(Stores.config, WALLET_BACKUP_STATE_KEY);
    if (!backupStateEntry) {
      backupStateEntry = {
        key: WALLET_BACKUP_STATE_KEY,
        value: {
          deviceId,
          clocks: { [deviceId]: 1 },
          walletRootPub: k.pub,
          walletRootPriv: k.priv,
          lastBackupPlainHash: undefined,
        },
      };
      await tx.put(Stores.config, backupStateEntry);
    }
    return backupStateEntry.value;
  });
}

export async function getWalletBackupState(
  ws: InternalWalletState,
  tx: TransactionHandle<typeof Stores.config>,
): Promise<WalletBackupConfState> {
  let bs = await tx.get(Stores.config, WALLET_BACKUP_STATE_KEY);
  checkDbInvariant(!!bs, "wallet backup state should be in DB");
  return bs.value;
}
