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
import { Fragment, h, JSX, VNode } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "preact/hooks";
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

  [data-multiline] {
    padding: 4px 0 5px;
  }
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
  textarea {
    height: "auto";
    resize: "none";
    padding: 0px;
    padding-top: 0px;
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
  class: _class,
  ...props
}: any): VNode {
  return (
    <input
      disabled={disabled}
      type={type}
      class={[
        componentStyle,
        _class,
        disabled && componentDisabledStyle,
        size === "small" && componentSmallStyle,
        // multiline && componentMultilineStyle,
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
  maxRows,
  minRows,
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
  }, [value, fcs]);

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

  const rowsProps = {
    minRows: rows ? rows : minRows,
    maxRows: rows ? rows : maxRows,
  };
  if (props.multiline) {
    Input = TextareaAutoSize;
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
          {...rowsProps}
          {...props}
        />
      </FormControlContext.Provider>
    </Root>
  );
}
const shadowStyle = css`
  visibility: hidden;
  position: absolute;
  overflow: hidden;
  height: 0px;
  top: 0px;
  left: 0px;
  transform: translateZ(0);
`;

function ownerDocument(node: Node | null | undefined): Document {
  return (node && node.ownerDocument) || document;
}
function ownerWindow(node: Node | null | undefined): Window {
  const doc = ownerDocument(node);
  return doc.defaultView || window;
}
function getStyleValue(
  computedStyle: CSSStyleDeclaration,
  property: any,
): number {
  return parseInt(computedStyle[property], 10) || 0;
}

function debounce(func: any, wait = 166): any {
  let timeout: any;
  function debounced(...args: any[]): void {
    const later = () => {
      func.apply({}, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }

  debounced.clear = () => {
    clearTimeout(timeout);
  };

  return debounced;
}

export function TextareaAutoSize({
  // disabled,
  // size,
  onChange,
  value,
  multiline,
  focused,
  disabled,
  error,
  minRows = 1,
  maxRows,
  style,
  type,
  class: _class,
  ...props
}: any): VNode {
  // const { onChange, maxRows, minRows = 1, style, value, ...other } = props;

  const { current: isControlled } = useRef(value != null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // const handleRef = useForkRef(ref, inputRef);
  const shadowRef = useRef<HTMLTextAreaElement>(null);
  const renders = useRef(0);
  const [state, setState] = useState<{ outerHeightStyle: any; overflow: any }>({
    outerHeightStyle: undefined,
    overflow: undefined,
  });

  const syncHeight = useCallback(() => {
    const input = inputRef.current;
    const inputShallow = shadowRef.current;
    if (!input || !inputShallow) return;
    const containerWindow = ownerWindow(input);
    const computedStyle = containerWindow.getComputedStyle(input);

    // If input's width is shrunk and it's not visible, don't sync height.
    if (computedStyle.width === "0px") {
      return;
    }

    inputShallow.style.width = computedStyle.width;
    inputShallow.value = input.value || props.placeholder || "x";
    if (inputShallow.value.slice(-1) === "\n") {
      // Certain fonts which overflow the line height will cause the textarea
      // to report a different scrollHeight depending on whether the last line
      // is empty. Make it non-empty to avoid this issue.
      inputShallow.value += " ";
    }

    const boxSizing: string = computedStyle["box-sizing" as any];
    const padding =
      getStyleValue(computedStyle, "padding-bottom") +
      getStyleValue(computedStyle, "padding-top");
    const border =
      getStyleValue(computedStyle, "border-bottom-width") +
      getStyleValue(computedStyle, "border-top-width");

    // console.log(boxSizing, padding, border);
    // The height of the inner content
    const innerHeight = inputShallow.scrollHeight;

    // Measure height of a textarea with a single row
    inputShallow.value = "x";
    const singleRowHeight = inputShallow.scrollHeight;

    // The height of the outer content
    let outerHeight = innerHeight;

    if (minRows) {
      outerHeight = Math.max(Number(minRows) * singleRowHeight, outerHeight);
    }
    if (maxRows) {
      outerHeight = Math.min(Number(maxRows) * singleRowHeight, outerHeight);
    }
    outerHeight = Math.max(outerHeight, singleRowHeight);

    // Take the box sizing into account for applying this value as a style.
    const outerHeightStyle =
      outerHeight + (boxSizing === "border-box" ? padding + border : 0);
    const overflow = Math.abs(outerHeight - innerHeight) <= 1;

    console.log("height", outerHeight, minRows, maxRows);
    setState((prevState) => {
      // Need a large enough difference to update the height.
      // This prevents infinite rendering loop.
      if (
        renders.current < 20 &&
        ((outerHeightStyle > 0 &&
          Math.abs((prevState.outerHeightStyle || 0) - outerHeightStyle) > 1) ||
          prevState.overflow !== overflow)
      ) {
        renders.current += 1;
        return {
          overflow,
          outerHeightStyle,
        };
      }

      return prevState;
    });
  }, [maxRows, minRows, props.placeholder]);

  useLayoutEffect(() => {
    const handleResize = debounce(() => {
      renders.current = 0;
      syncHeight();
    });
    const containerWindow = ownerWindow(inputRef.current);
    containerWindow.addEventListener("resize", handleResize);
    let resizeObserver: any;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(inputRef.current);
    }

    return () => {
      handleResize.clear();
      containerWindow.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [syncHeight]);

  useLayoutEffect(() => {
    syncHeight();
  });

  useLayoutEffect(() => {
    renders.current = 0;
  }, [value]);

  const handleChange = (event: any): void => {
    renders.current = 0;

    if (!isControlled) {
      syncHeight();
    }

    if (onChange) {
      onChange(event);
    }
  };

  return (
    <Fragment>
      <textarea
        class={[
          componentStyle,
          componentMultilineStyle,
          // _class,
          disabled && componentDisabledStyle,
          // size === "small" && componentSmallStyle,
          multiline && componentMultilineStyle,
          type === "search" && searchStyle,
        ].join(" ")}
        value={value}
        onChange={handleChange}
        ref={inputRef}
        // Apply the rows prop to get a "correct" first SSR paint
        rows={minRows}
        style={{
          height: state.outerHeightStyle,
          // Need a large enough difference to allow scrolling.
          // This prevents infinite rendering loop.
          overflow: state.overflow ? "hidden" : null,
          ...style,
        }}
        // {...props}
      />

      <textarea
        aria-hidden
        class={[
          componentStyle,
          componentMultilineStyle,
          shadowStyle,
          type === "search" && searchStyle,
        ].join(" ")}
        readOnly
        ref={shadowRef}
        tabIndex={-1}
      />
    </Fragment>
  );
}
