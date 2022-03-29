/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
import { Fragment, h } from "preact";
import { platform } from "../platform/api.js";
import {
  ButtonPrimary,
  ButtonSuccess,
  Title,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";

export interface Props {
  url: string;
  onDismiss: () => void;
}

export function TalerActionFound({ url, onDismiss }: Props) {
  const uriType = classifyTalerUri(url);
  const { i18n } = useTranslationContext();
  function redirectToWallet() {
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
            <ButtonSuccess onClick={redirectToWallet}>
              <i18n.Translate>Open pay page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerWithdraw && (
          <div>
            <p>
              <i18n.Translate>
                This page has a withdrawal action.
              </i18n.Translate>
            </p>
            <ButtonSuccess onClick={redirectToWallet}>
              <i18n.Translate>Open withdraw page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerTip && (
          <div>
            <p>
              <i18n.Translate>This page has a tip action.</i18n.Translate>
            </p>
            <ButtonSuccess onClick={redirectToWallet}>
              <i18n.Translate>Open tip page</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerNotifyReserve && (
          <div>
            <p>
              <i18n.Translate>
                This page has a notify reserve action.
              </i18n.Translate>
            </p>
            <ButtonSuccess onClick={redirectToWallet}>
              <i18n.Translate>Notify</i18n.Translate>
            </ButtonSuccess>
          </div>
        )}
        {uriType === TalerUriType.TalerRefund && (
          <div>
            <p>
              <i18n.Translate>This page has a refund action.</i18n.Translate>
            </p>
            <ButtonSuccess onClick={redirectToWallet}>
              <i18n.Translate>Open refund page</i18n.Translate>
            </ButtonSuccess>
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
        <ButtonPrimary onClick={() => onDismiss()}>
          {" "}
          <i18n.Translate>Dismiss</i18n.Translate>{" "}
        </ButtonPrimary>
      </footer>
    </Fragment>
  );
}
