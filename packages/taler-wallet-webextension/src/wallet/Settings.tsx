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

import { ExchangeListItem, WalletCoreVersion } from "@gnu-taler/taler-util";
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
import { useAutoOpenPermissions } from "../hooks/useAutoOpenPermissions.js";
import { ToggleHandler } from "../mui/handlers.js";
import { Pages } from "../NavigationBar.js";
import { buildTermsOfServiceStatus } from "../components/TermsOfService/utils.js";
import * as wxApi from "../wxApi.js";
import { platform } from "../platform/api.js";
import { useClipboardPermissions } from "../hooks/useClipboardPermissions.js";

const GIT_HASH = typeof __GIT_HASH__ !== "undefined" ? __GIT_HASH__ : undefined;

export function SettingsPage(): VNode {
  const autoOpenToggle = useAutoOpenPermissions();
  const clipboardToggle = useClipboardPermissions();
  const { devMode, toggleDevMode } = useDevContext();
  const { name, update } = useBackupDeviceName();
  const webex = platform.getWalletWebExVersion();

  const exchangesHook = useAsyncAsHook(async () => {
    const list = await wxApi.listExchanges();
    const version = await wxApi.getVersion();
    return { exchanges: list.exchanges, version };
  });
  const { exchanges, version } =
    !exchangesHook || exchangesHook.hasError
      ? { exchanges: [], version: undefined }
      : exchangesHook.response;

  return (
    <SettingsView
      knownExchanges={exchanges}
      deviceName={name}
      setDeviceName={update}
      autoOpenToggle={autoOpenToggle}
      clipboardToggle={clipboardToggle}
      developerMode={devMode}
      toggleDeveloperMode={toggleDevMode}
      webexVersion={{
        version: webex.version,
        hash: GIT_HASH,
      }}
      coreVersion={version}
    />
  );
}

export interface ViewProps {
  deviceName: string;
  setDeviceName: (s: string) => Promise<void>;
  autoOpenToggle: ToggleHandler;
  clipboardToggle: ToggleHandler;
  developerMode: boolean;
  toggleDeveloperMode: () => Promise<void>;
  knownExchanges: Array<ExchangeListItem>;
  coreVersion: WalletCoreVersion | undefined;
  webexVersion: {
    version: string;
    hash: string | undefined;
  };
}

export function SettingsView({
  knownExchanges,
  autoOpenToggle,
  clipboardToggle,
  developerMode,
  coreVersion,
  webexVersion,
  toggleDeveloperMode,
}: ViewProps): VNode {
  const { i18n, lang, supportedLang, changeLanguage } = useTranslationContext();

  return (
    <Fragment>
      <section>
        {autoOpenToggle.button.error && (
          <ErrorTalerOperation
            title={<i18n.Translate>Could not toggle auto-open</i18n.Translate>}
            error={autoOpenToggle.button.error.errorDetail}
          />
        )}
        {clipboardToggle.button.error && (
          <ErrorTalerOperation
            title={<i18n.Translate>Could not toggle clipboard</i18n.Translate>}
            error={clipboardToggle.button.error.errorDetail}
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
          name="autoOpen"
          description={
            <i18n.Translate>
              Enabling this option below will make using the wallet faster, but
              requires more permissions from your browser.
            </i18n.Translate>
          }
          enabled={autoOpenToggle.value!}
          onToggle={autoOpenToggle.button.onClick!}
        />
        <Checkbox
          label={
            <i18n.Translate>
              Automatically check clipboard for Taler URI
            </i18n.Translate>
          }
          name="clipboard"
          description={
            <i18n.Translate>
              Enabling this option below will make using the wallet faster, but
              requires more permissions from your browser.
            </i18n.Translate>
          }
          enabled={clipboardToggle.value!}
          onToggle={clipboardToggle.button.onClick!}
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

        <SubTitle>
          <i18n.Translate>Troubleshooting</i18n.Translate>
        </SubTitle>
        <Checkbox
          label={<i18n.Translate>Developer mode</i18n.Translate>}
          name="devMode"
          description={
            <i18n.Translate>
              More options and information useful for debugging
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
        {coreVersion && (
          <Part
            title={<i18n.Translate>Wallet Core</i18n.Translate>}
            text={
              <span>
                {coreVersion.version}{" "}
                <JustInDevMode>{coreVersion.hash}</JustInDevMode>
              </span>
            }
          />
        )}
        <Part
          title={<i18n.Translate>Web Extension</i18n.Translate>}
          text={
            <span>
              {webexVersion.version}{" "}
              <JustInDevMode>{webexVersion.hash}</JustInDevMode>
            </span>
          }
        />
        {coreVersion && (
          <JustInDevMode>
            <Part
              title={<i18n.Translate>Exchange compatibility</i18n.Translate>}
              text={<span>{coreVersion.exchange}</span>}
            />
            <Part
              title={<i18n.Translate>Merchant compatibility</i18n.Translate>}
              text={<span>{coreVersion.merchant}</span>}
            />
            <Part
              title={<i18n.Translate>Bank compatibility</i18n.Translate>}
              text={<span>{coreVersion.bank}</span>}
            />
          </JustInDevMode>
        )}
      </section>
    </Fragment>
  );
}
