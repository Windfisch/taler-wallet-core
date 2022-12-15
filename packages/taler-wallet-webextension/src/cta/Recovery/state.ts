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

import { parseRecoveryUri } from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useBackendContext } from "../../context/backend.js";
import { Props, State } from "./index.js";

export function useComponentState({
  talerRecoveryUri,
  onCancel,
  onSuccess,
}: Props): State {
  const api = useBackendContext();
  if (!talerRecoveryUri) {
    return {
      status: "loading-uri",
      error: {
        operational: false,
        hasError: true,
        message: "Missing URI",
      },
    };
  }
  const info = parseRecoveryUri(talerRecoveryUri);

  if (!info) {
    return {
      status: "loading-uri",
      error: {
        operational: false,
        hasError: true,
        message: "Could not be read",
      },
    };
  }
  const recovery = info;

  async function recoverBackup(): Promise<void> {
    await api.wallet.call(WalletApiOperation.ImportBackupRecovery, {
      recovery,
    });
    onSuccess();
  }

  return {
    status: "ready",

    accept: {
      onClick: recoverBackup,
    },
    cancel: {
      onClick: onCancel,
    },
    error: undefined,
  };
}
