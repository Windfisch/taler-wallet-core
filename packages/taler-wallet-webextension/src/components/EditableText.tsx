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
  onChange: (s: string) => Promise<void>;
  label: string;
  name: string;
  description?: string;
}
export function EditableText({ name, value, onChange, label, description }: Props): JSX.Element {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement>()
  let InputText;
  if (!editing) {
    InputText = () => <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <p>{value}</p>
      <button onClick={() => setEditing(true)}>edit</button>
    </div>
  } else {
    InputText = () => <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <input
        value={value}
        ref={ref}
        type="text"
        id={`text-${name}`}
      />
      <button onClick={() => { onChange(ref.current.value).then(r => setEditing(false)) }}>confirm</button>
    </div>
  }
  return (
    <div>
      <label
        htmlFor={`text-${name}`}
        style={{ marginLeft: "0.5em", fontWeight: "bold" }}
      >
        {label}
      </label>
      <InputText />
      {description && <span
        style={{
          color: "#383838",
          fontSize: "smaller",
          display: "block",
          marginLeft: "2em",
        }}
      >
        {description}
      </span>}
    </div>
  );
}