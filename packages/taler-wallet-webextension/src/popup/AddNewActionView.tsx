import { classifyTalerUri, TalerUriType } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Button, ButtonSuccess, InputWithLabel } from "../components/styled";
import { actionForTalerUri } from "../utils/index";

export interface Props {
  onCancel: () => void;
}

function buttonLabelByTalerType(type: TalerUriType): string {
  switch (type) {
    case TalerUriType.TalerNotifyReserve:
      return "Open reserve page";
    case TalerUriType.TalerPay:
      return "Open pay page";
    case TalerUriType.TalerRefund:
      return "Open refund page";
    case TalerUriType.TalerTip:
      return "Open tip page";
    case TalerUriType.TalerWithdraw:
      return "Open withdraw page";
  }
  return "";
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
        <Button onClick={onCancel}>Back</Button>
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
