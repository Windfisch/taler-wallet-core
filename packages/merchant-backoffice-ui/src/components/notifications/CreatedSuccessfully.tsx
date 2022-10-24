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
import { ComponentChildren, h, VNode } from "preact";

interface Props {
  onCreateAnother?: () => void;
  onConfirm: () => void;
  children: ComponentChildren;
}

export function CreatedSuccessfully({ children, onConfirm, onCreateAnother }: Props): VNode {
  return <div class="columns is-fullwidth is-vcentered mt-3">
    <div class="column" />
    <div class="column is-four-fifths">
      <div class="card">
        <header class="card-header has-background-success">
          <p class="card-header-title has-text-white-ter">
            Success.
          </p>
        </header>
        <div class="card-content">
          {children}
        </div>
      </div>
        <div class="buttons is-right">
          {onCreateAnother && <button class="button is-info" onClick={onCreateAnother}>Create another</button>}
          <button class="button is-info" onClick={onConfirm}>Continue</button>
        </div>
    </div>
    <div class="column" />
  </div>
}
