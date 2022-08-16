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
import { ComponentChildren, h, VNode } from "preact";
import { FormControl } from "./input/FormControl.js";
import { FormHelperText } from "./input/FormHelperText.js";
import { InputFilled } from "./input/InputFilled.js";
import { InputLabel } from "./input/InputLabel.js";
import { InputStandard } from "./input/InputStandard.js";
import { SelectFilled } from "./input/SelectFilled.js";
import { SelectOutlined } from "./input/SelectOutlined.js";
import { SelectStandard } from "./input/SelectStandard.js";
// eslint-disable-next-line import/extensions
import { Colors } from "./style";

export interface Props {
  autoComplete?: string;
  autoFocus?: boolean;
  color?: Colors;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  helperText?: VNode | string;
  id?: string;
  label?: VNode | string;
  margin?: "dense" | "normal" | "none";
  maxRows?: number;
  minRows?: number;
  multiline?: boolean;
  onChange?: (s: string) => void;
  placeholder?: string;
  required?: boolean;

  startAdornment?: VNode;
  endAdornment?: VNode;

  //FIXME: change to "grabFocus"
  // focused?: boolean;
  rows?: number;
  select?: boolean;
  type?: string;
  value?: string;
  variant?: "filled" | "outlined" | "standard";
  children?: ComponentChildren;
}

const inputVariant = {
  standard: InputStandard,
  filled: InputFilled,
  outlined: InputStandard,
};

const selectVariant = {
  standard: SelectStandard,
  filled: SelectFilled,
  outlined: SelectStandard,
};

export function TextField({
  label,
  select,
  helperText,
  children,
  variant = "filled",
  ...props
}: Props): VNode {
  // htmlFor={id} id={inputLabelId}
  const Input = select ? selectVariant[variant] : inputVariant[variant];
  return (
    <FormControl {...props}>
      {label && <InputLabel>{label}</InputLabel>}
      <Input {...props}>{children}</Input>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
