/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { h, VNode } from 'preact';
import { Translate } from '../../i18n';

interface Props {
  mobile?: boolean;
}

export function Sidebar({ mobile }: Props): VNode {
  // const config = useConfigContext();
  const config = { version: 'none' };
  // FIXME: add replacement for __VERSION__ with the current version
  const process = { env: { __VERSION__: '0.0.0' } };

  return (
    <aside class="aside is-placed-left is-expanded">
      <div class="aside-tools">
        <div class="aside-tools-label">
          <div>
            <b>euFin bank</b>
          </div>
          <div
            class="is-size-7 has-text-right"
            style={{ lineHeight: 0, marginTop: -10 }}
          >
            Version {process.env.__VERSION__} ({config.version})
          </div>
        </div>
      </div>
      <div class="menu is-menu-main">
        <p class="menu-label">
          <Translate>Bank menu</Translate>
        </p>
        <ul class="menu-list">
          <li>
            <div class="ml-4">
              <span class="menu-item-label">
                <Translate>Select option1</Translate>
              </span>
            </div>
          </li>
          <li>
            <div class="ml-4">
              <span class="menu-item-label">
                <Translate>Select option2</Translate>
              </span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  );
}
