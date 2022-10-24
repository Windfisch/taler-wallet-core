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
import { DetailPage as TestedComponent } from "./DetailPage";

export default {
  title: "Pages/Instance/Detail",
  component: TestedComponent,
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
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
  selected: {
    accounts: [],
    name: "name",
    auth: { method: "external" },
    address: {},
    jurisdiction: {},
    default_max_deposit_fee: "TESTKUDOS:2",
    default_max_wire_fee: "TESTKUDOS:1",
    default_pay_delay: {
      d_us: 1000000,
    },
    default_wire_fee_amortization: 1,
    default_wire_transfer_delay: {
      d_us: 100000,
    },
    merchant_pub: "ASDWQEKASJDKSADJ",
  },
});
