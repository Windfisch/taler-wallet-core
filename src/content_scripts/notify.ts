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


"use strict";

declare var cloneInto: any;

// Make sure we don't pollute the namespace too much.
namespace TalerNotify {
  const PROTOCOL_VERSION = 1;

  let logVerbose: boolean = false;
  try {
    logVerbose = !!localStorage.getItem("taler-log-verbose");
  } catch (e) {
    // can't read from local storage
  }

  if (!taler) {
    console.error("Taler wallet lib not included, HTTP 402 payments not" +
                  " supported");
  }

  if (document.documentElement.getAttribute("data-taler-nojs")) {
    document.dispatchEvent(new Event("taler-probe-result"));
  }


  function subst(url: string, H_contract: string) {
    url = url.replace("${H_contract}", H_contract);
    url = url.replace("${$}", "$");
    return url;
  }

  interface Handler {
    type: string;
    listener: (e: CustomEvent) => void|Promise<void>;
  }
  const handlers: Handler[] = [];

  function hashContract(contract: string): Promise<string> {
    let walletHashContractMsg = {
      type: "hash-contract",
      detail: {contract}
    };
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(walletHashContractMsg, (resp: any) => {
        if (!resp.hash) {
          console.log("error", resp);
          reject(Error("hashing failed"));
        }
        resolve(resp.hash);
      });
    });
  }

  function checkRepurchase(contract: string): Promise<any> {
    const walletMsg = {
      type: "check-repurchase",
      detail: {
        contract: contract
      },
    };
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(walletMsg, (resp: any) => {
        resolve(resp);
      });
    });
  }

  function queryPayment(query: any): Promise<any> {
    // current URL without fragment
    const walletMsg = {
      type: "query-payment",
      detail: query,
    };
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(walletMsg, (resp: any) => {
        resolve(resp);
      });
    });
  }

  function putHistory(historyEntry: any): Promise<void> {
    const walletMsg = {
      type: "put-history-entry",
      detail: {
        historyEntry,
      },
    };
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(walletMsg, (resp: any) => {
        resolve();
      });
    });
  }

  function saveOffer(offer: any): Promise<number> {
    const walletMsg = {
      type: "save-offer",
      detail: {
        offer: {
          contract: offer.data,
          merchant_sig: offer.sig,
          H_contract: offer.hash,
          offer_time: new Date().getTime() / 1000
        },
      },
    };
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(walletMsg, (resp: any) => {
        if (resp && resp.error) {
          reject(resp);
        } else {
          resolve(resp);
        }
      });
    });
  }

  function init() {
    chrome.runtime.sendMessage({type: "get-tab-cookie"}, (resp) => {
      if (chrome.runtime.lastError) {
        logVerbose && console.log("extension not yet ready");
        window.setTimeout(init, 200);
        return;
      }
      registerHandlers();
      // Hack to know when the extension is unloaded
      let port = chrome.runtime.connect();

      port.onDisconnect.addListener(() => {
        logVerbose && console.log("chrome runtime disconnected, removing handlers");
        for (let handler of handlers) {
          document.removeEventListener(handler.type, handler.listener);
        }
      });

      if (resp && resp.type == "pay") {
        logVerbose && console.log("doing taler.pay with", resp.payDetail);
        taler.internalPay(resp.payDetail);
        document.documentElement.style.visibility = "hidden";
      }
    });
  }

  logVerbose && console.log("loading Taler content script");
  init();

  interface HandlerFn {
    (detail: any, sendResponse: (msg: any) => void): void;
  }

  function downloadContract(url: string): Promise<any> {
    // FIXME: include and check nonce!
    return new Promise((resolve, reject) => {
      const contract_request = new XMLHttpRequest();
      console.log("downloading contract from '" + url + "'")
      contract_request.open("GET", url, true);
      contract_request.onload = function (e) {
        if (contract_request.readyState == 4) {
          if (contract_request.status == 200) {
            console.log("response text:",
                        contract_request.responseText);
            var contract_wrapper = JSON.parse(contract_request.responseText);
            if (!contract_wrapper) {
              console.error("response text was invalid json");
              let detail = {hint: "invalid json", status: contract_request.status, body: contract_request.responseText};
              reject(detail);
              return;
            }
            resolve(contract_wrapper);
          } else {
            let detail = {hint: "contract download failed", status: contract_request.status, body: contract_request.responseText};
            reject(detail);
            return;
          }
        }
      };
      contract_request.onerror = function (e) {
        let detail = {hint: "contract download failed", status: contract_request.status, body: contract_request.responseText};
        reject(detail);
        return;
      };
      contract_request.send();
    });
  }

  async function processProposal(proposal: any) {
    if (!proposal.data) {
      console.error("field proposal.data field missing");
      return;
    }

    if (!proposal.hash) {
      console.error("proposal.hash field missing");
      return;
    }

    let contractHash = await hashContract(proposal.data);

    if (contractHash != proposal.hash) {
      console.error("merchant-supplied contract hash is wrong");
      return;
    }

    let resp = await checkRepurchase(proposal.data);

    if (resp.error) {
      console.error("wallet backend error", resp);
      return;
    }

    if (resp.isRepurchase) {
      logVerbose && console.log("doing repurchase");
      console.assert(resp.existingFulfillmentUrl);
      console.assert(resp.existingContractHash);
      window.location.href = subst(resp.existingFulfillmentUrl,
                                   resp.existingContractHash);

    } else {

      let merchantName = "(unknown)";
      try {
        merchantName = proposal.data.merchant.name;
      } catch (e) {
        // bad contract / name not included
      }

      let historyEntry = {
        timestamp: (new Date).getTime(),
        subjectId: `contract-${contractHash}`,
        type: "offer-contract",
        detail: {
          contractHash,
          merchantName,
        }
      };
      await putHistory(historyEntry);
      let offerId = await saveOffer(proposal);

      const uri = URI(chrome.extension.getURL(
        "/src/pages/confirm-contract.html"));
      const params = {
        offerId: offerId.toString(),
      };
      const target = uri.query(params).href();
      document.location.replace(target);
    }
  }

  function registerHandlers() {
    /**
     * Add a handler for a DOM event, which automatically
     * handles adding sequence numbers to responses.
     */
    function addHandler(type: string, handler: HandlerFn) {
      let handlerWrap = (e: CustomEvent) => {
        if (e.type != type) {
          throw Error(`invariant violated`);
        }
        let callId: number|undefined = undefined;
        if (e.detail && e.detail.callId != undefined) {
          callId = e.detail.callId;
        }
        let responder = (msg?: any) => {
          let fullMsg = Object.assign({}, msg, {callId});
          let opts = { detail: fullMsg };
          if ("function" == typeof cloneInto) {
            opts = cloneInto(opts, document.defaultView);
          }
          let evt = new CustomEvent(type + "-result", opts);
          document.dispatchEvent(evt);
        };
        handler(e.detail, responder);
      };
      document.addEventListener(type, handlerWrap);
      handlers.push({type, listener: handlerWrap});
    }


    addHandler("taler-query-id", (msg: any, sendResponse: any) => {
      // FIXME: maybe include this info in taoer-probe?
      sendResponse({id: chrome.runtime.id})
    });

    addHandler("taler-probe", (msg: any, sendResponse: any) => {
      sendResponse();
    });

    addHandler("taler-create-reserve", (msg: any) => {
      let params = {
        amount: JSON.stringify(msg.amount),
        callback_url: URI(msg.callback_url)
          .absoluteTo(document.location.href),
        bank_url: document.location.href,
        wt_types: JSON.stringify(msg.wt_types),
        suggested_exchange_url: msg.suggested_exchange_url,
      };
      let uri = URI(chrome.extension.getURL("/src/pages/confirm-create-reserve.html"));
      let redirectUrl = uri.query(params).href();
      window.location.href = redirectUrl;
    });

    addHandler("taler-confirm-reserve", (msg: any, sendResponse: any) => {
      let walletMsg = {
        type: "confirm-reserve",
        detail: {
          reservePub: msg.reserve_pub
        }
      };
      chrome.runtime.sendMessage(walletMsg, (resp) => {
        sendResponse();
      });
    });


    addHandler("taler-confirm-contract", async(msg: any) => {
      if (!msg.contract_wrapper) {
        console.error("contract wrapper missing");
        return;
      }

      const proposal = msg.contract_wrapper;

      processProposal(proposal);
    });

    addHandler("taler-pay", async(msg: any, sendResponse: any) => {
      let res = await queryPayment(msg.contract_query);
      logVerbose && console.log("taler-pay: got response", res);
      if (res && res.payReq) {
        sendResponse(res);
        return;
      }
      if (msg.contract_url) {
        let proposal = await downloadContract(msg.contract_url);
        await processProposal(proposal);
        return;
      }

      if (msg.offer_url) {
        document.location.href = msg.offer_url;
        return;
      }

      console.log("can't proceed with payment, no way to get contract specified");
    });

    addHandler("taler-payment-failed", (msg: any, sendResponse: any) => {
      const walletMsg = {
        type: "payment-failed",
        detail: {
          contractHash: msg.H_contract
        },
      };
      chrome.runtime.sendMessage(walletMsg, (resp) => {
        sendResponse();
      })
    });

    addHandler("taler-payment-succeeded", (msg: any, sendResponse: any) => {
      if (!msg.H_contract) {
        console.error("H_contract missing in taler-payment-succeeded");
        return;
      }
      logVerbose && console.log("got taler-payment-succeeded");
      const walletMsg = {
        type: "payment-succeeded",
        detail: {
          contractHash: msg.H_contract,
        },
      };
      chrome.runtime.sendMessage(walletMsg, (resp) => {
        sendResponse();
      })
    });
  }
}
