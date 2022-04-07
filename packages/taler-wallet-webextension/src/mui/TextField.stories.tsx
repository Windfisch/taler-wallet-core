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

import { styled } from "@linaria/react";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { TextField, Props } from "./TextField.js";

export default {
  title: "mui/TextField",
  component: TextField,
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin-bottom: 20px !important;
  }
`;

const BasicExample = (variant: Props["variant"]): VNode => {
  const [value, onChange] = useState("");
  return (
    <Container>
      <TextField variant={variant} label="Name" {...{ value, onChange }} />
      <TextField
        variant={variant}
        type="password"
        label="Password"
        {...{ value, onChange }}
      />
      <TextField
        disabled
        variant={variant}
        label="Country"
        helperText="this is disabled"
        value="disabled"
      />
      <TextField
        error
        variant={variant}
        label="Something"
        {...{ value, onChange }}
      />
      <TextField
        error
        disabled
        variant={variant}
        label="Disabled and Error"
        value="disabled with error"
        helperText="this field has an error"
      />
      <TextField
        variant={variant}
        required
        label="Name"
        {...{ value, onChange }}
        helperText="this field is required"
      />
    </Container>
  );
};

export const Standard = (): VNode => BasicExample("standard");
export const Filled = (): VNode => BasicExample("filled");
export const Outlined = (): VNode => BasicExample("outlined");

export const Color = (): VNode => {
  const [value, onChange] = useState("");
  return (
    <Container>
      <TextField
        variant="standard"
        label="Outlined secondary"
        color="secondary"
      />
      <TextField label="Filled success" variant="standard" color="success" />
      <TextField label="Standard warning" variant="standard" color="warning" />
    </Container>
  );
};

export const Multiline = (): VNode => {
  const [value, onChange] = useState("");
  return (
    <Container>
      {/* <TextField
        {...{ value, onChange }}
        label="Multiline"
        variant="standard"
        multiline
      /> */}
      <TextField
        {...{ value, onChange }}
        label="Max row 4"
        variant="standard"
        multiline
        maxRows={4}
      />
      {/* <TextField
        {...{ value, onChange }}
        label="Row 10"
        variant="standard"
        multiline
        rows={10}
      /> */}
    </Container>
  );
};
