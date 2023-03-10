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

import { AbsoluteTime, AttentionType } from "@gnu-taler/taler-util";
import { createExample } from "../../test-utils.js";
import { ReadyView } from "./views.js";

export default {
  title: "notifications",
};

export const Ready = createExample(ReadyView, {
  list: [
    {
      when: AbsoluteTime.now(),
      read: false,
      info: {
        type: AttentionType.KycWithdrawal,
        transactionId: "123",
      },
    },
    {
      when: AbsoluteTime.now(),
      read: false,
      info: {
        type: AttentionType.MerchantRefund,
        transactionId: "123",
      },
    },
    {
      when: AbsoluteTime.now(),
      read: false,
      info: {
        type: AttentionType.BackupUnpaid,
        provider_base_url: "http://sync.taler.net",
        talerUri: "taler://payment/asdasdasd",
      },
    },
  ],
});
