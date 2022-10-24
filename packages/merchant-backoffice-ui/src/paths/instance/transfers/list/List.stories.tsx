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
import { ListPage as TestedComponent } from "./ListPage";

export default {
  title: "Pages/Transfer/List",
  component: TestedComponent,
  argTypes: {
    onCreate: { action: "onCreate" },
    onDelete: { action: "onDelete" },
    onLoadMoreBefore: { action: "onLoadMoreBefore" },
    onLoadMoreAfter: { action: "onLoadMoreAfter" },
    onShowAll: { action: "onShowAll" },
    onShowVerified: { action: "onShowVerified" },
    onShowUnverified: { action: "onShowUnverified" },
    onChangePayTo: { action: "onChangePayTo" },
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
  transfers: [
    {
      exchange_url: "http://exchange.url/",
      credit_amount: "TESTKUDOS:10",
      payto_uri: "payto//x-taler-bank/bank:8080/account",
      transfer_serial_id: 123123123,
      wtid: "!@KJELQKWEJ!L@K#!J@",
      confirmed: true,
      execution_time: {
        t_s: new Date().getTime() / 1000,
      },
      verified: false,
    },
    {
      exchange_url: "http://exchange.url/",
      credit_amount: "TESTKUDOS:10",
      payto_uri: "payto//x-taler-bank/bank:8080/account",
      transfer_serial_id: 123123123,
      wtid: "!@KJELQKWEJ!L@K#!J@",
      confirmed: true,
      execution_time: {
        t_s: new Date().getTime() / 1000,
      },
      verified: false,
    },
    {
      exchange_url: "http://exchange.url/",
      credit_amount: "TESTKUDOS:10",
      payto_uri: "payto//x-taler-bank/bank:8080/account",
      transfer_serial_id: 123123123,
      wtid: "!@KJELQKWEJ!L@K#!J@",
      confirmed: true,
      execution_time: {
        t_s: new Date().getTime() / 1000,
      },
      verified: false,
    },
  ],
  accounts: ["payto://x-taler-bank/bank/some_account"],
});
export const Empty = createExample(TestedComponent, {
  transfers: [],
  accounts: [],
});
