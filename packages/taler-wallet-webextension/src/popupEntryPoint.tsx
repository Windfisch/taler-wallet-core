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
import { render } from "preact";
import Router, { route, Route } from "preact-router";
import { useEffect } from "preact/hooks";
import { DevContextProvider } from "./context/useDevContext";
import { useTalerActionURL } from "./hooks/useTalerActionURL";
import { strings } from "./i18n/strings";
import { BackupPage } from "./popup/BackupPage";
import { BalancePage } from "./popup/Balance";
import { DeveloperPage as DeveloperPage } from "./popup/Debug";
import { HistoryPage } from "./popup/History";
import {
  Pages, WalletNavBar
} from "./popup/popup";
import { ProviderAddPage } from "./popup/ProviderAddPage";
import { ProviderDetailPage } from "./popup/ProviderDetailPage";
import { SettingsPage } from "./popup/Settings";
import { TransactionPage } from "./popup/Transaction";

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

interface Props {
  url: string;
  onDismiss: (s: boolean) => void;
}

function TalerActionFound({ url, onDismiss }: Props) {
  return <div style={{ padding: "1em", width: 400 }}>
    <h1>Taler Action </h1>
    <p>This page has a Taler action.</p>
    <p>
      <button onClick={() => { chrome.tabs.create({ "url": url }); }}>
        Open
      </button>
    </p>
    <p>
      <button onClick={() => onDismiss(true)}> Dismiss </button>
    </p>
  </div>

}

function Application() {
  const [talerActionUrl, setDismissed] = useTalerActionURL()

  if (talerActionUrl) {
    return <TalerActionFound url={talerActionUrl} onDismiss={setDismissed} />
  }

  return (
    <div>
      <DevContextProvider>
        <WalletNavBar />
        <div style={{ padding: 8, width: 'calc(400px - 16px)', height: 'calc(320px - 34px - 16px)' }}>
          <Router history={createHashHistory()}>
            <Route path={Pages.balance} component={BalancePage} />
            <Route path={Pages.settings} component={SettingsPage} />
            <Route path={Pages.dev} component={DeveloperPage} />
            <Route path={Pages.history} component={HistoryPage} />
            <Route path={Pages.backup} component={BackupPage} 
              onAddProvider={() => {
                route(Pages.provider_add)
              }} 
              />
            <Route path={Pages.provider_detail} component={ProviderDetailPage} 
            onBack={() => {
              route(Pages.backup)
            }}
            />
            <Route path={Pages.provider_add} component={ProviderAddPage} />
            <Route path={Pages.transaction} component={TransactionPage} />
            <Route default component={Redirect} to={Pages.balance} />
          </Router>
        </div>
      </DevContextProvider>
    </div>
  );
}


function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    route(to, true)
  })
  return null
}