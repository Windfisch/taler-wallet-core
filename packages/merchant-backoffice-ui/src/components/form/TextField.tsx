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
import { useField, InputProps } from "./useField";

interface Props<T> extends InputProps<T> {
  inputType?: 'text' | 'number' | 'multiline' | 'password';
  expand?: boolean;
  side?: ComponentChildren;
  children: ComponentChildren;
}

export function TextField<T>({ name, tooltip, label, expand, help, children, side}: Props<keyof T>): VNode {
  const { error } = useField<T>(name);
  return <div class="field is-horizontal">
    <div class="field-label is-normal">
      <label class="label">
        {label}
        {tooltip && <span class="icon has-tooltip-right" data-tooltip={tooltip}>
          <i class="mdi mdi-information" />
        </span>}
      </label>
    </div>
    <div class="field-body is-flex-grow-3">
      <div class="field">
        <p class={expand ? "control is-expanded has-icons-right" : "control has-icons-right"}>
          {children}          
          {help}
        </p>
        {error && <p class="help is-danger">{error}</p>}
      </div>
      {side}
    </div>
  </div>;
}
