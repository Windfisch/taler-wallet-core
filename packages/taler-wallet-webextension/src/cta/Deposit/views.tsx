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
import { SubTitle, WalletAction } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { State } from "./index.js";

/**
 *
 * @author sebasjm
 */

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load deposit status</i18n.Translate>}
      error={error}
    />
  );
}
export function CompletedView(state: State.Completed): VNode {
  const { i18n } = useTranslationContext();

  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital cash deposit</i18n.Translate>
      </SubTitle>
      <section>
        <p>
          <i18n.Translate>deposit completed</i18n.Translate>
        </p>
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
        <i18n.Translate>Digital cash deposit</i18n.Translate>
      </SubTitle>
      <section>
        {Amounts.isNonZero(state.cost) && (
          <Part
            big
            title={<i18n.Translate>Cost</i18n.Translate>}
            text={<Amount value={state.cost} />}
            kind="negative"
          />
        )}
        {Amounts.isNonZero(state.fee) && (
          <Part
            big
            title={<i18n.Translate>Fee</i18n.Translate>}
            text={<Amount value={state.fee} />}
            kind="negative"
          />
        )}
        <Part
          big
          title={<i18n.Translate>To be received</i18n.Translate>}
          text={<Amount value={state.effective} />}
          kind="positive"
        />
      </section>
      <section>
        <Button
          variant="contained"
          color="success"
          onClick={state.confirm.onClick}
        >
          <i18n.Translate>
            Send &nbsp; {<Amount value={state.cost} />}
          </i18n.Translate>
        </Button>
      </section>
    </WalletAction>
  );
}
