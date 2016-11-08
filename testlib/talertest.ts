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

/**
 *
 * @author Florian Dold
 */

type TestFn = (t: TestLib) => void | Promise<void>;

interface Test {
  name: string;
  testFn: TestFn;
}

export interface TestLib {
  pass(msg?: string): void;
  fail(msg?: string): void;
  assert(v: any, msg?: string): void;
}

let tests: Test[] = [];
let testRunner: any;


/**
 * Register a test case.
 */
export function test(name: string, testFn: TestFn) {
  tests.push({name, testFn});
}


/**
 * Run all registered test case, producing a TAP stream.
 */
export async function run() {
  console.log(`1..${tests.length}`);
  for (let i in tests) {
    let t = tests[i];
    let passed = false;
    let lastMsg: string|undefined = undefined;
    let p = new Promise((resolve, reject) => {
      let pass = (msg?: string) => {
        if (passed) {
          reject(Error("called pass twice"));
          return;
        }
        passed = true;
        lastMsg = msg;
        resolve();
      };
      let fail = (msg?: string) => {
        lastMsg = msg;
        reject();
        throw Error("test failed");
      };
      let assert = (v: any, msg?: string) => {
        if (!v) {
          lastMsg = msg;
          reject();
          throw Error("test failed");
        }
      };
      // Test might return a promise.  If so, wait for it.
      let r = t.testFn({pass,fail, assert});
      r.then(() => resolve(), (e) => reject(e));
    });

    console.log(`# ${t.name}`);

    if (!lastMsg) {
      lastMsg = "-";
    }

    try {
      await p;
      if (passed) {
        throw Error("test did not call 'pass'");
      }
      console.log(`ok ${Number(i) + 1} ${lastMsg}`);
    } catch (e) {
      console.error(e);
      console.log(`not ok ${Number(i) + 1} ${lastMsg}`);
    }
  }
}
