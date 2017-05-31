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

// tslint:disable:no-unused-expression

/**
 * Module that is injected into (all!) pages to allow them
 * to interact with the GNU Taler wallet via DOM Events.
 */

/**
 * Imports.
 */
import URI = require("urijs");

import wxApi = require("./wxApi");

declare var cloneInto: any;

let logVerbose: boolean = false;
try {
  logVerbose = !!localStorage.getItem("taler-log-verbose");
} catch (e) {
  // can't read from local storage
}

if (document.documentElement.getAttribute("data-taler-nojs")) {
  document.dispatchEvent(new Event("taler-probe-result"));
}

interface Handler {
  type: string;
  listener: (e: CustomEvent) => void|Promise<void>;
}
const handlers: Handler[] = [];


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
  async function handleFailedPayment(r: XMLHttpRequest) {
    let timeoutHandle: number|null = null;
    function err() {
      // FIXME: proper error reporting!
      console.log("pay-failed", {status: r.status, response: r.responseText});
    }
    function onTimeout() {
      timeoutHandle = null;
      err();
    }
    timeoutHandle = window.setTimeout(onTimeout, 200);

    await wxApi.paymentFailed(walletResp.H_contract);
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    err();
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
    r.onload = async () => {
      if (!r) {
        return;
      }
      switch (r.status) {
        case 200:
          const merchantResp = JSON.parse(r.responseText);
          logVerbose && console.log("got success from pay_url");
          await wxApi.paymentSucceeded(walletResp.H_contract, merchantResp.sig);
          const nextUrl = walletResp.contract.fulfillment_url;
          logVerbose && console.log("taler-payment-succeeded done, going to", nextUrl);
          window.location.href = nextUrl;
          window.location.reload(true);
          break;
        default:
          handleFailedPayment(r);
          break;
      }
      r = null;
      if (timeoutHandle !== null) {
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
    timeoutHandle = window.setTimeout(retry, timeout_ms);
  }
  sendPay();
}


function init() {
  // Only place where we don't use the nicer RPC wrapper, since the wallet
  // backend might not be ready (during install, upgrade, etc.)
  chrome.runtime.sendMessage({type: "get-tab-cookie"}, (resp) => {
    if (chrome.runtime.lastError) {
      logVerbose && console.log("extension not yet ready");
      window.setTimeout(init, 200);
      return;
    }
    if (document.documentElement.getAttribute("data-taler-nojs")) {
      const onload = () => {
        initStyle();
        setStyles(true);
      };
      if (document.readyState === "complete") {
        onload();
      } else {
        document.addEventListener("DOMContentLoaded", onload);
      }
    }
    registerHandlers();
    // Hack to know when the extension is unloaded
    const port = chrome.runtime.connect();

    port.onDisconnect.addListener(() => {
      logVerbose && console.log("chrome runtime disconnected, removing handlers");
      if (document.documentElement.getAttribute("data-taler-nojs")) {
        setStyles(false);
      }
      for (const handler of handlers) {
        document.removeEventListener(handler.type, handler.listener);
      }
    });

    if (resp && resp.type === "pay") {
      logVerbose && console.log("doing taler.pay with", resp.payDetail);
      talerPay(resp.payDetail).then(handlePaymentResponse);
      document.documentElement.style.visibility = "hidden";
    }
  });
}

type HandlerFn = (detail: any, sendResponse: (msg: any) => void) => void;

function downloadContract(url: string, nonce: string): Promise<any> {
  const parsed_url = new URI(url);
  url = parsed_url.setQuery({nonce}).href();
  // FIXME: include and check nonce!
  return new Promise((resolve, reject) => {
    const contract_request = new XMLHttpRequest();
    console.log("downloading contract from '" + url + "'");
    contract_request.open("GET", url, true);
    contract_request.onload = (e) => {
      if (contract_request.readyState === 4) {
        if (contract_request.status === 200) {
          console.log("response text:",
                      contract_request.responseText);
          const contract_wrapper = JSON.parse(contract_request.responseText);
          if (!contract_wrapper) {
            console.error("response text was invalid json");
            const detail = {
              body: contract_request.responseText,
              hint: "invalid json",
              status: contract_request.status,
            };
            reject(detail);
            return;
          }
          resolve(contract_wrapper);
        } else {
          const detail = {
            body: contract_request.responseText,
            hint: "contract download failed",
            status: contract_request.status,
          };
          reject(detail);
          return;
        }
      }
    };
    contract_request.onerror = (e) => {
      const detail = {
        body: contract_request.responseText,
        hint: "contract download failed",
        status: contract_request.status,
      };
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

  const contractHash = await wxApi.hashContract(proposal.data);

  if (contractHash !== proposal.hash) {
    console.error(`merchant-supplied contract hash is wrong (us: ${contractHash}, merchant: ${proposal.hash})`);
    console.dir(proposal.data);
    return;
  }

  let merchantName = "(unknown)";
  try {
    merchantName = proposal.data.merchant.name;
  } catch (e) {
    // bad contract / name not included
  }

  const historyEntry = {
    detail: {
      contractHash,
      merchantName,
    },
    subjectId: `contract-${contractHash}`,
    timestamp: (new Date()).getTime(),
    type: "offer-contract",
  };
  await wxApi.putHistory(historyEntry);
  let proposalId = await wxApi.saveProposal(proposal);

  const uri = new URI(chrome.extension.getURL("/src/webex/pages/confirm-contract.html"));
  const params = {
    proposalId: proposalId.toString(),
  };
  const target = uri.query(params).href();
  document.location.replace(target);
}

function talerPay(msg: any): Promise<any> {
  return new Promise(async(resolve, reject) => {
    // current URL without fragment
    const url = new URI(document.location.href).fragment("").href();
    const res = await wxApi.queryPayment(url);
    logVerbose && console.log("taler-pay: got response", res);
    if (res && res.payReq) {
      resolve(res);
      return;
    }
    if (msg.contract_url) {
      const nonce = await wxApi.generateNonce();
      const proposal = await downloadContract(msg.contract_url, nonce);
      if (proposal.data.nonce !== nonce) {
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


function registerHandlers() {
  /**
   * Add a handler for a DOM event, which automatically
   * handles adding sequence numbers to responses.
   */
  function addHandler(type: string, handler: HandlerFn) {
    const handlerWrap = (e: CustomEvent) => {
      if (e.type !== type) {
        throw Error(`invariant violated`);
      }
      let callId: number|undefined;
      if (e.detail && e.detail.callId !== undefined) {
        callId = e.detail.callId;
      }
      const responder = (msg?: any) => {
        const fullMsg = Object.assign({}, msg, {callId});
        let opts = { detail: fullMsg };
        if ("function" === typeof cloneInto) {
          opts = cloneInto(opts, document.defaultView);
        }
        const evt = new CustomEvent(type + "-result", opts);
        document.dispatchEvent(evt);
      };
      handler(e.detail, responder);
    };
    document.addEventListener(type, handlerWrap);
    handlers.push({type, listener: handlerWrap});
  }


  addHandler("taler-query-id", (msg: any, sendResponse: any) => {
    // FIXME: maybe include this info in taler-probe?
    sendResponse({id: chrome.runtime.id});
  });

  addHandler("taler-probe", (msg: any, sendResponse: any) => {
    sendResponse();
  });

  addHandler("taler-create-reserve", (msg: any) => {
    const params = {
      amount: JSON.stringify(msg.amount),
      bank_url: document.location.href,
      callback_url: new URI(msg.callback_url) .absoluteTo(document.location.href),
      suggested_exchange_url: msg.suggested_exchange_url,
      wt_types: JSON.stringify(msg.wt_types),
    };
    const uri = new URI(chrome.extension.getURL("/src/webex/pages/confirm-create-reserve.html"));
    const redirectUrl = uri.query(params).href();
    window.location.href = redirectUrl;
  });

  addHandler("taler-add-auditor", (msg: any) => {
    const params = {
      req: JSON.stringify(msg),
    };
    const uri = new URI(chrome.extension.getURL("/src/webex/pages/add-auditor.html"));
    const redirectUrl = uri.query(params).href();
    window.location.href = redirectUrl;
  });

  addHandler("taler-confirm-reserve", async (msg: any, sendResponse: any) => {
    const reservePub = msg.reserve_pub;
    if (typeof reservePub !== "string") {
      console.error("taler-confirm-reserve expects parameter reserve_pub of type 'string'");
      return;
    }
    await wxApi.confirmReserve(msg.reserve_pub);
    sendResponse();
  });

  addHandler("taler-pay", async(msg: any, sendResponse: any) => {
    const resp = await talerPay(msg);
    sendResponse(resp);
  });
}

logVerbose && console.log("loading Taler content script");
init();
