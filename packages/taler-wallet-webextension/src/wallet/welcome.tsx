/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems SA

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
 * Welcome page, shown on first installs.
 *
 * @author Florian Dold
 */

import * as wxApi from "../wxApi";
import { getPermissionsApi } from "../compat";
import { extendedPermissions } from "../permissions";
import { Fragment, JSX } from "preact/jsx-runtime";
import { PermissionsCheckbox } from "../components/PermissionsCheckbox";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";
import { Diagnostics } from "../components/Diagnostics";

export async function handleExtendedPerm(isEnabled: boolean): Promise<boolean> {
  let nextVal: boolean | undefined;

  if (!isEnabled) {
    const granted = await new Promise<boolean>((resolve, reject) => {
      // We set permissions here, since apparently FF wants this to be done
      // as the result of an input event ...
      getPermissionsApi().request(extendedPermissions, (granted: boolean) => {
        if (chrome.runtime.lastError) {
          console.error("error requesting permissions");
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        console.log("permissions granted:", granted);
        resolve(granted);
      });
    });
    const res = await wxApi.setExtendedPermissions(granted);
    nextVal = res.newValue;
  } else {
    const res = await wxApi.setExtendedPermissions(false);
    nextVal = res.newValue;
  }
  console.log("new permissions applied:", nextVal ?? false);
  return nextVal ?? false
}

export function Welcome(): JSX.Element {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions()
  return (
    <>
      <p>Thank you for installing the wallet.</p>
      <Diagnostics />
      <h2>Permissions</h2>
      <PermissionsCheckbox enabled={permissionsEnabled} onToggle={togglePermissions}/>
      <h2>Next Steps</h2>
      <a href="https://demo.taler.net/" style={{ display: "block" }}>
        Try the demo »
      </a>
      <a href="https://demo.taler.net/" style={{ display: "block" }}>
        Learn how to top up your wallet balance »
      </a>
    </>
  );
}

/**
 * @deprecated to be removed
 */
export function createWelcomePage(): JSX.Element {
  return <Welcome />;
}
