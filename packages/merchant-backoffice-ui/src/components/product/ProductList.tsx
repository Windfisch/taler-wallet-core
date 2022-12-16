/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { Amounts } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import emptyImage from "../../assets/empty.png";
import { MerchantBackend } from "../../declaration.js";
import { Translate } from "../../i18n/index.js";

interface Props {
  list: MerchantBackend.Product[];
  actions?: {
    name: string;
    tooltip: string;
    handler: (d: MerchantBackend.Product, index: number) => void;
  }[];
}
export function ProductList({ list, actions = [] }: Props): VNode {
  return (
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>image</Translate>
            </th>
            <th>
              <Translate>description</Translate>
            </th>
            <th>
              <Translate>quantity</Translate>
            </th>
            <th>
              <Translate>unit price</Translate>
            </th>
            <th>
              <Translate>total price</Translate>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((entry, index) => {
            const unitPrice = !entry.price ? "0" : entry.price;
            const totalPrice = !entry.price
              ? "0"
              : Amounts.stringify(
                  Amounts.mult(
                    Amounts.parseOrThrow(entry.price),
                    entry.quantity
                  ).amount
                );

            return (
              <tr key={index}>
                <td>
                  <img
                    style={{ height: 32, width: 32 }}
                    src={entry.image ? entry.image : emptyImage}
                  />
                </td>
                <td>{entry.description}</td>
                <td>
                  {entry.quantity === 0
                    ? "--"
                    : `${entry.quantity} ${entry.unit}`}
                </td>
                <td>{unitPrice}</td>
                <td>{totalPrice}</td>
                <td class="is-actions-cell right-sticky">
                  {actions.map((a, i) => {
                    return (
                      <div key={i} class="buttons is-right">
                        <button
                          class="button is-small is-danger has-tooltip-left"
                          data-tooltip={a.tooltip}
                          type="button"
                          onClick={() => a.handler(entry, index)}
                        >
                          {a.name}
                        </button>
                      </div>
                    );
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
