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


import { PermissionsCheckbox } from "../components/PermissionsCheckbox";
import { useExtendedPermissions } from "../hooks/useExtendedPermissions";


export function SettingsPage() {
  const [permissionsEnabled, togglePermissions] = useExtendedPermissions();
  return (
    <div>
      <h2>Permissions</h2>
      <PermissionsCheckbox enabled={permissionsEnabled} onToggle={togglePermissions} />
      {/*
            <h2>Developer mode</h2>
            <DebugCheckbox enabled={permissionsEnabled} onToggle={togglePermissions} />
            */}
    </div>
  );
}
