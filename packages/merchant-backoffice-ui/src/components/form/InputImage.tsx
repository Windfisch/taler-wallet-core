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
import { useRef, useState } from "preact/hooks";
import { Translate } from "../../i18n/index.js";
import { MAX_IMAGE_SIZE as MAX_IMAGE_UPLOAD_SIZE } from "../../utils/constants.js";
import { InputProps, useField } from "./useField.js";

export interface Props<T> extends InputProps<T> {
  expand?: boolean;
  addonAfter?: ComponentChildren;
  children?: ComponentChildren;
}

export function InputImage<T>({ name, readonly, placeholder, tooltip, label, help, children, expand }: Props<keyof T>): VNode {
  const { error, value, onChange } = useField<T>(name);

  const image = useRef<HTMLInputElement>(null)

  const [sizeError, setSizeError] = useState(false)

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
          {value &&
            <img src={value} style={{ width: 200, height: 200 }} onClick={() => image.current?.click()} />
          }
          <input
            ref={image} style={{ display: 'none' }}
            type="file" name={String(name)}
            placeholder={placeholder} readonly={readonly}
            onChange={e => {
              const f: FileList | null = e.currentTarget.files
              if (!f || f.length != 1) {
                return onChange(undefined!)
              }
              if (f[0].size > MAX_IMAGE_UPLOAD_SIZE) {
                setSizeError(true)
                return onChange(undefined!)
              }
              setSizeError(false)
              return f[0].arrayBuffer().then(b => {
                const b64 = btoa(
                  new Uint8Array(b)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
                )
                return onChange(`data:${f[0].type};base64,${b64}` as any)
              })
            }} />
          {help}
          {children}
        </p>
        {error && <p class="help is-danger">{error}</p>}
        {sizeError && <p class="help is-danger">
          <Translate>Image should be smaller than 1 MB</Translate>
        </p>}
        {!value &&
          <button class="button" onClick={() => image.current?.click()} ><Translate>Add</Translate></button>
        }
        {value &&
          <button class="button" onClick={() => onChange(undefined!)} ><Translate>Remove</Translate></button>
        }
      </div>
    </div>
  </div>
}

