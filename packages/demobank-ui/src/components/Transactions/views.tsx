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

import { h, VNode } from "preact";
import { useTranslationContext } from "@gnu-taler/web-util/lib/index.browser";
import { State } from "./index.js";
import { format } from "date-fns";
import { Amounts } from "@gnu-taler/taler-util";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <div>
      <i18n.Translate>Could not load</i18n.Translate>
    </div>
  );
}

export function ReadyView({ transactions }: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  return (
    <div class="results">
      <table class="pure-table pure-table-striped">
        <thead>
          <tr>
            <th>{i18n.str`Date`}</th>
            <th>{i18n.str`Amount`}</th>
            <th>{i18n.str`Counterpart`}</th>
            <th>{i18n.str`Subject`}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((item, idx) => {
            return (
              <tr key={idx}>
                <td>
                  {item.when.t_ms === "never"
                    ? "never"
                    : format(item.when.t_ms, "dd/MM/yyyy")}
                </td>
                <td>
                  {item.negative ? "-" : ""}
                  {Amounts.stringifyValue(item.amount)} {item.amount.currency}
                </td>
                <td>{item.counterpart}</td>
                <td>{item.subject}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
