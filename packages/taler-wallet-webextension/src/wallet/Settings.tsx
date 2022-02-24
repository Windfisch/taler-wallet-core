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

import { ExchangeListItem, i18n, Translate } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../components/Checkbox";
import { SelectList } from "../components/SelectList";
import {
  DestructiveText,
  Input,
  LinkPrimary,
  SuccessText,
  WarningText,
} from "../components/styled";
import { useDevContext } from "../context/devContext";
import { useTranslationContext } from "../context/translation";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { useBackupDeviceName } from "../hooks/useBackupDeviceName";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";
import { useLang } from "../hooks/useLang";
import { Pages } from "../NavigationBar";
import { buildTermsOfServiceStatus } from "../utils/index";
import * as wxApi from "../wxApi";

export function SettingsPage(): VNode {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();
  const { devMode, toggleDevMode } = useDevContext();
  const { name, update } = useBackupDeviceName();
  // const [lang, changeLang] = useLang();
  const exchangesHook = useAsyncAsHook(wxApi.listExchanges);

  return (
    <SettingsView
      // lang={lang}
      // changeLang={changeLang}
      knownExchanges={
        !exchangesHook || exchangesHook.hasError
          ? []
          : exchangesHook.response.exchanges
      }
      deviceName={name}
      setDeviceName={update}
      permissionsEnabled={permissionsEnabled}
      togglePermissions={togglePermissions}
      developerMode={devMode}
      toggleDeveloperMode={toggleDevMode}
    />
  );
}

export interface ViewProps {
  // lang: string;
  // changeLang: (s: string) => void;
  deviceName: string;
  setDeviceName: (s: string) => Promise<void>;
  permissionsEnabled: boolean;
  togglePermissions: () => void;
  developerMode: boolean;
  toggleDeveloperMode: () => void;
  knownExchanges: Array<ExchangeListItem>;
}

export function SettingsView({
  knownExchanges,
  permissionsEnabled,
  togglePermissions,
  developerMode,
  toggleDeveloperMode,
}: ViewProps): VNode {
  const { lang, supportedLang, changeLanguage } = useTranslationContext();

  return (
    <Fragment>
      <section>
        <h2>
          <i18n.Translate>Display</i18n.Translate>
        </h2>
        <Input>
          <SelectList
            label={<i18n.Translate>Current Language</i18n.Translate>}
            list={supportedLang}
            name="lang"
            value={lang}
            onChange={(v) => changeLanguage(v)}
          />
        </Input>

        <h2>
          <i18n.Translate>Navigator</i18n.Translate>
        </h2>
        <Checkbox
          label={
            <i18n.Translate>
              Automatically open wallet based on page content
            </i18n.Translate>
          }
          name="perm"
          description={
            <i18n.Translate>
              Enabling this option below will make using the wallet faster, but
              requires more permissions from your browser.
            </i18n.Translate>
          }
          enabled={permissionsEnabled}
          onToggle={togglePermissions}
        />

        <h2>
          <i18n.Translate>Trust</i18n.Translate>
        </h2>
        {!knownExchanges || !knownExchanges.length ? (
          <div>
            <i18n.Translate>No exchange yet</i18n.Translate>
          </div>
        ) : (
          <Fragment>
            <table>
              <thead>
                <tr>
                  <th>
                    <i18n.Translate>Currency</i18n.Translate>
                  </th>
                  <th>
                    <i18n.Translate>URL</i18n.Translate>
                  </th>
                  <th>
                    <i18n.Translate>Term of Service</i18n.Translate>
                  </th>
                </tr>
              </thead>
              <tbody>
                {knownExchanges.map((e, idx) => {
                  function Status(): VNode {
                    const status = buildTermsOfServiceStatus(
                      e.tos.content,
                      e.tos.acceptedVersion,
                      e.tos.currentVersion,
                    );
                    switch (status) {
                      case "accepted":
                        return (
                          <SuccessText>
                            <i18n.Translate>ok</i18n.Translate>
                          </SuccessText>
                        );
                      case "changed":
                        return (
                          <WarningText>
                            <i18n.Translate>changed</i18n.Translate>
                          </WarningText>
                        );
                      case "new":
                      case "notfound":
                        return (
                          <DestructiveText>
                            <i18n.Translate>not accepted</i18n.Translate>
                          </DestructiveText>
                        );
                    }
                  }
                  return (
                    <tr key={idx}>
                      <td>{e.currency}</td>
                      <td>
                        <a href={e.exchangeBaseUrl}>{e.exchangeBaseUrl}</a>
                      </td>
                      <td>
                        <Status />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Fragment>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div />
          <LinkPrimary href={Pages.settings_exchange_add}>
            <i18n.Translate>Add an exchange</i18n.Translate>
          </LinkPrimary>
        </div>

        <h2>Troubleshooting</h2>
        <Checkbox
          label={<i18n.Translate>Developer mode</i18n.Translate>}
          name="devMode"
          description={
            <i18n.Translate>
              (More options and information useful for debugging)
            </i18n.Translate>
          }
          enabled={developerMode}
          onToggle={toggleDeveloperMode}
        />
      </section>
    </Fragment>
  );
}
