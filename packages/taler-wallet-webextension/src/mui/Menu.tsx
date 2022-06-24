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
import { h, VNode, Fragment, ComponentChildren } from "preact";
import { buttonBaseStyle } from "./Button.js";
import { alpha } from "./colors/manipulation.js";
import { Paper } from "./Paper.js";
// eslint-disable-next-line import/extensions
import { Colors, ripple, theme } from "./style";

interface Props {
  children: ComponentChildren;
  onClose: () => Promise<void>;
  onClick: () => Promise<void>;
  open?: boolean;
}

const menuPaper = css`
  max-height: calc(100% - 96px);
  -webkit-overflow-scrolling: touch;
`;

const menuList = css`
  outline: 0px;
`;

export function Menu({ children, onClose, onClick, open }: Props): VNode {
  return (
    <Popover class={menuPaper}>
      <ul class={menuList}>{children}</ul>
    </Popover>
  );
}

const popoverRoot = css``;

const popoverPaper = css`
  position: absolute;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 16px;
  min-height: 16px;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 32px);
  outline: 0;
`;

function Popover({ children }: any): VNode {
  return (
    <div class={popoverRoot}>
      <Paper class={popoverPaper}>{children}</Paper>
    </div>
  );
}

const root = css`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  text-decoration: none;
  min-height: 48px;
  padding-top: 6px;
  padding-bottom: 6px;
  box-sizing: border-box;
  white-space: nowrap;
  appearance: none;

  &:not([data-disableGutters]) {
    padding-left: 16px;
    padding-right: 16px;
  }

  [data-dividers] {
    border-bottom: 1px solid ${theme.palette.divider};
    background-clip: padding-box;
  }
  &:hover {
    text-decoration: none;
    background-color: var(--color-main-alpha-half);
    @media (hover: none) {
      background-color: transparent;
    }
  }
`;

export function MenuItem({
  children,
  onClick,
  color = "primary",
}: {
  children: ComponentChildren;
  onClick?: () => Promise<void>;
  color?: Colors;
}): VNode {
  function doClick(): void {
    // if (onClick) onClick();
    return;
  }
  return (
    <li
      onClick={doClick}
      disabled={false}
      role="menuitem"
      class={[buttonBaseStyle, root, ripple].join(" ")}
      style={{
        "--color-main": theme.palette[color].main,
        "--color-dark": theme.palette[color].dark,
        "--color-grey-or-dark": !color
          ? theme.palette.grey.A100
          : theme.palette[color].dark,
        "--color-main-alpha-half": alpha(theme.palette[color].main, 0.7),
        "--color-main-alpha-opacity": alpha(
          theme.palette[color].main,
          theme.palette.action.hoverOpacity,
        ),
      }}
    >
      {children}
    </li>
  );
}
