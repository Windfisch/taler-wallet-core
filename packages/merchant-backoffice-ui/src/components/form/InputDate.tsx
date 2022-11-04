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
import { format } from "date-fns";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Translate, useTranslator } from "../../i18n/index.js";
import { DatePicker } from "../picker/DatePicker.js";
import { InputProps, useField } from "./useField.js";

export interface Props<T> extends InputProps<T> {
  readonly?: boolean;
  expand?: boolean;
  //FIXME: create separated components InputDate and InputTimestamp
  withTimestampSupport?: boolean;
}

export function InputDate<T>({
  name,
  readonly,
  label,
  placeholder,
  help,
  tooltip,
  expand,
  withTimestampSupport,
}: Props<keyof T>): VNode {
  const [opened, setOpened] = useState(false);
  const i18n = useTranslator();

  const { error, required, value, onChange } = useField<T>(name);

  let strValue = "";
  if (!value) {
    strValue = withTimestampSupport ? "unknown" : "";
  } else if (value instanceof Date) {
    strValue = format(value, "yyyy/MM/dd");
  } else if (value.t_s) {
    strValue =
      value.t_s === "never"
        ? withTimestampSupport
          ? "never"
          : ""
        : format(new Date(value.t_s * 1000), "yyyy/MM/dd");
  }

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
            <p
              class={
                expand
                  ? "control is-expanded has-icons-right"
                  : "control has-icons-right"
              }
            >
              <input
                class="input"
                type="text"
                readonly
                value={strValue}
                placeholder={placeholder}
                onClick={() => {
                  if (!readonly) setOpened(true);
                }}
              />
              {required && (
                <span class="icon has-text-danger is-right">
                  <i class="mdi mdi-alert" />
                </span>
              )}
              {help}
            </p>
            <div
              class="control"
              onClick={() => {
                if (!readonly) setOpened(true);
              }}
            >
              <a class="button is-static">
                <span class="icon">
                  <i class="mdi mdi-calendar" />
                </span>
              </a>
            </div>
          </div>
          {error && <p class="help is-danger">{error}</p>}
        </div>

        {!readonly && (
          <span
            data-tooltip={
              withTimestampSupport
                ? i18n`change value to unknown date`
                : i18n`change value to empty`
            }
          >
            <button
              class="button is-info mr-3"
              onClick={() => onChange(undefined as any)}
            >
              <Translate>clear</Translate>
            </button>
          </span>
        )}
        {withTimestampSupport && (
          <span data-tooltip={i18n`change value to never`}>
            <button
              class="button is-info"
              onClick={() => onChange({ t_s: "never" } as any)}
            >
              <Translate>never</Translate>
            </button>
          </span>
        )}
      </div>
      <DatePicker
        opened={opened}
        closeFunction={() => setOpened(false)}
        dateReceiver={(d) => {
          if (withTimestampSupport) {
            onChange({ t_s: d.getTime() / 1000 } as any);
          } else {
            onChange(d as any);
          }
        }}
      />
    </div>
  );
}
