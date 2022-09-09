/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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
 * @author sebasjm
 */

import { createHashHistory } from "history";
import { Fragment, h, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import { Match } from "preact-router/match";
import { useEffect, useState } from "preact/hooks";
import PendingTransactions from "../components/PendingTransactions.js";
import { PopupBox } from "../components/styled/index.js";
import { DevContextProvider } from "../context/devContext.js";
import { IoCProviderForRuntime } from "../context/iocContext.js";
import {
  TranslationProvider,
  useTranslationContext,
} from "../context/translation.js";
import { useTalerActionURL } from "../hooks/useTalerActionURL.js";
import { Pages, PopupNavBar } from "../NavigationBar.js";
import { platform } from "../platform/api.js";
import { BackupPage } from "../wallet/BackupPage.js";
import { ProviderDetailPage } from "../wallet/ProviderDetailPage.js";
import { BalancePage } from "./BalancePage.js";
import { TalerActionFound } from "./TalerActionFound.js";

function CheckTalerActionComponent(): VNode {
  const [action] = useTalerActionURL();

  const actionUri = action?.uri;

  useEffect(() => {
    if (actionUri) {
      route(Pages.cta({ action: encodeURIComponent(actionUri) }));
    }
  }, [actionUri]);

  return <Fragment />;
}

export function Application(): VNode {
  const hash_history = createHashHistory();
  return (
    <TranslationProvider>
      <DevContextProvider>
        {({ devMode }: { devMode: boolean }) => (
          <IoCProviderForRuntime>
            <PendingTransactions
              goToTransaction={(tid: string) =>
                redirectTo(Pages.balanceTransaction({ tid }))
              }
            />
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
                    redirectTo(Pages.receiveCash({}))
                  }
                  goToWalletDeposit={(currency: string) =>
                    redirectTo(Pages.sendCash({ amount: `${currency}:0` }))
                  }
                  goToWalletHistory={(currency: string) =>
                    redirectTo(Pages.balanceHistory({ currency }))
                  }
                />

                <Route
                  path={Pages.cta.pattern}
                  component={function Action({ action }: { action: string }) {
                    const [, setDismissed] = useTalerActionURL();

                    return (
                      <TalerActionFound
                        url={decodeURIComponent(action)}
                        onDismiss={() => {
                          setDismissed(true);
                          return redirectTo(Pages.balance);
                        }}
                      />
                    );
                  }}
                />

                <Route
                  path={Pages.backup}
                  component={BackupPage}
                  onAddProvider={() => redirectTo(Pages.backupProviderAdd)}
                />
                <Route
                  path={Pages.backupProviderDetail.pattern}
                  component={ProviderDetailPage}
                  onBack={() => redirectTo(Pages.backup)}
                />

                <Route
                  path={Pages.balanceTransaction.pattern}
                  component={RedirectToWalletPage}
                />
                <Route
                  path={Pages.ctaWithdrawManual.pattern}
                  component={RedirectToWalletPage}
                />
                <Route
                  path={Pages.balanceDeposit.pattern}
                  component={RedirectToWalletPage}
                />
                <Route
                  path={Pages.balanceHistory.pattern}
                  component={RedirectToWalletPage}
                />
                <Route
                  path={Pages.backupProviderAdd}
                  component={RedirectToWalletPage}
                />
                <Route
                  path={Pages.receiveCash.pattern}
                  component={RedirectToWalletPage}
                />
                <Route
                  path={Pages.sendCash.pattern}
                  component={RedirectToWalletPage}
                />
                <Route path={Pages.qr} component={RedirectToWalletPage} />
                <Route path={Pages.settings} component={RedirectToWalletPage} />
                <Route
                  path={Pages.settingsExchangeAdd.pattern}
                  component={RedirectToWalletPage}
                />
                <Route path={Pages.dev} component={RedirectToWalletPage} />

                <Route default component={Redirect} to={Pages.balance} />
              </Router>
            </PopupBox>
          </IoCProviderForRuntime>
        )}
      </DevContextProvider>
    </TranslationProvider>
  );
}

function RedirectToWalletPage(): VNode {
  const page = (document.location.hash || "#/").replace("#", "");
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    platform.openWalletPageFromPopup(page);
    setTimeout(() => {
      setShowText(true);
    }, 250);
  });
  const { i18n } = useTranslationContext();
  if (!showText) return <Fragment />;
  return (
    <span>
      <i18n.Translate>
        this popup is being closed and you are being redirected to {page}
      </i18n.Translate>
    </span>
  );
}

async function redirectTo(location: string): Promise<void> {
  route(location);
}

function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    route(to, true);
  });
  return null;
}
