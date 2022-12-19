/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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
import { useField, InputProps } from "./useField.js";

interface Props<T> extends InputProps<T> {
  inputType?: "text" | "number" | "multiline" | "password";
  expand?: boolean;
  toStr?: (v?: any) => string;
  fromStr?: (s: string) => any;
  inputExtra?: any;
  side?: ComponentChildren;
  children?: ComponentChildren;
}

const defaultToString = (f?: any): string => f || "";
const defaultFromString = (v: string): any => v as any;

const TextInput = ({ inputType, error, ...rest }: any) =>
  inputType === "multiline" ? (
    <textarea
      {...rest}
      class={error ? "textarea is-danger" : "textarea"}
      rows="3"
    />
  ) : (
    <input
      {...rest}
      class={error ? "input is-danger" : "input"}
      type={inputType}
    />
  );

export function Input<T>({
  name,
  readonly,
  placeholder,
  tooltip,
  label,
  expand,
  help,
  children,
  inputType,
  inputExtra,
  side,
  fromStr = defaultFromString,
  toStr = defaultToString,
}: Props<keyof T>): VNode {
  const { error, value, onChange, required } = useField<T>(name);
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
          <p
            class={
              expand
                ? "control is-expanded has-icons-right"
                : "control has-icons-right"
            }
          >
            <TextInput
              error={error}
              {...inputExtra}
              inputType={inputType}
              placeholder={placeholder}
              readonly={readonly}
              name={String(name)}
              value={toStr(value)}
              onChange={(e: h.JSX.TargetedEvent<HTMLInputElement>): void =>
                onChange(fromStr(e.currentTarget.value))
              }
            />
            {help}
            {children}
            {required && (
              <span class="icon has-text-danger is-right">
                <i class="mdi mdi-alert" />
              </span>
            )}
          </p>
          {error && <p class="help is-danger">{error}</p>}
        </div>
        {side}
      </div>
    </div>
  );
}
