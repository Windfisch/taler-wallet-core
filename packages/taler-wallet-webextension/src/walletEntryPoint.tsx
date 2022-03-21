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

import { setupI18n } from "@gnu-taler/taler-util";
import { createHashHistory } from "history";
import { Fragment, h, render, VNode } from "preact";
import Router, { route, Route } from "preact-router";
import Match from "preact-router/match";
import { useEffect, useState } from "preact/hooks";
import { LogoHeader } from "./components/LogoHeader";
import PendingTransactions from "./components/PendingTransactions";
import {
  NavigationHeader,
  NavigationHeaderHolder,
  SuccessBox,
  WalletBox,
} from "./components/styled";
import { DevContextProvider } from "./context/devContext";
import { IoCProviderForRuntime } from "./context/iocContext";
import {
  TranslationProvider,
  useTranslationContext,
} from "./context/translation";
import { PayPage } from "./cta/Pay";
import { RefundPage } from "./cta/Refund";
import { TipPage } from "./cta/Tip";
import { WithdrawPage } from "./cta/Withdraw";
import { strings } from "./i18n/strings";
import { Pages, WalletNavBar } from "./NavigationBar";
import { DeveloperPage } from "./popup/DeveloperPage";
import { BackupPage } from "./wallet/BackupPage";
import { DepositPage } from "./wallet/DepositPage";
import { ExchangeAddPage } from "./wallet/ExchangeAddPage";
import { HistoryPage } from "./wallet/History";
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

setupI18n("en", strings);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

function Application(): VNode {
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
