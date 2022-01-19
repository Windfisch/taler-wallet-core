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

import { setupI18n } from "@gnu-taler/taler-util";
import { createHashHistory } from "history";
import { h, render, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import Match from "preact-router/match";
import { useEffect, useState } from "preact/hooks";
import { LogoHeader } from "./components/LogoHeader";
import { SuccessBox, WalletBox } from "./components/styled";
import { DevContextProvider } from "./context/devContext";
import { IoCProviderForRuntime } from "./context/iocContext";
import { PayPage } from "./cta/Pay";
import { RefundPage } from "./cta/Refund";
import { TipPage } from "./cta/Tip";
import { WithdrawPage } from "./cta/Withdraw";
import { strings } from "./i18n/strings";
import { NavBar, Pages } from "./NavigationBar";
import { DeveloperPage } from "./popup/DeveloperPage";
import { BackupPage } from "./wallet/BackupPage";
import { BalancePage } from "./wallet/BalancePage";
import { DepositPage } from "./wallet/DepositPage";
import { ExchangeAddPage } from "./wallet/ExchangeAddPage";
import { HistoryPage } from "./wallet/History";
import { LastActivityPage } from "./wallet/LastActivityPage";
import { ManualWithdrawPage } from "./wallet/ManualWithdrawPage";
import { ProviderAddPage } from "./wallet/ProviderAddPage";
import { ProviderDetailPage } from "./wallet/ProviderDetailPage";
import { SettingsPage } from "./wallet/Settings";
import { TransactionPage } from "./wallet/Transaction";
import { WelcomePage } from "./wallet/Welcome";

function main(): void {
  try {
    const container = document.getElementById("container");
    if (!container) {
      throw Error("container not found, can't mount page contents");
    }
    render(<Application />, container);
  } catch (e) {
    console.error("got error", e);
    if (e instanceof Error) {
      document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
    }
  }
}

setupI18n("en-US", strings);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

function Application(): VNode {
  const [globalNotification, setGlobalNotification] = useState<
    string | undefined
  >(undefined);
  const hash_history = createHashHistory();
  return (
    <div>
      <DevContextProvider>
        {({ devMode }: { devMode: boolean }) => (
          <IoCProviderForRuntime>
            <LogoHeader />
            {/* <Match/> won't work in the first render if <Router /> is not called first */}
            {/* https://github.com/preactjs/preact-router/issues/415 */}
            <Router history={hash_history} />
            <Match>
              {({ path }: { path: string }) => (
                <NavBar devMode={devMode} path={path} />
              )}
            </Match>
            <WalletBox>
              {globalNotification && (
                <SuccessBox onClick={() => setGlobalNotification(undefined)}>
                  <div>{globalNotification}</div>
                </SuccessBox>
              )}
              <Router history={hash_history}>
                <Route path={Pages.welcome} component={WelcomePage} />

                <Route
                  path={Pages.balance}
                  component={BalancePage}
                  goToWalletManualWithdraw={() =>
                    route(Pages.manual_withdraw.replace(":currency?", ""))
                  }
                  goToWalletDeposit={(currency: string) =>
                    route(Pages.deposit.replace(":currency", currency))
                  }
                  goToWalletHistory={(currency: string) =>
                    route(Pages.balance_history.replace(":currency", currency))
                  }
                />
                <Route
                  path={Pages.balance_history}
                  component={HistoryPage}
                  goToWalletDeposit={(currency: string) =>
                    route(Pages.deposit.replace(":currency", currency))
                  }
                  goToWalletManualWithdraw={(currency?: string) =>
                    route(
                      Pages.manual_withdraw.replace(
                        ":currency?",
                        currency || "",
                      ),
                    )
                  }
                />
                <Route
                  path={Pages.last_activity}
                  component={LastActivityPage}
                />
                <Route path={Pages.transaction} component={TransactionPage} />
                <Route path={Pages.settings} component={SettingsPage} />
                <Route
                  path={Pages.backup}
                  component={BackupPage}
                  onAddProvider={() => {
                    route(Pages.provider_add);
                  }}
                />
                <Route
                  path={Pages.provider_detail}
                  component={ProviderDetailPage}
                  onBack={() => {
                    route(Pages.backup);
                  }}
                />
                <Route
                  path={Pages.provider_add}
                  component={ProviderAddPage}
                  onBack={() => {
                    route(Pages.backup);
                  }}
                />

                <Route
                  path={Pages.exchange_add}
                  component={ExchangeAddPage}
                  onBack={() => {
                    route(Pages.balance);
                  }}
                />

                <Route
                  path={Pages.manual_withdraw}
                  component={ManualWithdrawPage}
                />

                <Route
                  path={Pages.deposit}
                  component={DepositPage}
                  onSuccess={(currency: string) => {
                    route(Pages.balance_history.replace(":currency", currency));
                    setGlobalNotification(
                      "All done, your transaction is in progress",
                    );
                  }}
                />
                <Route
                  path={Pages.reset_required}
                  component={() => <div>no yet implemented</div>}
                />
                <Route
                  path={Pages.payback}
                  component={() => <div>no yet implemented</div>}
                />
                <Route
                  path={Pages.return_coins}
                  component={() => <div>no yet implemented</div>}
                />

                <Route path={Pages.dev} component={DeveloperPage} />

                {/** call to action */}
                <Route
                  path={Pages.pay}
                  component={PayPage}
                  goToWalletManualWithdraw={(currency?: string) =>
                    route(
                      Pages.manual_withdraw.replace(
                        ":currency?",
                        currency || "",
                      ),
                    )
                  }
                  goBack={() => route(Pages.balance)}
                />
                <Route
                  path={Pages.pay}
                  component={PayPage}
                  goBack={() => route(Pages.balance)}
                />
                <Route path={Pages.refund} component={RefundPage} />
                <Route path={Pages.tips} component={TipPage} />
                <Route path={Pages.withdraw} component={WithdrawPage} />

                <Route default component={Redirect} to={Pages.balance} />
              </Router>
            </WalletBox>
          </IoCProviderForRuntime>
        )}
      </DevContextProvider>
    </div>
  );
}

function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    console.log("go some wrong route");
    route(to, true);
  });
  return null;
}
