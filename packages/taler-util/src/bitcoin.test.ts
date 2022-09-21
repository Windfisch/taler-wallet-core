/*
 This file is part of GNU Taler
 (C) 2018-2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Type-safe codecs for converting from/to JSON.
 */

import test from "ava";
import { generateFakeSegwitAddress } from "./bitcoin.js";

test("generate testnet", (t) => {
  const [addr1, addr2] = generateFakeSegwitAddress(
    "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XSG",
    "tb1qhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );

  t.assert(addr1 === "tb1qtfwqwaj6tsrhdtvuyhflr6nklm8ldqxpf0lfjw");
  t.assert(addr2 === "tb1qmfwqwa5vr5vdac6wr20ts76aewakzpmns40yuf");
});

test("generate mainnet", (t) => {
  const [addr1, addr2] = generateFakeSegwitAddress(
    "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XSG",
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  );
  //bc
  t.assert(addr1 === "bc1qtfwqwaj6tsrhdtvuyhflr6nklm8ldqxprfy6fa");
  t.assert(addr2 === "bc1qmfwqwa5vr5vdac6wr20ts76aewakzpmn6n5h86");
});

test("generate Regtest", (t) => {
  const [addr1, addr2] = generateFakeSegwitAddress(
    "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XSG",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );

  t.assert(addr1 === "bcrt1qtfwqwaj6tsrhdtvuyhflr6nklm8ldqxptxxy98");
  t.assert(addr2 === "bcrt1qmfwqwa5vr5vdac6wr20ts76aewakzpmnjukftq");
});

test("unknown net", (t) => {
  t.throws(() => {
    generateFakeSegwitAddress(
      "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XSG",
      "abqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
    );
  });
});

test("invalid or no reserve", (t) => {
  let result = undefined;
  // empty
  result = generateFakeSegwitAddress(
    "",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  // small
  result = generateFakeSegwitAddress(
    "s",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  result = generateFakeSegwitAddress(
    "asdsad",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  result = generateFakeSegwitAddress(
    "asdasdasdasdasdasd",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  result = generateFakeSegwitAddress(
    "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XS",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  result = generateFakeSegwitAddress(
    "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XSSSS",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  // no reserve
  result = generateFakeSegwitAddress(
    undefined,
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
  result = generateFakeSegwitAddress(
    "B9E0EXNDKGJX7WFAEVZCZXM0R661T66YWD71N7NRFDEWQEV10XS-",
    "bcrtqhxrhccqexg0dv4nltgkuw4fg2ce7muplmjsn0v",
  );
  t.deepEqual(result, []);
});
