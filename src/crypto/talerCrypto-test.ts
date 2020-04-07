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
import {
  encodeCrock,
  decodeCrock,
  ecdheGetPublic,
  eddsaGetPublic,
  keyExchangeEddsaEcdhe,
  keyExchangeEcdheEddsa,
  rsaBlind,
  rsaUnblind,
  rsaVerify,
} from "./talerCrypto";
import { sha512, kdf } from "./primitives/kdf";
import * as nacl from "./primitives/nacl-fast";

test("encoding", (t) => {
  const utf8decoder = new TextDecoder("utf-8");
  const utf8encoder = new TextEncoder();
  const s = "Hello, World";
  const encStr = encodeCrock(utf8encoder.encode(s));
  const outBuf = decodeCrock(encStr);
  const sOut = utf8decoder.decode(outBuf);
  t.deepEqual(s, sOut);
});

test("taler-exchange-tvg hash code", (t) => {
  const input = "91JPRV3F5GG4EKJN41A62V35E8";
  const output =
    "CW96WR74JS8T53EC8GKSGD49QKH4ZNFTZXDAWMMV5GJ1E4BM6B8GPN5NVHDJ8ZVXNCW7Q4WBYCV61HCA3PZC2YJD850DT29RHHN7ESR";

  const myOutput = encodeCrock(sha512(decodeCrock(input)));

  t.deepEqual(myOutput, output);
});

test("taler-exchange-tvg ecdhe key", (t) => {
  const priv1 = "X4T4N0M8PVQXQEBW2BA7049KFSM7J437NSDFC6GDNM3N5J9367A0";
  const pub1 = "M997P494MS6A95G1P0QYWW2VNPSHSX5Q6JBY5B9YMNYWP0B50X3G";
  const priv2 = "14A0MMQ64DCV8HE0CS3WBC9DHFJAHXRGV7NEARFJPC5R5E1697E0";
  const skm =
    "NXRY2YCY7H9B6KM928ZD55WG964G59YR0CPX041DYXKBZZ85SAWNPQ8B30QRM5FMHYCXJAN0EAADJYWEF1X3PAC2AJN28626TR5A6AR";

  const myPub1 = nacl.scalarMult_base(decodeCrock(priv1));
  t.deepEqual(encodeCrock(myPub1), pub1);

  const mySkm = nacl.hash(
    nacl.scalarMult(decodeCrock(priv2), decodeCrock(pub1)),
  );
  t.deepEqual(encodeCrock(mySkm), skm);
});

test("taler-exchange-tvg eddsa key", (t) => {
  const priv = "9TM70AKDTS57AWY9JK2J4TMBTMW6K62WHHGZWYDG0VM5ABPZKD40";
  const pub = "8GSJZ649T2PXMKZC01Y4ANNBE7MF14QVK9SQEC4E46ZHKCVG8AS0";

  const pair = nacl.sign_keyPair_fromSeed(decodeCrock(priv));
  t.deepEqual(encodeCrock(pair.publicKey), pub);
});

test("taler-exchange-tvg kdf", (t) => {
  const salt = "94KPT83PCNS7J83KC5P78Y8";
  const ikm = "94KPT83MD1JJ0WV5CDS6AX10D5Q70XBM41NPAY90DNGQ8SBJD5GPR";
  const ctx =
    "94KPT83141HPYVKMCNW78833D1TPWTSC41GPRWVF41NPWVVQDRG62WS04XMPWSKF4WG6JVH0EHM6A82J8S1G";
  const outLen = 64;
  const out =
    "GTMR4QT05Z9WF5HKVG0WK9RPXGHSMHJNW377G9GJXCA8B0FEKPF4D27RJMSJZYWSQNTBJ5EYVV7ZW18B48Z0JVJJ80RHB706Y96Q358";

  const myOut = kdf(
    outLen,
    decodeCrock(ikm),
    decodeCrock(salt),
    decodeCrock(ctx),
  );

  t.deepEqual(encodeCrock(myOut), out);
});

test("taler-exchange-tvg eddsa_ecdh", (t) => {
  const priv_ecdhe = "4AFZWMSGTVCHZPQ0R81NWXDCK4N58G7SDBBE5KXE080Y50370JJG";
  const pub_ecdhe = "FXFN5GPAFTKVPWJDPVXQ87167S8T82T5ZV8CDYC0NH2AE14X0M30";
  const priv_eddsa = "1KG54M8T3X8BSFSZXCR3SQBSR7Y9P53NX61M864S7TEVMJ2XVPF0";
  const pub_eddsa = "7BXWKG6N224C57RTDV8XEAHR108HG78NMA995BE8QAT5GC1S7E80";
  const key_material =
    "PKZ42Z56SVK2796HG1QYBRJ6ZQM2T9QGA3JA4AAZ8G7CWK9FPX175Q9JE5P0ZAX3HWWPHAQV4DPCK10R9X3SAXHRV0WF06BHEC2ZTKR";

  const myEcdhePub = ecdheGetPublic(decodeCrock(priv_ecdhe));
  t.deepEqual(encodeCrock(myEcdhePub), pub_ecdhe);

  const myEddsaPub = eddsaGetPublic(decodeCrock(priv_eddsa));
  t.deepEqual(encodeCrock(myEddsaPub), pub_eddsa);

  const myKm1 = keyExchangeEddsaEcdhe(
    decodeCrock(priv_eddsa),
    decodeCrock(pub_ecdhe),
  );
  t.deepEqual(encodeCrock(myKm1), key_material);

  const myKm2 = keyExchangeEcdheEddsa(
    decodeCrock(priv_ecdhe),
    decodeCrock(pub_eddsa),
  );
  t.deepEqual(encodeCrock(myKm2), key_material);
});

test("taler-exchange-tvg blind signing", (t) => {
  const messageHash =
    "TT1R28D79EJEJ9PC35AQS35CCG85DSXSZ508MV2HS2FN4ME6AHESZX5WP485R8A75KG53FN6F1YNW95008663TKAPWB81420VG17BY8";
  const rsaPublicKey =
    "040000Y62RSDDKZXTE7GDVA302ZZR0DY224RSDT6WDWR1XGT8E3YG80XV6TMT3ZCNP8XC84W0N6MSZ0EF8S3YB1JJ2AXY9JQZW3MCA0CG38ER4YE2RY4Q2666DEZSNKT29V6CKZVCDHXSAKY8W6RPEKEQ5YSBYQK23MRK3CQTNNJXQFDKEMRHEC5Y6RDHAC5RJCV8JJ8BF18VPKZ2Q7BB14YN1HJ22H8EZGW0RDGG9YPEWA9183BHEQ651PP81J514TJ9K8DH23AJ50SZFNS429HQ390VRP5E4MQ7RK7ZJXXTSZAQSRTC0QF28P23PD37C17QFQB0BBC54MB8MDH7RW104STG6VN0J22P39JP4EXPVGK5D9AX5W869MDQ6SRD42ZYK5H20227Q8CCWSQ6C3132WP0F0H04002";
  const bks = "7QD31RPJH0W306RJWBRG646Z2FTA1F89BKSXPDAG7YM0N5Z0B610";
  const bm =
    "GA8PC6YH9VF5MW6P2DKTV0W0ZTQ24DZ9EAN5QH3SQXRH7SCZHFMM21ZY05F0BS7MFW8TSEP4SEB280BYP5ACHNQWGE10PCXDDMK7ECXJDPHJ224JBCV4KYNWG6NBR3SC9HK8FXVFX55GFBJFNQHNZGEB8DB0KN9MSVYFDXN45KPMSNY03FVX0JZ0R3YG9XQ8XVGB5SYZCF0QSHWH61MT0Q10CZD2V114BT64D3GD86EJ5S9WBMYG51SDN5CSKEJ734YAJ4HCEWW0RDN8GXA9ZMA18SKVW8T3TTBCPJRF2Y77JGQ08GF35SYGA2HWFV1HGVS8RCTER6GB9SZHRG4T7919H9C1KFAP50G2KSV6X42D6KNJANNSGKQH649TJ00YJQXPHPNFBSS198RY2C243D4B4W";
  const bs =
    "5VW0MS5PRBA3W8TPATSTDA2YRFQM1Z7F2DWKQ8ATMZYYY768Q3STZ3HGNVYQ6JB5NKP80G5HGE58616FPA70SX9PTW7EN8EJ23E26FASBWZBP8E2RWQQ5E0F72B2PWRP5ZCA2J3AB3F6P86XK4PZYT64RF94MDGHY0GSDSSBH5YSFB3VM0KVXA52H2Y2G9S85AVCSD3BTMHQRF5BJJ8JE00T4GK70PSTVCGMRKRNA7DGW7GD2F35W55AXF7R2YJC8PAGNSJYWKC3PC75A5N8H69K299AK5PM3CDDHNS4BMRNGF7K49CR4ZBFRXDAWMB3X6T05Q4NKSG0F1KP5JA0XBMF2YJK7KEPRD1EWCHJE44T9YXBTK4W9CV77X7Z9P407ZC6YB3M2ARANZXHJKSM3XC33M";
  const sig =
    "PFT6WQJGCM9DE6264DJS6RMG4XDMCDBJKZGSXAF3BEXWZ979Q13NETKK05S1YV91CX3Y034FSS86SSHZTTE8097RRESQP52EKFGTWJXKHZJEQJ49YHMBNQDHW4CFBJECNJSV2PMHWVGXV7HB84R6P0S3ES559HWQX01Q9MYDEGRNHKW87QR2BNSG951D5NQGAKEJ2SSJBE18S6WYAC24FAP8TT8ANECH5371J0DJY0YR0VWAFWVJDV8XQSFXWMJ80N3A80SPSHPYJY3WZZXW63WQ46WHYY56ZSNE5G1RZ5CR0XYV2ECKPM8R0FS58EV16WTRAM1ABBFVNAT3CAEFAZCWP3XHPVBQY5NZVTD5QS2Q8SKJQ2XB30E11CWDN9KTV5CBK4DN72EVG73F3W3BATAKHG";

  const myBm = rsaBlind(
    decodeCrock(messageHash),
    decodeCrock(bks),
    decodeCrock(rsaPublicKey),
  );
  t.deepEqual(encodeCrock(myBm), bm);

  const mySig = rsaUnblind(
    decodeCrock(bs),
    decodeCrock(rsaPublicKey),
    decodeCrock(bks),
  );
  t.deepEqual(encodeCrock(mySig), sig);

  const v = rsaVerify(
    decodeCrock(messageHash),
    decodeCrock(sig),
    decodeCrock(rsaPublicKey),
  );
  t.true(v);
});

test("incremental hashing #1", (t) => {
  const n = 1024;
  const d = nacl.randomBytes(n);

  const h1 = nacl.hash(d);
  const h2 = new nacl.HashState().update(d).finish();

  const s = new nacl.HashState();
  for (let i = 0; i < n; i++) {
    const b = new Uint8Array(1);
    b[0] = d[i];
    s.update(b);
  }

  const h3 = s.finish();

  t.deepEqual(encodeCrock(h1), encodeCrock(h2));
  t.deepEqual(encodeCrock(h1), encodeCrock(h3));
});

test("incremental hashing #2", (t) => {
  const n = 10;
  const d = nacl.randomBytes(n);

  const h1 = nacl.hash(d);
  const h2 = new nacl.HashState().update(d).finish();
  const s = new nacl.HashState();
  for (let i = 0; i < n; i++) {
    const b = new Uint8Array(1);
    b[0] = d[i];
    s.update(b);
  }

  const h3 = s.finish();

  t.deepEqual(encodeCrock(h1), encodeCrock(h3));
  t.deepEqual(encodeCrock(h1), encodeCrock(h2));
});
