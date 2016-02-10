/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

import {AmountJson} from "./wallet/wallet";

export function substituteFulfillmentUrl(url: string, vars) {
  url = url.replace("${H_contract}", vars.H_contract);
  url = url.replace("${$}", "$");
  return url;
}

export function amountToPretty(amount: AmountJson): string {
  let x = amount.value + amount.fraction / 1e6;
  return `${x} ${amount.currency}`;
}