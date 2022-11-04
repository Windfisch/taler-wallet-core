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
import { DetailPage as TestedComponent } from "./DetailPage.js";

export default {
  title: "Pages/Reserve/Detail",
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

export const Funded = createExample(TestedComponent, {
  id: "THISISTHERESERVEID",
  selected: {
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
    payto_uri: "payto://x-taler-bank/bank.taler:8080/account",
    exchange_url: "http://exchange.taler/",
  },
});

export const NotYetFunded = createExample(TestedComponent, {
  id: "THISISTHERESERVEID",
  selected: {
    active: true,
    committed_amount: "TESTKUDOS:10",
    creation_time: {
      t_s: new Date().getTime() / 1000,
    },
    exchange_initial_amount: "TESTKUDOS:0",
    expiration_time: {
      t_s: new Date().getTime() / 1000,
    },
    merchant_initial_amount: "TESTKUDOS:10",
    pickup_amount: "TESTKUDOS:10",
    payto_uri: "payto://x-taler-bank/bank.taler:8080/account",
    exchange_url: "http://exchange.taler/",
  },
});

export const FundedWithEmptyTips = createExample(TestedComponent, {
  id: "THISISTHERESERVEID",
  selected: {
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
    payto_uri: "payto://x-taler-bank/bank.taler:8080/account",
    exchange_url: "http://exchange.taler/",
    tips: [
      {
        reason: "asdasd",
        tip_id: "123",
        total_amount: "TESTKUDOS:1",
      },
    ],
  },
});
