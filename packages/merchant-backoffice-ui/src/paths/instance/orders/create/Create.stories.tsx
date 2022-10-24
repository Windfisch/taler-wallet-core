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
import { CreatePage as TestedComponent } from "./CreatePage";

export default {
  title: "Pages/Order/Create",
  component: TestedComponent,
  argTypes: {
    onCreate: { action: "onCreate" },
    goBack: { action: "goBack" },
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
  instanceConfig: {
    default_max_deposit_fee: "",
    default_max_wire_fee: "",
    default_pay_delay: {
      d_us: 1000 * 60 * 60,
    },
    default_wire_fee_amortization: 1,
  },
  instanceInventory: [
    {
      id: "t-shirt-1",
      description: "a m size t-shirt",
      price: "TESTKUDOS:1",
      total_stock: -1,
    },
    {
      id: "t-shirt-2",
      price: "TESTKUDOS:1",
      description: "a xl size t-shirt",
    } as any,
    {
      id: "t-shirt-3",
      price: "TESTKUDOS:1",
      description: "a s size t-shirt",
    } as any,
  ],
});
