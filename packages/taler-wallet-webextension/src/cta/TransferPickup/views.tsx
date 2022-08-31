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
import { Amount } from "../../components/Amount.js";
import { ErrorTalerOperation } from "../../components/ErrorTalerOperation.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { Link, SubTitle, WalletAction } from "../../components/styled/index.js";
import { Time } from "../../components/Time.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
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
  accept,
  summary,
  expiration,
  amount,
  cancel,
  operationError,
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
              Could not finish the pickup operation
            </i18n.Translate>
          }
          error={operationError}
        />
      )}
      <section style={{ textAlign: "left" }}>
        <Part
          title={<i18n.Translate>Subject</i18n.Translate>}
          text={<div>{summary}</div>}
        />
        <Part
          title={<i18n.Translate>Amount</i18n.Translate>}
          text={<Amount value={amount} />}
        />
        <Part
          title={<i18n.Translate>Valid until</i18n.Translate>}
          text={<Time timestamp={expiration} format="dd MMMM yyyy, HH:mm" />}
          kind="neutral"
        />
      </section>
      <section>
        <Button variant="contained" color="success" onClick={accept.onClick}>
          <i18n.Translate>
            Receive &nbsp; {<Amount value={amount} />}
          </i18n.Translate>
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
