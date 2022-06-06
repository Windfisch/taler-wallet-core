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

import { Amounts, Balance } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { TableWithRoundRows as TableWithRoundedRows } from "./styled/index.js";

export function BalanceTable({
  balances,
  goToWalletHistory,
}: {
  balances: Balance[];
  goToWalletHistory: (currency: string) => void;
}): VNode {
  return (
    <TableWithRoundedRows>
      {balances.map((entry, idx) => {
        const av = Amounts.parseOrThrow(entry.available);

        return (
          <tr
            key={idx}
            onClick={() => goToWalletHistory(av.currency)}
            style={{ cursor: "pointer" }}
          >
            <td>{av.currency}</td>
            <td
              style={{
                fontSize: "2em",
                textAlign: "right",
                width: "100%",
              }}
            >
              {Amounts.stringifyValue(av, 2)}
            </td>
          </tr>
        );
      })}
    </TableWithRoundedRows>
  );
}
