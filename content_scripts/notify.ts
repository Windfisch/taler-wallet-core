/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

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
 * Script that is injected into (all!) pages to allow them
 * to interact with the GNU Taler wallet via DOM Events.
 *
 * @author Florian Dold
 */


/// <reference path="../lib/decl/chrome/chrome.d.ts" />

"use strict";

import {createReserve, confirmContract, fetchPayment} from "../lib/shopApi";

// Make sure we don't pollute the namespace too much.
namespace TalerNotify {
  const PROTOCOL_VERSION = 1;

  console.log("Taler injected", chrome.runtime.id);

  const handlers = [];

  function init() {
    chrome.runtime.sendMessage({type: "ping"}, () => {
      if (chrome.runtime.lastError) {
        console.log("extension not yet ready");
        window.setTimeout(init, 200);
        return;
      }
      console.log("got pong");
      registerHandlers();
      // Hack to know when the extension is unloaded
      let port = chrome.runtime.connect();

      port.onDisconnect.addListener(() => {
        console.log("chrome runtime disconnected, removing handlers");
        for (let handler of handlers) {
          document.removeEventListener(handler.type, handler.listener);
        }
      });
    });
  }

  init();

  function registerHandlers() {
    function addHandler(type, listener) {
      document.addEventListener(type, listener);
      handlers.push({type, listener});
    }

    addHandler("taler-query-id", function(e) {
      let evt = new CustomEvent("taler-id", {
        detail: {
          id: chrome.runtime.id
        }
      });
      document.dispatchEvent(evt);
    });

    addHandler("taler-probe", function(e) {
      let evt = new CustomEvent("taler-wallet-present", {
        detail: {
          walletProtocolVersion: PROTOCOL_VERSION
        }
      });
      document.dispatchEvent(evt);
    });

    addHandler("taler-create-reserve", function(e: CustomEvent) {
      createReserve(e.detail.amount, e.detail.callback_url, e.detail.wt_types);
    });

    addHandler("taler-confirm-reserve", function(e: CustomEvent) {
      console.log("taler-confirm-reserve with " + JSON.stringify(e.detail));
      let msg = {
        type: "confirm-reserve",
        detail: {
          reservePub: e.detail.reserve_pub
        }
      };
      chrome.runtime.sendMessage(msg, (resp) => {
        console.log("confirm reserve done");
      });
    });

    addHandler("taler-confirm-contract", function(e: CustomEvent) {
      confirmContract(e.detail.contract_wrapper, e.detail.replace_navigation);
    });

    addHandler("taler-payment-failed", (e: CustomEvent) => {
      const msg = {
        type: "payment-failed",
        detail: {},
      };
      chrome.runtime.sendMessage(msg, (resp) => {
        let evt = new CustomEvent("taler-payment-failed-ok", {
          detail: {}
        });
        document.dispatchEvent(evt);
      });
    });

    addHandler("taler-fetch-payment", (e: CustomEvent) => {
      fetchPayment(e.detail.H_contract, e.detail.offering_url);
    });
  }
}