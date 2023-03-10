/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { h, VNode } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

export interface TextInputProps {
  label: string;
  grabFocus?: boolean;
  error?: string;
  placeholder?: string;
  tooltip?: string;
  onConfirm?: () => void;
  bind: [string, (x: string) => void];
}

export function PhoneNumberInput(props: TextInputProps): VNode {
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (props.grabFocus) {
      inputRef.current?.focus();
    }
  }, [props.grabFocus]);
  const value = props.bind[0];
  const [dirty, setDirty] = useState(false);
  const showError = dirty && props.error;
  return (
    <div class="field">
      <label class="label">
        {props.label}
        {props.tooltip && (
          <span class="icon has-tooltip-right" data-tooltip={props.tooltip}>
            <i class="mdi mdi-information" />
          </span>
        )}
      </label>
      <div class="control has-icons-right">
        <input
          value={value}
          type="tel"
          placeholder={props.placeholder}
          class={showError ? "input is-danger" : "input"}
          onKeyPress={(e) => {
            if (e.key === "Enter" && props.onConfirm) {
              props.onConfirm();
            }
          }}
          onInput={(e) => {
            setDirty(true);
            props.bind[1]((e.target as HTMLInputElement).value);
          }}
          ref={inputRef}
          style={{ display: "block" }}
        />
      </div>
      {showError && <p class="help is-danger">{props.error}</p>}
    </div>
  );
}
