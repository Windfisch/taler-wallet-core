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
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
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

  // FIXME: only do this for test wallets?
  // This is no security risk, since the extension ID for published
  // extension is publicly known.

  function subst(url: string, H_contract) {
    url = url.replace("${H_contract}", H_contract);
    url = url.replace("${$}", "$");
    return url;
  }

  let $ = (x) => document.getElementById(x);

  document.addEventListener("DOMContentLoaded", function(e) {
    if (document.documentElement.getAttribute("data-taler-requested")) {
      console.log("taler requested in html element");
      document.documentElement.setAttribute("data-taler-extension-id",
                                            chrome.runtime.id);
    }
  });

  document.addEventListener("taler-probe", function(e) {
    let evt = new CustomEvent("taler-wallet-present", {
      detail: {
        walletProtocolVersion: PROTOCOL_VERSION
      }
    });
    document.dispatchEvent(evt);
    console.log("handshake done");
  });

  document.addEventListener("taler-create-reserve", function(e: CustomEvent) {
    console.log("taler-create-reserve with " + JSON.stringify(e.detail));
    let params = {
      amount: JSON.stringify(e.detail.amount),
      callback_url: URI(e.detail.callback_url)
        .absoluteTo(document.location.href),
      bank_url: document.location.href,
    };
    let uri = URI(chrome.extension.getURL("pages/confirm-create-reserve.html"));
    document.location.href = uri.query(params).href();
  });

  document.addEventListener("taler-confirm-reserve", function(e: CustomEvent) {
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


  // XXX: remove in a bit, just here for compatibility ...
  document.addEventListener("taler-contract", function(e: CustomEvent) {
    // XXX: the merchant should just give us the parsed data ...
    let offer = JSON.parse(e.detail);

    if (!offer.contract) {
      console.error("contract field missing");
      return;
    }

    let msg = {
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
        let uri = URI(chrome.extension.getURL("pages/confirm-contract.html"));
        let params = {
          offer: JSON.stringify(offer),
          merchantPageUrl: document.location.href,
        };
        document.location.href = uri.query(params).href();
      }
    });
  });


  document.addEventListener("taler-confirm-contract", function(e: CustomEvent) {
    if (!e.detail.contract_wrapper) {
      console.error("contract wrapper missing");
      return;
    }

    let offer = e.detail.contract_wrapper;

    if (!offer.contract) {
      console.error("contract field missing");
      return;
    }

    let msg = {
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
        let uri = URI(chrome.extension.getURL("pages/confirm-contract.html"));
        let params = {
          offer: JSON.stringify(offer),
          merchantPageUrl: document.location.href,
        };
        let target = uri.query(params).href();
        if (e.detail.replace_navigation === true) {
          document.location.replace(target);
        } else {
          document.location.href = target;
        }
      }
    });
  });


  document.addEventListener('taler-execute-payment', function(e: CustomEvent) {
    console.log("got taler-execute-payment in content page");
    if (!e.detail.pay_url) {
      console.log("field 'pay_url' missing in taler-execute-payment event");
      return;
    }
    let payUrl = e.detail.pay_url;
    let msg = {
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

      console.log("Making request to ", payUrl);
      let r = new XMLHttpRequest();
      r.open('post', payUrl);
      r.send(JSON.stringify(resp.payReq));
      r.onload = () => {
        switch (r.status) {
          case 200:
            console.log("going to", contract.fulfillment_url);
            // TODO: Is this the right thing?  Does the reload
            // TODO: override setting location.href?
            window.location.href = subst(contract.fulfillment_url,
                                         e.detail.H_contract);
            window.location.reload(true);
            break;
          default:
            console.log("Unexpected status code for $pay_url:", r.status);
            break;
        }
      };
    });
  });
}
