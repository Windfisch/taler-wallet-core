/*
 This file is part of TALER
 (C) 2016 Inria

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
let tests = [];
let testRunner;
/**
 * Register a test case.
 */
function test(name, testFn) {
    tests.push({ name, testFn });
}
exports.test = test;
/**
 * Run all registered test case, producing a TAP stream.
 */
function run(statusCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`1..${tests.length}`);
        for (let i in tests) {
            let t = tests[i];
            let passed = false;
            let lastMsg = undefined;
            let p = new Promise((resolve, reject) => {
                let pass = (msg) => {
                    if (passed) {
                        let e = Error("test passed twice");
                        reject(e);
                        throw e;
                    }
                    passed = true;
                    lastMsg = msg;
                    resolve();
                };
                let fail = (msg) => {
                    lastMsg = msg;
                    let e = Error("test failed");
                    reject(e);
                    throw e;
                };
                let assert = (v, msg) => {
                    if (!v) {
                        lastMsg = msg;
                        reject(Error("test failed"));
                        return;
                    }
                };
                let assertEqualsStrict = (v1, v2, msg) => {
                    if (v1 !== v2) {
                        console.log(`# expected: ${v1}`);
                        console.log(`# actual: ${v2}`);
                        lastMsg = msg;
                        let e = Error("test failed");
                        reject(e);
                        throw e;
                    }
                };
                // Test might return a promise.  If so, wait for it.
                let r = t.testFn({ pass, fail, assert, assertEqualsStrict });
                if (r) {
                    r.then(() => pass(), (e) => fail(e.toString()));
                }
            });
            console.log(`# ${t.name}`);
            statusCallback && statusCallback(`starting test ${t.name}`);
            if (!lastMsg) {
                lastMsg = "-";
            }
            try {
                yield p;
                if (!passed) {
                    throw Error("test did not call 'pass'");
                }
                console.log(`ok ${Number(i) + 1} ${lastMsg || "-"}`);
                statusCallback && statusCallback(`finished test ${t.name}`);
            }
            catch (e) {
                try {
                    console.error(e.stack);
                }
                catch (e2) {
                    console.error(e);
                }
                console.log(`not ok ${Number(i) + 1} ${lastMsg || "-"}`);
                statusCallback && statusCallback(`failed test ${t.name}`);
            }
        }
    });
}
exports.run = run;
