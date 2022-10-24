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
import { InputArray } from "./InputArray";
import { PAYTO_REGEX } from "../../utils/constants";
import { InputProps } from "./useField";

export type Props<T> = InputProps<T>;

const PAYTO_START_REGEX = /^payto:\/\//

export function InputPayto<T>({ name, readonly, placeholder, tooltip, label, help }: Props<keyof T>): VNode {
  return <InputArray<T> name={name} readonly={readonly} 
    addonBefore="payto://" 
    label={label} placeholder={placeholder} help={help} tooltip={tooltip}
    isValid={(v) => v && PAYTO_REGEX.test(v) }
    toStr={(v?: string) => !v ? '': v.replace(PAYTO_START_REGEX, '')}
    fromStr={(v: string) => `payto://${v}` }
  />
}

