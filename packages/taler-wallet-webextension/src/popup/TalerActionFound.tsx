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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { classifyTalerUri, TalerUriType } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Title } from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { Button } from "../mui/Button.js";
import { platform } from "../platform/api.js";

export interface Props {
  url: string;
  onDismiss: () => Promise<void>;
}

export function TalerActionFound({ url, onDismiss }: Props): VNode {
  const uriType = classifyTalerUri(url);
  const { i18n } = useTranslationContext();
  async function redirectToWallet(): Promise<void> {
    platform.openWalletURIFromPopup(url);
  }
  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Taler Action</i18n.Translate>
        </Title>
        {uriType === TalerUriType.TalerPay && (
          <div>
            <p>
              <i18n.Translate>This page has pay action.</i18n.Translate>
            </p>
            <Button
              variant="contained"
              color="success"
              onClick={redirectToWallet}
            >
              <i18n.Translate>Open pay page</i18n.Translate>
            </Button>
          </div>
        )}
        {uriType === TalerUriType.TalerWithdraw && (
          <div>
            <p>
              <i18n.Translate>
                This page has a withdrawal action.
              </i18n.Translate>
            </p>
            <Button
              variant="contained"
              color="success"
              onClick={redirectToWallet}
            >
              <i18n.Translate>Open withdraw page</i18n.Translate>
            </Button>
          </div>
        )}
        {uriType === TalerUriType.TalerTip && (
          <div>
            <p>
              <i18n.Translate>This page has a tip action.</i18n.Translate>
            </p>
            <Button
              variant="contained"
              color="success"
              onClick={redirectToWallet}
            >
              <i18n.Translate>Open tip page</i18n.Translate>
            </Button>
          </div>
        )}
        {uriType === TalerUriType.TalerRefund && (
          <div>
            <p>
              <i18n.Translate>This page has a refund action.</i18n.Translate>
            </p>
            <Button
              variant="contained"
              color="success"
              onClick={redirectToWallet}
            >
              <i18n.Translate>Open refund page</i18n.Translate>
            </Button>
          </div>
        )}
        {uriType === TalerUriType.Unknown && (
          <div>
            <p>
              <i18n.Translate>
                This page has a malformed taler uri.
              </i18n.Translate>
            </p>
            <p>{url}</p>
          </div>
        )}
      </section>
      <footer>
        <div />
        <Button variant="contained" onClick={onDismiss}>
          <i18n.Translate>Dismiss</i18n.Translate>
        </Button>
      </footer>
    </Fragment>
  );
}
