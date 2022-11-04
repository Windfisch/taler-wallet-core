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
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Translate, useTranslator } from "../../i18n/index.js";
import { InputProps, useField } from "./useField.js";

export type Props<T> = InputProps<T>;

const TokenStatus = ({ prev, post }: any) => {
  if ((prev === undefined || prev === null) && (post === undefined || post === null))
    return null
  return (prev === post) ? null : (
    post === null ?
      <span class="tag is-danger is-align-self-center ml-2"><Translate>Deleting</Translate></span> :
      <span class="tag is-warning is-align-self-center ml-2"><Translate>Changing</Translate></span>
  )
}

export function InputSecured<T>({ name, readonly, placeholder, tooltip, label, help }: Props<keyof T>): VNode {
  const { error, value, initial, onChange, toStr, fromStr } = useField<T>(name);

  const [active, setActive] = useState(false);
  const [newValue, setNuewValue] = useState("")

  const i18n = useTranslator()

  return <Fragment>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">
          {label}
          {tooltip && <span class="icon has-tooltip-right" data-tooltip={tooltip}>
            <i class="mdi mdi-information" />
          </span>}
        </label>
      </div>
      <div class="field-body is-flex-grow-3">
        {!active ?
          <Fragment>
            <div class="field has-addons">
              <button class="button" 
                onClick={(): void => { setActive(!active); }} >
                <div class="icon is-left"><i class="mdi mdi-lock-reset" /></div>
                <span><Translate>Manage access token</Translate></span>
              </button>
              <TokenStatus prev={initial} post={value} />
            </div>
          </Fragment> :
          <Fragment>
            <div class="field has-addons">
              <div class="control">
                <a class="button is-static">secret-token:</a>
              </div>
              <div class="control is-expanded">
                <input class="input" type="text"
                  placeholder={placeholder} readonly={readonly || !active}
                  disabled={readonly || !active}
                  name={String(name)} value={newValue}
                  onInput={(e): void => {
                    setNuewValue(e.currentTarget.value)
                  }} />
                {help}
              </div>
              <div class="control">
                <button class="button is-info" disabled={fromStr(newValue) === value} onClick={(): void => { onChange(fromStr(newValue)); setActive(!active); setNuewValue(""); }} >
                  <div class="icon is-left"><i class="mdi mdi-lock-outline" /></div>
                  <span><Translate>Update</Translate></span>
                </button>
              </div>
            </div>
          </Fragment>
        }
        {error ? <p class="help is-danger">{error}</p> : null}
      </div>
    </div>
    {active &&
      <div class="field is-horizontal">
        <div class="field-body is-flex-grow-3">
          <div class="level" style={{ width: '100%' }}>
            <div class="level-right is-flex-grow-1">
              <div class="level-item">
                <button class="button is-danger" disabled={null === value || undefined === value} onClick={(): void => { onChange(null!); setActive(!active); setNuewValue(""); }} >
                  <div class="icon is-left"><i class="mdi mdi-lock-open-variant" /></div>
                  <span><Translate>Remove</Translate></span>
                </button>
              </div>
              <div class="level-item">
                <button class="button " onClick={(): void => { onChange(initial!); setActive(!active); setNuewValue(""); }} >
                  <div class="icon is-left"><i class="mdi mdi-lock-open-variant" /></div>
                  <span><Translate>Cancel</Translate></span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    }
  </Fragment >;
}
