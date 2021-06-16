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

import { JSX } from "preact/jsx-runtime";

export function PermissionsCheckbox({ enabled, onToggle }: { enabled: boolean; onToggle: () => void; }): JSX.Element {
  return (
    <div>
      <input
        checked={enabled}
        onClick={onToggle}
        type="checkbox"
        id="checkbox-perm"
        style={{ width: "1.5em", height: "1.5em", verticalAlign: "middle" }} />
      <label
        htmlFor="checkbox-perm"
        style={{ marginLeft: "0.5em", fontWeight: "bold" }}
      >
        Automatically open wallet based on page content
      </label>
      <span
        style={{
          color: "#383838",
          fontSize: "smaller",
          display: "block",
          marginLeft: "2em",
        }}
      >
        (Enabling this option below will make using the wallet faster, but
        requires more permissions from your browser.)
      </span>
    </div>
  );
}
