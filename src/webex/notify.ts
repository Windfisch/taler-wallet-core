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

import { getTalerStampSec } from "../helpers";
import { TipToken, QueryPaymentResult } from "../types";


import axios from "axios";

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


async function handlePaymentResponse(maybeFoundResponse: QueryPaymentResult) {
  if (!maybeFoundResponse.found) {
    console.log("pay-failed", {hint: "payment not found in the wallet"});
    return;
  }
  const walletResp = maybeFoundResponse;

  logVerbose && console.log("handling taler-notify-payment: ", walletResp);
  let resp;
  try {
    const config = {
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      timeout: 5000, /* 5 seconds */
      validateStatus: (s: number) => s === 200,
    };
    resp = await axios.post(walletResp.contractTerms.pay_url, walletResp.payReq, config);
  } catch (e) {
    // Gives the user the option to retry / abort and refresh
    wxApi.logAndDisplayError({
      contractTerms: walletResp.contractTerms,
      message: e.message,
      name: "pay-post-failed",
      response: e.response,
    });
    throw e;
  }
  const merchantResp = resp.data;
  logVerbose && console.log("got success from pay_url");
  await wxApi.paymentSucceeded(walletResp.contractTermsHash, merchantResp.sig);
  const nextUrl = walletResp.contractTerms.fulfillment_url;
  logVerbose && console.log("taler-payment-succeeded done, going to", nextUrl);
  window.location.href = nextUrl;
  window.location.reload(true);
}


function onceOnComplete(cb: () => void) {
  if (document.readyState === "complete") {
    cb();
  } else {
    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") {
        cb();
      }
    });
  }
}


function init() {
  // Only place where we don't use the nicer RPC wrapper, since the wallet
  // backend might not be ready (during install, upgrade, etc.)
  chrome.runtime.sendMessage({type: "get-tab-cookie"}, (resp) => {
    logVerbose && console.log("got response for get-tab-cookie");
    if (chrome.runtime.lastError) {
      logVerbose && console.log("extension not yet ready");
      window.setTimeout(init, 200);
      return;
    }
    onceOnComplete(() => {
      if (document.documentElement.getAttribute("data-taler-nojs")) {
        initStyle();
        setStyles(true);
      }
    });
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

async function downloadContract(url: string, nonce: string): Promise<any> {
  const parsed_url = new URI(url);
  url = parsed_url.setQuery({nonce}).href();
  console.log("downloading contract from '" + url + "'");
  let resp;
  try {
    resp = await axios.get(url, { validateStatus: (s) => s === 200 });
  } catch (e) {
    wxApi.logAndDisplayError({
      message: e.message,
      name: "contract-download-failed",
      response: e.response,
      sameTab: true,
    });
    throw e;
  }
  console.log("got response", resp);
  return resp.data;
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

  const proposalId = await wxApi.saveProposal({
    contractTerms: proposal.data,
    contractTermsHash: proposal.hash,
    merchantSig: proposal.sig,
    timestamp: (new Date()).getTime(),
  });

  const uri = new URI(chrome.extension.getURL("/src/webex/pages/confirm-contract.html"));
  const params = {
    proposalId: proposalId.toString(),
  };
  const target = uri.query(params).href();
  document.location.replace(target);
}


/**
 * Handle a payment request (coming either from an HTTP 402 or
 * the JS wallet API).
 */
function talerPay(msg: any): Promise<any> {
  // Use a promise directly instead of of an async
  // function since some paths never resolve the promise.
  return new Promise(async(resolve, reject) => {
    if (msg.tip) {
      const tipToken = TipToken.checked(JSON.parse(msg.tip));

      console.log("got tip token", tipToken);

      const deadlineSec = getTalerStampSec(tipToken.expiration);
      if (!deadlineSec) {
        wxApi.logAndDisplayError({
          message: "invalid expiration",
          name: "tipping-failed",
          sameTab: true,
        });
        return;
      }

      const merchantDomain = new URI(document.location.href).origin();
      let walletResp;
      try {
        walletResp = await wxApi.getTipPlanchets(merchantDomain, tipToken.tip_id, tipToken.amount, deadlineSec, tipToken.exchange_url);
      } catch (e) {
        wxApi.logAndDisplayError({
          message: e.message,
          name: "tipping-failed",
          response: e.response,
          sameTab: true,
        });
        throw e;
      }

      let planchets = walletResp;

      if (!planchets) {
        wxApi.logAndDisplayError({
          message: "processing tip failed",
          detail: walletResp,
          name: "tipping-failed",
          sameTab: true,
        });
        return;
      }

      let merchantResp;

      try {
        const config = {
          validateStatus: (s: number) => s === 200,
        };
        const req = { planchets, tip_id: tipToken.tip_id };
        merchantResp = await axios.post(tipToken.pickup_url, req, config);
      } catch (e) {
        wxApi.logAndDisplayError({
          message: e.message,
          name: "tipping-failed",
          response: e.response,
          sameTab: true,
        });
        throw e;
      }

      try {
        wxApi.processTipResponse(merchantDomain, tipToken.tip_id, merchantResp.data);
      } catch (e) {
        wxApi.logAndDisplayError({
          message: e.message,
          name: "tipping-failed",
          response: e.response,
          sameTab: true,
        });
        throw e;
      }

      // Go to tip dialog page, where the user can confirm the tip or
      // decline if they are not happy with the exchange.
      const uri = new URI(chrome.extension.getURL("/src/webex/pages/tip.html"));
      const params = { tip_id: tipToken.tip_id, merchant_domain: merchantDomain };
      const redirectUrl = uri.query(params).href();
      window.location.href = redirectUrl;

      return;
    }

    if (msg.refund_url) {
      console.log("processing refund");
      let resp;
      try {
        const config = {
          validateStatus: (s: number) => s === 200,
        };
        resp = await axios.get(msg.refund_url, config);
      } catch (e) {
        wxApi.logAndDisplayError({
          message: e.message,
          name: "refund-download-failed",
          response: e.response,
          sameTab: true,
        });
        throw e;
      }
      await wxApi.acceptRefund(resp.data);
      const hc = resp.data.refund_permissions[0].h_contract_terms;
      document.location.href = chrome.extension.getURL(`/src/webex/pages/refund.html?contractTermsHash=${hc}`);
      return;
    }

    // current URL without fragment
    const url = new URI(document.location.href).fragment("").href();
    const res = await wxApi.queryPayment(url);
    logVerbose && console.log("taler-pay: got response", res);
    if (res && res.found && res.payReq) {
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
