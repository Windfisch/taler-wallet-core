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
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Entry point for the background page.
 */

"use strict";

// TypeScript does not allow ".js" extensions in the
// module name, so SystemJS must add it.
System.config({
                defaultJSExtensions: true,
              });


System.import("../lib/wallet/wxMessaging")
      .then((wxMessaging) => {
        wxMessaging.wxMain();
      })
      .catch((e) => {
        console.log("wallet failed");
        console.error(e.stack);
      });