/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
import * as wxApi from "../wxApi";
import { platform } from "../platform/api";
import { getReadRequestPermissions } from "../permissions";

export function useExtendedPermissions(): [boolean, () => Promise<void>] {
  const [enabled, setEnabled] = useState(false);

  const toggle = async () => {
    return handleExtendedPerm(enabled, setEnabled)
  };

  useEffect(() => {
    async function getExtendedPermValue(): Promise<void> {
      const res = await wxApi.getExtendedPermissions();
      setEnabled(res.newValue);
    }
    getExtendedPermValue();
  }, []);
  return [enabled, toggle];
}

async function handleExtendedPerm(isEnabled: boolean, onChange: (value: boolean) => void): Promise<void> {
  if (!isEnabled) {
    // We set permissions here, since apparently FF wants this to be done
    // as the result of an input event ...
    const granted = await platform.getPermissionsApi().request(getReadRequestPermissions());
    console.log("permissions granted:", granted);
    const lastError = platform.getLastError();
    if (lastError) {
      console.error("error requesting permissions");
      console.error(lastError);
      onChange(false);
      return;
    }
    // try {
    const res = await wxApi.setExtendedPermissions(granted);
    onChange(res.newValue);
    // } finally {
    //   return
    // }

    // return new Promise<void>((res) => {
    //   platform.getPermissionsApi().request(getReadRequestPermissions(), async (granted: boolean) => {
    //     console.log("permissions granted:", granted);
    //     const lastError = getLastError()
    //     if (lastError) {
    //       console.error("error requesting permissions");
    //       console.error(lastError);
    //       onChange(false);
    //       return;
    //     }
    //     try {
    //       const res = await wxApi.setExtendedPermissions(granted);
    //       onChange(res.newValue);
    //     } finally {
    //       res()
    //     }

    //   });
    // })
  }
  await wxApi.setExtendedPermissions(false).then(r => onChange(r.newValue));
  return
}
