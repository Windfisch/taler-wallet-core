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
 * Boilerplate to initialize the module system and call main()
 *
 * @author Florian Dold
 */

"use strict";

if (typeof System === "undefined") {
  throw Error("system loader not present (must be included before the" +
    " trampoline");
}

System.config({
  defaultJSExtensions: true,
  map: {
    src: "/src/",
  },
});

let me = window.location.protocol
  + "//" + window.location.host
  + window.location.pathname.replace(/[.]html$/, ".js");

let domLoaded = false;

document.addEventListener("DOMContentLoaded", function(event) {
  domLoaded = true;
});

function execMain(m: any) {
  if (m.main) {
    console.log("executing module main");
    let res = m.main();
  } else {
    console.warn("module does not export a main() function");
  }
}

console.log("loading", me);

System.import("src/logging").then((logging) => {
  window.onerror = (m, source, lineno, colno, error) => {
    logging.record("error", m + error, source || "(unknown)", undefined, lineno || 0, colno || 0);
  };
  window.addEventListener('unhandledrejection', (evt: any) => {
    logging.recordException("unhandled promise rejection", evt.reason);
  });
  System.import(me).then((m) => {
    if (domLoaded) {
      execMain(m);
      return;
    }
    document.addEventListener("DOMContentLoaded", function(event) {
      execMain(m);
    });
  });
})
.catch((e) => {
  console.log("trampoline failed");
  console.error(e.stack);
});

