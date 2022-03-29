import { css } from "@linaria/core";
import { ComponentChildren, h, VNode } from "preact";
// eslint-disable-next-line import/extensions
import { Colors, theme } from "../style";
import { useFormControl } from "./FormControl.js";

export interface Props {
  class?: string;
  disabled?: boolean;
  error?: boolean;
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
      data-focused={fcs.focused}
      data-error={fcs.error}
      data-disabled={fcs.disabled}
      class={[_class, root, theme.typography.body1].join(" ")}
      {...rest}
      style={{
        "--color-main": theme.palette[fcs.color].main,
      }}
    >
      {children}
      {fcs.required && <span data-error={fcs.error}>&thinsp;{"*"}</span>}
    </label>
  );
}
