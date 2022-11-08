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

import { format } from "date-fns";
import { h, VNode } from "preact";
import { ErrorTalerOperation } from "../../components/ErrorTalerOperation.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { QR } from "../../components/QR.js";
import {
  Link,
  SubTitle,
  SvgIcon,
  WalletAction,
} from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { Grid } from "../../mui/Grid.js";
import { TextField } from "../../mui/TextField.js";
import editIcon from "../../svg/edit_24px.svg";
import { ExchangeDetails, InvoiceDetails } from "../../wallet/Transaction.js";
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
  exchangeUrl,
  subject,
  expiration,
  cancel,
  operationError,
  create,
  toBeReceived,
  requestAmount,
  doSelectExchange,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  async function oneDayExpiration() {
    if (expiration.onInput) {
      expiration.onInput(
        format(new Date().getTime() + 1000 * 60 * 60 * 24, "dd/MM/yyyy"),
      );
    }
  }

  async function oneWeekExpiration() {
    if (expiration.onInput) {
      expiration.onInput(
        format(new Date().getTime() + 1000 * 60 * 60 * 24 * 7, "dd/MM/yyyy"),
      );
    }
  }
  async function _20DaysExpiration() {
    if (expiration.onInput) {
      expiration.onInput(
        format(new Date().getTime() + 1000 * 60 * 60 * 24 * 20, "dd/MM/yyyy"),
      );
    }
  }
  return (
    <WalletAction>
      <LogoHeader />
      <SubTitle>
        <i18n.Translate>Digital invoice</i18n.Translate>
      </SubTitle>
      {operationError && (
        <ErrorTalerOperation
          title={
            <i18n.Translate>
              Could not finish the invoice creation
            </i18n.Translate>
          }
          error={operationError}
        />
      )}
      <section style={{ textAlign: "left" }}>
        <Part
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <i18n.Translate>Exchange</i18n.Translate>
              <Button onClick={doSelectExchange.onClick} variant="text">
                <SvgIcon
                  title="Edit"
                  dangerouslySetInnerHTML={{ __html: editIcon }}
                  color="black"
                />
              </Button>
            </div>
          }
          text={<ExchangeDetails exchange={exchangeUrl} />}
          kind="neutral"
          big
        />
        <p>
          <TextField
            label="Subject"
            variant="filled"
            error={subject.error}
            required
            fullWidth
            value={subject.value}
            onChange={subject.onInput}
          />
        </p>

        <p>
          <TextField
            label="Expiration"
            variant="filled"
            error={expiration.error}
            required
            fullWidth
            value={expiration.value}
            onChange={expiration.onInput}
          />
          <p>
            <Button
              variant="outlined"
              disabled={!expiration.onInput}
              onClick={oneDayExpiration}
            >
              1 day
            </Button>
            <Button
              variant="outlined"
              disabled={!expiration.onInput}
              onClick={oneWeekExpiration}
            >
              1 week
            </Button>
            <Button
              variant="outlined"
              disabled={!expiration.onInput}
              onClick={_20DaysExpiration}
            >
              20 days
            </Button>
          </p>
        </p>

        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={
            <InvoiceDetails
              amount={{
                effective: toBeReceived,
                raw: requestAmount,
              }}
            />
          }
        />
      </section>
      <section>
        <Button onClick={create.onClick} variant="contained" color="success">
          <i18n.Translate>Create</i18n.Translate>
        </Button>
      </section>
      <section>
        <Link upperCased onClick={cancel.onClick}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Link>
      </section>
    </WalletAction>
  );
}
