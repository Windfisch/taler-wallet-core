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

import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { Paper } from "../mui/Paper.js";

const QrVideo = styled.video`
  width: 80%;
  margin-left: auto;
  margin-right: auto;
  padding: 8px;
  background-color: black;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin: 8px;
  }
`;

interface Props {
  action: "send" | "get";
  currency?: string;
}

export function DestinationSelectionGetCash({ currency }: Props): VNode {
  return (
    <Container>
      <p>Request {currency} from:</p>
      <Paper style={{ padding: 8 }}>Bank account</Paper>
      <Paper style={{ padding: 8 }}>Another person</Paper>
    </Container>
  );
}

export function DestinationSelectionSendCash({ currency }: Props): VNode {
  return (
    <Container>
      <p>Sending {currency} to:</p>
      <Paper style={{ padding: 8 }}>Bank account</Paper>
      <Paper style={{ padding: 8 }}>Another person</Paper>
    </Container>
  );
}
