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

import {
  canonicalizeBaseUrl,
  TalerConfigResponse,
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../hooks/useAsyncAsHook";
import { queryToSlashKeys } from "../utils";
import * as wxApi from "../wxApi";
import { ExchangeAddConfirmPage } from "./ExchangeAddConfirm";
import { ExchangeSetUrlPage } from "./ExchangeSetUrl";

interface Props {
  currency: string;
  onBack: () => void;
}

export function ExchangeAddPage({ onBack }: Props): VNode {
  const [verifying, setVerifying] = useState<
    { url: string; config: TalerConfigResponse } | undefined
  >(undefined);

  const knownExchangesResponse = useAsyncAsHook(wxApi.listExchanges);
  const knownExchanges = !knownExchangesResponse
    ? []
    : knownExchangesResponse.hasError
    ? []
    : knownExchangesResponse.response.exchanges;

  if (!verifying) {
    return (
      <ExchangeSetUrlPage
        onCancel={onBack}
        knownExchanges={knownExchanges}
        onVerify={(url) => queryToSlashKeys(url)}
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
        await wxApi.addExchange({
          exchangeBaseUrl: canonicalizeBaseUrl(verifying.url),
          forceUpdate: true,
        });
        onBack();
      }}
    />
  );
}
