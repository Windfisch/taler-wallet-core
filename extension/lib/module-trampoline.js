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
 * Boilerplate to initialize the module system and call main()
 */

"use strict";

if (typeof System === "undefined") {
  throw Error("system loader not present (must be included before the" +
    " trampoline");
}

System.config({
  defaultJSExtensions: true,
});


// Register mithril as a module,
// but only if it is ambient.
if (m) {
  let mod = System.newModule({default: m});
  let modName = "mithril";
  System.set(modName, mod);
}


let me = window.location.protocol
  + "//" + window.location.host
  + window.location.pathname.replace(/[.]html$/, ".js");

let domLoaded = false;

document.addEventListener("DOMContentLoaded", function(event) {
  domLoaded = true;
});

function execMain(m) {
  if (m.main) {
    console.log("executing module main");
    m.main();
  } else {
    console.warn("module does not export a main() function");
  }
}

console.log("loading", me);

System.import(me)
  .then((m) => {
    console.log("module imported", me);
    if (domLoaded) {
      execMain(m);
      return;
    }
    document.addEventListener("DOMContentLoaded", function(event) {
      execMain(m);
    });
  })
  .catch((e) => {
    console.log("trampoline failed");
    console.error(e.stack);
  });