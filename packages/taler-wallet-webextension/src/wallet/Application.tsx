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
import { PaymentPage } from "../cta/Payment/index.js";
import { RefundPage } from "../cta/Refund/index.js";
import { TipPage } from "../cta/Tip/index.js";
import {
  WithdrawPageFromParams,
  WithdrawPageFromURI,
} from "../cta/Withdraw/index.js";
import { DepositPage as DepositPageCTA } from "../cta/Deposit/index.js";
import { Pages, WalletNavBar } from "../NavigationBar.js";
import { DeveloperPage } from "./DeveloperPage.js";
import { BackupPage } from "./BackupPage.js";
import { DepositPage } from "./DepositPage.js";
import { ExchangeAddPage } from "./ExchangeAddPage.js";
import { HistoryPage } from "./History.js";
import { ProviderAddPage } from "./ProviderAddPage.js";
import { ProviderDetailPage } from "./ProviderDetailPage.js";
import { SettingsPage } from "./Settings.js";
import { TransactionPage } from "./Transaction.js";
import { WelcomePage } from "./Welcome.js";
import { QrReaderPage } from "./QrReader.js";
import { platform } from "../platform/api.js";
import {
  DestinationSelectionGetCash,
  DestinationSelectionSendCash,
} from "./DestinationSelection.js";
import { ExchangeSelectionPage } from "./ExchangeSelection/index.js";
import { TransferCreatePage } from "../cta/TransferCreate/index.js";
import { InvoiceCreatePage } from "../cta/InvoiceCreate/index.js";
import { TransferPickupPage } from "../cta/TransferPickup/index.js";
import { InvoicePayPage } from "../cta/InvoicePay/index.js";

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
          <Router history={hash_history}>
            <Match default>
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
          </Router>
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
                  redirectTo(Pages.sendCash({ amount: `${currency}:0` }))
                }
                goToWalletManualWithdraw={(currency?: string) =>
                  redirectTo(
                    Pages.receiveCash({
                      amount: !currency ? undefined : `${currency}:0`,
                    }),
                  )
                }
              />
              <Route path={Pages.exchanges} component={ExchangeSelectionPage} />
              <Route
                path={Pages.sendCash.pattern}
                component={DestinationSelectionSendCash}
                goToWalletBankDeposit={(amount: string) =>
                  redirectTo(Pages.balanceDeposit({ amount }))
                }
                goToWalletWalletSend={(amount: string) =>
                  redirectTo(Pages.ctaTransferCreate({ amount }))
                }
              />
              <Route
                path={Pages.receiveCash.pattern}
                component={DestinationSelectionGetCash}
                goToWalletManualWithdraw={(amount?: string) =>
                  redirectTo(Pages.ctaWithdrawManual({ amount }))
                }
                goToWalletWalletInvoice={(amount?: string) =>
                  redirectTo(Pages.ctaInvoiceCreate({ amount }))
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
              <Route
                path={Pages.qr}
                component={QrReaderPage}
                onDetected={(talerActionUrl: string) => {
                  platform.openWalletURIFromPopup(talerActionUrl);
                }}
              />

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
                component={PaymentPage}
                goToWalletManualWithdraw={(amount?: string) =>
                  redirectTo(Pages.ctaWithdrawManual({ amount }))
                }
                cancel={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaRefund}
                component={RefundPage}
                cancel={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaTips}
                component={TipPage}
                onCancel={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaWithdraw}
                component={WithdrawPageFromURI}
                cancel={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaWithdrawManual.pattern}
                component={WithdrawPageFromParams}
                cancel={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaDeposit}
                component={DepositPageCTA}
                cancel={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaInvoiceCreate.pattern}
                component={InvoiceCreatePage}
                onClose={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaTransferCreate.pattern}
                component={TransferCreatePage}
                onClose={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaInvoicePay}
                component={InvoicePayPage}
                goToWalletManualWithdraw={(amount?: string) =>
                  redirectTo(Pages.ctaWithdrawManual({ amount }))
                }
                onClose={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />
              <Route
                path={Pages.ctaTransferPickup}
                component={TransferPickupPage}
                onClose={() => redirectTo(Pages.balance)}
                onSuccess={(tid: string) =>
                  redirectTo(Pages.balanceTransaction({ tid }))
                }
              />

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

function matchesRoute(url: string, route: string): boolean {
  type MatcherFunc = (
    url: string,
    route: string,
    opts: any,
  ) => Record<string, string> | false;

  const internalPreactMatcher: MatcherFunc = (Router as any).exec;
  const result = internalPreactMatcher(url, route, {});
  return !result ? false : true;
}

function shouldShowPendingOperations(url: string): boolean {
  return [
    Pages.balanceHistory.pattern,
    Pages.dev,
    Pages.settings,
    Pages.backup,
  ].some((p) => matchesRoute(url, p));
}
