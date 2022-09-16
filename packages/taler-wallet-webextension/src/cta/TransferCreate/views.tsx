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
import { ErrorTalerOperation } from "../../components/ErrorTalerOperation.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { QR } from "../../components/QR.js";
import { Link, SubTitle, WalletAction } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
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

export function ReadyView({
  subject,
  toBeReceived,
  chosenAmount,
  create,
  operationError,
  cancel,
  invalid,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />
      <SubTitle>
        <i18n.Translate>Digital cash transfer</i18n.Translate>
      </SubTitle>
      {operationError && (
        <ErrorTalerOperation
          title={
            <i18n.Translate>
              Could not finish the transfer creation
            </i18n.Translate>
          }
          error={operationError}
        />
      )}
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
        <p>
          <i18n.Translate>How do you want to transfer?</i18n.Translate>
        </p>
        <Button
          disabled={invalid}
          onClick={create.onClick}
          variant="contained"
          color="success"
        >
          <i18n.Translate>Create</i18n.Translate>
        </Button>
      </section>
      <section>
        <section>
          <Link upperCased onClick={cancel.onClick}>
            <i18n.Translate>Cancel</i18n.Translate>
          </Link>
        </section>
      </section>
    </WalletAction>
  );
}
