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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { ExchangeListItem } from "@gnu-taler/taler-util";
import { createExample } from "../../test-utils.js";
import { bitcoinExchanges, kudosExchanges } from "./example.js";
import { FeeDescription, FeeDescriptionPair, OperationMap } from "./index.js";
import {
  createDenominationPairTimeline,
  createDenominationTimeline,
} from "./state.js";
import { ReadyView, ComparingView } from "./views.js";

export default {
  title: "wallet/select exchange",
};

function timelineForExchange(
  ex: ExchangeListItem,
): OperationMap<FeeDescription[]> {
  return {
    deposit: createDenominationTimeline(
      ex.denominations,
      "stampExpireDeposit",
      "feeDeposit",
    ),
    refresh: createDenominationTimeline(
      ex.denominations,
      "stampExpireWithdraw",
      "feeRefresh",
    ),
    refund: createDenominationTimeline(
      ex.denominations,
      "stampExpireWithdraw",
      "feeRefund",
    ),
    withdraw: createDenominationTimeline(
      ex.denominations,
      "stampExpireWithdraw",
      "feeWithdraw",
    ),
  };
}

function timelinePairForExchange(
  ex1: ExchangeListItem,
  ex2: ExchangeListItem,
): OperationMap<FeeDescriptionPair[]> {
  const om1 = timelineForExchange(ex1);
  const om2 = timelineForExchange(ex2);
  return {
    deposit: createDenominationPairTimeline(om1.deposit, om2.deposit),
    refresh: createDenominationPairTimeline(om1.refresh, om2.refresh),
    refund: createDenominationPairTimeline(om1.refund, om2.refund),
    withdraw: createDenominationPairTimeline(om1.withdraw, om2.withdraw),
  };
}

export const Bitcoin1 = createExample(ReadyView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
  } as any,
  onClose: {},
  nextFeeUpdate: {
    t_ms: 1,
  },
  timeline: timelineForExchange(bitcoinExchanges[0]),
});
export const Bitcoin2 = createExample(ReadyView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
  } as any,
  onClose: {},
  nextFeeUpdate: {
    t_ms: 1,
  },
  timeline: timelineForExchange(bitcoinExchanges[1]),
});
export const Kudos1 = createExample(ReadyView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
  } as any,
  onClose: {},
  nextFeeUpdate: {
    t_ms: 1,
  },
  timeline: timelineForExchange(kudosExchanges[0]),
});
export const Kudos2 = createExample(ReadyView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
  } as any,
  onClose: {},
  nextFeeUpdate: {
    t_ms: 1,
  },
  timeline: timelineForExchange(kudosExchanges[1]),
});
export const ComparingBitcoin = createExample(ComparingView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
  } as any,
  onReset: {},
  onSelect: {},
  error: undefined,
  nextFeeUpdate: {
    t_ms: 1,
  },
  pairTimeline: timelinePairForExchange(
    bitcoinExchanges[0],
    bitcoinExchanges[1],
  ),
});
export const ComparingKudos = createExample(ComparingView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "KUDOS",
    auditors: [],
  } as any,
  onReset: {},
  onSelect: {},
  error: undefined,
  nextFeeUpdate: {
    t_ms: 1,
  },
  pairTimeline: timelinePairForExchange(kudosExchanges[0], kudosExchanges[1]),
});
