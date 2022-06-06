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

/**
 * Welcome page, shown on first installs.
 *
 * @author sebasjm
 */

import { WalletDiagnostics } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../components/Checkbox.js";
import { SubTitle, Title } from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { useDiagnostics } from "../hooks/useDiagnostics.js";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions.js";
import { ToggleHandler } from "../mui/handlers.js";
import { platform } from "../platform/api.js";

export function WelcomePage(): VNode {
  const permissionToggle = useExtendedPermissions();
  const [diagnostics, timedOut] = useDiagnostics();
  return (
    <View
      permissionToggle={permissionToggle}
      diagnostics={diagnostics}
      timedOut={timedOut}
    />
  );
}

export interface ViewProps {
  permissionToggle: ToggleHandler;
  diagnostics: WalletDiagnostics | undefined;
  timedOut: boolean;
}
export function View({
  permissionToggle,
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
          <i18n.Translate>
            You can open the GNU Taler Wallet using the combination{" "}
            <pre style="font-weight: bold; display: inline;">&lt;ALT+W&gt;</pre>
            .
          </i18n.Translate>
        </p>
        {!platform.isFirefox() && (
          <Fragment>
            <p>
              <i18n.Translate>
                Also pinning the GNU Taler Wallet to your Chrome browser allows
                you to quick access without keyboard:
              </i18n.Translate>
            </p>
            <ol style={{ paddingLeft: 40 }}>
              <li>
                <i18n.Translate>Click the puzzle icon</i18n.Translate>
              </li>
              <li>
                <i18n.Translate>Search for GNU Taler Wallet</i18n.Translate>
              </li>
              <li>
                <i18n.Translate>Click the pin icon</i18n.Translate>
              </li>
            </ol>
          </Fragment>
        )}
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
          enabled={permissionToggle.value!}
          onToggle={permissionToggle.button.onClick!}
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
