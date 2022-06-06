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
import { classifyTalerUri, TalerUriType } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { platform } from "../platform/api.js";
import { InputWithLabel } from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";
import { Button } from "../mui/Button.js";

export interface Props {
  onCancel: () => Promise<void>;
}

export function AddNewActionView({ onCancel }: Props): VNode {
  const [url, setUrl] = useState("");
  const uriType = classifyTalerUri(url);
  const { i18n } = useTranslationContext();

  async function redirectToWallet(): Promise<void> {
    platform.openWalletURIFromPopup(url);
  }

  return (
    <Fragment>
      <section>
        <InputWithLabel
          invalid={url !== "" && uriType === TalerUriType.Unknown}
        >
          <label>GNU Taler URI</label>
          <div>
            <input
              style={{ width: "100%" }}
              type="text"
              value={url}
              placeholder="taler://pay/...."
              onInput={(e) => setUrl(e.currentTarget.value)}
            />
          </div>
        </InputWithLabel>
      </section>
      <footer>
        <Button variant="contained" color="secondary" onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {uriType !== TalerUriType.Unknown && (
          <Button
            variant="contained"
            color="success"
            onClick={redirectToWallet}
          >
            {(() => {
              switch (uriType) {
                case TalerUriType.TalerNotifyReserve:
                  return <i18n.Translate>Open reserve page</i18n.Translate>;
                case TalerUriType.TalerPay:
                  return <i18n.Translate>Open pay page</i18n.Translate>;
                case TalerUriType.TalerRefund:
                  return <i18n.Translate>Open refund page</i18n.Translate>;
                case TalerUriType.TalerTip:
                  return <i18n.Translate>Open tip page</i18n.Translate>;
                case TalerUriType.TalerWithdraw:
                  return <i18n.Translate>Open withdraw page</i18n.Translate>;
              }
              return <Fragment />;
            })()}
          </Button>
        )}
      </footer>
    </Fragment>
  );
}
