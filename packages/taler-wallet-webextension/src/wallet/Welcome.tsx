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

import { WalletDiagnostics } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../components/Checkbox";
import { Diagnostics } from "../components/Diagnostics";
import { SubTitle, Title } from "../components/styled";
import { useTranslationContext } from "../context/translation";
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
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <Title>
        <i18n.Translate>Browser Extension Installed!</i18n.Translate>
      </Title>
      <div>
        <p>
          <i18n.Translate>Thank you for installing the wallet.</i18n.Translate>
        </p>
        <SubTitle>
          <i18n.Translate>Permissions</i18n.Translate>
        </SubTitle>
        <Checkbox
          label={
            <i18n.Translate>
              Automatically open wallet based on page content
            </i18n.Translate>
          }
          name="perm"
          description={
            <i18n.Translate>
              (Enabling this option below will make using the wallet faster, but
              requires more permissions from your browser.)
            </i18n.Translate>
          }
          enabled={permissionsEnabled}
          onToggle={togglePermissions}
        />
        <SubTitle>
          <i18n.Translate>Next Steps</i18n.Translate>
        </SubTitle>
        <a href="https://demo.taler.net/" style={{ display: "block" }}>
          <i18n.Translate>Try the demo</i18n.Translate> »
        </a>
        <a href="https://demo.taler.net/" style={{ display: "block" }}>
          <i18n.Translate>
            Learn how to top up your wallet balance
          </i18n.Translate>{" "}
          »
        </a>
      </div>
    </Fragment>
  );
}
