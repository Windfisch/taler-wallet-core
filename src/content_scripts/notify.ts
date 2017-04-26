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


import URI = require("urijs");

declare var cloneInto: any;

const PROTOCOL_VERSION = 1;

let logVerbose: boolean = false;
try {
  logVerbose = !!localStorage.getItem("taler-log-verbose");
} catch (e) {
  // can't read from local storage
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
  return new Promise<string>((resolve, reject) => {
    chrome.runtime.sendMessage(walletHashContractMsg, (resp: any) => {
      if (!resp.hash) {
        console.log("error", resp);
        reject(Error("hashing failed"));
      }
      resolve(resp.hash);
    });
  });
}

function queryPayment(url: string): Promise<any> {
  const walletMsg = {
    type: "query-payment",
    detail: { url },
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
  return new Promise<void>((resolve, reject) => {
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
  return new Promise<number>((resolve, reject) => {
    chrome.runtime.sendMessage(walletMsg, (resp: any) => {
      if (resp && resp.error) {
        reject(resp);
      } else {
        resolve(resp);
      }
    });
  });
}




let sheet: CSSStyleSheet|null;

function initStyle() {
  logVerbose && console.log("taking over styles");
  const name = "taler-presence-stylesheet";
  const content = "/* Taler stylesheet controlled by JS */";
  let style = document.getElementById(name) as HTMLStyleElement|null; 
  if (!style) {
    style = document.createElement("style");
    // Needed by WebKit
    style.appendChild(document.createTextNode(content));
    style.id = name;
    document.head.appendChild(style);
    sheet = style.sheet as CSSStyleSheet;
  } else {
    // We've taken over the stylesheet now,
    // make it clear by clearing all the rules in it
    // and making it obvious in the DOM.
    if (style.tagName.toLowerCase() === "style") {
      style.innerText = content;
    }
    if (!style.sheet) {
      throw Error("taler-presence-stylesheet should be a style sheet (<link> or <style>)");
    }
    sheet = style.sheet as CSSStyleSheet;
    while (sheet.cssRules.length > 0) {
      sheet.deleteRule(0);
    }
  }
}


function setStyles(installed: boolean) {
  if (!sheet || !sheet.cssRules) {
    return;
  }
  while (sheet.cssRules.length > 0) {
    sheet.deleteRule(0);
  }
  if (installed) {
    sheet.insertRule(".taler-installed-hide { display: none; }", 0);
    sheet.insertRule(".taler-probed-hide { display: none; }", 0);
  } else {
    sheet.insertRule(".taler-installed-show { display: none; }", 0);
  }
}



function handlePaymentResponse(walletResp: any) {
  /**
   * Handle a failed payment.
   *
   * Try to notify the wallet first, before we show a potentially
   * synchronous error message (such as an alert) or leave the page.
   */
  function handleFailedPayment(r: XMLHttpRequest) {
    let timeoutHandle: number|null = null;
    function err() {
      // FIXME: proper error reporting!
      console.log("pay-failed", {status: r.status, response: r.responseText});
    }
    function onTimeout() {
      timeoutHandle = null
      err();
    }
    talerPaymentFailed(walletResp.H_contract).then(() => {
      if (timeoutHandle != null) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      err();
    })
    timeoutHandle = setTimeout(onTimeout, 200);
  }


  logVerbose && console.log("handling taler-notify-payment: ", walletResp);
  // Payment timeout in ms.
  let timeout_ms = 1000;
  // Current request.
  let r: XMLHttpRequest|null;
  let timeoutHandle: number|null = null;
  function sendPay() {
    r = new XMLHttpRequest();
    r.open("post", walletResp.contract.pay_url);
    r.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    r.send(JSON.stringify(walletResp.payReq));
    r.onload = function() {
      if (!r) {
        return;
      }
      switch (r.status) {
        case 200:
          const merchantResp = JSON.parse(r.responseText);
          logVerbose && console.log("got success from pay_url");
          talerPaymentSucceeded({H_contract: walletResp.H_contract, merchantSig: merchantResp.sig}).then(() => {
            let nextUrl = walletResp.contract.fulfillment_url;
            logVerbose && console.log("taler-payment-succeeded done, going to", nextUrl);
            window.location.href = nextUrl;
            window.location.reload(true);
          });
          break;
        default:
          handleFailedPayment(r);
          break;
      }
      r = null;
      if (timeoutHandle != null) {
        clearTimeout(timeoutHandle!);
        timeoutHandle = null;
      }
    };
    function retry() {
      if (r) {
        r.abort();
        r = null;
      }
      timeout_ms = Math.min(timeout_ms * 2, 10 * 1000);
      logVerbose && console.log("sendPay timed out, retrying in ", timeout_ms, "ms");
      sendPay();
    }
    timeoutHandle = setTimeout(retry, timeout_ms);
  }
  sendPay();
}


function init() {
  chrome.runtime.sendMessage({type: "get-tab-cookie"}, (resp) => {
    if (chrome.runtime.lastError) {
      logVerbose && console.log("extension not yet ready");
      window.setTimeout(init, 200);
      return;
    }
    if (document.documentElement.getAttribute("data-taler-nojs")) {
      initStyle();
      setStyles(true);
    }
    registerHandlers();
    // Hack to know when the extension is unloaded
    let port = chrome.runtime.connect();

    port.onDisconnect.addListener(() => {
      logVerbose && console.log("chrome runtime disconnected, removing handlers");
      if (document.documentElement.getAttribute("data-taler-nojs")) {
        setStyles(false);
      }
      for (let handler of handlers) {
        document.removeEventListener(handler.type, handler.listener);
      }
    });

    if (resp && resp.type == "pay") {
      logVerbose && console.log("doing taler.pay with", resp.payDetail);
      talerPay(resp.payDetail).then(handlePaymentResponse);
      document.documentElement.style.visibility = "hidden";
    }
  });
}

interface HandlerFn {
  (detail: any, sendResponse: (msg: any) => void): void;
}

function generateNonce(): Promise<string> {
  const walletMsg = {
    type: "generate-nonce",
  };
  return new Promise<string>((resolve, reject) => {
    chrome.runtime.sendMessage(walletMsg, (resp: any) => {
      resolve(resp);
    });
  });
}

function downloadContract(url: string, nonce: string): Promise<any> {
  let parsed_url = new URI(url);
  url = parsed_url.setQuery({nonce}).href();
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

  const uri = new URI(chrome.extension.getURL(
    "/src/pages/confirm-contract.html"));
  const params = {
    offerId: offerId.toString(),
  };
  const target = uri.query(params).href();
  document.location.replace(target);
}

function talerPay(msg: any): Promise<any> {
  return new Promise(async(resolve, reject) => {
    // current URL without fragment
    let url = new URI(document.location.href).fragment("").href();
    let res = await queryPayment(url);
    logVerbose && console.log("taler-pay: got response", res);
    if (res && res.payReq) {
      resolve(res);
      return;
    }
    if (msg.contract_url) {
      let nonce = await generateNonce();
      let proposal = await downloadContract(msg.contract_url, nonce);
      if (proposal.data.nonce != nonce) {
        console.error("stale contract");
        return;
      }
      await processProposal(proposal);
      return;
    }

    if (msg.offer_url) {
      document.location.href = msg.offer_url;
      return;
    }

    console.log("can't proceed with payment, no way to get contract specified");
  });
}

function talerPaymentFailed(H_contract: string) {
  return new Promise(async(resolve, reject) => {
    const walletMsg = {
      type: "payment-failed",
      detail: {
        contractHash: H_contract
      },
    };
    chrome.runtime.sendMessage(walletMsg, (resp) => {
      resolve();
    });
  });
}

function talerPaymentSucceeded(msg: any) {
  return new Promise((resolve, reject) => {
    if (!msg.H_contract) {
      console.error("H_contract missing in taler-payment-succeeded");
      return;
    }
    if (!msg.merchantSig) {
      console.error("merchantSig missing in taler-payment-succeeded");
      return;
    }
    logVerbose && console.log("got taler-payment-succeeded");
    const walletMsg = {
      type: "payment-succeeded",
      detail: {
        merchantSig: msg.merchantSig,
        contractHash: msg.H_contract,
      },
    };
    chrome.runtime.sendMessage(walletMsg, (resp) => {
      resolve();
    });
  });
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
      callback_url: new URI(msg.callback_url)
        .absoluteTo(document.location.href),
      bank_url: document.location.href,
      wt_types: JSON.stringify(msg.wt_types),
      suggested_exchange_url: msg.suggested_exchange_url,
    };
    let uri = new URI(chrome.extension.getURL("/src/pages/confirm-create-reserve.html"));
    let redirectUrl = uri.query(params).href();
    window.location.href = redirectUrl;
  });

  addHandler("taler-add-auditor", (msg: any) => {
    let params = {
      req: JSON.stringify(msg),
    };
    let uri = new URI(chrome.extension.getURL("/src/pages/add-auditor.html"));
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
    let resp = await talerPay(msg);
    sendResponse(resp);
  });

  addHandler("taler-payment-failed", async(msg: any, sendResponse: any) => {
    await talerPaymentFailed(msg.H_contract);
    sendResponse();
  });

  addHandler("taler-payment-succeeded", async(msg: any, sendResponse: any) => {
    await talerPaymentSucceeded(msg);
    sendResponse();
  });
}

logVerbose && console.log("loading Taler content script");
init();

