/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useEffect, useState } from "preact/hooks";
import { useBackendContext } from "../context/backend.js";

export interface BackupDeviceName {
  name: string;
  update: (s: string) => Promise<void>;
}

export function useBackupDeviceName(): BackupDeviceName {
  const [status, setStatus] = useState<BackupDeviceName>({
    name: "",
    update: () => Promise.resolve(),
  });
  const api = useBackendContext();

  useEffect(() => {
    async function run(): Promise<void> {
      //create a first list of backup info by currency
      const status = await api.wallet.call(
        WalletApiOperation.GetBackupInfo,
        {},
      );

      async function update(newName: string): Promise<void> {
        await api.wallet.call(WalletApiOperation.SetWalletDeviceId, {
          walletDeviceId: newName,
        });
        setStatus((old) => ({ ...old, name: newName }));
      }

      setStatus({ name: status.deviceId, update });
    }
    run();
  }, []);

  return status;
}
