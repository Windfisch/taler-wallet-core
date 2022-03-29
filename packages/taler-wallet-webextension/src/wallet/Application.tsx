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
                        goToTransaction={(txId: string) =>
                          route(Pages.balance_transaction.replace(":tid", txId))
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
                path={Pages.balance_history}
                component={HistoryPage}
                goToWalletDeposit={(currency: string) =>
                  route(Pages.balance_deposit.replace(":currency", currency))
                }
                goToWalletManualWithdraw={(currency?: string) =>
                  route(
                    Pages.balance_manual_withdraw.replace(
                      ":currency?",
                      currency || "",
                    ),
                  )
                }
              />
              <Route
                path={Pages.balance_transaction}
                component={TransactionPage}
                goToWalletHistory={(currency?: string) => {
                  route(
                    Pages.balance_history.replace(":currency?", currency || ""),
                  );
                }}
              />

              <Route
                path={Pages.balance_manual_withdraw}
                component={ManualWithdrawPage}
                onCancel={() => {
                  route(Pages.balance);
                }}
              />

              <Route
                path={Pages.balance_deposit}
                component={DepositPage}
                onCancel={(currency: string) => {
                  route(Pages.balance_history.replace(":currency?", currency));
                }}
                onSuccess={(currency: string) => {
                  route(Pages.balance_history.replace(":currency?", currency));
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
                path={Pages.backup_provider_add}
                component={ProviderAddPage}
                onBack={() => {
                  route(Pages.backup);
                }}
              />

              {/**
               * SETTINGS
               */}
              <Route
                path={Pages.settings_exchange_add}
                component={ExchangeAddPage}
                onBack={() => {
                  route(Pages.balance);
                }}
              />

              {/**
               * DEV
               */}

              <Route path={Pages.dev} component={DeveloperPage} />

              {/**
               * CALL TO ACTION
               */}
              <Route
                path={Pages.cta_pay}
                component={PayPage}
                goToWalletManualWithdraw={(currency?: string) =>
                  route(
                    Pages.balance_manual_withdraw.replace(
                      ":currency?",
                      currency || "",
                    ),
                  )
                }
                goBack={() => route(Pages.balance)}
              />
              <Route path={Pages.cta_refund} component={RefundPage} />
              <Route path={Pages.cta_tips} component={TipPage} />
              <Route path={Pages.cta_withdraw} component={WithdrawPage} />

              {/**
               * NOT FOUND
               * all redirects should be at the end
               */}
              <Route
                path={Pages.balance}
                component={Redirect}
                to={Pages.balance_history.replace(":currency?", "")}
              />

              <Route
                default
                component={Redirect}
                to={Pages.balance_history.replace(":currency?", "")}
              />
            </Router>
          </WalletBox>
        </IoCProviderForRuntime>
      </DevContextProvider>
    </TranslationProvider>
  );
}

function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    console.log("got some wrong route", to);
    route(to, true);
  });
  return null;
}

function shouldShowPendingOperations(path: string): boolean {
  return ["/balance/history/", "/dev", "/settings", "/backup"].includes(path);
}
