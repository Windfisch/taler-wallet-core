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

import { ExchangeListItem } from "@gnu-taler/taler-util";
import { useState } from "preact/hooks";
import { ButtonHandler } from "../mui/handlers.js";

type State = State.Ready | State.NoExchange | State.Selecting;

export namespace State {
  export interface NoExchange {
    status: "no-exchange";
    error: undefined;
    currency: string | undefined;
  }
  export interface Ready {
    status: "ready";
    doSelect: ButtonHandler;
    selected: ExchangeListItem;
  }
  export interface Selecting {
    status: "selecting-exchange";
    error: undefined;
    onSelection: (url: string) => Promise<void>;
    onCancel: () => Promise<void>;
    list: ExchangeListItem[];
    currency: string;
    currentExchange: string;
  }
}

interface Props {
  currency: string;
  //there is a preference for the default at the initial state
  defaultExchange?: string;
  //list of exchanges
  list: ExchangeListItem[];
}

export function useSelectedExchange({
  currency,
  defaultExchange,
  list,
}: Props): State {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string | undefined>(
    undefined,
  );

  if (!list.length) {
    return {
      status: "no-exchange",
      error: undefined,
      currency: undefined,
    };
  }

  const listCurrency = list.filter((e) => e.currency === currency);
  if (!listCurrency.length) {
    // there should be at least one exchange for this currency
    return {
      status: "no-exchange",
      error: undefined,
      currency,
    };
  }

  if (isSelecting) {
    const currentExchange =
      selectedExchange ?? defaultExchange ?? listCurrency[0].exchangeBaseUrl;
    return {
      status: "selecting-exchange",
      error: undefined,
      list: listCurrency,
      currency,
      currentExchange: currentExchange,
      onSelection: async (exchangeBaseUrl: string) => {
        setIsSelecting(false);
        setSelectedExchange(exchangeBaseUrl);
      },
      onCancel: async () => {
        setIsSelecting(false);
      },
    };
  }

  {
    const found = !selectedExchange
      ? undefined
      : list.find((e) => e.exchangeBaseUrl === selectedExchange);
    if (found)
      return {
        status: "ready",
        doSelect: {
          onClick: async () => setIsSelecting(true),
        },
        selected: found,
      };
  }
  {
    const found = !defaultExchange
      ? undefined
      : list.find((e) => e.exchangeBaseUrl === defaultExchange);
    if (found)
      return {
        status: "ready",
        doSelect: {
          onClick: async () => setIsSelecting(true),
        },
        selected: found,
      };
  }

  return {
    status: "ready",
    doSelect: {
      onClick: async () => setIsSelecting(true),
    },
    selected: listCurrency[0],
  };
}
