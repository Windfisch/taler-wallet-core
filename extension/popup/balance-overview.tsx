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

"use strict";

document.addEventListener("DOMContentLoaded", (e) => {
  console.log("content loaded");
  chrome.runtime.sendMessage({type: "balances"}, function(wallet) {
    let context = document.getElementById("balance-template").innerHTML;
    let template = Handlebars.compile(context);
    document.getElementById("content").innerHTML = template(wallet);
    console.log("got wallet", JSON.stringify(wallet));
    let el = document.getElementById("link-kudos");
    if (el) {
      el.onclick = (e) => {
        let target: any = e.target;
        chrome.tabs.create({
                             "url": target.href
                           });
      };
    }
  });

  document.getElementById("debug").addEventListener("click", (e) => {
    chrome.tabs.create({
                         "url": chrome.extension.getURL("pages/debug.html")
                       });
  });
  document.getElementById("reset").addEventListener("click", (e) => {
    chrome.runtime.sendMessage({type: "reset"});
    window.close();
  });
});
