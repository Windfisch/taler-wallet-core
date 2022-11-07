/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { css } from "@linaria/core";
import { ComponentChildren, h, VNode } from "preact";
// eslint-disable-next-line import/extensions
import { Colors, theme } from "../style";
import { useFormControl } from "./FormControl.js";

export interface Props {
  class?: string;
  disabled?: boolean;
  error?: string;
  filled?: boolean;
  focused?: boolean;
  required?: boolean;
  color?: Colors;
  children?: ComponentChildren;
}

const root = css`
  color: ${theme.palette.text.secondary};
  line-height: 1.4375em;
  padding: 0px;
  position: relative;
  &[data-focused] {
    color: var(--color-main);
  }
  &[data-disabled] {
    color: ${theme.palette.text.disabled};
  }
  &[data-error] {
    color: ${theme.palette.error.main};
  }
`;

export function FormLabel({
  disabled,
  error,
  filled,
  focused,
  required,
  color,
  class: _class,
  children,
  ...rest
}: Props): VNode {
  const fcs = useFormControl({
    disabled,
    error,
    filled,
    focused,
    required,
    color,
  });
  return (
    <label
      data-focused={!fcs.focused ? undefined : true}
      data-error={!fcs.error ? undefined : true}
      data-disabled={!fcs.disabled ? undefined : true}
      class={[_class, root, theme.typography.body1].join(" ")}
      {...rest}
      style={{
        "--color-main": theme.palette[fcs.color].main,
      }}
    >
      {children}
      {fcs.required && (
        <span data-error={!fcs.error ? undefined : true}>&thinsp;{"*"}</span>
      )}
    </label>
  );
}
