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
System.register(["../lib/wallet/helpers", "../lib/wallet/types", "mithril", "../lib/wallet/wxApi"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var helpers_1, types_1, mithril_1, types_2, wxApi_1;
    var DelayTimer, Controller;
    function view(ctrl) {
        var controls = [];
        var mx = function (x) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            return controls.push(mithril_1.default.apply(void 0, [x].concat(args)));
        };
        mx("p", (_a = ["The bank wants to create a reserve over ", "."], _a.raw = ["The bank wants to create a reserve over ", "."], i18n(_a, helpers_1.amountToPretty(ctrl.amount))));
        mx("input", {
            className: "url",
            type: "text",
            spellcheck: false,
            value: ctrl.url(),
            oninput: mithril_1.default.withAttr("value", ctrl.onUrlChanged.bind(ctrl)),
        });
        mx("button", {
            onclick: function () { return ctrl.confirmReserve(ctrl.url(), ctrl.amount, ctrl.callbackUrl); },
            disabled: !ctrl.isValidMint
        }, "Confirm mint selection");
        if (ctrl.statusString) {
            mx("p", ctrl.statusString);
        }
        else {
            mx("p", "Checking URL, please wait ...");
        }
        if (ctrl.reserveCreationInfo) {
            var totalCost = types_2.Amounts.add(ctrl.reserveCreationInfo.overhead, ctrl.reserveCreationInfo.withdrawFee).amount;
            mx("p", "Withdraw cost: " + helpers_1.amountToPretty(totalCost));
            if (ctrl.detailCollapsed()) {
                mx("button.linky", {
                    onclick: function () {
                        ctrl.detailCollapsed(false);
                    }
                }, "show more details");
            }
            else {
                mx("button.linky", {
                    onclick: function () {
                        ctrl.detailCollapsed(true);
                    }
                }, "hide details");
                mx("div", {}, renderReserveCreationDetails(ctrl.reserveCreationInfo));
            }
        }
        return mithril_1.default("div", controls);
        var _a;
    }
    function renderReserveCreationDetails(rci) {
        var denoms = rci.selectedDenoms;
        function row(denom) {
            return mithril_1.default("tr", [
                mithril_1.default("td", denom.pub_hash.substr(0, 5) + "..."),
                mithril_1.default("td", helpers_1.amountToPretty(denom.value)),
                mithril_1.default("td", helpers_1.amountToPretty(denom.fee_withdraw)),
                mithril_1.default("td", helpers_1.amountToPretty(denom.fee_refresh)),
                mithril_1.default("td", helpers_1.amountToPretty(denom.fee_deposit)),
            ]);
        }
        var withdrawFeeStr = helpers_1.amountToPretty(rci.withdrawFee);
        var overheadStr = helpers_1.amountToPretty(rci.overhead);
        return [
            mithril_1.default("p", "Fee for withdrawal: " + withdrawFeeStr),
            mithril_1.default("p", "Overhead: " + overheadStr),
            mithril_1.default("table", [
                mithril_1.default("tr", [
                    mithril_1.default("th", "Key Hash"),
                    mithril_1.default("th", "Value"),
                    mithril_1.default("th", "Withdraw Fee"),
                    mithril_1.default("th", "Refresh Fee"),
                    mithril_1.default("th", "Deposit Fee"),
                ]),
                denoms.map(row)
            ])
        ];
    }
    function probeMint(mintBaseUrl) {
        throw Error("not implemented");
    }
    function getSuggestedMint(currency) {
        // TODO: make this request go to the wallet backend
        // Right now, this is a stub.
        var defaultMint = {
            "KUDOS": "http://mint.demo.taler.net",
            "PUDOS": "http://mint.test.taler.net",
        };
        var mint = defaultMint[currency];
        if (!mint) {
            mint = "";
        }
        return Promise.resolve(mint);
    }
    function main() {
        var url = URI(document.location.href);
        var query = URI.parseQuery(url.query());
        var amount = types_1.AmountJson.checked(JSON.parse(query.amount));
        var callback_url = query.callback_url;
        var bank_url = query.bank_url;
        getSuggestedMint(amount.currency)
            .then(function (suggestedMintUrl) {
            var controller = function () { return new Controller(suggestedMintUrl, amount, callback_url); };
            var MintSelection = { controller: controller, view: view };
            mithril_1.default.mount(document.getElementById("mint-selection"), MintSelection);
        })
            .catch(function (e) {
            // TODO: provide more context information, maybe factor it out into a
            // TODO:generic error reporting function or component.
            document.body.innerText = "Fatal error: \"" + e.message + "\".";
            console.error("got backend error \"" + e.message + "\"");
        });
    }
    exports_1("main", main);
    return {
        setters:[
            function (helpers_1_1) {
                helpers_1 = helpers_1_1;
            },
            function (types_1_1) {
                types_1 = types_1_1;
                types_2 = types_1_1;
            },
            function (mithril_1_1) {
                mithril_1 = mithril_1_1;
            },
            function (wxApi_1_1) {
                wxApi_1 = wxApi_1_1;
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
                    this.stop();
                    var handler = function () {
                        _this.f();
                    };
                    this.timerId = window.setTimeout(handler, this.ms);
                };
                DelayTimer.prototype.stop = function () {
                    if (this.timerId !== null) {
                        window.clearTimeout(this.timerId);
                    }
                };
                return DelayTimer;
            }());
            Controller = (function () {
                function Controller(initialMintUrl, amount, callbackUrl) {
                    var _this = this;
                    this.url = mithril_1.default.prop();
                    this.statusString = null;
                    this.isValidMint = false;
                    this.reserveCreationInfo = null;
                    this.detailCollapsed = mithril_1.default.prop(true);
                    console.log("creating main controller");
                    this.amount = amount;
                    this.callbackUrl = callbackUrl;
                    this.timer = new DelayTimer(800, function () { return _this.update(); });
                    this.url(initialMintUrl);
                    this.update();
                }
                Controller.prototype.update = function () {
                    var _this = this;
                    this.timer.stop();
                    var doUpdate = function () {
                        if (!_this.url()) {
                            _this.statusString = (_a = ["Please enter a URL"], _a.raw = ["Please enter a URL"], i18n(_a));
                            return;
                        }
                        _this.statusString = null;
                        var parsedUrl = URI(_this.url());
                        if (parsedUrl.is("relative")) {
                            _this.statusString = (_b = ["The URL you've entered is not valid (must be absolute)"], _b.raw = ["The URL you've entered is not valid (must be absolute)"], i18n(_b));
                            return;
                        }
                        mithril_1.default.redraw(true);
                        console.log("doing get mint info");
                        wxApi_1.getReserveCreationInfo(_this.url(), _this.amount)
                            .then(function (r) {
                            console.log("get mint info resolved");
                            _this.isValidMint = true;
                            _this.reserveCreationInfo = r;
                            console.dir(r);
                            _this.statusString = "The mint base URL is valid!";
                            mithril_1.default.endComputation();
                        })
                            .catch(function (e) {
                            console.log("get mint info rejected");
                            if (e.hasOwnProperty("httpStatus")) {
                                _this.statusString = "request failed with status " + _this.request.status;
                            }
                            else {
                                _this.statusString = "unknown request error";
                            }
                            mithril_1.default.endComputation();
                        });
                        var _a, _b;
                    };
                    doUpdate();
                    console.log("got update");
                };
                Controller.prototype.reset = function () {
                    this.isValidMint = false;
                    this.statusString = null;
                    this.reserveCreationInfo = null;
                    if (this.request) {
                        this.request.abort();
                        this.request = null;
                    }
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
                            _this.statusString = ("Oops, something went wrong." +
                                ("The wallet responded with error status (" + rawResp.error + ")."));
                        }
                    };
                    chrome.runtime.sendMessage({ type: 'create-reserve', detail: d }, cb);
                };
                Controller.prototype.onUrlChanged = function (url) {
                    this.reset();
                    this.url(url);
                    this.timer.bump();
                };
                return Controller;
            }());
        }
    }
});
//# sourceMappingURL=confirm-create-reserve.js.map