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
import { LangSelector } from './LangSelector';

interface Props {
  mobile?: boolean;
}

export function Sidebar({ mobile }: Props): VNode {
  // const config = useConfigContext();
  const config = { version: 'none' }
  const process = { env : { __VERSION__: '0.0.0'}}
  
  return (
    <aside class="aside is-placed-left is-expanded">
      {mobile && <div class="footer" onClick={(e) => { return e.stopImmediatePropagation() }}>
        <LangSelector />
      </div>}
      <div class="aside-tools">
        <div class="aside-tools-label">
          <div><b>Anastasis</b> Reducer</div>
          <div class="is-size-7 has-text-right" style={{ lineHeight: 0, marginTop: -10 }}>
            {process.env.__VERSION__} ({config.version})
          </div>
        </div>
      </div>
      <div class="menu is-menu-main">
        <p class="menu-label">
          <Translate>Back up a secret</Translate>
        </p>
        <ul class="menu-list">
          <li>
            <div class="has-icon">
              <span class="icon"><i class="mdi mdi-square-edit-outline" /></span>
              <span class="menu-item-label"><Translate>Location &amp; Currency</Translate></span>
            </div>
          </li>
          <li class="is-active">
            <div class="has-icon">
              <span class="icon"><i class="mdi mdi-cash-register" /></span>
              <span class="menu-item-label"><Translate>Personal information</Translate></span>
            </div>
          </li>
          <li>
            <div class="has-icon">
              <span class="icon"><i class="mdi mdi-shopping" /></span>
              <span class="menu-item-label"><Translate>Authorization methods</Translate></span>
            </div>
          </li>
          <li>
            <div  class="has-icon">
              <span class="icon"><i class="mdi mdi-bank" /></span>
              <span class="menu-item-label"><Translate>Recovery policies</Translate></span>
            </div>
          </li>
          <li>
            <div  class="has-icon">
              <span class="icon"><i class="mdi mdi-bank" /></span>
              <span class="menu-item-label"><Translate>Enter secrets</Translate></span>
            </div>
          </li>
          <li>
            <div  class="has-icon">
              <span class="icon"><i class="mdi mdi-bank" /></span>
              <span class="menu-item-label"><Translate>Payment (optional)</Translate></span>
            </div>
          </li>
          <li>
            <div  class="has-icon">
              <span class="icon"><i class="mdi mdi-cash" /></span>
              <span class="menu-item-label">Backup completed</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  );
}

