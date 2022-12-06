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
  title: "select exchange",
};

export const Bitcoin1 = createExample(ReadyView, {
  exchanges: {
    list: { "0": "https://exchange.taler.ar" },
    value: "0",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
    exchangeBaseUrl: "https://exchange.taler.ar",
    denomFees: timelineExample(),
    transferFees: {},
    globalFees: [],
  } as any,
  onShowPrivacy: {},
  onShowTerms: {},
  onClose: {},
});
export const Bitcoin2 = createExample(ReadyView, {
  exchanges: {
    list: {
      "https://exchange.taler.ar": "https://exchange.taler.ar",
      "https://exchange-btc.taler.ar": "https://exchange-btc.taler.ar",
    },
    value: "https://exchange.taler.ar",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
    exchangeBaseUrl: "https://exchange.taler.ar",
    denomFees: timelineExample(),
    transferFees: {},
    globalFees: [],
  } as any,
  onShowPrivacy: {},
  onShowTerms: {},
  onClose: {},
});

export const Kudos1 = createExample(ReadyView, {
  exchanges: {
    list: {
      "https://exchange-kudos.taler.ar": "https://exchange-kudos.taler.ar",
    },
    value: "https://exchange-kudos.taler.ar",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
    exchangeBaseUrl: "https://exchange.taler.ar",
    denomFees: timelineExample(),
    transferFees: {},
    globalFees: [],
  } as any,
  onShowPrivacy: {},
  onShowTerms: {},
  onClose: {},
});
export const Kudos2 = createExample(ReadyView, {
  exchanges: {
    list: {
      "https://exchange-kudos.taler.ar": "https://exchange-kudos.taler.ar",
      "https://exchange-kudos2.taler.ar": "https://exchange-kudos2.taler.ar",
    },
    value: "https://exchange-kudos.taler.ar",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
    exchangeBaseUrl: "https://exchange.taler.ar",
    denomFees: timelineExample(),
    transferFees: {},
    globalFees: [],
  } as any,
  onShowPrivacy: {},
  onShowTerms: {},
  onClose: {},
});
export const ComparingBitcoin = createExample(ComparingView, {
  exchanges: {
    list: { "http://exchange": "http://exchange" },
    value: "http://exchange",
  },
  selected: {
    currency: "BITCOINBTC",
    auditors: [],
    exchangeBaseUrl: "https://exchange.taler.ar",
    transferFees: {},
    globalFees: [],
  } as any,
  onReset: {},
  onShowPrivacy: {},
  onShowTerms: {},
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
    exchangeBaseUrl: "https://exchange.taler.ar",
    transferFees: {},
    globalFees: [],
  } as any,
  onReset: {},
  onShowPrivacy: {},
  onShowTerms: {},
  onSelect: {},
  error: undefined,
  pairTimeline: {
    deposit: [],
    refresh: [],
    refund: [],
    withdraw: [],
  },
});

function timelineExample() {
  return {
    deposit: [
      {
        group: "0.1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1916386904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1916386904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "10",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1916386904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1000",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1916386904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "2",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1916386904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "5",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1916386904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
    refresh: [
      {
        group: "0.1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "10",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1000",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "2",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "5",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
    refund: [
      {
        group: "0.1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "10",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1000",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "2",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "5",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
    withdraw: [
      {
        group: "0.1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "10",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "1000",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "2",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
      {
        group: "5",
        from: {
          t_ms: 1664098904000,
        },
        until: {
          t_ms: 1758706904000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
    wad: [
      {
        group: "iban",
        from: {
          t_ms: 1640995200000,
        },
        until: {
          t_ms: 1798761600000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
    wire: [
      {
        group: "iban",
        from: {
          t_ms: 1640995200000,
        },
        until: {
          t_ms: 1798761600000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
    closing: [
      {
        group: "iban",
        from: {
          t_ms: 1640995200000,
        },
        until: {
          t_ms: 1798761600000,
        },
        fee: {
          currency: "KUDOS",
          fraction: 1000000,
          value: 0,
        },
      },
    ],
  };
}
