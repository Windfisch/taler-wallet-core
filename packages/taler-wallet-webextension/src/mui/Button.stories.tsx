/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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

import { Button } from "./Button.js";
import { Fragment, h, VNode } from "preact";
import DeleteIcon from "../svg/delete_24px.svg";
import SendIcon from "../svg/send_24px.svg";
import { styled } from "@linaria/react";

export default {
  title: "mui/button",
  component: Button,
};

const Stack = styled.div`
  display: flex;
  flex-direction: column;
`;

export const BasicExample = (): VNode => (
  <Fragment>
    <Stack>
      <Button size="small" variant="text">
        Text
      </Button>
      <Button size="small" variant="contained">
        Contained
      </Button>
      <Button size="small" variant="outlined">
        Outlined
      </Button>
    </Stack>
    <Stack>
      <Button variant="text">Text</Button>
      <Button variant="contained">Contained</Button>
      <Button variant="outlined">Outlined</Button>
    </Stack>
    <Stack>
      <Button size="large" variant="text">
        Text
      </Button>
      <Button size="large" variant="contained">
        Contained
      </Button>
      <Button size="large" variant="outlined">
        Outlined
      </Button>
    </Stack>
  </Fragment>
);

export const Others = (): VNode => (
  <Fragment>
    <p>colors</p>
    <Stack>
      <Button color="secondary">Secondary</Button>
      <Button variant="contained" color="success">
        Success
      </Button>
      <Button variant="outlined" color="error">
        Error
      </Button>
    </Stack>
    <p>disabled</p>
    <Stack>
      <Button disabled variant="text">
        Text
      </Button>
      <Button disabled variant="contained">
        Contained
      </Button>
      <Button disabled variant="outlined">
        Outlined
      </Button>
    </Stack>
  </Fragment>
);

export const WithIcons = (): VNode => (
  <Fragment>
    <Stack>
      <Button variant="outlined" size="small" startIcon={DeleteIcon}>
        Delete
      </Button>
      <Button variant="contained" size="small" endIcon={SendIcon}>
        Send
      </Button>
      <Button variant="text" size="small" endIcon={SendIcon}>
        Send
      </Button>
    </Stack>
    <Stack>
      <Button variant="outlined" startIcon={DeleteIcon}>
        Delete
      </Button>
      <Button variant="contained" endIcon={SendIcon}>
        Send
      </Button>
      <Button variant="text" endIcon={SendIcon}>
        Send
      </Button>
    </Stack>
    <Stack>
      <Button variant="outlined" size="large" startIcon={DeleteIcon}>
        Delete
      </Button>
      <Button variant="contained" size="large" endIcon={SendIcon}>
        Send
      </Button>
      <Button variant="text" size="large" endIcon={SendIcon}>
        Send
      </Button>
    </Stack>
  </Fragment>
);
