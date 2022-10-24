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
import { intervalToDuration, formatDuration } from "date-fns";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Translate, useTranslator } from "../../i18n";
import { SimpleModal } from "../modal";
import { DurationPicker } from "../picker/DurationPicker";
import { InputProps, useField } from "./useField";

export interface Props<T> extends InputProps<T> {
  expand?: boolean;
  readonly?: boolean;
  withForever?: boolean;
}

export function InputDuration<T>({
  name,
  expand,
  placeholder,
  tooltip,
  label,
  help,
  readonly,
  withForever,
}: Props<keyof T>): VNode {
  const [opened, setOpened] = useState(false);
  const i18n = useTranslator();

  const { error, required, value, onChange } = useField<T>(name);
  let strValue = "";
  if (!value) {
    strValue = "";
  } else if (value.d_us === "forever") {
    strValue = i18n`forever`;
  } else {
    strValue = formatDuration(
      intervalToDuration({ start: 0, end: value.d_us / 1000 }),
      {
        locale: {
          formatDistance: (name, value) => {
            switch (name) {
              case "xMonths":
                return i18n`${value}M`;
              case "xYears":
                return i18n`${value}Y`;
              case "xDays":
                return i18n`${value}d`;
              case "xHours":
                return i18n`${value}h`;
              case "xMinutes":
                return i18n`${value}min`;
              case "xSeconds":
                return i18n`${value}sec`;
            }
          },
          localize: {
            day: () => "s",
            month: () => "m",
            ordinalNumber: () => "th",
            dayPeriod: () => "p",
            quarter: () => "w",
            era: () => "e",
          },
        },
      }
    );
  }

  return (
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">
          {label}
          {tooltip && (
            <span class="icon" data-tooltip={tooltip}>
              <i class="mdi mdi-information" />
            </span>
          )}
        </label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <div class="field has-addons">
            <p class={expand ? "control is-expanded " : "control "}>
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
                  <i class="mdi mdi-clock" />
                </span>
              </a>
            </div>
          </div>
          {error && <p class="help is-danger">{error}</p>}
        </div>
        {withForever && (
          <span data-tooltip={i18n`change value to never`}>
            <button
              class="button is-info mr-3"
              onClick={() => onChange({ d_us: "forever" } as any)}
            >
              <Translate>forever</Translate>
            </button>
          </span>
        )}
        {!readonly && (
          <span data-tooltip={i18n`change value to empty`}>
            <button
              class="button is-info "
              onClick={() => onChange(undefined as any)}
            >
              <Translate>clear</Translate>
            </button>
          </span>
        )}
      </div>
      {opened && (
        <SimpleModal onCancel={() => setOpened(false)}>
          <DurationPicker
            days
            hours
            minutes
            value={!value || value.d_us === "forever" ? 0 : value.d_us}
            onChange={(v) => {
              onChange({ d_us: v } as any);
            }}
          />
        </SimpleModal>
      )}
    </div>
  );
}
