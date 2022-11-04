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
import { useConfigContext } from "../../context/config.js";
import { Amount } from "../../declaration.js";
import { InputWithAddon } from "./InputWithAddon.js";
import { InputProps } from "./useField.js";

export interface Props<T> extends InputProps<T> {
  expand?: boolean;
  addonAfter?: ComponentChildren;
  children?: ComponentChildren;
  side?: ComponentChildren;
}

export function InputCurrency<T>({ name, readonly, label, placeholder, help, tooltip, expand, addonAfter, children, side }: Props<keyof T>) {
  const config = useConfigContext()
  return <InputWithAddon<T> name={name} readonly={readonly} addonBefore={config.currency}
    side={side}
    label={label} placeholder={placeholder} help={help} tooltip={tooltip}
    addonAfter={addonAfter}
    inputType='number' expand={expand}
    toStr={(v?: Amount) => v?.split(':')[1] || ''}
    fromStr={(v: string) => !v ? '' : `${config.currency}:${v}`}
    inputExtra={{ min: 0 }}
    children={children}
  />
}

