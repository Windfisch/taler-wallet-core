import {
  classifyTalerUri,
  TalerUriType,
  Translate,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Button, ButtonSuccess, InputWithLabel } from "../components/styled";
import { actionForTalerUri } from "../utils/index";

export interface Props {
  onCancel: () => void;
}

function buttonLabelByTalerType(type: TalerUriType): VNode {
  switch (type) {
    case TalerUriType.TalerNotifyReserve:
      return <Translate>Open reserve page</Translate>;
    case TalerUriType.TalerPay:
      return <Translate>Open pay page</Translate>;
    case TalerUriType.TalerRefund:
      return <Translate>Open refund page</Translate>;
    case TalerUriType.TalerTip:
      return <Translate>Open tip page</Translate>;
    case TalerUriType.TalerWithdraw:
      return <Translate>Open withdraw page</Translate>;
  }
  return <Fragment />;
}

export function AddNewActionView({ onCancel }: Props): VNode {
  const [url, setUrl] = useState("");
  const uriType = classifyTalerUri(url);

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
          <Translate>Back</Translate>
        </Button>
        {uriType !== TalerUriType.Unknown && (
          <ButtonSuccess
            onClick={() => {
              // eslint-disable-next-line no-undef
              chrome.tabs.create({ url: actionForTalerUri(uriType, url) });
            }}
          >
            {buttonLabelByTalerType(uriType)}
          </ButtonSuccess>
        )}
      </footer>
    </Fragment>
  );
}
