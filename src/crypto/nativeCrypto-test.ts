/*
 This file is part of GNU Taler
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

/**
 * Imports
 */
import test from "ava";
import { encodeCrock, decodeCrock } from "./nativeCrypto";


test("encoding", (t) => {
  const utf8decoder = new TextDecoder("utf-8");
  const utf8encoder = new TextEncoder();
  const s = "Hello, World";
  const encStr = encodeCrock(utf8encoder.encode(s));
  const outBuf = decodeCrock(encStr);
  const sOut = utf8decoder.decode(outBuf);
  t.deepEqual(s, sOut);
});