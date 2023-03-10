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
import { ComponentChildren, createContext, h, VNode } from "preact";
import { useContext, useMemo, useState } from "preact/hooks";
// eslint-disable-next-line import/extensions
import { Colors } from "../style";

export interface Props {
  color: Colors;
  disabled: boolean;
  error?: string;
  focused: boolean;
  fullWidth: boolean;
  hiddenLabel: boolean;
  required: boolean;
  variant: "filled" | "outlined" | "standard";
  margin: "none" | "normal" | "dense";
  size: "medium" | "small";
  children: ComponentChildren;
}

export const root = css`
  display: inline-flex;
  flex-direction: column;
  position: relative;
  min-width: 0px;
  padding: 0px;
  margin: 0px;
  border: 0px;
  vertical-align: top;
`;

const marginVariant = {
  none: "",
  normal: css`
    margin-top: 16px;
    margin-bottom: 8px;
  `,
  dense: css`
    margin-top: 8px;
    margin-bottom: 4px;
  `,
};
const fullWidthStyle = css`
  width: 100%;
`;

export const FormControlContext = createContext<FCCProps | null>(null);

export function FormControl({
  color = "primary",
  disabled = false,
  error = undefined,
  focused: visuallyFocused,
  fullWidth = false,
  hiddenLabel = false,
  margin = "none",
  required = false,
  size = "medium",
  variant = "filled",
  children,
}: Partial<Props>): VNode {
  const [filled, setFilled] = useState(false);
  const [focusedState, setFocused] = useState(visuallyFocused);
  const focused =
    focusedState !== undefined && !disabled ? focusedState : false;

  const value: FCCProps = {
    color,
    disabled,
    error,
    filled,
    focused,
    fullWidth,
    hiddenLabel,
    size,
    onBlur: () => {
      setFocused(false);
    },
    onEmpty: () => {
      setFilled(false);
    },
    onFilled: () => {
      setFilled(true);
    },
    onFocus: () => {
      setFocused(true);
    },
    required,
    variant,
  };

  return (
    <div
      class={[
        root,
        marginVariant[margin],
        fullWidth ? fullWidthStyle : "",
      ].join(" ")}
    >
      <FormControlContext.Provider value={value}>
        {children}
      </FormControlContext.Provider>
    </div>
  );
}

export interface FCCProps {
  // adornedStart,
  // setAdornedStart,
  color: Colors;
  disabled: boolean;
  error: string | undefined;
  filled: boolean;
  focused: boolean;
  fullWidth: boolean;
  hiddenLabel: boolean;
  size: "medium" | "small";
  onBlur: () => void;
  onEmpty: () => void;
  onFilled: () => void;
  onFocus: () => void;
  // registerEffect,
  required: boolean;
  variant: "filled" | "outlined" | "standard";
}

const defaultContextValue: FCCProps = {
  color: "primary",
  disabled: false,
  error: undefined,
  filled: false,
  focused: false,
  fullWidth: false,
  hiddenLabel: false,
  size: "medium",
  onBlur: () => null,
  onEmpty: () => null,
  onFilled: () => null,
  onFocus: () => null,
  required: false,
  variant: "filled",
};

function withoutUndefinedProperties(obj: any): any {
  return Object.keys(obj).reduce((acc, key) => {
    const _acc: any = acc;
    if (obj[key] !== undefined && obj[key] !== false) _acc[key] = obj[key];
    return _acc;
  }, {});
}

export function useFormControl(props: Partial<FCCProps> = {}): FCCProps {
  const ctx = useContext(FormControlContext);
  const cleanedProps = withoutUndefinedProperties(props);

  return useMemo(() => {
    return !ctx
      ? { ...defaultContextValue, ...cleanedProps }
      : { ...ctx, ...cleanedProps };
  }, [cleanedProps, ctx]);
}
