import { css } from "@linaria/core";
import { h, VNode } from "preact";
import { Colors, theme } from "../style";
import { useFormControl } from "./FormControl";
import { InputBase, InputBaseComponent, InputBaseRoot } from "./InputBase";

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
`;
const formControlStyle = css`
  label + & {
    margin-top: 16px;
  }
`;
const underlineStyle = css`
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

function Root({ disabled, focused, error, children }: any) {
  return (
    <InputBaseRoot
      disabled={disabled}
      focused={focused}
      error={error}
      class={[rootStyle, formControlStyle, underlineStyle].join(" ")}
    >
      {children}
    </InputBaseRoot>
  );
}

function Input(props: any) {
  return <InputBaseComponent {...props} />;
}
