import {CryptoApi} from "./cryptoApi";
import {test, TestLib} from "testlib/talertest";

test("string hashing bla", async (t: TestLib) => {
  let crypto = new CryptoApi();
  let s = await crypto.hashString("hello taler");
  console.log(s);
  t.pass();
});
