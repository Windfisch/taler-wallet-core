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

import ReactDOM from "react-dom";
import { createPopup } from "./pages/popup";
import { createWithdrawPage } from "./pages/withdraw";
import { createWelcomePage } from "./pages/welcome";
import { createPayPage } from "./pages/pay";
import { createRefundPage } from "./pages/refund";
import { setupI18n } from "taler-wallet-core";
import { createTipPage } from './pages/tip';

function main(): void {
  try {
    let mainElement;
    const m = location.pathname.match(/([^/]+)$/);
    if (!m) {
      throw Error("can't parse page URL");
    }
    const page = m[1];
    switch (page) {
      case "popup.html":
        mainElement = createPopup();
        break;
      case "withdraw.html":
        mainElement = createWithdrawPage();
        break;
      case "welcome.html":
        mainElement = createWelcomePage();
        break;
      case "pay.html":
        mainElement = createPayPage();
        break;
      case "refund.html":
        mainElement = createRefundPage();
        break;
      case "tip.html":
        mainElement = createTipPage();
        break;
      default:
        throw Error(`page '${page}' not implemented`);
    }
    const container = document.getElementById("container");
    if (!container) {
      throw Error("container not found, can't mount page contents");
    }
    ReactDOM.render(mainElement, container);
  } catch (e) {
    console.error("got error", e);
    document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
  }
}

setupI18n("en-US");

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
