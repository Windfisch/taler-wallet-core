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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { h, VNode, FunctionalComponent } from "preact";
import { CardTable as TestedComponent } from "./Table.js";

export default {
  title: "Pages/Reserve/List",
  component: TestedComponent,
  argTypes: {
    onCreate: { action: "onCreate" },
    onDelete: { action: "onDelete" },
    onNewTip: { action: "onNewTip" },
    onSelect: { action: "onSelect" },
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

export const AllFunded = createExample(TestedComponent, {
  instances: [
    {
      id: "reseverId",
      active: true,
      committed_amount: "TESTKUDOS:10",
      creation_time: {
        t_s: new Date().getTime() / 1000,
      },
      exchange_initial_amount: "TESTKUDOS:10",
      expiration_time: {
        t_s: new Date().getTime() / 1000,
      },
      merchant_initial_amount: "TESTKUDOS:10",
      pickup_amount: "TESTKUDOS:10",
      reserve_pub: "WEQWDASDQWEASDADASDQWEQWEASDAS",
    },
    {
      id: "reseverId2",
      active: true,
      committed_amount: "TESTKUDOS:13",
      creation_time: {
        t_s: new Date().getTime() / 1000,
      },
      exchange_initial_amount: "TESTKUDOS:10",
      expiration_time: {
        t_s: new Date().getTime() / 1000,
      },
      merchant_initial_amount: "TESTKUDOS:10",
      pickup_amount: "TESTKUDOS:10",
      reserve_pub: "WEQWDASDQWEASDADASDQWEQWEASDAS",
    },
  ],
});

export const Empty = createExample(TestedComponent, {
  instances: [],
});

export const OneNotYetFunded = createExample(TestedComponent, {
  instances: [
    {
      id: "reseverId",
      active: true,
      committed_amount: "TESTKUDOS:0",
      creation_time: {
        t_s: new Date().getTime() / 1000,
      },
      exchange_initial_amount: "TESTKUDOS:0",
      expiration_time: {
        t_s: new Date().getTime() / 1000,
      },
      merchant_initial_amount: "TESTKUDOS:10",
      pickup_amount: "TESTKUDOS:10",
      reserve_pub: "WEQWDASDQWEASDADASDQWEQWEASDAS",
    },
  ],
});
