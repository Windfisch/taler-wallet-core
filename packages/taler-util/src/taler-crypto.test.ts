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
  stringToBytes,
  bytesToString,
  deriveBSeed,
  csBlind,
  csUnblind,
  csVerify,
  scalarMultBase25519,
  deriveSecrets,
  calcRBlind,
  Edx25519,
  getRandomBytes,
  bigintToNaclArr,
  bigintFromNaclArr,
} from "./taler-crypto.js";
import { sha512, kdf } from "./kdf.js";
import * as nacl from "./nacl-fast.js";
import { initNodePrng } from "./prng-node.js";

// Since we import nacl-fast directly (and not via index.node.ts), we need to
// init the PRNG manually.
initNodePrng();
import bigint from "big-integer";
import { AssertionError } from "assert";
import BigInteger from "big-integer";

test("encoding", (t) => {
  const s = "Hello, World";
  const encStr = encodeCrock(stringToBytes(s));
  const outBuf = decodeCrock(encStr);
  const sOut = bytesToString(outBuf);
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

  const pair = nacl.crypto_sign_keyPair_fromSeed(decodeCrock(priv));
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

test("taler-exchange-tvg eddsa_ecdh #2", (t) => {
  const priv_ecdhe = "W5FH9CFS3YPGSCV200GE8TH6MAACPKKGEG2A5JTFSD1HZ5RYT7Q0";
  const pub_ecdhe = "FER9CRS2T8783TAANPZ134R704773XT0ZT1XPFXZJ9D4QX67ZN00";
  const priv_eddsa = "MSZ1TBKC6YQ19ZFP3NTJVKWNVGFP35BBRW8FTAQJ9Z2B96VC9P4G";
  const pub_eddsa = "Y7MKG85PBT8ZEGHF08JBVZXEV70TS0PY5Y2CMEN1WXEDN63KP1A0";
  const key_material =
    "G6RA58N61K7MT3WA13Q7VRTE1FQS6H43RX9HK8Z5TGAB61601GEGX51JRHHQMNKNM2R9AVC1STSGQDRHGKWVYP584YGBCTVMMJYQF30";

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

test("taler CS blind c", async (t) => {
  /**$
   * Test Vectors:
    {
      "operation": "cs_blind_signing",
      "message_hash": "KZ7540050MWFPPPJ6C0910TC15AWD6KN6GMK4YH8PY5Z2RKP7NQMHZ1NDD7JHD9CA2CZXDKYN7XRX521YERAF6N50VJZMHWPH18TCFG",
      "cs_public_key": "1903SZ7QE1K8T4BHTJ32KDJ153SBXT22DGNQDY5NKJE535J72H2G",
      "cs_private_key": "K43QAMEPE9KJJTX6AJZD6N4SN1N3ARVAXZ2MRNPT85FHD4QD2C60",
      "cs_nonce": "GWPVFP9160XNADYQZ4T6S7RACB2482KG1JCY0X2Z5R52W74YXY3G",
      "cs_r_priv_0": "B01FJCRCST8JM10K17SJXY7S7HH7T65JMFQ03H6PNYY9Z167Q1T0",
      "cs_r_priv_1": "N3GW5X6VYSB8PY83CYNHJ3PN6TCA5N5BCS4WT2WEEQH7MTK915P0",
      "cs_r_pub_0": "J5XFBKFP9T6BM02H6ZV6Y568PQ2K398MD339036F25XTSP1A7T3G",
      "cs_r_pub_1": "GA2CZKJ6CWFS81ZN1T5R4GQFHF7XJV6HWHDR1JA9VATKKXQN89J0",
      "cs_bs_alpha_0": "R06FWJ4XEK4JKKKA03JARGD0PD5JAX8DK2N6J0K8CAZZMVQEJ1T0",
      "cs_bs_alpha_1": "13NXE2FEHJS0Q5XCWNRF4V1NC3BSAHN6BW02WZ07PG6967156HYG",
      "cs_bs_beta_0": "T3EZP42RJQXRTJ4FTDWF18Z422VX7KFGN8GJ3QCCM1QV3N456HD0",
      "cs_bs_beta_1": "P3MECYGCCR58QVEDSW443699CDXVT8C8W5ZT22PPNRJ363M72H6G",
      "cs_r_pub_blind_0": "CHK7JC4SXZ4Y9RDA3881S82F7BP99H35Q361WR6RBXN5YN2ZM1M0",
      "cs_r_pub_blind_1": "4C65R74GA9PPDX4DC2B948W96T3Z6QEENK2NDJQPNB9QBTKCT590",
      "cs_c_0": "F288QXT67TR36E6DHE399G8J24RM6C3DP16HGMH74B6WZ1DETR10",
      "cs_c_1": "EFK5WTN01NCVS3DZCG20MQDHRHBATRG8589BA0XSZDZ6D0HFR470",
      "cs_blind_s": "6KZF904YZA8KK4C8X5JV57E7B84SR8TDDN9GDC8QTRRSNTHJTM4G",
      "cs_b": "0000000",
      "cs_sig_s": "F4ZKMFW3Q7DFN0N94KAMG2JFFHAC362T0QZ6ZCVZ73RS8P91CR70",
      "cs_sig_R": "CHK7JC4SXZ4Y9RDA3881S82F7BP99H35Q361WR6RBXN5YN2ZM1M0",
      "cs_c_blind_0": "6TN5454DZCHBDXFAGQFXQY37FNX6YRKW0MPFEX4TG5EHXC98M840",
      "cs_c_blind_1": "EX6MYRZX6EC93YB4EE3M7AR3PQDYYG4092917YF29HD36X58NG0G",
      "cs_prehash_0": "D29BBP762HEN6ZHZ5T2T6S4VMV400K9Y659M1QQZYZ0WJS3V3EJSF0FVXSCD1E99JJJMW295EY8TEE97YEGSGEQ0Q0A9DDMS2NCAG9R",
      "cs_prehash_1": "9BYD02BC29ZF26BG88DWFCCENCS8CD8VZN76XP8JPWKTN9JS73MBCD0F36N0JSM223MRNJZACNYPMW23SGRHYVSP6BTT79GSSK5R228"
    }
   */

  type CsBlindSignature = {
    sBlind: Uint8Array;
    rPubBlind: Uint8Array;
  };
  /**
   * CS denomination keypair
   */
  const priv = "K43QAMEPE9KJJTX6AJZD6N4SN1N3ARVAXZ2MRNPT85FHD4QD2C60";
  const pub_cmp = "1903SZ7QE1K8T4BHTJ32KDJ153SBXT22DGNQDY5NKJE535J72H2G";
  const pub = await scalarMultBase25519(decodeCrock(priv));
  t.deepEqual(decodeCrock(pub_cmp), pub);

  const nonce = "GWPVFP9160XNADYQZ4T6S7RACB2482KG1JCY0X2Z5R52W74YXY3G";
  const msg_hash =
    "KZ7540050MWFPPPJ6C0910TC15AWD6KN6GMK4YH8PY5Z2RKP7NQMHZ1NDD7JHD9CA2CZXDKYN7XRX521YERAF6N50VJZMHWPH18TCFG";

  /**
   * rPub is returned from the exchange's new /csr API
   */
  const rPriv0 = "B01FJCRCST8JM10K17SJXY7S7HH7T65JMFQ03H6PNYY9Z167Q1T0";
  const rPriv1 = "N3GW5X6VYSB8PY83CYNHJ3PN6TCA5N5BCS4WT2WEEQH7MTK915P0";
  const rPub0 = await scalarMultBase25519(decodeCrock(rPriv0));
  const rPub1 = await scalarMultBase25519(decodeCrock(rPriv1));

  const rPub: [Uint8Array, Uint8Array] = [rPub0, rPub1];

  t.deepEqual(
    rPub[0],
    decodeCrock("J5XFBKFP9T6BM02H6ZV6Y568PQ2K398MD339036F25XTSP1A7T3G"),
  );
  t.deepEqual(
    rPub[1],
    decodeCrock("GA2CZKJ6CWFS81ZN1T5R4GQFHF7XJV6HWHDR1JA9VATKKXQN89J0"),
  );

  /**
   * Test if blinding seed derivation is deterministic
   * In the wallet the b-seed MUST be different from the Withdraw-Nonce or Refresh Nonce!
   * (Eg. derive two different values from coin priv) -> See CS protocols for details
   */
  const priv_eddsa = "1KG54M8T3X8BSFSZXCR3SQBSR7Y9P53NX61M864S7TEVMJ2XVPF0";
  // const pub_eddsa = eddsaGetPublic(decodeCrock(priv_eddsa));
  const bseed1 = deriveBSeed(decodeCrock(priv_eddsa), rPub);
  const bseed2 = deriveBSeed(decodeCrock(priv_eddsa), rPub);
  t.deepEqual(bseed1, bseed2);

  /**
   * In this scenario the nonce from the test vectors is used as b-seed and refresh.
   * This is only used in testing to test functionality.
   * DO NOT USE the same values for blinding-seed and nonce anywhere else.
   *
   * Tests whether the blinding secrets are derived as in the exchange implementation
   */
  const bseed = decodeCrock(nonce);
  const secrets = deriveSecrets(bseed);
  t.deepEqual(
    secrets.alpha[0],
    decodeCrock("R06FWJ4XEK4JKKKA03JARGD0PD5JAX8DK2N6J0K8CAZZMVQEJ1T0"),
  );
  t.deepEqual(
    secrets.alpha[1],
    decodeCrock("13NXE2FEHJS0Q5XCWNRF4V1NC3BSAHN6BW02WZ07PG6967156HYG"),
  );
  t.deepEqual(
    secrets.beta[0],
    decodeCrock("T3EZP42RJQXRTJ4FTDWF18Z422VX7KFGN8GJ3QCCM1QV3N456HD0"),
  );
  t.deepEqual(
    secrets.beta[1],
    decodeCrock("P3MECYGCCR58QVEDSW443699CDXVT8C8W5ZT22PPNRJ363M72H6G"),
  );

  const rBlind = await calcRBlind(pub, secrets, rPub);
  t.deepEqual(
    rBlind[0],
    decodeCrock("CHK7JC4SXZ4Y9RDA3881S82F7BP99H35Q361WR6RBXN5YN2ZM1M0"),
  );
  t.deepEqual(
    rBlind[1],
    decodeCrock("4C65R74GA9PPDX4DC2B948W96T3Z6QEENK2NDJQPNB9QBTKCT590"),
  );

  const c = await csBlind(bseed, rPub, pub, decodeCrock(msg_hash));
  t.deepEqual(
    c[0],
    decodeCrock("F288QXT67TR36E6DHE399G8J24RM6C3DP16HGMH74B6WZ1DETR10"),
  );
  t.deepEqual(
    c[1],
    decodeCrock("EFK5WTN01NCVS3DZCG20MQDHRHBATRG8589BA0XSZDZ6D0HFR470"),
  );

  const lMod = Array.from(
    new Uint8Array([
      0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x14, 0xde, 0xf9, 0xde, 0xa2, 0xf7, 0x9c, 0xd6,
      0x58, 0x12, 0x63, 0x1a, 0x5c, 0xf5, 0xd3, 0xed,
    ]),
  );
  const L = bigint.fromArray(lMod, 256, false).toString();
  //Lmod needs to be 2^252+27742317777372353535851937790883648493
  if (!L.startsWith("723700")) {
    throw new AssertionError({ message: L });
  }

  const b = 0;
  const blindsig: CsBlindSignature = {
    sBlind: decodeCrock("6KZF904YZA8KK4C8X5JV57E7B84SR8TDDN9GDC8QTRRSNTHJTM4G"),
    rPubBlind: rPub[b],
  };

  const sig = await csUnblind(bseed, rPub, pub, b, blindsig);
  t.deepEqual(
    sig.s,
    decodeCrock("F4ZKMFW3Q7DFN0N94KAMG2JFFHAC362T0QZ6ZCVZ73RS8P91CR70"),
  );
  t.deepEqual(
    sig.rPub,
    decodeCrock("CHK7JC4SXZ4Y9RDA3881S82F7BP99H35Q361WR6RBXN5YN2ZM1M0"),
  );

  const res = await csVerify(decodeCrock(msg_hash), sig, pub);
  t.deepEqual(res, true);
});

test("bigint/nacl conversion", async (t) => {
  const b1 = BigInteger(42);
  const n1 = bigintToNaclArr(b1, 32);
  t.is(n1[0], 42);
  t.is(n1.length, 32);
  const b2 = bigintFromNaclArr(n1);
  t.true(b1.eq(b2));
});

test("taler age restriction crypto", async (t) => {
  const priv1 = await Edx25519.keyCreate();
  const pub1 = await Edx25519.getPublic(priv1);

  const seed = getRandomBytes(32);

  const priv2 = await Edx25519.privateKeyDerive(priv1, seed);
  const pub2 = await Edx25519.publicKeyDerive(pub1, seed);

  const pub2Ref = await Edx25519.getPublic(priv2);

  t.deepEqual(pub2, pub2Ref);
});

test("edx signing", async (t) => {
  const priv1 = await Edx25519.keyCreate();
  const pub1 = await Edx25519.getPublic(priv1);

  const msg = stringToBytes("hello world");

  const sig = nacl.crypto_edx25519_sign_detached(msg, priv1, pub1);

  t.true(nacl.crypto_edx25519_sign_detached_verify(msg, sig, pub1));

  sig[0]++;

  t.false(nacl.crypto_edx25519_sign_detached_verify(msg, sig, pub1));
});

test("edx test vector", async (t) => {
  // Generated by gnunet-crypto-tvg
  const tv = {
    operation: "edx25519_derive",
    priv1_edx:
      "P0JAQ53G66M7TSGQTCFVFMPCBC7WHBRYDZGQXM8VD88C72NJANR07V1DQRAE7KSH92HZ3B62PJVRYFTVFTQM43K5AQD8R4A7HWJ3P7G",
    pub1_edx: "4YZ6D5MGWTWCTKY4W931V4S5SW0XG7AD4A60J2Z9CSEB9WE05WB0",
    seed: "SQ3YAVGNZ2GYER9VQAJB2M1Z903Y458HYXWBSF9S2A9YKF85R4DHYJX35YXXX82CBGFW2TRBCR1ZCWSQ7A87QW5SHC8WP9JH48P8KK8",
    priv2_edx:
      "GQ7NCSVNKY0QS7GQVFP2TSG6P4YN1NCK303K5TYXXBKSZ61M3R4XFZ0KA42JND6GBZRXRSJY9EX3HMMY160VQ6Y6H2NZ8H0WVQRCG1R",
    pub2_edx: "F5X6379F0FSY87MN9210FAN84PR8KYDJQ5G5784H1N3FY12ZKAPG",
  };

  {
    const pub1Prime = await Edx25519.getPublic(decodeCrock(tv.priv1_edx));
    t.deepEqual(pub1Prime, decodeCrock(tv.pub1_edx));
  }

  const pub2Prime = await Edx25519.publicKeyDerive(
    decodeCrock(tv.pub1_edx),
    decodeCrock(tv.seed),
  );
  t.deepEqual(pub2Prime, decodeCrock(tv.pub2_edx));

  const priv2Prime = await Edx25519.privateKeyDerive(
    decodeCrock(tv.priv1_edx),
    decodeCrock(tv.seed),
  );
  t.deepEqual(priv2Prime, decodeCrock(tv.priv2_edx));
});
