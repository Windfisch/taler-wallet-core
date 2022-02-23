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
 * @author sebasjm
 */

import { Translate, WalletDiagnostics } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../components/Checkbox";
import { Diagnostics } from "../components/Diagnostics";
import { useDiagnostics } from "../hooks/useDiagnostics";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";

export function WelcomePage(): VNode {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();
  const [diagnostics, timedOut] = useDiagnostics();
  return (
    <View
      permissionsEnabled={permissionsEnabled}
      togglePermissions={togglePermissions}
      diagnostics={diagnostics}
      timedOut={timedOut}
    />
  );
}

export interface ViewProps {
  permissionsEnabled: boolean;
  togglePermissions: () => void;
  diagnostics: WalletDiagnostics | undefined;
  timedOut: boolean;
}
export function View({
  permissionsEnabled,
  togglePermissions,
  diagnostics,
  timedOut,
}: ViewProps): VNode {
  return (
    <Fragment>
      <h1>
        <Translate>Browser Extension Installed!</Translate>
      </h1>
      <div>
        <p>
          <Translate>Thank you for installing the wallet.</Translate>
        </p>
        <Diagnostics diagnostics={diagnostics} timedOut={timedOut} />
        <h2>
          <Translate>Permissions</Translate>
        </h2>
        <Checkbox
          label={
            <Translate>
              Automatically open wallet based on page content
            </Translate>
          }
          name="perm"
          description={
            <Translate>
              (Enabling this option below will make using the wallet faster, but
              requires more permissions from your browser.)
            </Translate>
          }
          enabled={permissionsEnabled}
          onToggle={togglePermissions}
        />
        <h2>
          <Translate>Next Steps</Translate>
        </h2>
        <a href="https://demo.taler.net/" style={{ display: "block" }}>
          <Translate>Try the demo</Translate> »
        </a>
        <a href="https://demo.taler.net/" style={{ display: "block" }}>
          <Translate>Learn how to top up your wallet balance</Translate> »
        </a>
      </div>
    </Fragment>
  );
}
