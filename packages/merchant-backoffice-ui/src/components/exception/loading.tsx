/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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

import { h, VNode } from "preact";

export function Loading(): VNode {
  return <div class="columns is-centered is-vcentered" style={{ height: 'calc(100% - 3rem)', position: 'absolute', width: '100%' }}>
    <Spinner />
  </div>
}

export function Spinner(): VNode {
  return <div class="lds-ring"><div /><div /><div /><div /></div>
}