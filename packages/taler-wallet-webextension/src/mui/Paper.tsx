import { css } from "@linaria/core";
import { h, Fragment, VNode, ComponentChildren } from "preact";
import { alpha } from "./colors/manipulation";
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

export function Paper({
  elevation = 1,
  square,
  variant = "elevation",
  children,
}: {
  elevation?: number;
  square?: boolean;
  variant?: "elevation" | "outlined";
  children?: ComponentChildren;
}): VNode {
  return (
    <div
      class={[
        baseStyle,
        !square && theme.shape.borderRadius,
        borderVariant[variant],
      ].join(" ")}
      style={{
        "--theme-shadow-elevation": theme.shadows[elevation],
        "--gradient-white-elevation": `linear-gradient(${alpha(
          "#fff",
          getOverlayAlpha(elevation),
        )}, ${alpha("#fff", getOverlayAlpha(elevation))})`,
      }}
    >
      {children}
    </div>
  );
}

// Inspired by https://github.com/material-components/material-components-ios/blob/bca36107405594d5b7b16265a5b0ed698f85a5ee/components/Elevation/src/UIColor%2BMaterialElevation.m#L61
const getOverlayAlpha = (elevation: number): number => {
  let alphaValue;
  if (elevation < 1) {
    alphaValue = 5.11916 * elevation ** 2;
  } else {
    alphaValue = 4.5 * Math.log(elevation + 1) + 2;
  }
  return Number((alphaValue / 100).toFixed(2));
};
