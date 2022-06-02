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
 * @author sebasjm
 */

import { createHashHistory } from "history";
import { Fragment, h, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import Match from "preact-router/match";
import { useEffect, useState } from "preact/hooks";
import { LogoHeader } from "../components/LogoHeader.js";
import PendingTransactions from "../components/PendingTransactions.js";
import { SuccessBox, WalletBox } from "../components/styled/index.js";
import { DevContextProvider } from "../context/devContext.js";
import { IoCProviderForRuntime } from "../context/iocContext.js";
import {
  TranslationProvider,
  useTranslationContext,
} from "../context/translation.js";
import { PayPage } from "../cta/Pay.js";
import { RefundPage } from "../cta/Refund.js";
import { TipPage } from "../cta/Tip.js";
import { WithdrawPage } from "../cta/Withdraw.js";
import { DepositPage as DepositPageCTA } from "../cta/Deposit.js";
import { Pages, WalletNavBar } from "../NavigationBar.js";
import { DeveloperPage } from "./DeveloperPage.js";
import { BackupPage } from "./BackupPage.js";
import { DepositPage } from "./DepositPage.js";
import { ExchangeAddPage } from "./ExchangeAddPage.js";
import { HistoryPage } from "./History.js";
import { ManualWithdrawPage } from "./ManualWithdrawPage.js";
import { ProviderAddPage } from "./ProviderAddPage.js";
import { ProviderDetailPage } from "./ProviderDetailPage.js";
import { SettingsPage } from "./Settings.js";
import { TransactionPage } from "./Transaction.js";
import { WelcomePage } from "./Welcome.js";

export function Application(): VNode {
  const [globalNotification, setGlobalNotification] = useState<
    VNode | undefined
  >(undefined);
  const hash_history = createHashHistory();
  function clearNotification(): void {
    setGlobalNotification(undefined);
  }
  function clearNotificationWhenMovingOut(): void {
    // const movingOutFromNotification =
    //   globalNotification && e.url !== globalNotification.to;
    if (globalNotification) {
      //&& movingOutFromNotification) {
      setGlobalNotification(undefined);
    }
  }
  const { i18n } = useTranslationContext();

  return (
    <TranslationProvider>
      <DevContextProvider>
        <IoCProviderForRuntime>
          {/* <Match/> won't work in the first render if <Router /> is not called first */}
          {/* https://github.com/preactjs/preact-router/issues/415 */}
          <Router history={hash_history} />
          <Match>
            {({ path }: { path: string }) => {
              if (path && path.startsWith("/cta")) return;
              return (
                <Fragment>
                  <LogoHeader />
                  <WalletNavBar path={path} />
                  {shouldShowPendingOperations(path) && (
                    <div
                      style={{
                        backgroundColor: "lightcyan",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <PendingTransactions
                        goToTransaction={(tid: string) =>
                          redirectTo(Pages.balanceTransaction({ tid }))
                        }
                      />
                    </div>
                  )}
                </Fragment>
              );
            }}
          </Match>
          <WalletBox>
            {globalNotification && (
              <SuccessBox onClick={clearNotification}>
                <div>{globalNotification}</div>
              </SuccessBox>
            )}
            <Router
              history={hash_history}
              onChange={clearNotificationWhenMovingOut}
            >
              <Route path={Pages.welcome} component={WelcomePage} />

              {/**
               * BALANCE
               */}

              <Route
                path={Pages.balanceHistory.pattern}
                component={HistoryPage}
                goToWalletDeposit={(currency: string) =>
                  redirectTo(Pages.balanceDeposit({ currency }))
                }
                goToWalletManualWithdraw={(currency?: string) =>
                  redirectTo(Pages.balanceManualWithdraw({ currency }))
                }
              />
              <Route
                path={Pages.balanceTransaction.pattern}
                component={TransactionPage}
                goToWalletHistory={(currency?: string) =>
                  redirectTo(Pages.balanceHistory({ currency }))
                }
              />

              <Route
                path={Pages.balanceManualWithdraw.pattern}
                component={ManualWithdrawPage}
                onCancel={() => redirectTo(Pages.balance)}
              />

              <Route
                path={Pages.balanceDeposit.pattern}
                component={DepositPage}
                onCancel={(currency: string) => {
                  redirectTo(Pages.balanceHistory({ currency }));
                }}
                onSuccess={(currency: string) => {
                  redirectTo(Pages.balanceHistory({ currency }));
                  setGlobalNotification(
                    <i18n.Translate>
                      All done, your transaction is in progress
                    </i18n.Translate>,
                  );
                }}
              />
              {/**
               * PENDING
               */}
              <Route path={Pages.settings} component={SettingsPage} />

              {/**
               * BACKUP
               */}
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
                path={Pages.backupProviderAdd}
                component={ProviderAddPage}
                onBack={() => redirectTo(Pages.backup)}
              />

              {/**
               * SETTINGS
               */}
              <Route
                path={Pages.settingsExchangeAdd.pattern}
                component={ExchangeAddPage}
                onBack={() => redirectTo(Pages.balance)}
              />

              {/**
               * DEV
               */}

              <Route path={Pages.dev} component={DeveloperPage} />

              {/**
               * CALL TO ACTION
               */}
              <Route
                path={Pages.ctaPay}
                component={PayPage}
                goToWalletManualWithdraw={(currency?: string) =>
                  redirectTo(Pages.balanceManualWithdraw({ currency }))
                }
                goBack={() => redirectTo(Pages.balance)}
              />
              <Route path={Pages.ctaRefund} component={RefundPage} />
              <Route path={Pages.ctaTips} component={TipPage} />
              <Route path={Pages.ctaWithdraw} component={WithdrawPage} />
              <Route path={Pages.ctaDeposit} component={DepositPageCTA} />

              {/**
               * NOT FOUND
               * all redirects should be at the end
               */}
              <Route
                path={Pages.balance}
                component={Redirect}
                to={Pages.balanceHistory({})}
              />

              <Route
                default
                component={Redirect}
                to={Pages.balanceHistory({})}
              />
            </Router>
          </WalletBox>
        </IoCProviderForRuntime>
      </DevContextProvider>
    </TranslationProvider>
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

function shouldShowPendingOperations(path: string): boolean {
  // FIXME: replace includes with a match API like preact router does
  // [Pages.balanceHistory, Pages.dev, Pages.settings, Pages.backup]
  return ["/balance/history/", "/dev", "/settings", "/backup"].includes(path);
}
