import { css } from "@linaria/core";
import { ComponentChildren, h } from "preact";
import { Colors, theme } from "../style";
import { useFormControl } from "./FormControl";
import { FormLabel } from "./FormLabel";

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
  error: boolean;
  focused: boolean;
  margin: boolean;
  required: boolean;
  shrink: boolean;
  variant: "filled" | "outlined" | "standard";
  children: ComponentChildren;
}
export function InputLabel(props: Partial<InputLabelProps>) {
  const fcs = useFormControl(props);
  return (
    <FormLabel
      data-form-control={!!fcs}
      data-size={fcs.size}
      data-shrink={props.shrink || fcs.filled || fcs.focused}
      data-disable-animation={props.disableAnimation}
      data-variant={fcs.variant}
      class={root}
      {...props}
    />
  );
}
