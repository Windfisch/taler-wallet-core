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

import { createExample } from "../../test-utils.js";
import { ComparingView, ReadyView } from "./views.js";

export default {
  title: "wallet/select exchange",
};

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
  timeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
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
  timeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
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
  timeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
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
  timeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
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
  pairTimeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
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
  pairTimeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
});
