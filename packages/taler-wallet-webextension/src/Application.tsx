import Router, { route, Route } from "preact-router";
import { createHashHistory } from 'history';
import { useEffect } from "preact/hooks";

import { WalletPopup } from "./pages/popup";
import { WithdrawalDialog } from "./pages/withdraw";
import { Welcome } from "./pages/welcome";
import { TalerPayDialog } from "./pages/pay";
import { RefundStatusView } from "./pages/refund";
import { TalerTipDialog } from './pages/tip';


export enum Pages {
  welcome = '/welcome',
  pay = '/pay',
  payback = '/payback',
  refund = '/refund',
  reset_required = '/reset-required',
  return_coins = '/return-coins',
  tips = '/tips',
  withdraw = '/withdraw',
  popup = '/popup/:rest',
}

export function Application() {
  const sp = new URL(document.location.href).searchParams
  const queryParams: any = {}
  sp.forEach((v, k) => { queryParams[k] = v; });

  return <Router history={createHashHistory()} >
    <Route path={Pages.popup} component={WalletPopup} />

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

    <Route default component={Redirect} to='/popup/balance' />
  </Router>
}

export function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    route(to, true)
  })
  return null
}
