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
import { theme } from "../style";
import { useFormControl } from "./FormControl.js";

const root = css`
  color: ${theme.palette.text.secondary};
  text-align: left;
  margin-top: 3px;
  margin-bottom: 0px;
  margin-right: 0px;
  margin-left: 0px;
`;
const disabledStyle = css`
  color: ${theme.palette.text.disabled};
`;
const errorStyle = css`
  color: ${theme.palette.error.main};
`;
const sizeSmallStyle = css`
  margin-top: 4px;
`;
const containedStyle = css`
  margin-right: 14px;
  margin-left: 14px;
`;

interface Props {
  disabled?: boolean;
  error?: string;
  filled?: boolean;
  focused?: boolean;
  margin?: "dense";
  required?: boolean;
  children: ComponentChildren;
}
export function FormHelperText({ children, ...props }: Props): VNode {
  const fcs = useFormControl(props);
  const contained = fcs.variant === "filled" || fcs.variant === "outlined";
  return (
    <p
      class={[
        root,
        theme.typography.caption,
        fcs.disabled && disabledStyle,
        fcs.error && errorStyle,
        fcs.size === "small" && sizeSmallStyle,
        contained && containedStyle,
      ].join(" ")}
    >
      {children}
    </p>
  );
}
