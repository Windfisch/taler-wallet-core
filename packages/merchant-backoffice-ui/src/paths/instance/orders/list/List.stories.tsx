/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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

import { h, VNode, FunctionalComponent } from "preact";
import { ListPage as TestedComponent } from "./ListPage.js";

export default {
  title: "Pages/Order/List",
  component: TestedComponent,
  argTypes: {
    onShowAll: { action: "onShowAll" },
    onShowPaid: { action: "onShowPaid" },
    onShowRefunded: { action: "onShowRefunded" },
    onShowNotWired: { action: "onShowNotWired" },
    onCopyURL: { action: "onCopyURL" },
    onSelectDate: { action: "onSelectDate" },
    onLoadMoreBefore: { action: "onLoadMoreBefore" },
    onLoadMoreAfter: { action: "onLoadMoreAfter" },
    onSelectOrder: { action: "onSelectOrder" },
    onRefundOrder: { action: "onRefundOrder" },
    onSearchOrderById: { action: "onSearchOrderById" },
    onCreate: { action: "onCreate" },
  },
};

function createExample<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props>
) {
  const r = (args: any) => <Component {...args} />;
  r.args = props;
  return r;
}

export const Example = createExample(TestedComponent, {
  orders: [
    {
      id: "123",
      amount: "TESTKUDOS:10",
      paid: false,
      refundable: true,
      row_id: 1,
      summary: "summary",
      timestamp: {
        t_s: new Date().getTime() / 1000,
      },
      order_id: "123",
    },
    {
      id: "234",
      amount: "TESTKUDOS:12",
      paid: true,
      refundable: true,
      row_id: 2,
      summary:
        "summary with long text, very very long text that someone want to add as a description of the order",
      timestamp: {
        t_s: new Date().getTime() / 1000,
      },
      order_id: "234",
    },
    {
      id: "456",
      amount: "TESTKUDOS:1",
      paid: false,
      refundable: false,
      row_id: 3,
      summary:
        "summary with long text, very very long text that someone want to add as a description of the order",
      timestamp: {
        t_s: new Date().getTime() / 1000,
      },
      order_id: "456",
    },
    {
      id: "234",
      amount: "TESTKUDOS:12",
      paid: false,
      refundable: false,
      row_id: 4,
      summary:
        "summary with long text, very very long text that someone want to add as a description of the order",
      timestamp: {
        t_s: new Date().getTime() / 1000,
      },
      order_id: "234",
    },
  ],
});
