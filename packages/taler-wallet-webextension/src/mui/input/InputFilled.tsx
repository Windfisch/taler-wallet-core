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
export function InputFilled({
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

const light = theme.palette.mode === "light";
const bottomLineColor = light
  ? "rgba(0, 0, 0, 0.42)"
  : "rgba(255, 255, 255, 0.7)";
const backgroundColor = light
  ? "rgba(0, 0, 0, 0.06)"
  : "rgba(255, 255, 255, 0.09)";
const backgroundColorHover = light
  ? "rgba(0, 0, 0, 0.09)"
  : "rgba(255, 255, 255, 0.13)";
const backgroundColorDisabled = light
  ? "rgba(0, 0, 0, 0.12)"
  : "rgba(255, 255, 255, 0.12)";

const formControlStyle = css`
  label + & {
    margin-top: 16px;
  }
`;

const filledRootStyle = css`
  position: relative;
  background-color: ${backgroundColor};
  border-top-left-radius: ${theme.shape.borderRadius}px;
  border-top-right-radius: ${theme.shape.borderRadius}px;
  transition: ${theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shorter,
    easing: theme.transitions.easing.easeOut,
  })};
  // when is not disabled underline
  &:hover {
    background-color: ${backgroundColorHover};
    @media (hover: none) {
      background-color: ${backgroundColor};
    }
  }
  [data-focused] {
    background-color: ${backgroundColor};
  }
  [data-disabled] {
    background-color: ${backgroundColorDisabled};
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
      class={[filledRootStyle, underlineStyle].join(" ")}
    >
      {children}
    </InputBaseRoot>
  );
}

const filledBaseStyle = css`
  padding-top: 25px;
  padding-right: 12px;
  padding-bottom: 8px;
  padding-left: 12px;
`;

function Input(props: any): VNode {
  return <InputBaseComponent class={[filledBaseStyle].join(" ")} {...props} />;
}
