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
import { FormLabel } from "./FormLabel.js";

const root = css`
  display: block;
  transform-origin: top left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;

  &[data-form-control] {
    position: absolute;
    left: 0px;
    top: 0px;
    transform: translate(0, 20px) scale(1);
  }
  &[data-size="small"] {
    transform: translate(0, 17px) scale(1);
  }
  &[data-shrink] {
    transform: translate(0, -1.5px) scale(0.75);
    transform-origin: top left;
    max-width: 133%;
  }
  &:not([data-disable-animation]) {
    transition: ${theme.transitions.create(
      ["color", "transform", "max-width"],
      {
        duration: theme.transitions.duration.shorter,
        easing: theme.transitions.easing.easeOut,
      },
    )};
  }
  &[data-variant="filled"] {
    z-index: 1;
    pointer-events: none;
    transform: translate(12px, 16px) scale(1);
    max-width: calc(100% - 24px);
    &[data-size="small"] {
      transform: translate(12px, 13px) scale(1);
    }
    &[data-shrink] {
      user-select: none;
      pointer-events: auto;
      transform: translate(12px, 7px) scale(0.75);
      max-width: calc(133% - 24px);
      &[data-size="small"] {
        transform: translate(12px, 4px) scale(0.75);
      }
    }
  }
  &[data-variant="outlined"] {
    z-index: 1;
    pointer-events: none;
    transform: translate(14px, 16px) scale(1);
    max-width: calc(100% - 24px);
    &[data-size="small"] {
      transform: translate(14px, 9px) scale(1);
    }
    &[data-shrink] {
      user-select: none;
      pointer-events: auto;
      transform: translate(14px, -9px) scale(0.75);
      max-width: calc(133% - 24px);
    }
  }
`;

interface InputLabelProps {
  color: Colors;
  disableAnimation: boolean;
  disabled: boolean;
  error?: string;
  focused: boolean;
  margin: boolean;
  required: boolean;
  shrink: boolean;
  variant: "filled" | "outlined" | "standard";
  children: ComponentChildren;
}
export function InputLabel(props: Partial<InputLabelProps>): VNode {
  const fcs = useFormControl(props);
  return (
    <FormLabel
      data-form-control={!!fcs}
      data-size={fcs.size}
      data-shrink={props.shrink || fcs.filled || fcs.focused ? true : undefined}
      data-disable-animation={props.disableAnimation ? true : undefined}
      data-variant={fcs.variant}
      class={root}
      {...props}
    />
  );
}
