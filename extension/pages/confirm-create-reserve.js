/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */
System.register(["../lib/wallet/helpers", "../lib/wallet/types"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var helpers_1, types_1;
    var DelayTimer, Controller;
    function main() {
        var url = URI(document.location.href);
        var query = URI.parseQuery(url.query());
        var amount = types_1.AmountJson.checked(JSON.parse(query.amount));
        var callback_url = query.callback_url;
        var MintSelection = {
            controller: function () { return new Controller(); },
            view: function (ctrl) {
                var controls = [];
                var mx = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return controls.push(m.apply(void 0, args));
                };
                mx("p", (_a = ["The bank wants to create a reserve over ", "."], _a.raw = ["The bank wants to create a reserve over ", "."], i18n(_a, helpers_1.amountToPretty(amount))));
                mx("input.url", {
                    type: "text",
                    spellcheck: false,
                    oninput: m.withAttr("value", ctrl.onUrlChanged.bind(ctrl)),
                });
                if (ctrl.isValidMint) {
                    mx("button", {
                        onclick: function () { return ctrl.confirmReserve(ctrl.url, amount, callback_url); }
                    }, "Confirm mint selection");
                }
                if (ctrl.errorString) {
                    mx("p", ctrl.errorString);
                }
                return m("div", controls);
                var _a;
            }
        };
        m.mount(document.getElementById("mint-selection"), MintSelection);
    }
    exports_1("main", main);
    return {
        setters:[
            function (helpers_1_1) {
                helpers_1 = helpers_1_1;
            },
            function (types_1_1) {
                types_1 = types_1_1;
            }],
        execute: function() {
            "use strict";
            /**
             * Execute something after a delay, with the possibility
             * to reset the delay.
             */
            DelayTimer = (function () {
                function DelayTimer(ms, f) {
                    this.timerId = null;
                    this.f = f;
                    this.ms = ms;
                }
                DelayTimer.prototype.bump = function () {
                    var _this = this;
                    if (this.timerId !== null) {
                        window.clearTimeout(this.timerId);
                    }
                    var handler = function () {
                        _this.f();
                    };
                    this.timerId = window.setTimeout(handler, this.ms);
                };
                return DelayTimer;
            }());
            Controller = (function () {
                function Controller() {
                    var _this = this;
                    this.url = null;
                    this.errorString = null;
                    this.isValidMint = false;
                    this.update();
                    this.timer = new DelayTimer(800, function () { return _this.update(); });
                }
                Controller.prototype.update = function () {
                    var _this = this;
                    var doUpdate = function () {
                        if (!_this.url) {
                            _this.errorString = (_a = ["Please enter a URL"], _a.raw = ["Please enter a URL"], i18n(_a));
                            return;
                        }
                        _this.errorString = null;
                        var parsedUrl = URI(_this.url);
                        if (parsedUrl.is("relative")) {
                            _this.errorString = (_b = ["The URL you've entered is not valid (must be absolute)"], _b.raw = ["The URL you've entered is not valid (must be absolute)"], i18n(_b));
                            return;
                        }
                        var keysUrl = URI("/keys").absoluteTo(helpers_1.canonicalizeBaseUrl(_this.url));
                        console.log("requesting keys from '" + keysUrl + "'");
                        _this.request = new XMLHttpRequest();
                        _this.request.onreadystatechange = function () {
                            if (_this.request.readyState == XMLHttpRequest.DONE) {
                                switch (_this.request.status) {
                                    case 200:
                                        _this.isValidMint = true;
                                        break;
                                    case 0:
                                        _this.errorString = "unknown request error";
                                        break;
                                    default:
                                        _this.errorString = "request failed with status " + _this.request.status;
                                        break;
                                }
                                m.redraw();
                            }
                        };
                        _this.request.open("get", keysUrl.href());
                        _this.request.send();
                        var _a, _b;
                    };
                    doUpdate();
                    m.redraw();
                    console.log("got update");
                };
                Controller.prototype.reset = function () {
                    this.isValidMint = false;
                    this.errorString = null;
                    if (this.request) {
                        this.request.abort();
                        this.request = null;
                    }
                    m.redraw();
                };
                Controller.prototype.confirmReserve = function (mint, amount, callback_url) {
                    var _this = this;
                    var d = { mint: mint, amount: amount };
                    var cb = function (rawResp) {
                        if (!rawResp) {
                            throw Error("empty response");
                        }
                        if (!rawResp.error) {
                            var resp = types_1.CreateReserveResponse.checked(rawResp);
                            var q = {
                                mint: resp.mint,
                                reserve_pub: resp.reservePub,
                                amount_value: amount.value,
                                amount_fraction: amount.fraction,
                                amount_currency: amount.currency,
                            };
                            var url = URI(callback_url).addQuery(q);
                            if (!url.is("absolute")) {
                                throw Error("callback url is not absolute");
                            }
                            console.log("going to", url.href());
                            document.location.href = url.href();
                        }
                        else {
                            _this.reset();
                            _this.errorString = ("Oops, something went wrong." +
                                ("The wallet responded with error status (" + rawResp.error + ")."));
                        }
                    };
                    chrome.runtime.sendMessage({ type: 'create-reserve', detail: d }, cb);
                };
                Controller.prototype.onUrlChanged = function (url) {
                    this.reset();
                    this.url = url;
                    this.timer.bump();
                };
                return Controller;
            }());
        }
    }
});
//# sourceMappingURL=confirm-create-reserve.js.map