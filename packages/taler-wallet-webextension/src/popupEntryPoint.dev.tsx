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

import { setupI18n } from "@gnu-taler/taler-util";
import { h, render } from "preact";
import { strings } from "./i18n/strings.js";
import { setupPlatform } from "./platform/api.js";
import devAPI from "./platform/dev.js";
import { Application } from "./popup/Application.js";

console.log("Wallet setup for Dev API");
setupPlatform(devAPI);

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
