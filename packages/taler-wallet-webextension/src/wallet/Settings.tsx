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

import { ExchangeListItem } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../components/Checkbox.js";
import { ErrorTalerOperation } from "../components/ErrorTalerOperation.js";
import { JustInDevMode } from "../components/JustInDevMode.js";
import { Part } from "../components/Part.js";
import { SelectList } from "../components/SelectList.js";
import {
  DestructiveText,
  Input,
  LinkPrimary,
  SubTitle,
  SuccessText,
  WarningText,
} from "../components/styled/index.js";
import { useDevContext } from "../context/devContext.js";
import { useTranslationContext } from "../context/translation.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { useBackupDeviceName } from "../hooks/useBackupDeviceName.js";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions.js";
import { ToggleHandler } from "../mui/handlers.js";
import { Pages } from "../NavigationBar.js";
import { buildTermsOfServiceStatus } from "../utils/index.js";
import * as wxApi from "../wxApi.js";

export function SettingsPage(): VNode {
  const permissionToggle = useExtendedPermissions();
  const { devMode, toggleDevMode } = useDevContext();
  const { name, update } = useBackupDeviceName();

  const exchangesHook = useAsyncAsHook(wxApi.listExchanges);

  return (
    <SettingsView
      knownExchanges={
        !exchangesHook || exchangesHook.hasError
          ? []
          : exchangesHook.response.exchanges
      }
      deviceName={name}
      setDeviceName={update}
      permissionToggle={permissionToggle}
      developerMode={devMode}
      toggleDeveloperMode={toggleDevMode}
    />
  );
}

export interface ViewProps {
  deviceName: string;
  setDeviceName: (s: string) => Promise<void>;
  permissionToggle: ToggleHandler;
  developerMode: boolean;
  toggleDeveloperMode: () => Promise<void>;
  knownExchanges: Array<ExchangeListItem>;
}
const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
const GIT_HASH = typeof __GIT_HASH__ !== "undefined" ? __GIT_HASH__ : undefined;

export function SettingsView({
  knownExchanges,
  permissionToggle,
  developerMode,
  toggleDeveloperMode,
}: ViewProps): VNode {
  const { i18n, lang, supportedLang, changeLanguage } = useTranslationContext();

  return (
    <Fragment>
      <section>
        {permissionToggle.button.error && (
          <ErrorTalerOperation
            title={<i18n.Translate>Could not toggle auto-open</i18n.Translate>}
            error={permissionToggle.button.error.errorDetail}
          />
        )}
        <SubTitle>
          <i18n.Translate>Navigator</i18n.Translate>
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
              Enabling this option below will make using the wallet faster, but
              requires more permissions from your browser.
            </i18n.Translate>
          }
          enabled={permissionToggle.value!}
          onToggle={permissionToggle.button.onClick!}
        />

        <SubTitle>
          <i18n.Translate>Trust</i18n.Translate>
        </SubTitle>
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
          <LinkPrimary href={Pages.settingsExchangeAdd({})}>
            <i18n.Translate>Add an exchange</i18n.Translate>
          </LinkPrimary>
        </div>

        <SubTitle>Troubleshooting</SubTitle>
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

        <JustInDevMode>
          <SubTitle>
            <i18n.Translate>Display</i18n.Translate>
          </SubTitle>
          <Input>
            <SelectList
              label={<i18n.Translate>Current Language</i18n.Translate>}
              list={supportedLang}
              name="lang"
              value={lang}
              onChange={(v) => changeLanguage(v)}
            />
          </Input>
        </JustInDevMode>
        <SubTitle>
          <i18n.Translate>Version</i18n.Translate>
        </SubTitle>
        <Part
          title={<i18n.Translate>Release</i18n.Translate>}
          text={<span>{VERSION}</span>}
        />
        {GIT_HASH && (
          <Part
            title={<i18n.Translate>Hash</i18n.Translate>}
            text={<span>{GIT_HASH}</span>}
          />
        )}
      </section>
    </Fragment>
  );
}
