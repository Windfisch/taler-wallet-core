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
import { ConfigRecord, WalletStoresV1 } from "../../db.js";
import { getRandomBytes, encodeCrock } from "../../index.js";
import { checkDbInvariant } from "../../util/invariants";
import { GetReadOnlyAccess } from "../../util/query.js";
import { Wallet } from "../../wallet.js";
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
  const bs: ConfigRecord<WalletBackupConfState> | undefined = await ws.db
    .mktx((x) => ({
      config: x.config,
    }))
    .runReadOnly(async (tx) => {
      return tx.config.get(WALLET_BACKUP_STATE_KEY);
    });
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
  return await ws.db
    .mktx((x) => ({
      config: x.config,
    }))
    .runReadWrite(async (tx) => {
      let backupStateEntry:
        | ConfigRecord<WalletBackupConfState>
        | undefined = await tx.config.get(WALLET_BACKUP_STATE_KEY);
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
        await tx.config.put(backupStateEntry);
      }
      return backupStateEntry.value;
    });
}

export async function getWalletBackupState(
  ws: InternalWalletState,
  tx: GetReadOnlyAccess<{ config: typeof WalletStoresV1.config }>,
): Promise<WalletBackupConfState> {
  const bs = await tx.config.get(WALLET_BACKUP_STATE_KEY);
  checkDbInvariant(!!bs, "wallet backup state should be in DB");
  return bs.value;
}
