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
import { stringCodec, objectCodec } from "./codec";

interface MyObj {
  foo: string;
}

test("basic codec", (t) => {
  const myObjCodec = objectCodec<MyObj>().property("foo", stringCodec).build("MyObj");
  const res = myObjCodec.decode({ foo: "hello" });
  t.assert(res.foo === "hello");

  t.throws(() => {
    const res2 = myObjCodec.decode({ foo: 123 });
  });
});
