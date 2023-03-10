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
  TalerConfigResponse,
} from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useBackendContext } from "../context/backend.js";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook.js";
import { queryToSlashKeys } from "../utils/index.js";
import { ExchangeAddConfirmPage } from "./ExchangeAddConfirm.js";
import { ExchangeSetUrlPage } from "./ExchangeSetUrl.js";

interface Props {
  currency?: string;
  onBack: () => Promise<void>;
}

export function ExchangeAddPage({ currency, onBack }: Props): VNode {
  const [verifying, setVerifying] = useState<
    { url: string; config: TalerConfigResponse } | undefined
  >(undefined);

  const api = useBackendContext();
  const knownExchangesResponse = useAsyncAsHook(() =>
    api.wallet.call(WalletApiOperation.ListExchanges, {}),
  );
  const knownExchanges = !knownExchangesResponse
    ? []
    : knownExchangesResponse.hasError
    ? []
    : knownExchangesResponse.response.exchanges;

  if (!verifying) {
    return (
      <ExchangeSetUrlPage
        onCancel={onBack}
        expectedCurrency={currency}
        onVerify={async (url) => {
          const found =
            knownExchanges.findIndex((e) => e.exchangeBaseUrl === url) !== -1;

          if (found) {
            throw Error("This exchange is already known");
          }
          return queryToSlashKeys(url);
        }}
        onConfirm={(url) =>
          queryToSlashKeys<TalerConfigResponse>(url)
            .then((config) => {
              setVerifying({ url, config });
            })
            .catch((e) => e.message)
        }
      />
    );
  }
  return (
    <ExchangeAddConfirmPage
      url={verifying.url}
      onCancel={onBack}
      onConfirm={async () => {
        await api.wallet.call(WalletApiOperation.AddExchange, {
          exchangeBaseUrl: canonicalizeBaseUrl(verifying.url),
          forceUpdate: true,
        });
        onBack();
      }}
    />
  );
}
