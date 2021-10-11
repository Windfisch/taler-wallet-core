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


import { ExchangeListItem, i18n } from "@gnu-taler/taler-util";
import { VNode, h, Fragment } from "preact";
import { Checkbox } from "../components/Checkbox";
import { EditableText } from "../components/EditableText";
import { SelectList } from "../components/SelectList";
import { ButtonPrimary, ButtonSuccess, WalletBox } from "../components/styled";
import { useDevContext } from "../context/devContext";
import { useBackupDeviceName } from "../hooks/useBackupDeviceName";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { useLang } from "../hooks/useLang";
import * as wxApi from "../wxApi";

export function SettingsPage(): VNode {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();
  const { devMode, toggleDevMode } = useDevContext()
  const { name, update } = useBackupDeviceName()
  const [lang, changeLang] = useLang()
  const exchangesHook = useAsyncAsHook(() => wxApi.listExchanges());

  return <SettingsView
    lang={lang} changeLang={changeLang}
    knownExchanges={!exchangesHook || exchangesHook.hasError ? [] : exchangesHook.response.exchanges}
    deviceName={name} setDeviceName={update}
    permissionsEnabled={permissionsEnabled} togglePermissions={togglePermissions}
    developerMode={devMode} toggleDeveloperMode={toggleDevMode}
  />;
}

export interface ViewProps {
  lang: string;
  changeLang: (s: string) => void;
  deviceName: string;
  setDeviceName: (s: string) => Promise<void>;
  permissionsEnabled: boolean;
  togglePermissions: () => void;
  developerMode: boolean;
  toggleDeveloperMode: () => void;
  knownExchanges: Array<ExchangeListItem>;
}

import { strings as messages } from '../i18n/strings'

type LangsNames = {
  [P in keyof typeof messages]: string
}

const names: LangsNames = {
  es: 'Español [es]',
  en: 'English [en]',
  fr: 'Français [fr]',
  de: 'Deutsch [de]',
  sv: 'Svenska [sv]',
  it: 'Italiano [it]',
}


export function SettingsView({ knownExchanges, lang, changeLang, deviceName, setDeviceName, permissionsEnabled, togglePermissions, developerMode, toggleDeveloperMode }: ViewProps): VNode {
  return (
    <WalletBox>
      <section>

        <h2><i18n.Translate>Known exchanges</i18n.Translate></h2>
        {!knownExchanges || !knownExchanges.length ? <div>
          No exchange yet!
        </div> :
          <dl>
            {knownExchanges.map(e => <Fragment>
              <dt>{e.currency}</dt>
              <dd>{e.exchangeBaseUrl}</dd>
              <dd>{e.paytoUris}</dd>
            </Fragment>)}
          </dl>
        }
        <ButtonPrimary>add exchange</ButtonPrimary>
        <h2><i18n.Translate>Permissions</i18n.Translate></h2>
        <Checkbox label="Automatically open wallet based on page content"
          name="perm"
          description="(Enabling this option below will make using the wallet faster, but requires more permissions from your browser.)"
          enabled={permissionsEnabled} onToggle={togglePermissions}
        />
        <h2>Config</h2>
        <Checkbox label="Developer mode"
          name="devMode"
          description="(More options and information useful for debugging)"
          enabled={developerMode} onToggle={toggleDeveloperMode}
        />
      </section>
    </WalletBox>
  )
}