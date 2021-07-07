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

import { JSX } from "preact/jsx-runtime";
import { Checkbox } from "../components/Checkbox";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";
import { Diagnostics } from "../components/Diagnostics";

export function WelcomePage(): JSX.Element {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions()
  return (
    <>
      <p>Thank you for installing the wallet.</p>
      <Diagnostics />
      <h2>Permissions</h2>
      <Checkbox label="Automatically open wallet based on page content"
        name="perm"
        description="(Enabling this option below will make using the wallet faster, but requires more permissions from your browser.)"
        enabled={permissionsEnabled} onToggle={togglePermissions}
      />
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