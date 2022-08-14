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
import { Fragment, h, VNode } from "preact";
import { Amount } from "../../components/Amount.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { Link, SubTitle, WalletAction } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { ProductList } from "../Payment/views.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load refund status</i18n.Translate>}
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
        <i18n.Translate>Digital cash refund</i18n.Translate>
      </SubTitle>
      <section>
        <p>
          <i18n.Translate>You&apos;ve ignored the tip.</i18n.Translate>
        </p>
      </section>
    </WalletAction>
  );
}
export function InProgressView(state: State.InProgress): VNode {
  const { i18n } = useTranslationContext();

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash refund</i18n.Translate>
      </SubTitle>
      <section>
        <p>
          <i18n.Translate>The refund is in progress.</i18n.Translate>
        </p>
      </section>
      <section>
        <Part
          big
          title={<i18n.Translate>Total to refund</i18n.Translate>}
          text={<Amount value={state.awaitingAmount} />}
          kind="negative"
        />
        <Part
          big
          title={<i18n.Translate>Refunded</i18n.Translate>}
          text={<Amount value={state.amount} />}
          kind="negative"
        />
      </section>
      {state.products && state.products.length ? (
        <section>
          <ProductList products={state.products} />
        </section>
      ) : undefined}
    </WalletAction>
  );
}
export function CompletedView(state: State.Completed): VNode {
  const { i18n } = useTranslationContext();

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash refund</i18n.Translate>
      </SubTitle>
      <section>
        <p>
          <i18n.Translate>this refund is already accepted.</i18n.Translate>
        </p>
      </section>
      <section>
        <Part
          big
          title={<i18n.Translate>Total to refunded</i18n.Translate>}
          text={<Amount value={state.granted} />}
          kind="negative"
        />
      </section>
    </WalletAction>
  );
}
export function ReadyView(state: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash refund</i18n.Translate>
      </SubTitle>
      <section>
        <p>
          <i18n.Translate>
            The merchant &quot;<b>{state.merchantName}</b>&quot; is offering you
            a refund.
          </i18n.Translate>
        </p>
      </section>
      <section>
        <Part
          big
          title={<i18n.Translate>Order amount</i18n.Translate>}
          text={<Amount value={state.amount} />}
          kind="neutral"
        />
        {Amounts.isNonZero(state.granted) && (
          <Part
            big
            title={<i18n.Translate>Already refunded</i18n.Translate>}
            text={<Amount value={state.granted} />}
            kind="neutral"
          />
        )}
        <Part
          big
          title={<i18n.Translate>Refund offered</i18n.Translate>}
          text={<Amount value={state.awaitingAmount} />}
          kind="positive"
        />
      </section>
      {state.products && state.products.length ? (
        <section>
          <ProductList products={state.products} />
        </section>
      ) : undefined}
      <section>
        <Button
          variant="contained"
          color="success"
          onClick={state.accept.onClick}
        >
          <i18n.Translate>
            Accept &nbsp; <Amount value={state.amount} />
          </i18n.Translate>
        </Button>
      </section>
      <section>
        <Link upperCased onClick={state.cancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Link>
      </section>
    </WalletAction>
  );
}
