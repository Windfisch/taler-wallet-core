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
import { clk } from "./clk.js";

test("bla", (t) => {
  const prog = clk.program("foo", {
    help: "Hello",
  });

  let success = false;

  prog.maybeOption("opt1", ["-o", "--opt1"], clk.INT).action((args) => {
    success = true;
    t.deepEqual(args.foo.opt1, 42);
  });

  prog.run(["bla", "-o", "42"]);

  t.true(success);
});
