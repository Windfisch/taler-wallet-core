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

import * as a1 from "./Deposit/stories.jsx";
import * as a3 from "./Payment/stories.jsx";
import * as a4 from "./Refund/stories.jsx";
import * as a5 from "./Tip/stories.jsx";
import * as a6 from "./Withdraw/stories.jsx";
import * as a7 from "./TermsOfService/stories.js";
import * as a8 from "./InvoiceCreate/stories.js";
import * as a9 from "./InvoicePay/stories.js";
import * as a10 from "./TransferCreate/stories.js";
import * as a11 from "./TransferPickup/stories.js";

export default [a1, a3, a4, a5, a6, a7, a8, a9, a10, a11];
