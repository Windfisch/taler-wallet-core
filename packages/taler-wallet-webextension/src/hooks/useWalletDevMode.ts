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

import { useState, useEffect } from "preact/hooks";
import { ToggleHandler } from "../mui/handlers.js";
import { TalerError, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useBackendContext } from "../context/backend.js";

export function useWalletDevMode(): ToggleHandler {
  const [enabled, setEnabled] = useState<undefined | boolean>(undefined);
  const [error, setError] = useState<TalerError | undefined>();
  const api = useBackendContext();

  const toggle = async (): Promise<void> => {
    return handleOpen(enabled, setEnabled, api).catch((e) => {
      setError(TalerError.fromException(e));
    });
  };

  useEffect(() => {
    async function getValue(): Promise<void> {
      const res = await api.wallet.call(WalletApiOperation.GetVersion, {});
      setEnabled(res.devMode);
    }
    getValue();
  }, []);
  return {
    value: enabled,
    button: {
      onClick: enabled === undefined ? undefined : toggle,
      error,
    },
  };
}

async function handleOpen(
  currentValue: undefined | boolean,
  onChange: (value: boolean) => void,
  api: ReturnType<typeof useBackendContext>,
): Promise<void> {
  const nextValue = !currentValue;
  await api.wallet.call(WalletApiOperation.SetDevMode, {
    devModeEnabled: nextValue,
  });
  onChange(nextValue);
  return;
}
