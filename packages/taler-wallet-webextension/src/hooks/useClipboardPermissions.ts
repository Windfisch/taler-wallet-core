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

import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useEffect, useState } from "preact/hooks";
import { useBackendContext } from "../context/backend.js";
import { ToggleHandler } from "../mui/handlers.js";
import { platform } from "../platform/api.js";

export function useClipboardPermissions(): ToggleHandler {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<TalerError | undefined>();
  const api = useBackendContext();

  const toggle = async (): Promise<void> => {
    return handleClipboardPerm(enabled, setEnabled, api.background).catch(
      (e) => {
        setError(TalerError.fromException(e));
      },
    );
  };

  useEffect(() => {
    async function getValue(): Promise<void> {
      const res = await api.background.containsHeaderListener();
      setEnabled(res.newValue);
    }
    getValue();
  }, []);

  return {
    value: enabled,
    button: {
      onClick: toggle,
      error,
    },
  };
}

async function handleClipboardPerm(
  isEnabled: boolean,
  onChange: (value: boolean) => void,
  background: ReturnType<typeof useBackendContext>["background"],
): Promise<void> {
  if (!isEnabled) {
    // We set permissions here, since apparently FF wants this to be done
    // as the result of an input event ...
    let granted: boolean;
    try {
      granted = await platform
        .getPermissionsApi()
        .requestClipboardPermissions();
    } catch (lastError) {
      onChange(false);
      throw lastError;
    }
    onChange(granted);
  } else {
    try {
      await background
        .toggleHeaderListener(false)
        .then((r) => onChange(r.newValue));
    } catch (e) {
      console.log(e);
    }
  }
  return;
}
