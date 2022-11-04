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
import logo from '../../assets/logo.jpeg';
import { LangSelector } from "./LangSelector.js";

interface Props {
  onMobileMenu: () => void;
  title: string;
}

export function NavigationBar({ onMobileMenu, title }: Props): VNode {
  return (<nav class="navbar is-fixed-top" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <span class="navbar-item" style={{ fontSize: 24, fontWeight: 900 }}>{title}</span>

      <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" onClick={(e) => {
        onMobileMenu()
        e.stopPropagation()
      }}>
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </a>
    </div>

    <div class="navbar-menu ">
      <a class="navbar-start is-justify-content-center is-flex-grow-1" href="https://taler.net">
        <img src={logo} style={{ height: 50, maxHeight: 50 }} />
      </a>
      <div class="navbar-end">
        <div class="navbar-item" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <LangSelector />
        </div>
      </div>
    </div>
  </nav>
  );
}