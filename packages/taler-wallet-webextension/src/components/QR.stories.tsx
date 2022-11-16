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

import { createExample } from "../test-utils.js";
import { QR } from "./QR.js";

export default {
  title: "wallet/qr",
};

export const Restore = createExample(QR, {
  text: "taler://restore/6J0RZTJC6AV21WXK87BTE67WTHE9P2QSHF2BZXTP7PDZY2ARYBPG@sync1.demo.taler.net,sync2.demo.taler.net,sync1.demo.taler.net,sync3.demo.taler.net",
});
