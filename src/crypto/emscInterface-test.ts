/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

// tslint:disable:max-line-length

import test from "ava";
import { NodeEmscriptenLoader } from "./nodeEmscriptenLoader";
import * as native from "./emscInterface";


test("string hashing", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const x = native.ByteArray.fromStringWithNull(emsc, "hello taler");
  const h = "8RDMADB3YNF3QZBS3V467YZVJAMC2QAQX0TZGVZ6Q5PFRRAJFT70HHN0QF661QR9QWKYMMC7YEMPD679D2RADXCYK8Y669A2A5MKQFR";
  const hc = x.hash().toCrock();
  console.log(`# hc ${hc}`);
  t.true(h === hc, "must equal");
  t.pass();
});


test("signing", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const x = native.ByteArray.fromStringWithNull(emsc, "hello taler");
  const priv = native.EddsaPrivateKey.create(emsc, );
  const pub = priv.getPublicKey();
  const purpose = new native.EccSignaturePurpose(emsc, native.SignaturePurpose.TEST, x);
  const sig = native.eddsaSign(purpose, priv);
  t.true(native.eddsaVerify(native.SignaturePurpose.TEST, purpose, sig, pub));
  t.pass();
});


test("signing-fixed-data", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const x = native.ByteArray.fromStringWithNull(emsc, "hello taler");
  const purpose = new native.EccSignaturePurpose(emsc, native.SignaturePurpose.TEST, x);
  const privStr = "G9R8KRRCAFKPD0KW7PW48CC2T03VQ8K2AN9J6J6K2YW27J5MHN90";
  const pubStr = "YHCZB442FQFJ0ET20MWA8YJ53M61EZGJ6QKV1KTJZMRNXDY45WT0";
  const sigStr = "7V6XY4QGC1406GPMT305MZQ1HDCR7R0S5BP02GTGDQFPSXB6YD2YDN5ZS7NJQCNP61Y39MRHXNXQ1Z15JY4CJY4CPDA6CKQ3313WG38";
  const priv = native.EddsaPrivateKey.fromCrock(emsc, privStr);
  t.true(privStr === priv.toCrock());
  const pub = priv.getPublicKey();
  t.true(pubStr === pub.toCrock());
  const sig = native.EddsaSignature.fromCrock(emsc, sigStr);
  t.true(sigStr === sig.toCrock());
  const sig2 = native.eddsaSign(purpose, priv);
  t.true(sig.toCrock() === sig2.toCrock());
  t.true(native.eddsaVerify(native.SignaturePurpose.TEST, purpose, sig, pub));
  t.pass();
});


const denomPubStr1 = "51R7ARKCD5HJTTV5F4G0M818E9SP280A40G2GVH04CR30G9R64VK6HHS6MW42DSN8MVKJGHK6WR3CGT18MWMCDSM75138E1K8S0MADSQ68W34DHH6MW4CHA270W4CG9J6GW48DHG8MVK4E9S7523GEA56H0K4E1Q891KCCSG752KGC1M88VMCDSQ6D23CHHG8H33AGHG6MSK8GT26CRKAC1M64V3JCJ56CVKCC228MWMCHA26MS30H1J8MVKEDHJ70TMADHK892KJC1H60TKJDHM710KGGT584T38H9K851KCDHG60W30HJ28CT4CC1G8CR3JGJ28H236DJ28H330H9S890M2D9S8S14AGA369344GA36S248CHS70RKEDSS6MWKGDJ26D136GT465348CSS8S232CHM6GS34C9N8CS3GD9H60W36H1R8MSK2GSQ8MSM6C9R70SKCHHN6MW3ACJ28N0K2CA58RS3GCA26MV42G9P891KAG9Q8N0KGD9M850KEHJ16S130CA27124AE1G852KJCHR6S1KGDSJ8RTKED1S8RR3CCHP68W4CH9Q6GT34GT18GS36EA46N24AGSP6933GCHM60VMAE1S8GV3EHHN74W3GC1J651KEH9N8MSK0CSG6S2KEEA460R32C1M8D144GSR6RWKEC218S0KEGJ4611KEEA36CSKJC2564TM4CSJ6H230E1N74TM8C1P61342CSG60WKCGHH64VK2G9S8CRKAHHK88W30HJ388R3CH1Q6X2K2DHK8GSM4D1Q74WM4HA461146H9S6D33JDJ26D234C9Q6923ECSS60RM6CT46CSKCH1M6S13EH9J8S33GCSN4CMGM81051JJ08SG64R30C1H4CMGM81054520A8A00";


test("rsa-encode", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const pubHashStr = "JM63YM5X7X547164QJ3MGJZ4WDD47GEQR5DW5SH35G4JFZXEJBHE5JBNZM5K8XN5C4BRW25BE6GSVAYBF790G2BZZ13VW91D41S4DS0";
  const denomPub = native.RsaPublicKey.fromCrock(emsc, denomPubStr1);
  const pubHash = denomPub.encode().hash();
  t.true(pubHashStr === pubHash.toCrock());
  t.pass();
});


test("withdraw-request", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const reservePrivStr = "G9R8KRRCAFKPD0KW7PW48CC2T03VQ8K2AN9J6J6K2YW27J5MHN90";
  const reservePriv = native.EddsaPrivateKey.fromCrock(emsc, reservePrivStr);
  const reservePub = reservePriv.getPublicKey();
  const amountWithFee = new native.Amount(emsc, {currency: "KUDOS", value: 1, fraction: 10000});
  amountWithFee.add(new native.Amount(emsc, {currency: "KUDOS", value: 0, fraction: 20000}));
  const withdrawFee = new native.Amount(emsc, {currency: "KUDOS", value: 0, fraction: 20000});
  const denomPub = native.RsaPublicKey.fromCrock(emsc, denomPubStr1);
  const ev = native.ByteArray.fromStringWithNull(emsc, "hello, world");

  // Signature
  const withdrawRequest = new native.WithdrawRequestPS(emsc, {
    amount_with_fee: amountWithFee.toNbo(),
    h_coin_envelope: ev.hash(),
    h_denomination_pub: denomPub.encode().hash(),
    reserve_pub: reservePub,
    withdraw_fee: withdrawFee.toNbo(),
  });

  const sigStr = "AD3T8W44NV193J19RAN3NAJHPP6RVB0R3NWV7ZK5G8Q946YDK0B6F8YJBNRRBXSPVTKY31S7BVZPJFFTJJRMY61DH51X4JSXK677428";

  const sig = native.eddsaSign(withdrawRequest.toPurpose(), reservePriv);
  t.true(native.eddsaVerify(native.SignaturePurpose.RESERVE_WITHDRAW, withdrawRequest.toPurpose(), sig, reservePub));
  t.true(sig.toCrock() === sigStr);
  t.pass();
});


test("currency-conversion", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const a1 = new native.Amount(emsc, {currency: "KUDOS", value: 1, fraction: 50000000});
  const a2 = new native.Amount(emsc, {currency: "KUDOS", value: 1, fraction: 50000000});
  a1.add(a2);
  const x = a1.toJson();
  t.true(x.currency === "KUDOS");
  t.true(x.fraction === 0);
  t.true(x.value === 3);
  t.pass();
});


test("ecdsa", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const priv = native.EcdsaPrivateKey.create(emsc);
  const pub1 = priv.getPublicKey();
  t.truthy(priv);
  t.truthy(pub1);
  t.pass();
});


test("ecdhe", async (t) => {
  const loader =  new NodeEmscriptenLoader();
  const emsc = await loader.getEmscriptenEnvironment();

  const priv = native.EcdhePrivateKey.create(emsc);
  const pub = priv.getPublicKey();
  t.truthy(priv);
  t.truthy(pub);
  t.pass();
});
