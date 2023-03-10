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

import { PreparePayResult, PreparePayResultType } from "@gnu-taler/taler-util";
import { createExample } from "../../test-utils.js";
import { ReadyView } from "./views.js";

export default {
  title: "invoice payment",
};

export const Ready = createExample(ReadyView, {
  amount: {
    currency: "ARS",
    value: 1,
    fraction: 0,
  },
  summary: "some subject",
  payStatus: {
    status: PreparePayResultType.PaymentPossible,
    amountEffective: "ARS:1",
  } as PreparePayResult,
  expiration: {
    t_ms: new Date().getTime() + 1000 * 60 * 60,
  },
  accept: {},
  cancel: {},
});
