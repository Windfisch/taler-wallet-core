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

import { Fragment, h, VNode } from "preact";
import { Amount } from "../../components/Amount.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { SubTitle, WalletAction } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load tip status</i18n.Translate>}
      error={error}
    />
  );
}

export function IgnoredView(state: State.Ignored): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash tip</i18n.Translate>
      </SubTitle>
      <span>
        <i18n.Translate>You&apos;ve ignored the tip.</i18n.Translate>
      </span>
    </WalletAction>
  );
}

export function ReadyView(state: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash tip</i18n.Translate>
      </SubTitle>

      <section>
        <p>
          <i18n.Translate>The merchant is offering you a tip</i18n.Translate>
        </p>
        <Part
          title={<i18n.Translate>Amount</i18n.Translate>}
          text={<Amount value={state.amount} />}
          kind="positive"
          big
        />
        <Part
          title={<i18n.Translate>Merchant URL</i18n.Translate>}
          text={state.merchantBaseUrl}
          kind="neutral"
        />
        <Part
          title={<i18n.Translate>Exchange</i18n.Translate>}
          text={state.exchangeBaseUrl}
          kind="neutral"
        />
      </section>
      <section>
        <Button
          variant="contained"
          color="success"
          onClick={state.accept.onClick}
        >
          <i18n.Translate>Accept tip</i18n.Translate>
        </Button>
        <Button onClick={state.ignore.onClick}>
          <i18n.Translate>Ignore</i18n.Translate>
        </Button>
      </section>
    </WalletAction>
  );
}

export function AcceptedView(state: State.Accepted): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash tip</i18n.Translate>
      </SubTitle>
      <section>
        <i18n.Translate>
          Tip from <code>{state.merchantBaseUrl}</code> accepted. Check your
          transactions list for more details.
        </i18n.Translate>
      </section>
    </WalletAction>
  );
}
