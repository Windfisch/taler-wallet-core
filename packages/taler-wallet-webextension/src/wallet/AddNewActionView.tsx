import { classifyTalerUri, TalerUriType } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { platform } from "../platform/api.js";
import {
  Button,
  ButtonSuccess,
  InputWithLabel,
} from "../components/styled/index.js";
import { useTranslationContext } from "../context/translation.js";

export interface Props {
  onCancel: () => void;
}

export function AddNewActionView({ onCancel }: Props): VNode {
  const [url, setUrl] = useState("");
  const uriType = classifyTalerUri(url);
  const { i18n } = useTranslationContext();

  function redirectToWallet(): void {
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
        <Button onClick={onCancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        {uriType !== TalerUriType.Unknown && (
          <ButtonSuccess onClick={redirectToWallet}>
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
          </ButtonSuccess>
        )}
      </footer>
    </Fragment>
  );
}
