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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
// Make sure we don't pollute the namespace too much.
var TalerNotify;
// Make sure we don't pollute the namespace too much.
(function (TalerNotify) {
    const PROTOCOL_VERSION = 1;
    let logVerbose = false;
    try {
        logVerbose = !!localStorage.getItem("taler-log-verbose");
    }
    catch (e) {
    }
    if (!taler) {
        console.error("Taler wallet lib not included, HTTP 402 payments not" +
            " supported");
    }
    if (document.documentElement.getAttribute("data-taler-nojs")) {
        document.dispatchEvent(new Event("taler-probe-result"));
    }
    function subst(url, H_contract) {
        url = url.replace("${H_contract}", H_contract);
        url = url.replace("${$}", "$");
        return url;
    }
    const handlers = [];
    function hashContract(contract) {
        let walletHashContractMsg = {
            type: "hash-contract",
            detail: { contract }
        };
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(walletHashContractMsg, (resp) => {
                if (!resp.hash) {
                    console.log("error", resp);
                    reject(Error("hashing failed"));
                }
                resolve(resp.hash);
            });
        });
    }
    function checkRepurchase(contract) {
        const walletMsg = {
            type: "check-repurchase",
            detail: {
                contract: contract
            },
        };
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(walletMsg, (resp) => {
                resolve(resp);
            });
        });
    }
    function putHistory(historyEntry) {
        const walletMsg = {
            type: "put-history-entry",
            detail: {
                historyEntry,
            },
        };
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(walletMsg, (resp) => {
                resolve();
            });
        });
    }
    function saveOffer(offer) {
        const walletMsg = {
            type: "save-offer",
            detail: {
                offer: {
                    contract: offer.contract,
                    merchant_sig: offer.merchant_sig,
                    H_contract: offer.H_contract,
                    offer_time: new Date().getTime() / 1000
                },
            },
        };
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(walletMsg, (resp) => {
                resolve(resp);
            });
        });
    }
    function init() {
        chrome.runtime.sendMessage({ type: "get-tab-cookie" }, (resp) => {
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
            if (resp && resp.type === "fetch") {
                logVerbose && console.log("it's fetch");
                taler.internalOfferContractFrom(resp.contractUrl);
                document.documentElement.style.visibility = "hidden";
            }
            else if (resp && resp.type === "execute") {
                logVerbose && console.log("it's execute");
                document.documentElement.style.visibility = "hidden";
                taler.internalExecutePayment(resp.contractHash, resp.payUrl, resp.offerUrl);
            }
        });
    }
    logVerbose && console.log("loading Taler content script");
    init();
    function registerHandlers() {
        /**
         * Add a handler for a DOM event, which automatically
         * handles adding sequence numbers to responses.
         */
        function addHandler(type, handler) {
            let handlerWrap = (e) => {
                if (e.type != type) {
                    throw Error(`invariant violated`);
                }
                let callId = undefined;
                if (e.detail && e.detail.callId != undefined) {
                    callId = e.detail.callId;
                }
                let responder = (msg) => {
                    let fullMsg = Object.assign({}, msg, { callId });
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
            handlers.push({ type, listener: handlerWrap });
        }
        addHandler("taler-query-id", (msg, sendResponse) => {
            // FIXME: maybe include this info in taoer-probe?
            sendResponse({ id: chrome.runtime.id });
        });
        addHandler("taler-probe", (msg, sendResponse) => {
            sendResponse();
        });
        addHandler("taler-create-reserve", (msg) => {
            let params = {
                amount: JSON.stringify(msg.amount),
                callback_url: URI(msg.callback_url)
                    .absoluteTo(document.location.href),
                bank_url: document.location.href,
                wt_types: JSON.stringify(msg.wt_types),
            };
            let uri = URI(chrome.extension.getURL("/src/pages/confirm-create-reserve.html"));
            let redirectUrl = uri.query(params).href();
            window.location.href = redirectUrl;
        });
        addHandler("taler-confirm-reserve", (msg, sendResponse) => {
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
        addHandler("taler-confirm-contract", (msg) => __awaiter(this, void 0, void 0, function* () {
            if (!msg.contract_wrapper) {
                console.error("contract wrapper missing");
                return;
            }
            const offer = msg.contract_wrapper;
            if (!offer.contract) {
                console.error("contract field missing");
                return;
            }
            if (!offer.H_contract) {
                console.error("H_contract field missing");
                return;
            }
            let walletHashContractMsg = {
                type: "hash-contract",
                detail: { contract: offer.contract }
            };
            let contractHash = yield hashContract(offer.contract);
            if (contractHash != offer.H_contract) {
                console.error("merchant-supplied contract hash is wrong");
                return;
            }
            let resp = yield checkRepurchase(offer.contract);
            if (resp.error) {
                console.error("wallet backend error", resp);
                return;
            }
            if (resp.isRepurchase) {
                logVerbose && console.log("doing repurchase");
                console.assert(resp.existingFulfillmentUrl);
                console.assert(resp.existingContractHash);
                window.location.href = subst(resp.existingFulfillmentUrl, resp.existingContractHash);
            }
            else {
                let merchantName = "(unknown)";
                try {
                    merchantName = offer.contract.merchant.name;
                }
                catch (e) {
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
                yield putHistory(historyEntry);
                let offerId = yield saveOffer(offer);
                const uri = URI(chrome.extension.getURL("/src/pages/confirm-contract.html"));
                const params = {
                    offerId: offerId.toString(),
                };
                const target = uri.query(params).href();
                if (msg.replace_navigation === true) {
                    document.location.replace(target);
                }
                else {
                    document.location.href = target;
                }
            }
        }));
        addHandler("taler-payment-failed", (msg, sendResponse) => {
            const walletMsg = {
                type: "payment-failed",
                detail: {
                    contractHash: msg.H_contract
                },
            };
            chrome.runtime.sendMessage(walletMsg, (resp) => {
                sendResponse();
            });
        });
        addHandler("taler-payment-succeeded", (msg, sendResponse) => {
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
            });
        });
        addHandler("taler-get-payment", (msg, sendResponse) => {
            const walletMsg = {
                type: "execute-payment",
                detail: {
                    H_contract: msg.H_contract,
                },
            };
            chrome.runtime.sendMessage(walletMsg, (resp) => {
                if (resp.rateLimitExceeded) {
                    console.error("rate limit exceeded, check for redirect loops");
                }
                if (!resp.success) {
                    if (msg.offering_url) {
                        window.location.href = msg.offering_url;
                    }
                    else {
                        console.error("execute-payment failed", resp);
                    }
                    return;
                }
                let contract = resp.contract;
                if (!contract) {
                    throw Error("contract missing");
                }
                // We have the details for then payment, the merchant page
                // is responsible to give it to the merchant.
                sendResponse({
                    H_contract: msg.H_contract,
                    contract: resp.contract,
                    payment: resp.payReq,
                });
            });
        });
    }
})(TalerNotify || (TalerNotify = {}));
//# sourceMappingURL=notify.js.map