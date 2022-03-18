import { css } from "@linaria/core";
import { ComponentChildren, h } from "preact";
import { theme } from "../style";
import { useFormControl } from "./FormControl";

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
  error?: boolean;
  filled?: boolean;
  focused?: boolean;
  margin?: "dense";
  required?: boolean;
  children: ComponentChildren;
}
export function FormHelperText({ children, ...props }: Props) {
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
