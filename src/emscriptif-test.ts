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

test("signing", (t: TestLib) => {
  let x = native.ByteArray.fromStringWithNull("hello taler");
  let priv = native.EddsaPrivateKey.create();
  let pub = priv.getPublicKey();
  let purpose = new native.EccSignaturePurpose(native.SignaturePurpose.TEST, x);
  let sig = native.eddsaSign(purpose, priv);
  t.assert(native.eddsaVerify(native.SignaturePurpose.TEST, purpose, sig, pub));
  t.pass();
});

test("signing-fixed-data", (t: TestLib) => {
  let x = native.ByteArray.fromStringWithNull("hello taler");
  let purpose = new native.EccSignaturePurpose(native.SignaturePurpose.TEST, x);
  const privStr = "G9R8KRRCAFKPD0KW7PW48CC2T03VQ8K2AN9J6J6K2YW27J5MHN90";
  const pubStr = "YHCZB442FQFJ0ET20MWA8YJ53M61EZGJ6QKV1KTJZMRNXDY45WT0";
  const sigStr = "7V6XY4QGC1406GPMT305MZQ1HDCR7R0S5BP02GTGDQFPSXB6YD2YDN5ZS7NJQCNP61Y39MRHXNXQ1Z15JY4CJY4CPDA6CKQ3313WG38";
  let priv = native.EddsaPrivateKey.fromCrock(privStr);
  t.assert(privStr == priv.toCrock())
  let pub = priv.getPublicKey();
  t.assert(pubStr == pub.toCrock());
  let sig = native.EddsaSignature.fromCrock(sigStr);
  t.assert(sigStr == sig.toCrock())
  let sig2 = native.eddsaSign(purpose, priv);
  t.assert(sig.toCrock() == sig2.toCrock());
  t.assert(native.eddsaVerify(native.SignaturePurpose.TEST, purpose, sig, pub));
  t.pass();
});
