import { css } from "@linaria/core";
import { h, JSX, VNode } from "preact";
import { useLayoutEffect } from "preact/hooks";
// eslint-disable-next-line import/extensions
import { theme } from "../style";
import { FormControlContext, useFormControl } from "./FormControl.js";

const rootStyle = css`
  color: ${theme.palette.text.primary};
  line-height: 1.4375em;
  box-sizing: border-box;
  position: relative;
  cursor: text;
  display: inline-flex;
  align-items: center;
`;
const rootDisabledStyle = css`
  color: ${theme.palette.text.disabled};
  cursor: default;
`;
const rootMultilineStyle = css`
  padding: 4px 0 5px;
`;
const fullWidthStyle = css`
  width: "100%";
`;

export function InputBaseRoot({
  class: _class,
  disabled,
  error,
  multiline,
  focused,
  fullWidth,
  children,
}: any): VNode {
  const fcs = useFormControl({});
  return (
    <div
      data-disabled={disabled}
      data-focused={focused}
      data-error={error}
      class={[
        _class,
        rootStyle,
        theme.typography.body1,
        disabled && rootDisabledStyle,
        multiline && rootMultilineStyle,
        fullWidth && fullWidthStyle,
      ].join(" ")}
      style={{
        "--color-main": theme.palette[fcs.color].main,
      }}
    >
      {children}
    </div>
  );
}

const componentStyle = css`
  font: inherit;
  letter-spacing: inherit;
  color: currentColor;
  padding: 4px 0 5px;
  border: 0px;
  box-sizing: content-box;
  background: none;
  height: 1.4375em;
  margin: 0px;
  -webkit-tap-highlight-color: transparent;
  display: block;
  min-width: 0px;
  width: 100%;
  animation-name: "auto-fill-cancel";
  animation-duration: 10ms;

  @keyframes auto-fill {
    from {
      display: block;
    }
  }
  @keyframes auto-fill-cancel {
    from {
      display: block;
    }
  }
  &::placeholder {
    color: "currentColor";
    opacity: ${theme.palette.mode === "light" ? 0.42 : 0.5};
    transition: ${theme.transitions.create("opacity", {
      duration: theme.transitions.duration.shorter,
    })};
  }
  &:focus {
    outline: 0;
  }
  &:invalid {
    box-shadow: none;
  }
  &::-webkit-search-decoration {
    -webkit-appearance: none;
  }
  &:-webkit-autofill {
    animation-duration: 5000s;
    animation-name: auto-fill;
  }
`;
const componentDisabledStyle = css`
  opacity: 1;
  --webkit-text-fill-color: ${theme.palette.text.disabled};
`;
const componentSmallStyle = css`
  padding-top: 1px;
`;
const componentMultilineStyle = css`
  height: auto;
  resize: none;
  padding: 0px;
  padding-top: 0px;
`;
const searchStyle = css`
  -moz-appearance: textfield;
  -webkit-appearance: textfield;
`;

export function InputBaseComponent({
  disabled,
  size,
  multiline,
  type,
  ...props
}: any): VNode {
  return (
    <input
      disabled={disabled}
      type={type}
      class={[
        componentStyle,
        disabled && componentDisabledStyle,
        size === "small" && componentSmallStyle,
        multiline && componentMultilineStyle,
        type === "search" && searchStyle,
      ].join(" ")}
      {...props}
    />
  );
}

export function InputBase({
  Root = InputBaseRoot,
  Input,
  onChange,
  name,
  placeholder,
  readOnly,
  onKeyUp,
  onKeyDown,
  rows,
  type = "text",
  value,
  onClick,
  ...props
}: any): VNode {
  const fcs = useFormControl(props);
  // const [focused, setFocused] = useState(false);
  useLayoutEffect(() => {
    if (value && value !== "") {
      fcs.onFilled();
    } else {
      fcs.onEmpty();
    }
  }, [value]);

  const handleFocus = (event: JSX.TargetedFocusEvent<EventTarget>): void => {
    // Fix a bug with IE11 where the focus/blur events are triggered
    // while the component is disabled.
    if (fcs.disabled) {
      event.stopPropagation();
      return;
    }

    // if (onFocus) {
    //   onFocus(event);
    // }
    // if (inputPropsProp.onFocus) {
    //   inputPropsProp.onFocus(event);
    // }

    fcs.onFocus();
  };

  const handleBlur = (): void => {
    // if (onBlur) {
    //   onBlur(event);
    // }
    // if (inputPropsProp.onBlur) {
    //   inputPropsProp.onBlur(event);
    // }

    fcs.onBlur();
  };

  const handleChange = (
    event: JSX.TargetedEvent<HTMLElement & { value?: string }>,
  ): void => {
    // if (inputPropsProp.onChange) {
    //   inputPropsProp.onChange(event, ...args);
    // }

    // Perform in the willUpdate
    if (onChange) {
      onChange(event.currentTarget.value);
    }
  };

  const handleClick = (
    event: JSX.TargetedMouseEvent<HTMLElement & { value?: string }>,
  ): void => {
    // if (inputRef.current && event.currentTarget === event.target) {
    //   inputRef.current.focus();
    // }

    if (onClick) {
      onClick(event.currentTarget.value);
    }
  };

  if (!Input) {
    Input = props.multiline ? TextareaAutoSize : InputBaseComponent;
  }

  return (
    <Root {...fcs} onClick={handleClick}>
      <FormControlContext.Provider value={null}>
        <Input
          aria-invalid={fcs.error}
          // aria-describedby={}
          disabled={fcs.disabled}
          name={name}
          placeholder={placeholder}
          readOnly={readOnly}
          required={fcs.required}
          rows={rows}
          value={value}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          type={type}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
      </FormControlContext.Provider>
    </Root>
  );
}

export function TextareaAutoSize(): VNode {
  return <input onClick={(e) => null} />;
}
