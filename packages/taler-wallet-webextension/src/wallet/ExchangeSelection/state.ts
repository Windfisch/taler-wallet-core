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

import { DenomOperationMap, FeeDescription } from "@gnu-taler/taler-util";
import { createPairTimeline } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { Props, State } from "./index.js";

export function useComponentState(
  { onCancel, onSelection, list: exchanges, currentExchange }: Props,
  api: typeof wxApi,
): State {
  const initialValue = exchanges.findIndex(
    (e) => e.exchangeBaseUrl === currentExchange,
  );
  if (initialValue === -1) {
    throw Error(
      `wrong usage of ExchangeSelection component, currentExchange '${currentExchange}' is not in the list of exchanges`,
    );
  }
  const [value, setValue] = useState(String(initialValue));

  const hook = useAsyncAsHook(async () => {
    // const { exchanges } = await api.listExchanges();

    const selectedIdx = parseInt(value, 10);
    const selectedExchange =
      exchanges.length == 0 ? undefined : exchanges[selectedIdx];
    const selected = !selectedExchange
      ? undefined
      : await api.getExchangeDetailedInfo(selectedExchange.exchangeBaseUrl);

    const initialExchange =
      selectedIdx === initialValue ? undefined : exchanges[initialValue];
    const original = !initialExchange
      ? undefined
      : await api.getExchangeDetailedInfo(initialExchange.exchangeBaseUrl);

    return { exchanges, selected, original };
  }, [value]);

  const [showingTos, setShowingTos] = useState<string | undefined>(undefined);
  const [showingPrivacy, setShowingPrivacy] = useState<string | undefined>(
    undefined,
  );

  if (!hook) {
    return {
      status: "loading",
      error: undefined,
    };
  }
  if (hook.hasError) {
    return {
      status: "error-loading",
      error: hook,
    };
  }

  const { selected, original } = hook.response;

  if (!selected) {
    //!selected <=> exchanges.length === 0
    return {
      status: "no-exchange",
      error: undefined,
      currency: undefined,
    };
  }

  const exchangeMap = exchanges.reduce(
    (prev, cur, idx) => ({ ...prev, [String(idx)]: cur.exchangeBaseUrl }),
    {} as Record<string, string>,
  );

  if (showingPrivacy) {
    return {
      status: "showing-privacy",
      error: undefined,
      onClose: {
        onClick: async () => setShowingPrivacy(undefined),
      },
      exchangeUrl: showingPrivacy,
    };
  }
  if (showingTos) {
    return {
      status: "showing-tos",
      error: undefined,
      onClose: {
        onClick: async () => setShowingTos(undefined),
      },
      exchangeUrl: showingTos,
    };
  }

  if (!original) {
    // !original <=> selected == original
    return {
      status: "ready",
      exchanges: {
        list: exchangeMap,
        value: value,
        onChange: async (v) => {
          setValue(v);
        },
      },
      error: undefined,
      onClose: {
        onClick: onCancel,
      },
      selected,
      onShowPrivacy: {
        onClick: async () => {
          setShowingPrivacy(selected.exchangeBaseUrl);
        },
      },
      onShowTerms: {
        onClick: async () => {
          setShowingTos(selected.exchangeBaseUrl);
        },
      },
    };
  }

  const pairTimeline: DenomOperationMap<FeeDescription[]> = {
    deposit: createPairTimeline(
      selected.denomFees.deposit,
      original.denomFees.deposit,
    ),
    refresh: createPairTimeline(
      selected.denomFees.refresh,
      original.denomFees.refresh,
    ),
    refund: createPairTimeline(
      selected.denomFees.refund,
      original.denomFees.refund,
    ),
    withdraw: createPairTimeline(
      selected.denomFees.withdraw,
      original.denomFees.withdraw,
    ),
  };

  return {
    status: "comparing",
    exchanges: {
      list: exchangeMap,
      value: value,
      onChange: async (v) => {
        setValue(v);
      },
    },
    error: undefined,
    onReset: {
      onClick: async () => {
        setValue(String(initialValue));
      },
    },
    onSelect: {
      onClick: async () => {
        onSelection(selected.exchangeBaseUrl);
      },
    },
    onShowPrivacy: {
      onClick: async () => {
        setShowingPrivacy(selected.exchangeBaseUrl);
      },
    },
    onShowTerms: {
      onClick: async () => {
        setShowingTos(selected.exchangeBaseUrl);
      },
    },
    selected,
    pairTimeline,
  };
}
