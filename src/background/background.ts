/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Entry point for the background page.
 *
 * @author Florian Dold
 */

"use strict";

window.addEventListener("load", () => {

  // TypeScript does not allow ".js" extensions in the
  // module name, so SystemJS must add it.
  System.config({
                 defaultJSExtensions: true,
                });

  System.import("../wxBackend")
    .then((wxMessaging: any) => {
      // Export as global for debugger
      (window as any).wxMessaging = wxMessaging;
      wxMessaging.wxMain();
    }).catch((e: Error) => {
      console.error("Loading Taler wallet background page failed.", e);
    });
});
