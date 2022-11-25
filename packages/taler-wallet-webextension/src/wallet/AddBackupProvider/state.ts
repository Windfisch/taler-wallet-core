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

import {
  canonicalizeBaseUrl,
  Codec,
  TalerErrorDetail,
} from "@gnu-taler/taler-util";
import {
  codecForSyncTermsOfServiceResponse,
  WalletApiOperation,
} from "@gnu-taler/taler-wallet-core";
import { useEffect, useState } from "preact/hooks";
import { assertUnreachable } from "../../utils/index.js";
import { wxApi } from "../../wxApi.js";
import { Props, State } from "./index.js";

type UrlState<T> = UrlOk<T> | UrlError;

interface UrlOk<T> {
  status: "ok";
  result: T;
}
type UrlError =
  | UrlNetworkError
  | UrlClientError
  | UrlServerError
  | UrlParsingError
  | UrlReadError;

interface UrlNetworkError {
  status: "network-error";
  href: string;
}
interface UrlClientError {
  status: "client-error";
  code: number;
}
interface UrlServerError {
  status: "server-error";
  code: number;
}
interface UrlParsingError {
  status: "parsing-error";
  json: any;
}
interface UrlReadError {
  status: "url-error";
}

function useDebounceEffect(
  time: number,
  cb: undefined | (() => Promise<void>),
  deps: Array<any>,
): void {
  const [currentTimer, setCurrentTimer] = useState<any>();
  useEffect(() => {
    if (currentTimer !== undefined) clearTimeout(currentTimer);
    if (cb !== undefined) {
      const tid = setTimeout(cb, time);
      setCurrentTimer(tid);
    }
  }, deps);
}

function useUrlState<T>(
  host: string | undefined,
  path: string,
  codec: Codec<T>,
): UrlState<T> | undefined {
  const [state, setState] = useState<UrlState<T> | undefined>();

  let href: string | undefined;
  try {
    if (host) {
      const isHttps =
        host.startsWith("https://") && host.length > "https://".length;
      const isHttp =
        host.startsWith("http://") && host.length > "http://".length;
      const withProto = isHttp || isHttps ? host : `https://${host}`;
      const baseUrl = canonicalizeBaseUrl(withProto);
      href = new URL(path, baseUrl).href;
    }
  } catch (e) {
    setState({
      status: "url-error",
    });
  }
  const constHref = href;

  useDebounceEffect(
    500,
    constHref == undefined
      ? undefined
      : async () => {
          const req = await fetch(constHref).catch((e) => {
            return setState({
              status: "network-error",
              href: constHref,
            });
          });
          if (!req) return;

          if (req.status >= 400 && req.status < 500) {
            setState({
              status: "client-error",
              code: req.status,
            });
            return;
          }
          if (req.status > 500) {
            setState({
              status: "server-error",
              code: req.status,
            });
            return;
          }

          const json = await req.json();
          try {
            const result = codec.decode(json);
            setState({ status: "ok", result });
          } catch (e: any) {
            setState({ status: "parsing-error", json });
          }
        },
    [host, path],
  );

  return state;
}

export function useComponentState(
  { currency, onBack, onComplete, onPaymentRequired }: Props,
  api: typeof wxApi,
): State {
  const [url, setHost] = useState<string | undefined>();
  const [name, setName] = useState<string | undefined>();
  const [tos, setTos] = useState(false);
  const urlState = useUrlState(
    url,
    "config",
    codecForSyncTermsOfServiceResponse(),
  );
  const [operationError, setOperationError] = useState<
    TalerErrorDetail | undefined
  >();
  const [showConfirm, setShowConfirm] = useState(false);

  async function addBackupProvider() {
    if (!url || !name) return;

    const resp = await api.wallet.call(WalletApiOperation.AddBackupProvider, {
      backupProviderBaseUrl: url,
      name: name,
      activate: true,
    });

    switch (resp.status) {
      case "payment-required":
        if (resp.talerUri) {
          return onPaymentRequired(resp.talerUri);
        } else {
          return onComplete(url);
        }
      case "error":
        return setOperationError(resp.error);
      case "ok":
        return onComplete(url);
      default:
        assertUnreachable(resp);
    }
  }

  if (showConfirm && urlState && urlState.status === "ok") {
    return {
      status: "confirm-provider",
      error: operationError,
      onAccept: {
        onClick: !tos ? undefined : addBackupProvider,
      },
      onCancel: {
        onClick: onBack,
      },
      provider: urlState.result,
      tos: {
        value: tos,
        button: {
          onClick: async () => setTos(!tos),
        },
      },
      url: url ?? "",
    };
  }

  return {
    status: "select-provider",
    error: undefined,
    name: {
      value: name || "",
      onInput: async (e) => setName(e),
      error:
        name === undefined ? undefined : !name ? "Can't be empty" : undefined,
    },
    onCancel: {
      onClick: onBack,
    },
    onConfirm: {
      onClick:
        !urlState || urlState.status !== "ok" || !name
          ? undefined
          : async () => {
              setShowConfirm(true);
            },
    },
    urlOk: urlState?.status === "ok",
    url: {
      value: url || "",
      onInput: async (e) => setHost(e),
      error: errorString(urlState),
    },
  };
}

function errorString(state: undefined | UrlState<any>): string | undefined {
  if (!state) return state;
  switch (state.status) {
    case "ok":
      return undefined;
    case "client-error": {
      switch (state.code) {
        case 404:
          return "Not found";
        case 401:
          return "Unauthorized";
        case 403:
          return "Forbidden";
        default:
          return `Server says it a client error: ${state.code}.`;
      }
    }
    case "server-error":
      return `Server had a problem ${state.code}.`;
    case "parsing-error":
      return `Server response doesn't have the right format.`;
    case "network-error":
      return `Unable to connect to ${state.href}.`;
    case "url-error":
      return "URL is not complete";
  }
}
