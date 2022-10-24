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
import { InputProps, useField } from "./useField";

export interface Props<T> extends InputProps<T> {
  expand?: boolean;
  inputType?: 'text' | 'number';
  addonBefore?: ComponentChildren;
  addonAfter?: ComponentChildren;
  toStr?: (v?: any) => string;
  fromStr?: (s: string) => any;
  inputExtra?: any,
  children?: ComponentChildren,
  side?: ComponentChildren;
}

const defaultToString = (f?: any): string => f || ''
const defaultFromString = (v: string): any => v as any

export function InputWithAddon<T>({ name, readonly, addonBefore, children, expand, label, placeholder, help, tooltip, inputType, inputExtra, side, addonAfter, toStr = defaultToString, fromStr = defaultFromString }: Props<keyof T>): VNode {
  const { error, value, onChange, required } = useField<T>(name);

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
        <div class="field has-addons">
          {addonBefore && <div class="control">
            <a class="button is-static">{addonBefore}</a>
          </div>}
          <p class={`control${expand ? " is-expanded" :""}${required ? " has-icons-right" : ''}`}>
            <input {...(inputExtra || {})} class={error ? "input is-danger" : "input"} type={inputType}
              placeholder={placeholder} readonly={readonly}
              name={String(name)} value={toStr(value)}
              onChange={(e): void => onChange(fromStr(e.currentTarget.value))} />
            {required && <span class="icon has-text-danger is-right">
              <i class="mdi mdi-alert" />
            </span>}
            {help}
            {children}
          </p>
          {addonAfter && <div class="control">
            <a class="button is-static">{addonAfter}</a>
          </div>}
        </div>
        {error && <p class="help is-danger">{error}</p>}
      </div>
      {side}
    </div>
  </div>;
}
