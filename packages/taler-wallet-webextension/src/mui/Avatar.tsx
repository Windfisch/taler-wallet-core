import { css } from "@linaria/core";
import { h, JSX, VNode, ComponentChildren } from "preact";
import { theme } from "./style";

const root = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  font-family: ${theme.typography.fontFamily};
  font-size: ${theme.typography.pxToRem(20)};
  line-height: 1;
  overflow: hidden;
  user-select: none;
`;

const colorStyle = css`
  color: ${theme.palette.background.default};
  background-color: ${theme.palette.mode === "light"
    ? theme.palette.grey[400]
    : theme.palette.grey[600]};
`;

const avatarImageStyle = css`
  width: 100%;
  height: 100%;
  text-align: center;
  object-fit: cover;
  color: transparent;
  text-indent: 10000;
`;

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: "circular" | "rounded" | "square";
  children?: ComponentChildren;
}

export function Avatar({ variant, children, ...rest }: Props): VNode {
  const borderStyle =
    variant === "square"
      ? theme.shape.squareBorder
      : variant === "rounded"
      ? theme.shape.roundBorder
      : theme.shape.circularBorder;
  return (
    <div class={[root, borderStyle].join(" ")} {...rest}>
      {children}
    </div>
  );
}
