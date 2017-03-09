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

const denomPubStr1 = "51R7ARKCD5HJTTV5F4G0M818E9SP280A40G2GVH04CR30G9R64VK6HHS6MW42DSN8MVKJGHK6WR3CGT18MWMCDSM75138E1K8S0MADSQ68W34DHH6MW4CHA270W4CG9J6GW48DHG8MVK4E9S7523GEA56H0K4E1Q891KCCSG752KGC1M88VMCDSQ6D23CHHG8H33AGHG6MSK8GT26CRKAC1M64V3JCJ56CVKCC228MWMCHA26MS30H1J8MVKEDHJ70TMADHK892KJC1H60TKJDHM710KGGT584T38H9K851KCDHG60W30HJ28CT4CC1G8CR3JGJ28H236DJ28H330H9S890M2D9S8S14AGA369344GA36S248CHS70RKEDSS6MWKGDJ26D136GT465348CSS8S232CHM6GS34C9N8CS3GD9H60W36H1R8MSK2GSQ8MSM6C9R70SKCHHN6MW3ACJ28N0K2CA58RS3GCA26MV42G9P891KAG9Q8N0KGD9M850KEHJ16S130CA27124AE1G852KJCHR6S1KGDSJ8RTKED1S8RR3CCHP68W4CH9Q6GT34GT18GS36EA46N24AGSP6933GCHM60VMAE1S8GV3EHHN74W3GC1J651KEH9N8MSK0CSG6S2KEEA460R32C1M8D144GSR6RWKEC218S0KEGJ4611KEEA36CSKJC2564TM4CSJ6H230E1N74TM8C1P61342CSG60WKCGHH64VK2G9S8CRKAHHK88W30HJ388R3CH1Q6X2K2DHK8GSM4D1Q74WM4HA461146H9S6D33JDJ26D234C9Q6923ECSS60RM6CT46CSKCH1M6S13EH9J8S33GCSN4CMGM81051JJ08SG64R30C1H4CMGM81054520A8A00";

test("rsa-encode", (t: TestLib) => {
  const pubHashStr = "JM63YM5X7X547164QJ3MGJZ4WDD47GEQR5DW5SH35G4JFZXEJBHE5JBNZM5K8XN5C4BRW25BE6GSVAYBF790G2BZZ13VW91D41S4DS0"
  let denomPub = native.RsaPublicKey.fromCrock(denomPubStr1);
  let pubHash = denomPub.encode().hash();
  t.assert(pubHashStr == pubHash.toCrock());
  t.pass();
});


test("withdraw-request", (t: TestLib) => {
  const reservePrivStr = "G9R8KRRCAFKPD0KW7PW48CC2T03VQ8K2AN9J6J6K2YW27J5MHN90";
  const reservePriv = native.EddsaPrivateKey.fromCrock(reservePrivStr);
  const reservePub = reservePriv.getPublicKey();
  const amountWithFee = new native.Amount({currency: "KUDOS", value: 1, fraction: 10000});
  amountWithFee.add(new native.Amount({currency: "KUDOS", value: 0, fraction: 20000}));
  const withdrawFee = new native.Amount({currency: "KUDOS", value: 0, fraction: 20000})
  const denomPub = native.RsaPublicKey.fromCrock(denomPubStr1);
  const ev = native.ByteArray.fromStringWithNull("hello, world");


  // Signature
  let withdrawRequest = new native.WithdrawRequestPS({
    reserve_pub: reservePub,
    amount_with_fee: amountWithFee.toNbo(),
    withdraw_fee: withdrawFee.toNbo(),
    h_denomination_pub: denomPub.encode().hash(),
    h_coin_envelope: ev.hash()
  });

  var sigStr = "AD3T8W44NV193J19RAN3NAJHPP6RVB0R3NWV7ZK5G8Q946YDK0B6F8YJBNRRBXSPVTKY31S7BVZPJFFTJJRMY61DH51X4JSXK677428";

  var sig = native.eddsaSign(withdrawRequest.toPurpose(), reservePriv);
  t.assert(native.eddsaVerify(native.SignaturePurpose.RESERVE_WITHDRAW, withdrawRequest.toPurpose(), sig, reservePub));
  t.assert(sig.toCrock() == sigStr);
  t.pass();
});

test("withdraw-request", (t: TestLib) => {
  const a1 = new native.Amount({currency: "KUDOS", value: 1, fraction: 50000000});
  const a2 = new native.Amount({currency: "KUDOS", value: 1, fraction: 50000000});
  a1.add(a2);
  let x = a1.toJson();
  t.assert(x.currency == "KUDOS");
  t.assert(x.fraction == 0);
  t.assert(x.value == 3);
  t.pass();
});
