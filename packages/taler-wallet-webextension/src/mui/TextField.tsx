import { ComponentChildren, h, VNode } from "preact";
import { FormControl } from "./input/FormControl.js";
import { FormHelperText } from "./input/FormHelperText.js";
import { InputFilled } from "./input/InputFilled.js";
import { InputLabel } from "./input/InputLabel.js";
import { InputOutlined } from "./input/InputOutlined.js";
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
  focused?: boolean;
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
  outlined: InputOutlined,
};

const selectVariant = {
  standard: SelectStandard,
  filled: SelectFilled,
  outlined: SelectOutlined,
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
  // console.log("variant", Input);
  return (
    <FormControl {...props}>
      {label && <InputLabel>{label}</InputLabel>}
      <Input {...props}>{children}</Input>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
