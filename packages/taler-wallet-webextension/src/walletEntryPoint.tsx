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

import { WithdrawalDialog } from "./pages/withdraw";
import { Welcome } from "./pages/welcome";
import { TalerPayDialog } from "./pages/pay";
import { RefundStatusView } from "./pages/refund";
import { TalerTipDialog } from './pages/tip';
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
  // popup = '/popup/:rest*',
}

function Application() {
  const sp = new URL(document.location.href).searchParams
  const queryParams: any = {}
  sp.forEach((v, k) => { queryParams[k] = v; });

  return <Router history={createHashHistory()} >

    <Route path={Pages.welcome} component={() => {
      return <section id="main">
        <div style="border-bottom: 3px dashed #aa3939; margin-bottom: 2em;">
          <h1 style="font-family: monospace; font-size: 250%;">
            <span style="color: #aa3939;">❰</span>Taler Wallet<span style="color: #aa3939;">❱</span>
          </h1>
        </div>
        <h1>Browser Extension Installed!</h1>
        <div>
          <Welcome />
        </div>
      </section>
    }} />

    <Route path={Pages.pay} component={() => {
      return <section id="main">
        <h1>GNU Taler Wallet</h1>
        <article class="fade">
          <TalerPayDialog talerPayUri={queryParams.talerPayUri} />
        </article>
      </section>
    }} />

    <Route path={Pages.refund} component={() => {
      return <section id="main">
        <h1>GNU Taler Wallet</h1>
        <article class="fade">
          <RefundStatusView talerRefundUri={queryParams.talerRefundUri} />
        </article>
      </section>
    }} />

    <Route path={Pages.tips} component={() => {
      return <section id="main">
        <h1>GNU Taler Wallet</h1>
        <div>
          <TalerTipDialog talerTipUri={queryParams.talerTipUri} />
        </div>
      </section>
    }} />
    <Route path={Pages.withdraw} component={() => {
      return <section id="main">
        <div style="border-bottom: 3px dashed #aa3939; margin-bottom: 2em;">
          <h1 style="font-family: monospace; font-size: 250%;">
            <span style="color: #aa3939;">❰</span>Taler Wallet<span style="color: #aa3939;">❱</span>
          </h1>
        </div>
        <div class="fade">
          <WithdrawalDialog talerWithdrawUri={queryParams.talerWithdrawUri} />
        </div>
      </section>
    }} />

    <Route path={Pages.reset_required} component={() => <div>no yet implemented</div>} />
    <Route path={Pages.payback} component={() => <div>no yet implemented</div>} />
    <Route path={Pages.return_coins} component={() => <div>no yet implemented</div>} />

  </Router>
}
