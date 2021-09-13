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
import { VNode, h } from "preact";
import { Checkbox } from "../components/Checkbox";
import { EditableText } from "../components/EditableText";
import { SelectList } from "../components/SelectList";
import { useDevContext } from "../context/devContext";
import { useBackupDeviceName } from "../hooks/useBackupDeviceName";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";
import { useLang } from "../hooks/useLang";

export function SettingsPage(): VNode {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();
  const { devMode, toggleDevMode } = useDevContext()
  const { name, update } = useBackupDeviceName()
  const [lang, changeLang] = useLang()
  return <SettingsView
    lang={lang} changeLang={changeLang}
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


export function SettingsView({ lang, changeLang, deviceName, setDeviceName, permissionsEnabled, togglePermissions, developerMode, toggleDeveloperMode }: ViewProps): VNode {
  return (
    <div>
      <section style={{ height: 300, overflow: 'auto' }}>
        <h2><i18n.Translate>Wallet</i18n.Translate></h2>
        <SelectList
          value={lang}
          onChange={changeLang}
          name="lang"
          list={names}
          label={i18n.str`Language`}
          description="(Choose your preferred lang)"
        />
        <EditableText
          value={deviceName}
          onChange={setDeviceName}
          name="device-id"
          label={i18n.str`Device name`}
          description="(This is how you will recognize the wallet in the backup provider)"
        />
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
    </div>
  )
}