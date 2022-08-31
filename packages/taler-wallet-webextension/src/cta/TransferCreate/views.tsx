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

import { h, VNode } from "preact";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { QR } from "../../components/QR.js";
import { Link, SubTitle, WalletAction } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { Grid } from "../../mui/Grid.js";
import { TextField } from "../../mui/TextField.js";
import { TransferDetails } from "../../wallet/Transaction.js";
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

export function ShowQrView({ talerUri, close }: State.ShowQr): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />
      <SubTitle>
        <i18n.Translate>Digital invoice</i18n.Translate>
      </SubTitle>
      <section>
        <p>Scan this QR code with the wallet</p>
        <QR text={talerUri} />
      </section>
      <section>
        <Link upperCased onClick={close}>
          <i18n.Translate>Close</i18n.Translate>
        </Link>
      </section>
    </WalletAction>
  );
}

export function ReadyView({
  subject,
  toBeReceived,
  chosenAmount,
  showQr,
  copyToClipboard,
  invalid,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />
      <SubTitle>
        <i18n.Translate>Digital cash transfer</i18n.Translate>
      </SubTitle>
      <section style={{ textAlign: "left" }}>
        <TextField
          label="Subject"
          variant="filled"
          error={!!subject.error}
          required
          fullWidth
          value={subject.value}
          onChange={subject.onInput}
        />
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={
            <TransferDetails
              amount={{
                effective: toBeReceived,
                raw: chosenAmount,
              }}
            />
          }
        />
      </section>
      <section>
        <p>How do you want to transfer?</p>

        <Grid item container columns={1} spacing={1}>
          <Grid item xs={1}>
            <Button disabled={invalid} onClick={copyToClipboard.onClick}>
              Copy transfer URI to clipboard
            </Button>
          </Grid>
          <Grid item xs={1}>
            <Button disabled={invalid} onClick={showQr.onClick}>
              Show QR
            </Button>
          </Grid>
        </Grid>
      </section>
    </WalletAction>
  );
}
