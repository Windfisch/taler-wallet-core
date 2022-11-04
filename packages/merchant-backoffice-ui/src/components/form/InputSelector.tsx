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
import { h, VNode } from "preact";
import { InputProps, useField } from "./useField.js";

interface Props<T> extends InputProps<T> {
  readonly?: boolean;
  expand?: boolean;
  values: string[];
  toStr?: (v?: any) => string;
  fromStr?: (s: string) => any;
}

const defaultToString = (f?: any): string => f || "";
const defaultFromString = (v: string): any => v as any;

export function InputSelector<T>({
  name,
  readonly,
  expand,
  placeholder,
  tooltip,
  label,
  help,
  values,
  toStr = defaultToString,
}: Props<keyof T>): VNode {
  const { error, value, onChange } = useField<T>(name);

  return (
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">
          {label}
          {tooltip && (
            <span class="icon has-tooltip-right" data-tooltip={tooltip}>
              <i class="mdi mdi-information" />
            </span>
          )}
        </label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class={expand ? "control is-expanded select" : "control select"}>
            <select
              class={error ? "select is-danger" : "select"}
              name={String(name)}
              disabled={readonly}
              readonly={readonly}
              onChange={(e) => {
                onChange(e.currentTarget.value as any);
              }}
            >
              {placeholder && <option>{placeholder}</option>}
              {values.map((v, i) => (
                <option key={i} value={v} selected={value === v}>
                  {toStr(v)}
                </option>
              ))}
            </select>
            {help}
          </p>
          {error && <p class="help is-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
