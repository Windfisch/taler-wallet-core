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
 * @author sebasjm <dold@taler.net>
 */

import { setupI18n, Translate } from "@gnu-taler/taler-util";
import { createHashHistory } from "history";
import { Fragment, h, render, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import { Match } from "preact-router/match";
import { useEffect } from "preact/hooks";
import { PopupBox } from "./components/styled";
import { DevContextProvider } from "./context/devContext";
import { IoCProviderForRuntime } from "./context/iocContext";
import { useTalerActionURL } from "./hooks/useTalerActionURL";
import { strings } from "./i18n/strings";
import { Pages, PopupNavBar } from "./NavigationBar";
import { BalancePage } from "./popup/BalancePage";
import { DeveloperPage } from "./popup/DeveloperPage";
import { TalerActionFound } from "./popup/TalerActionFound";
import { BackupPage } from "./wallet/BackupPage";
import { ExchangeAddPage } from "./wallet/ExchangeAddPage";
import { ProviderAddPage } from "./wallet/ProviderAddPage";
import { ProviderDetailPage } from "./wallet/ProviderDetailPage";

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

function CheckTalerActionComponent(): VNode {
  const [talerActionUrl] = useTalerActionURL();

  useEffect(() => {
    if (talerActionUrl)
      route(Pages.cta.replace(":action", encodeURIComponent(talerActionUrl)));
  }, [talerActionUrl]);

  return <Fragment />;
}

function Application(): VNode {
  const hash_history = createHashHistory();
  return (
    // <div>
    <DevContextProvider>
      {({ devMode }: { devMode: boolean }) => (
        <IoCProviderForRuntime>
          <Match>
            {({ path }: { path: string }) => <PopupNavBar path={path} />}
          </Match>
          <CheckTalerActionComponent />
          <PopupBox devMode={devMode}>
            <Router history={hash_history}>
              <Route
                path={Pages.balance}
                component={BalancePage}
                goToWalletManualWithdraw={() =>
                  route(Pages.balance_manual_withdraw.replace(":currency?", ""))
                }
                goToWalletDeposit={(currency: string) =>
                  route(Pages.balance_deposit.replace(":currency", currency))
                }
                goToWalletHistory={(currency: string) =>
                  route(Pages.balance_history.replace(":currency", currency))
                }
              />

              <Route
                path={Pages.cta}
                component={function Action({ action }: { action: string }) {
                  const [, setDismissed] = useTalerActionURL();

                  return (
                    <TalerActionFound
                      url={decodeURIComponent(action)}
                      onDismiss={() => {
                        setDismissed(true);
                        route(Pages.balance);
                      }}
                    />
                  );
                }}
              />

              <Route
                path={Pages.backup}
                component={BackupPage}
                onAddProvider={() => {
                  route(Pages.backup_provider_add);
                }}
              />
              <Route
                path={Pages.backup_provider_detail}
                component={ProviderDetailPage}
                onBack={() => {
                  route(Pages.backup);
                }}
              />

              <Route
                path={Pages.balance_manual_withdraw}
                component={RedirectToWalletPage}
              />
              <Route
                path={Pages.balance_deposit}
                component={RedirectToWalletPage}
              />
              <Route
                path={Pages.balance_history}
                component={RedirectToWalletPage}
              />
              <Route
                path={Pages.backup_provider_add}
                component={RedirectToWalletPage}
              />
              <Route path={Pages.settings} component={RedirectToWalletPage} />
              <Route
                path={Pages.settings_exchange_add}
                component={RedirectToWalletPage}
              />
              <Route path={Pages.dev} component={RedirectToWalletPage} />

              <Route default component={Redirect} to={Pages.balance} />
            </Router>
          </PopupBox>
        </IoCProviderForRuntime>
      )}
    </DevContextProvider>
    // </div>
  );
}

function RedirectToWalletPage(): VNode {
  const page = document.location.hash || "#/";
  useEffect(() => {
    chrome.tabs
      .create({
        active: true,
        // eslint-disable-next-line no-undef
        url: chrome.runtime.getURL(`/static/wallet.html${page}`),
      })
      .then(() => {
        window.close();
      });
  });
  return (
    <span>
      <Translate>
        this popup is being closed and you are being redirected to {page}
      </Translate>
    </span>
  );
}

function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    route(to, true);
  });
  return null;
}
