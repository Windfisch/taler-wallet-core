/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
*/

import { i18n } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../components/Checkbox";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";

export function SettingsPage(): VNode {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();

  return (
    <SettingsView
      permissionsEnabled={permissionsEnabled}
      togglePermissions={togglePermissions}
    />
  );
}

export interface ViewProps {
  permissionsEnabled: boolean;
  togglePermissions: () => void;
}

export function SettingsView({
  permissionsEnabled,
  togglePermissions,
}: ViewProps): VNode {
  return (
    <Fragment>
      <section>
        <h2>
          <i18n.Translate>Permissions</i18n.Translate>
        </h2>
        <Checkbox
          label="Automatically open wallet based on page content"
          name="perm"
          description="(Enabling this option below will make using the wallet faster, but requires more permissions from your browser.)"
          enabled={permissionsEnabled}
          onToggle={togglePermissions}
        />
      </section>
      <footer style={{ justifyContent: "space-around" }}>
        <a
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "darkgreen", textDecoration: "none" }}
          href={
            // eslint-disable-next-line no-undef
            chrome.runtime
              ? // eslint-disable-next-line no-undef
                chrome.runtime.getURL(`/static/wallet.html#/settings`)
              : "#"
          }
        >
          VIEW MORE SETTINGS
        </a>
      </footer>
    </Fragment>
  );
}
