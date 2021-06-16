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
import { useEffect, useState } from "preact/hooks";
import {
  actionForTalerUri, findTalerUriInActiveTab, Pages, WalletBalanceView, WalletDebug, WalletHistory,
  WalletNavBar, WalletSettings, WalletTransaction, WalletTransactionView
} from "./pages/popup";
import Match from "preact-router/match";
import Router, { route, Route } from "preact-router";
// import { Application } from "./Application";

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

function useTalerActionURL(): [string | undefined, (s: boolean) => void] {
  const [talerActionUrl, setTalerActionUrl] = useState<string | undefined>(
    undefined,
  );
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    async function check(): Promise<void> {
      const talerUri = await findTalerUriInActiveTab();
      if (talerUri) {
        const actionUrl = actionForTalerUri(talerUri);
        setTalerActionUrl(actionUrl);
      }
    }
    check();
  }, []);
  const url = dismissed ? undefined : talerActionUrl
  return [url, setDismissed]
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
      <button onClick={() => { window.open(url, "_blank"); }}>
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
      <Match>{({ path }: any) => <WalletNavBar current={path} />}</Match >
      <div style={{ margin: "1em", width: 400 }}>
        <Router>
          <Route path={Pages.balance} component={WalletBalanceView} />
          <Route path={Pages.settings} component={WalletSettings} />
          <Route path={Pages.debug} component={WalletDebug} />
          <Route path={Pages.history} component={WalletHistory} />
          <Route path={Pages.transaction} component={WalletTransaction} />
          <Route default component={Redirect} to={Pages.balance} />
        </Router>
      </div>
    </div>
  );
}




function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    route(to, true)
  })
  return null
}