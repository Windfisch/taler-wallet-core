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
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Translate, useTranslator } from "../../i18n/index.js";
import { InputProps, useField } from "./useField.js";

export interface Props<T> extends InputProps<T> {
  isValid?: (e: any) => boolean;
  addonBefore?: string;
  toStr?: (v?: any) => string;
  fromStr?: (s: string) => any;
}

const defaultToString = (f?: any): string => f || "";
const defaultFromString = (v: string): any => v as any;

export function InputArray<T>({
  name,
  readonly,
  placeholder,
  tooltip,
  label,
  help,
  addonBefore,
  isValid = () => true,
  fromStr = defaultFromString,
  toStr = defaultToString,
}: Props<keyof T>): VNode {
  const { error: formError, value, onChange, required } = useField<T>(name);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError || formError;

  const array: any[] = (value ? value! : []) as any;
  const [currentValue, setCurrentValue] = useState("");
  const i18n = useTranslator();

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
          <div class="field has-addons">
            {addonBefore && (
              <div class="control">
                <a class="button is-static">{addonBefore}</a>
              </div>
            )}
            <p class="control is-expanded has-icons-right">
              <input
                class={error ? "input is-danger" : "input"}
                type="text"
                placeholder={placeholder}
                readonly={readonly}
                disabled={readonly}
                name={String(name)}
                value={currentValue}
                onChange={(e): void => setCurrentValue(e.currentTarget.value)}
              />
              {required && (
                <span class="icon has-text-danger is-right">
                  <i class="mdi mdi-alert" />
                </span>
              )}
            </p>
            <p class="control">
              <button
                class="button is-info has-tooltip-left"
                disabled={!currentValue}
                onClick={(): void => {
                  const v = fromStr(currentValue);
                  if (!isValid(v)) {
                    setLocalError(
                      i18n`The value ${v} is invalid for a payment url`,
                    );
                    return;
                  }
                  setLocalError(null);
                  onChange([v, ...array] as any);
                  setCurrentValue("");
                }}
                data-tooltip={i18n`add element to the list`}
              >
                <Translate>add</Translate>
              </button>
            </p>
          </div>
          {help}
          {error && <p class="help is-danger"> {error} </p>}
          {array.map((v, i) => (
            <div key={i} class="tags has-addons mt-3 mb-0">
              <span
                class="tag is-medium is-info mb-0"
                style={{ maxWidth: "90%" }}
              >
                {v}
              </span>
              <a
                class="tag is-medium is-danger is-delete mb-0"
                onClick={() => {
                  onChange(array.filter((f) => f !== v) as any);
                  setCurrentValue(toStr(v));
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
