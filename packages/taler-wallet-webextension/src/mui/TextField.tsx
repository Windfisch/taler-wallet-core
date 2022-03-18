import { ComponentChildren, h, VNode } from "preact";
import { FormControl } from "./input/FormControl";
import { FormHelperText } from "./input/FormHelperText";
import { InputFilled } from "./input/InputFilled";
import { InputLabel } from "./input/InputLabel";
import { InputOutlined } from "./input/InputOutlined";
import { InputStandard } from "./input/InputStandard";
import { SelectFilled } from "./input/SelectFilled";
import { SelectOutlined } from "./input/SelectOutlined";
import { SelectStandard } from "./input/SelectStandard";
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

export function TextField({
  label,
  select,
  helperText,
  children,
  variant = "standard",
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
