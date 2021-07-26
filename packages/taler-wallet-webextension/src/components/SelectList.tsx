/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems SA

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { VNode } from "preact";
import { useRef, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

interface Props {
  value: string;
  onChange: (s: string) => void;
  label: string;
  list: {
    [label: string]: string
  }
  name: string;
  description?: string;
}

export function SelectList({ name, value, list, onChange, label, description }: Props): JSX.Element {
  return <select name={name} id="slct">
    <option selected disabled>Choose an option</option>
    {Object.keys(list)
      .filter((l) => l !== value)
      .map(key => <option value={key} key={key}>{list[key]}</option> )
    }
  </select>
}
