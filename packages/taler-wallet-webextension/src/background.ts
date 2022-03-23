/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
 * Entry point for the background page.
 *
 * @author sebasjm
 */

/**
 * Imports.
 */
import { platform, setupPlatform } from "./platform/api";
import firefoxAPI from "./platform/firefox"
import chromeAPI from "./platform/chrome"
import { wxMain } from "./wxBackend";

const isFirefox = typeof (window as any)['InstallTrigger'] !== 'undefined'

//FIXME: create different entry point for any platform instead of 
//switching in runtime
if (isFirefox) {
  console.log("Wallet setup for Firefox API")
  setupPlatform(firefoxAPI)
} else {
  console.log("Wallet setup for Chrome API")
  setupPlatform(chromeAPI)
}

try {
  platform.registerOnInstalled(() => {
    platform.openWalletPage("/welcome")
  })
} catch (e) {
  console.error(e);
}

platform.notifyWhenAppIsReady(() => {
  wxMain();
})
