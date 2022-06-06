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

// const colorStyle = css`
//   color: ${theme.palette.background.default};
//   background-color: ${theme.palette.mode === "light"
//     ? theme.palette.grey[400]
//     : theme.palette.grey[600]};
// `;

// const avatarImageStyle = css`
//   width: 100%;
//   height: 100%;
//   text-align: center;
//   object-fit: cover;
//   color: transparent;
//   text-indent: 10000;
// `;

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
