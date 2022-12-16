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
import { ComponentChildren, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useGroupField } from "./useGroupField.js";

export interface Props<T> {
  name: T;
  children: ComponentChildren;
  label: ComponentChildren;
  tooltip?: ComponentChildren;
  alternative?: ComponentChildren;
  fixed?: boolean;
  initialActive?: boolean;
}

export function InputGroup<T>({ name, label, children, tooltip, alternative, fixed, initialActive }: Props<keyof T>): VNode {
  const [active, setActive] = useState(initialActive || fixed);
  const group = useGroupField<T>(name);

  return <div class="card">
    <header class="card-header">
      <p class="card-header-title">
        {label}
        {tooltip && <span class="icon has-tooltip-right" data-tooltip={tooltip}>
          <i class="mdi mdi-information" />
        </span>}
        {group?.hasError && <span class="icon has-text-danger" data-tooltip={tooltip}>
          <i class="mdi mdi-alert" />
        </span>}
      </p>
      { !fixed && <button class="card-header-icon" aria-label="more options" onClick={(): void => setActive(!active)}>
        <span class="icon">
          {active ?
            <i class="mdi mdi-arrow-up" /> :
            <i class="mdi mdi-arrow-down" />}
        </span>
      </button> }
    </header>
    {active ? <div class="card-content">
        {children}
    </div> : (
      alternative ? <div class="card-content">
          {alternative}
      </div> : undefined
    )}
  </div>;
}
