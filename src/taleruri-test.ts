/*
 This file is part of TALER
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import test from "ava";
import { parsePayUri, parseWithdrawUri } from "./taleruri";

test("taler pay url parsing: http(s)", (t) => {
  const url1 = "https://example.com/bar?spam=eggs";
  const r1 = parsePayUri(url1);
  if (!r1) {
    t.fail();
    return;
  }
  t.is(r1.downloadUrl, url1);
  t.is(r1.sessionId, undefined);
  const url2 = "http://example.com/bar?spam=eggs";
  const r2 = parsePayUri(url2);
  if (!r2) {
    t.fail();
    return;
  }
});


test("taler pay url parsing: wrong scheme", (t) => {
  const url1 = "talerfoo://";
  const r1 = parsePayUri(url1);
  t.is(r1, undefined);

  const url2 = "taler://refund/a/b/c/d/e/f";
  const r2 = parsePayUri(url1);
  t.is(r2, undefined);
});


test("taler pay url parsing: defaults", (t) => {
  const url1 = "taler://pay/example.com/-/-/myorder";
  const r1 = parsePayUri(url1);
  if (!r1) {
    t.fail();
    return;
  }
  t.is(r1.downloadUrl, "https://example.com/public/proposal?instance=default&order_id=myorder");
  t.is(r1.sessionId, undefined);

  const url2 = "taler://pay/example.com/-/-/myorder/mysession";
  const r2 = parsePayUri(url2);
  if (!r2) {
    t.fail();
    return;
  }
  t.is(r2.downloadUrl, "https://example.com/public/proposal?instance=default&order_id=myorder");
  t.is(r2.sessionId, "mysession");
});


test("taler pay url parsing: trailing parts", (t) => {
  const url1 = "taler://pay/example.com/-/-/myorder/mysession/spam/eggs";
  const r1 = parsePayUri(url1);
  if (!r1) {
    t.fail();
    return;
  }
  t.is(r1.downloadUrl, "https://example.com/public/proposal?instance=default&order_id=myorder");
  t.is(r1.sessionId, "mysession");
});

test("taler withdraw uri parsing", (t) => {
  const url1 = "taler://withdraw/bank.example.com/-/12345";
  const r1 = parseWithdrawUri(url1);
  if (!r1) {
    t.fail();
    return;
  }
  t.is(r1.statusUrl, "https://bank.example.com/api/withdraw-operation/12345");
});