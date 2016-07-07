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

// Make sure we don't pollute the namespace too much.
namespace TalerNotify {
  const PROTOCOL_VERSION = 1;

  console.log("Taler injected", chrome.runtime.id);

  function subst(url: string, H_contract) {
    url = url.replace("${H_contract}", H_contract);
    url = url.replace("${$}", "$");
    return url;
  }

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
    const $ = (x) => document.getElementById(x);

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
      console.log("taler-create-reserve with " + JSON.stringify(e.detail));
      let params = {
        amount: JSON.stringify(e.detail.amount),
        callback_url: URI(e.detail.callback_url)
          .absoluteTo(document.location.href),
        bank_url: document.location.href,
        wt_types: JSON.stringify(e.detail.wt_types),
      };
      let uri = URI(chrome.extension.getURL("pages/confirm-create-reserve.html"));
      document.location.href = uri.query(params).href();
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
      if (!e.detail.contract_wrapper) {
        console.error("contract wrapper missing");
        return;
      }

      const offer = e.detail.contract_wrapper;

      if (!offer.contract) {
        console.error("contract field missing");
        return;
      }

      const msg = {
        type: "check-repurchase",
        detail: {
          contract: offer.contract
        },
      };

      chrome.runtime.sendMessage(msg, (resp) => {
        if (resp.error) {
          console.error("wallet backend error", resp);
          return;
        }
        if (resp.isRepurchase) {
          console.log("doing repurchase");
          console.assert(resp.existingFulfillmentUrl);
          console.assert(resp.existingContractHash);
          window.location.href = subst(resp.existingFulfillmentUrl,
                                       resp.existingContractHash);

        } else {
          const uri = URI(chrome.extension.getURL("pages/confirm-contract.html"));
          const params = {
            offer: JSON.stringify(offer),
            merchantPageUrl: document.location.href,
          };
          const target = uri.query(params).href();
          if (e.detail.replace_navigation === true) {
            document.location.replace(target);
          } else {
            document.location.href = target;
          }
        }
      });
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

    // Should be: taler-request-payment, taler-result-payment

    addHandler("taler-execute-contract", (e: CustomEvent) => {
      console.log("got taler-execute-contract in content page");
      const msg = {
        type: "execute-payment",
        detail: {
          H_contract: e.detail.H_contract,
        },
      };

      chrome.runtime.sendMessage(msg, (resp) => {
        console.log("got resp");
        console.dir(resp);
        if (!resp.success) {
          console.log("got event detial:");
          console.dir(e.detail);
          if (e.detail.offering_url) {
            console.log("offering url", e.detail.offering_url);
            window.location.href = e.detail.offering_url;
          } else {
            console.error("execute-payment failed");
          }
          return;
        }
        let contract = resp.contract;
        if (!contract) {
          throw Error("contract missing");
        }

        // We have the details for then payment, the merchant page
        // is responsible to give it to the merchant.

        let evt = new CustomEvent("taler-notify-payment", {
          detail: {
            H_contract: e.detail.H_contract,
            contract: resp.contract,
            payment: resp.payReq,
          }
        });
        document.dispatchEvent(evt);
      });
    });
  }
}