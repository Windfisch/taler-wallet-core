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
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { SubTitle, WalletAction } from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={
        <i18n.Translate>
          Could not load backup recovery information
        </i18n.Translate>
      }
      error={error}
    />
  );
}

export function ReadyView({ accept, cancel }: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WalletAction>
      <LogoHeader />

      <SubTitle>
        <i18n.Translate>Digital wallet recovery</i18n.Translate>
      </SubTitle>

      <section>
        <p>
          <i18n.Translate>Import backup, show info</i18n.Translate>
        </p>
        <Button variant="contained" onClick={accept.onClick}>
          Import
        </Button>
        <Button variant="contained" onClick={cancel.onClick}>
          Cancel
        </Button>
      </section>
    </WalletAction>
  );
}
