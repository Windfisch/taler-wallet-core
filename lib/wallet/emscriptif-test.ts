import {test, TestLib} from "testlib/talertest";
import * as native from "./emscriptif";

test("string hashing", (t: TestLib) => {
  let x = native.ByteArray.fromStringWithNull("hello taler");
  let h = "8RDMADB3YNF3QZBS3V467YZVJAMC2QAQX0TZGVZ6Q5PFRRAJFT70HHN0QF661QR9QWKYMMC7YEMPD679D2RADXCYK8Y669A2A5MKQFR"
  let hc = x.hash().toCrock();
  console.log(`# hc ${hc}`);
  t.assert(h === hc, "must equal");
  t.pass();
});
