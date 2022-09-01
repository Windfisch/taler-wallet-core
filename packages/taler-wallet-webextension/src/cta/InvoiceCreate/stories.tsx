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
import { ReadyView, CreatedView } from "./views.js";

export default {
  title: "wallet/invoice create",
};

export const ShowQr = createExample(CreatedView, {
  talerUri:
    "taler://pay-pull/exchange.taler.ar/HS585JK0QCXHJ8Z8QWZA3EBAY5WY7XNC1RR2MHJXSH2Z4WP0YPJ0",
  cancel: {},
  copyToClipboard: {},
});

export const Ready = createExample(ReadyView, {
  chosenAmount: {
    currency: "ARS",
    value: 1,
    fraction: 0,
  },
  cancel: {},
  toBeReceived: {
    currency: "ARS",
    value: 1,
    fraction: 0,
  },
  exchangeUrl: "https://exchange.taler.ar",
  subject: {
    value: "some subject",
    onInput: async () => {
      null;
    },
  },
  create: {},
});
