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

import { Amounts } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { LoadingError } from "../../components/LoadingError.js";
import { SelectList } from "../../components/SelectList.js";
import { Input } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { TextField } from "../../mui/TextField.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

const Container = styled.div``;

export function ReadyView({ amount, exchange, subject }: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Container>
      <p>Sending {Amounts.stringify(amount)}</p>
      <TextField
        label="Subject"
        variant="filled"
        required
        value={subject.value}
        onChange={subject.onInput}
      />
      <p>to:</p>
      <Button>Scan QR code</Button>
    </Container>
  );
}
