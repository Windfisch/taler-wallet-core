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
import { h, JSX, VNode, ComponentChildren } from "preact";
// eslint-disable-next-line import/extensions
import { alpha } from "./colors/manipulation";
// eslint-disable-next-line import/extensions
import { theme } from "./style";

const borderVariant = {
  outlined: css`
    border: 1px solid ${theme.palette.divider};
  `,
  elevation: css`
    box-shadow: var(--theme-shadow-elevation);
  `,
};
const baseStyle = css`
  background-color: ${theme.palette.background.paper};
  color: ${theme.palette.text.primary};

  .theme-dark & {
    background-image: var(--gradient-white-elevation);
  }
`;

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  elevation?: number;
  square?: boolean;
  variant?: "elevation" | "outlined";
  children?: ComponentChildren;
}

export function Paper({
  elevation = 1,
  square,
  variant = "elevation",
  children,
  class: _class,
  style,
  ...rest
}: Props): VNode {
  return (
    <div
      class={[
        _class,
        baseStyle,
        !square && theme.shape.roundBorder,
        borderVariant[variant],
      ].join(" ")}
      style={{
        "--theme-shadow-elevation": theme.shadows[elevation],
        "--gradient-white-elevation": `linear-gradient(${alpha(
          "#fff",
          getOverlayAlpha(elevation),
        )}, ${alpha("#fff", getOverlayAlpha(elevation))})`,
        ...(style as any),
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// Inspired by https://github.com/material-components/material-components-ios/blob/bca36107405594d5b7b16265a5b0ed698f85a5ee/components/Elevation/src/UIColor%2BMaterialElevation.m#L61
function getOverlayAlpha(elevation: number): number {
  let alphaValue;
  if (elevation < 1) {
    alphaValue = 5.11916 * elevation ** 2;
  } else {
    alphaValue = 4.5 * Math.log(elevation + 1) + 2;
  }
  return Number((alphaValue / 100).toFixed(2));
}
