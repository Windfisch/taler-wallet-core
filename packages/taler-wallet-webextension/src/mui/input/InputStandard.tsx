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
import { h, VNode } from "preact";
// eslint-disable-next-line import/extensions
import { Colors, theme } from "../style";
import { useFormControl } from "./FormControl.js";
import { InputBase, InputBaseComponent, InputBaseRoot } from "./InputBase.js";

export interface Props {
  autoComplete?: string;
  autoFocus?: boolean;
  color?: Colors;
  defaultValue?: string;
  disabled?: boolean;
  disableUnderline?: boolean;
  endAdornment?: VNode;
  error?: boolean;
  fullWidth?: boolean;
  id?: string;
  margin?: "dense" | "normal" | "none";
  maxRows?: number;
  minRows?: number;
  multiline?: boolean;
  name?: string;
  onChange?: (s: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  rows?: number;
  startAdornment?: VNode;
  type?: string;
  value?: string;
}
export function InputStandard({
  type = "text",
  multiline,
  ...props
}: Props): VNode {
  const fcs = useFormControl(props);
  return (
    <InputBase
      Root={Root}
      Input={Input}
      fullWidth={fcs.fullWidth}
      multiline={multiline}
      type={type}
      {...props}
    />
  );
}

const rootStyle = css`
  position: relative;
  padding: 4px 0 5px;
`;
const formControlStyle = css`
  label + & {
    margin-top: 16px;
  }
`;
const underlineStyle = css`
  // when is not disabled underline
  &:after {
    border-bottom: 2px solid var(--color-main);
    left: 0px;
    bottom: 0px;
    content: "";
    position: absolute;
    right: 0px;
    transform: scaleX(0);
    transition: ${theme.transitions.create("transform", {
      duration: theme.transitions.duration.shorter,
      easing: theme.transitions.easing.easeOut,
    })};
    pointer-events: none;
  }
  &[data-focused]:after {
    transform: scaleX(1);
  }
  &[data-error]:after {
    border-bottom-color: ${theme.palette.error.main};
    transform: scaleY(1);
  }
  &:before {
    border-bottom: 1px solid
      ${theme.palette.mode === "light"
        ? "rgba(0, 0, 0, 0.42)"
        : "rgba(255, 255, 255, 0.7)"};
    left: 0px;
    bottom: 0px;
    right: 0px;
    content: "\\00a0";
    position: absolute;
    transition: ${theme.transitions.create("border-bottom-color", {
      duration: theme.transitions.duration.shorter,
    })};
    pointer-events: none;
  }
  &:hover:not([data-disabled]:before) {
    border-bottom: 2px solid var(--color-main);
    @media (hover: none) {
      border-bottom: 1px solid
        ${theme.palette.mode === "light"
          ? "rgba(0, 0, 0, 0.42)"
          : "rgba(255, 255, 255, 0.7)"};
    }
  }
  &[data-disabled]:before {
    border-bottom-style: solid;
  }
`;

function Root({ fullWidth, disabled, focused, error, children }: any): VNode {
  return (
    <InputBaseRoot
      disabled={disabled}
      focused={focused}
      fullWidth={fullWidth}
      error={error}
      class={[rootStyle, formControlStyle, underlineStyle].join(" ")}
    >
      {children}
    </InputBaseRoot>
  );
}

function Input(props: any): VNode {
  return <InputBaseComponent {...props} />;
}
