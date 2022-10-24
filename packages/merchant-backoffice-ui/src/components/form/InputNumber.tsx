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
import { ComponentChildren, h } from "preact";
import { InputWithAddon } from "./InputWithAddon";
import { InputProps } from "./useField";

export interface Props<T> extends InputProps<T> {
  readonly?: boolean;
  expand?: boolean;
  side?: ComponentChildren;
  children?: ComponentChildren;
}

export function InputNumber<T>({ name, readonly, placeholder, tooltip, label, help, expand, children, side }: Props<keyof T>) {
  return <InputWithAddon<T> name={name} readonly={readonly} 
    fromStr={(v) => !v ? undefined : parseInt(v, 10) } toStr={(v) => `${v}`}
    inputType='number' expand={expand}
    label={label} placeholder={placeholder} help={help} tooltip={tooltip}
    inputExtra={{ min: 0 }}
    children={children}
    side={side}
  />
}
