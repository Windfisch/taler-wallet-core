/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
 * Main entry point for extension pages.
 *
 * @author Florian Dold <dold@taler.net>
 */

import { render } from "preact";
import { setupI18n } from "@gnu-taler/taler-util";
import { strings } from "./i18n/strings";
import { createHashHistory } from 'history';

import { WithdrawPage } from "./wallet/Withdraw";
import { WelcomePage } from "./wallet/Welcome";
import { PayPage } from "./wallet/Pay";
import { RefundPage } from "./wallet/Refund";
import { TipPage } from './wallet/Tip';
import Router, { route, Route } from "preact-router";

function main(): void {
  try {
    const container = document.getElementById("container");
    if (!container) {
      throw Error("container not found, can't mount page contents");
    }
    render(<Application />, container);
  } catch (e) {
    console.error("got error", e);
    document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
  }
}

setupI18n("en-US", strings);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}


enum Pages {
  welcome = '/welcome',
  pay = '/pay',
  payback = '/payback',
  refund = '/refund',
  reset_required = '/reset-required',
  return_coins = '/return-coins',
  tips = '/tips',
  withdraw = '/withdraw',
}

function Application() {
  const h = createHashHistory();
  return <Router history={h} >

    <Route path={Pages.welcome} component={WelcomePage} />
    <Route path={Pages.pay} component={PayPage} />
    <Route path={Pages.refund} component={RefundPage} />

    <Route path={Pages.tips} component={TipPage} />
    <Route path={Pages.withdraw} component={WithdrawPage} />

    <Route path={Pages.reset_required} component={() => <div>no yet implemented</div>} />
    <Route path={Pages.payback} component={() => <div>no yet implemented</div>} />
    <Route path={Pages.return_coins} component={() => <div>no yet implemented</div>} />

  </Router>
}
