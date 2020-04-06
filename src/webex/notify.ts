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
import * as wxApi from "./wxApi";

declare let cloneInto: any;

let logVerbose = false;
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
  listener: (e: Event) => void | Promise<void>;
}
const handlers: Handler[] = [];

let sheet: CSSStyleSheet | null;

function initStyle() {
  logVerbose && console.log("taking over styles");
  const name = "taler-presence-stylesheet";
  const content = "/* Taler stylesheet controlled by JS */";
  let style = document.getElementById(name) as HTMLStyleElement | null;
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
      throw Error(
        "taler-presence-stylesheet should be a style sheet (<link> or <style>)",
      );
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
}

type HandlerFn = (detail: any, sendResponse: (msg: any) => void) => void;

function registerHandlers() {
  /**
   * Add a handler for a DOM event, which automatically
   * handles adding sequence numbers to responses.
   */
  function addHandler(type: string, handler: HandlerFn) {
    const handlerWrap = (e: Event) => {
      if (!(e instanceof Event)) {
        console.log("unexpected event", e);
        throw Error(`invariant violated`);
      }
      if (e.type !== type) {
        console.log("unexpected event type", e);
        throw Error(`invariant violated`);
      }
      let callId: number | undefined;
      let detail;
      if (
        e instanceof CustomEvent &&
        e.detail &&
        e.detail.callId !== undefined
      ) {
        callId = e.detail.callId;
        detail = e.detail;
      }
      const responder = (msg?: any) => {
        const fullMsg = Object.assign({}, msg, { callId });
        let opts = { detail: fullMsg };
        if ("function" === typeof cloneInto) {
          opts = cloneInto(opts, document.defaultView);
        }
        const evt = new CustomEvent(type + "-result", opts);
        document.dispatchEvent(evt);
      };
      handler(detail, responder);
    };
    document.addEventListener(type, handlerWrap);
    handlers.push({ type, listener: handlerWrap });
  }

  addHandler("taler-query-id", (msg: any, sendResponse: any) => {
    // FIXME: maybe include this info in taler-probe?
    sendResponse({ id: chrome.runtime.id });
  });

  addHandler("taler-probe", (msg: any, sendResponse: any) => {
    sendResponse();
  });

  addHandler("taler-create-reserve", (msg: any) => {
    const uri = new URL(
      chrome.extension.getURL("/src/webex/pages/confirm-create-reserve.html"),
    );
    uri.searchParams.set("amount", JSON.stringify(msg.amount));
    uri.searchParams.set("bank_url", document.location.href);
    uri.searchParams.set(
      "callback_url",
      new URL(msg.callback_url, document.location.href).href,
    );
    uri.searchParams.set("suggested_exchange_url", msg.suggested_exchange_url);
    uri.searchParams.set("wt_types", JSON.stringify(msg.wt_types));
    window.location.href = uri.href;
  });

  addHandler("taler-add-auditor", (msg: any) => {
    const uri = new URL(
      chrome.extension.getURL("/src/webex/pages/add-auditor.html"),
    );
    uri.searchParams.set("req", JSON.stringify(msg));
    window.location.href = uri.href;
  });

  addHandler("taler-confirm-reserve", async (msg: any, sendResponse: any) => {
    const reservePub = msg.reserve_pub;
    if (typeof reservePub !== "string") {
      console.error(
        "taler-confirm-reserve expects parameter reserve_pub of type 'string'",
      );
      return;
    }
    await wxApi.confirmReserve(msg.reserve_pub);
    sendResponse();
  });
}

logVerbose && console.log("loading Taler content script");
init();
