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


import { VNode } from "preact";
import { Checkbox } from "../components/Checkbox";
import { useDevContext } from "../context/useDevContext";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";

export function SettingsPage(): VNode {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();
  const { devMode, toggleDevMode } = useDevContext()
  return <SettingsView 
    permissionsEnabled={permissionsEnabled} togglePermissions={togglePermissions}
    developerMode={devMode} toggleDeveloperMode={toggleDevMode}
  />;
}

export interface ViewProps {
  permissionsEnabled: boolean;
  togglePermissions: () => void;
  developerMode: boolean;
  toggleDeveloperMode: () => void;
}

export function SettingsView({permissionsEnabled, togglePermissions, developerMode, toggleDeveloperMode}: ViewProps): VNode {
  return (
    <div>
      <h2>Permissions</h2>
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
    </div>
  )
}