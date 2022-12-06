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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Menu, MenuItem } from "./Menu.jsx";
import { Paper } from "./Paper.js";

export default {
  title: "menu",
  component: Menu,
};

export const BasicExample = (): VNode => {
  const [open, setOpen] = useState(false);
  async function handleClose(): Promise<void> {
    setOpen(false);
  }
  async function handleClick(): Promise<void> {
    setOpen(true);
  }
  return (
    <Menu open={open} onClose={handleClose} onClick={handleClick}>
      <MenuItem onClick={handleClose}>Profile</MenuItem>
      <MenuItem onClick={handleClose}>My account</MenuItem>
      <MenuItem onClick={handleClose}>Logout</MenuItem>
    </Menu>
  );
};

import { styled } from "@linaria/react";
// eslint-disable-next-line import/extensions
import { theme } from "./style";
import { Typography } from "./Typography.js";
import { Divider } from "./Divider.js";

const ListItemIcon = styled.div`
  min-width: 36px;
  color: ${theme.palette.action.active};
  flex-shrink: 0;
  display: inline-flex;
`;

const IconCut = (): VNode => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    style={{
      width: "1em",
      height: "1em",
    }}
  >
    <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z" />
  </svg>
);

const IconCopy = (): VNode => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    style={{
      width: "1em",
      height: "1em",
    }}
  >
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

const IconPaste = (): VNode => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    style={{
      width: "1em",
      height: "1em",
    }}
  >
    <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z" />
  </svg>
);

const IconCloud = (): VNode => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    style={{
      width: "1em",
      height: "1em",
    }}
  >
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
  </svg>
);

const ListItemText = styled.div`
  flex: 1 1 auto;
  min-width: 0px;
  margin-top: 4px;
  margin-bottom: 4px;
`;

export function IconMenu(): VNode {
  return (
    <div style={{ width: 320 }}>
      <Paper>
        <ul>
          <MenuItem>
            <ListItemIcon>
              <IconCut />
            </ListItemIcon>
            <ListItemText>Cut</ListItemText>
            <Typography variant="body2" /* color="text.secondary" */>
              ⌘X
            </Typography>
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <IconCopy />
            </ListItemIcon>
            <ListItemText>Copy</ListItemText>
            <Typography variant="body2" /* color="text.secondary" */>
              ⌘C
            </Typography>
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <IconPaste />
            </ListItemIcon>
            <ListItemText>Paste</ListItemText>
            <Typography variant="body2" /* color="text.secondary" */>
              ⌘V
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem>
            <ListItemIcon>
              <IconCloud />
            </ListItemIcon>
            <ListItemText>Web Clipboard</ListItemText>
          </MenuItem>
        </ul>
      </Paper>
    </div>
  );
}
