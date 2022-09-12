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
import * as wxApi from "../wxApi.js";
import { platform } from "../platform/api.js";
import { ToggleHandler } from "../mui/handlers.js";
import { TalerError } from "@gnu-taler/taler-wallet-core";

export function useAutoOpenPermissions(): ToggleHandler {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<TalerError | undefined>();
  const toggle = async (): Promise<void> => {
    return handleAutoOpenPerm(enabled, setEnabled).catch((e) => {
      setError(TalerError.fromException(e));
    });
  };

  useEffect(() => {
    async function getValue(): Promise<void> {
      const res = await wxApi.containsHeaderListener();
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

async function handleAutoOpenPerm(
  isEnabled: boolean,
  onChange: (value: boolean) => void,
): Promise<void> {
  if (!isEnabled) {
    // We set permissions here, since apparently FF wants this to be done
    // as the result of an input event ...
    let granted: boolean;
    try {
      granted = await platform.getPermissionsApi().requestHostPermissions();
    } catch (lastError) {
      onChange(false);
      throw lastError;
    }
    const res = await wxApi.toggleHeaderListener(granted);
    onChange(res.newValue);
  } else {
    try {
      await wxApi.toggleHeaderListener(false).then((r) => onChange(r.newValue));
    } catch (e) {
      console.log(e);
    }
  }
  return;
}
