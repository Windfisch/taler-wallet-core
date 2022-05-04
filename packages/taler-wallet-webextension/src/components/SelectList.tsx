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

import { Fragment, h, VNode } from "preact";
import { useTranslationContext } from "../context/translation.js";
import { NiceSelect } from "./styled/index.js";

interface Props {
  value?: string;
  onChange?: (s: string) => void;
  label: VNode;
  list: {
    [label: string]: string;
  };
  name: string;
  description?: string;
  canBeNull?: boolean;
  maxWidth?: boolean;
}

export function SelectList({
  name,
  value,
  list,
  onChange,
  label,
  maxWidth,
  description,
  canBeNull,
}: Props): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <label
        htmlFor={`text-${name}`}
        style={{ marginLeft: "0.5em", fontWeight: "bold" }}
      >
        {" "}
        {label}
      </label>
      <NiceSelect>
        <select
          name={name}
          value={value}
          style={maxWidth ? { width: "100%" } : undefined}
          onChange={(e) => {
            if (onChange) onChange(e.currentTarget.value);
          }}
        >
          {value === undefined ||
            (canBeNull && (
              <option selected disabled>
                <i18n.Translate>Select one option</i18n.Translate>
              </option>
              // ) : (
              //   <option selected>{list[value]}</option>
            ))}
          {Object.keys(list)
            // .filter((l) => l !== value)
            .map((key) => (
              <option value={key} key={key}>
                {list[key]}
              </option>
            ))}
        </select>
      </NiceSelect>
      {description && (
        <span
          style={{
            color: "#383838",
            fontSize: "smaller",
            display: "block",
            marginLeft: "2em",
          }}
        >
          {description}
        </span>
      )}
    </Fragment>
  );
}
