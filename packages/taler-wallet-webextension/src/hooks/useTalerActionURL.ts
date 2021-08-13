import { classifyTalerUri, TalerUriType } from "@gnu-taler/taler-util";
import { useEffect, useState } from "preact/hooks";

export function useTalerActionURL(): [string | undefined, (s: boolean) => void] {
  const [talerActionUrl, setTalerActionUrl] = useState<string | undefined>(
    undefined
  );
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    async function check(): Promise<void> {
      const talerUri = await findTalerUriInActiveTab();
      if (talerUri) {
        const actionUrl = actionForTalerUri(talerUri);
        setTalerActionUrl(actionUrl);
      }
    }
    check();
  }, []);
  const url = dismissed ? undefined : talerActionUrl;
  return [url, setDismissed];
}

function actionForTalerUri(talerUri: string): string | undefined {
  const uriType = classifyTalerUri(talerUri);
  switch (uriType) {
    case TalerUriType.TalerWithdraw:
      return makeExtensionUrlWithParams("static/wallet.html#/withdraw", {
        talerWithdrawUri: talerUri,
      });
    case TalerUriType.TalerPay:
      return makeExtensionUrlWithParams("static/wallet.html#/pay", {
        talerPayUri: talerUri,
      });
    case TalerUriType.TalerTip:
      return makeExtensionUrlWithParams("static/wallet.html#/tip", {
        talerTipUri: talerUri,
      });
    case TalerUriType.TalerRefund:
      return makeExtensionUrlWithParams("static/wallet.html#/refund", {
        talerRefundUri: talerUri,
      });
    case TalerUriType.TalerNotifyReserve:
      // FIXME: implement
      break;
    default:
      console.warn(
        "Response with HTTP 402 has Taler header, but header value is not a taler:// URI.",
      );
      break;
  }
  return undefined;
}

function makeExtensionUrlWithParams(
  url: string,
  params?: { [name: string]: string | undefined },
): string {
  const innerUrl = new URL(chrome.extension.getURL("/" + url));
  if (params) {
    const hParams = Object.keys(params).map(k => `${k}=${params[k]}`).join('&')
    innerUrl.hash = innerUrl.hash + '?' + hParams
  }
  return innerUrl.href;
}

async function findTalerUriInActiveTab(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(
      {
        code: `
        (() => {
          let x = document.querySelector("a[href^='taler://'") || document.querySelector("a[href^='taler+http://'");
          return x ? x.href.toString() : null;
        })();
      `,
        allFrames: false,
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resolve(undefined);
          return;
        }
        console.log("got result", result);
        resolve(result[0]);
      },
    );
  });
}
