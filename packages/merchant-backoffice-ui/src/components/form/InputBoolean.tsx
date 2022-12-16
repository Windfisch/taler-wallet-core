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
import { InputProps, useField } from "./useField.js";

interface Props<T> extends InputProps<T> {
  name: T;
  readonly?: boolean;
  expand?: boolean;
  threeState?: boolean;
  toBoolean?: (v?: any) => boolean | undefined;
  fromBoolean?: (s: boolean | undefined) => any;
}

const defaultToBoolean = (f?: any): boolean | undefined => f || ''
const defaultFromBoolean = (v: boolean | undefined): any => v as any


export function InputBoolean<T>({ name, readonly, placeholder, tooltip, label, help, threeState, expand, fromBoolean = defaultFromBoolean, toBoolean = defaultToBoolean }: Props<keyof T>): VNode {
  const { error, value, onChange } = useField<T>(name);

  const onCheckboxClick = (): void => {
    const c = toBoolean(value)
    if (c === false && threeState) return onChange(undefined as any)
    return onChange(fromBoolean(!c))
  }

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
        <p class={expand ? "control is-expanded" : "control"}>
          <label class="b-checkbox checkbox">
            <input type="checkbox" class={toBoolean(value) === undefined ? "is-indeterminate" : ""}
              checked={toBoolean(value)}
              placeholder={placeholder} readonly={readonly}
              name={String(name)} disabled={readonly}
              onChange={onCheckboxClick} />
            <span class="check" />
          </label>
          {help}
        </p>
        {error && <p class="help is-danger">{error}</p>}
      </div>
    </div>
  </div>;
}
