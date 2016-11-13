/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {AmountJson} from "./types";
import Module, {EmscFunGen} from "../emscripten/taler-emscripten-lib";

/**
 * High-level interface to emscripten-compiled modules used
 * by the wallet.
 *
 * @author Florian Dold
 */

"use strict";

// Size of a native pointer.
const PTR_SIZE = 4;

const GNUNET_OK = 1;
const GNUNET_YES = 1;
const GNUNET_NO = 0;
const GNUNET_SYSERR = -1;


const getEmsc: EmscFunGen = (name: string, ret: any, argTypes: any[]) => {
  return (...args: any[]) => {
    return Module.ccall(name, ret, argTypes, args);
  }
};


/**
 * Wrapped emscripten functions that do not allocate any memory.
 */
const emsc = {
  free: (ptr: number) => Module._free(ptr),
  get_value: getEmsc("TALER_WR_get_value",
                     "number",
                     ["number"]),
  get_fraction: getEmsc("TALER_WR_get_fraction",
                        "number",
                        ["number"]),
  get_currency: getEmsc("TALER_WR_get_currency",
                        "string",
                        ["number"]),
  amount_add: getEmsc("TALER_amount_add",
                      "number",
                      ["number", "number", "number"]),
  amount_subtract: getEmsc("TALER_amount_subtract",
                           "number",
                           ["number", "number", "number"]),
  amount_normalize: getEmsc("TALER_amount_normalize",
                            "void",
                            ["number"]),
  amount_get_zero: getEmsc("TALER_amount_get_zero",
                           "number",
                           ["string", "number"]),
  amount_cmp: getEmsc("TALER_amount_cmp",
                      "number",
                      ["number", "number"]),
  amount_hton: getEmsc("TALER_amount_hton",
                       "void",
                       ["number", "number"]),
  amount_ntoh: getEmsc("TALER_amount_ntoh",
                       "void",
                       ["number", "number"]),
  hash: getEmsc("GNUNET_CRYPTO_hash",
                "void",
                ["number", "number", "number"]),
  memmove: getEmsc("memmove",
                   "number",
                   ["number", "number", "number"]),
  rsa_public_key_free: getEmsc("GNUNET_CRYPTO_rsa_public_key_free",
                               "void",
                               ["number"]),
  rsa_signature_free: getEmsc("GNUNET_CRYPTO_rsa_signature_free",
                              "void",
                              ["number"]),
  string_to_data: getEmsc("GNUNET_STRINGS_string_to_data",
                          "number",
                          ["number", "number", "number", "number"]),
  eddsa_sign: getEmsc("GNUNET_CRYPTO_eddsa_sign",
                      "number",
                      ["number", "number", "number"]),
  eddsa_verify: getEmsc("GNUNET_CRYPTO_eddsa_verify",
                        "number",
                        ["number", "number", "number", "number"]),
  hash_create_random: getEmsc("GNUNET_CRYPTO_hash_create_random",
                              "void",
                              ["number", "number"]),
  rsa_blinding_key_destroy: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_free",
                                    "void",
                                    ["number"]),
  random_block: getEmsc("GNUNET_CRYPTO_random_block",
                        "void",
                        ["number", "number", "number"]),
  hash_context_abort: getEmsc("GNUNET_CRYPTO_hash_context_abort",
                              "void",
                              ["number"]),
  hash_context_read: getEmsc("GNUNET_CRYPTO_hash_context_read",
                             "void",
                             ["number", "number", "number"]),
  hash_context_finish: getEmsc("GNUNET_CRYPTO_hash_context_finish",
                               "void",
                               ["number", "number"]),
  ecdh_eddsa: getEmsc("GNUNET_CRYPTO_ecdh_eddsa",
                      "number",
                     ["number", "number", "number"]),

  setup_fresh_coin: getEmsc(
    "TALER_setup_fresh_coin",
    "void",
    ["number", "number", "number"]),
};

const emscAlloc = {
  get_amount: getEmsc("TALER_WRALL_get_amount",
                      "number",
                      ["number", "number", "number", "string"]),
  eddsa_key_create: getEmsc("GNUNET_CRYPTO_eddsa_key_create",
                            "number", []),
  ecdsa_key_create: getEmsc("GNUNET_CRYPTO_ecdsa_key_create",
                            "number", []),
  ecdhe_key_create: getEmsc("GNUNET_CRYPTO_ecdhe_key_create",
                            "number", []),
  eddsa_public_key_from_private: getEmsc(
    "TALER_WRALL_eddsa_public_key_from_private",
    "number",
    ["number"]),
  ecdsa_public_key_from_private: getEmsc(
    "TALER_WRALL_ecdsa_public_key_from_private",
    "number",
    ["number"]),
  ecdhe_public_key_from_private: getEmsc(
    "TALER_WRALL_ecdhe_public_key_from_private",
    "number",
    ["number"]),
  data_to_string_alloc: getEmsc("GNUNET_STRINGS_data_to_string_alloc",
                                "number",
                                ["number", "number"]),
  purpose_create: getEmsc("TALER_WRALL_purpose_create",
                          "number",
                          ["number", "number", "number"]),
  rsa_blind: getEmsc("GNUNET_CRYPTO_rsa_blind",
                     "number",
                     ["number", "number", "number", "number", "number"]),
  rsa_blinding_key_create: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_create",
                                   "number",
                                   ["number"]),
  rsa_blinding_key_encode: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_encode",
                                   "number",
                                   ["number", "number"]),
  rsa_signature_encode: getEmsc("GNUNET_CRYPTO_rsa_signature_encode",
                                "number",
                                ["number", "number"]),
  rsa_blinding_key_decode: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_decode",
                                   "number",
                                   ["number", "number"]),
  rsa_public_key_decode: getEmsc("GNUNET_CRYPTO_rsa_public_key_decode",
                                 "number",
                                 ["number", "number"]),
  rsa_signature_decode: getEmsc("GNUNET_CRYPTO_rsa_signature_decode",
                                "number",
                                ["number", "number"]),
  rsa_public_key_encode: getEmsc("GNUNET_CRYPTO_rsa_public_key_encode",
                                 "number",
                                 ["number", "number"]),
  rsa_unblind: getEmsc("GNUNET_CRYPTO_rsa_unblind",
                       "number",
                       ["number", "number", "number"]),
  hash_context_start: getEmsc("GNUNET_CRYPTO_hash_context_start",
                              "number",
                              []),
  malloc: (size: number) => Module._malloc(size),
};


export enum SignaturePurpose {
  RESERVE_WITHDRAW = 1200,
  WALLET_COIN_DEPOSIT = 1201,
  MASTER_DENOMINATION_KEY_VALIDITY = 1025,
  WALLET_COIN_MELT = 1202,
  TEST = 4242,
}

export enum RandomQuality {
  WEAK = 0,
  STRONG = 1,
  NONCE = 2
}

interface ArenaObject {
  destroy(): void;
}


export class HashContext implements ArenaObject {
  private hashContextPtr: number | undefined;

  constructor() {
    this.hashContextPtr = emscAlloc.hash_context_start();
  }

  read(obj: PackedArenaObject): void {
    if (!this.hashContextPtr) {
      throw Error("assertion failed");
    }
    emsc.hash_context_read(this.hashContextPtr, obj.nativePtr, obj.size());
  }

  finish(h: HashCode) {
    if (!this.hashContextPtr) {
      throw Error("assertion failed");
    }
    h.alloc();
    emsc.hash_context_finish(this.hashContextPtr, h.nativePtr);
  }

  destroy(): void {
    if (this.hashContextPtr) {
      emsc.hash_context_abort(this.hashContextPtr);
    }
    this.hashContextPtr = undefined;
  }
}


abstract class MallocArenaObject implements ArenaObject {
  protected _nativePtr: number | undefined = undefined;

  /**
   * Is this a weak reference to the underlying memory?
   */
  isWeak = false;
  arena: Arena;

  destroy(): void {
    if (this._nativePtr && !this.isWeak) {
      emsc.free(this.nativePtr);
      this._nativePtr = undefined;
    }
  }

  constructor(arena?: Arena) {
    if (!arena) {
      if (arenaStack.length == 0) {
        throw Error("No arena available")
      }
      arena = arenaStack[arenaStack.length - 1];
    }
    arena.put(this);
    this.arena = arena;
  }

  alloc(size: number) {
    if (this._nativePtr !== undefined) {
      throw Error("Double allocation");
    }
    this.nativePtr = emscAlloc.malloc(size);
  }

  set nativePtr(v: number) {
    if (v === undefined) {
      throw Error("Native pointer must be a number or null");
    }
    this._nativePtr = v;
  }

  get nativePtr() {
    // We want to allow latent allocation
    // of native wrappers, but we never want to
    // pass 'undefined' to emscripten.
    if (this._nativePtr === undefined) {
      throw Error("Native pointer not initialized");
    }
    return this._nativePtr;
  }
}


interface Arena {
  put(obj: ArenaObject): void;
  destroy(): void;
}


/**
 * Arena that must be manually destroyed.
 */
class SimpleArena implements Arena {
  heap: Array<ArenaObject>;

  constructor() {
    this.heap = [];
  }

  put(obj: ArenaObject) {
    this.heap.push(obj);
  }

  destroy() {
    for (let obj of this.heap) {
      obj.destroy();
    }
    this.heap = []
  }
}


/**
 * Arena that destroys all its objects once control has returned to the message
 * loop.
 */
class SyncArena extends SimpleArena {
  private isScheduled: boolean;

  constructor() {
    super();
  }

  pub(obj: MallocArenaObject) {
    super.put(obj);
    if (!this.isScheduled) {
      this.schedule();
    }
    this.heap.push(obj);
  }

  private schedule() {
    this.isScheduled = true;
    Promise.resolve().then(() => {
      this.isScheduled = false;
      this.destroy();
    });
  }
}

let arenaStack: Arena[] = [];
arenaStack.push(new SyncArena());


export class Amount extends MallocArenaObject {
  constructor(args?: AmountJson, arena?: Arena) {
    super(arena);
    if (args) {
      this.nativePtr = emscAlloc.get_amount(args.value,
                                            0,
                                            args.fraction,
                                            args.currency);
    } else {
      this.nativePtr = emscAlloc.get_amount(0, 0, 0, "");
    }
  }

  static getZero(currency: string, a?: Arena): Amount {
    let am = new Amount(undefined, a);
    let r = emsc.amount_get_zero(currency, am.nativePtr);
    if (r != GNUNET_OK) {
      throw Error("invalid currency");
    }
    return am;
  }


  toNbo(a?: Arena): AmountNbo {
    let x = new AmountNbo(a);
    x.alloc();
    emsc.amount_hton(x.nativePtr, this.nativePtr);
    return x;
  }

  fromNbo(nbo: AmountNbo): void {
    emsc.amount_ntoh(this.nativePtr, nbo.nativePtr);
  }

  get value() {
    return emsc.get_value(this.nativePtr);
  }

  get fraction() {
    return emsc.get_fraction(this.nativePtr);
  }

  get currency(): String {
    return emsc.get_currency(this.nativePtr);
  }

  toJson(): AmountJson {
    return {
      value: emsc.get_value(this.nativePtr),
      fraction: emsc.get_fraction(this.nativePtr),
      currency: emsc.get_currency(this.nativePtr)
    };
  }

  /**
   * Add an amount to this amount.
   */
  add(a: Amount) {
    let res = emsc.amount_add(this.nativePtr, a.nativePtr, this.nativePtr);
    if (res < 1) {
      // Overflow
      return false;
    }
    return true;
  }

  /**
   * Perform saturating subtraction on amounts.
   */
  sub(a: Amount) {
    // this = this - a
    let res = emsc.amount_subtract(this.nativePtr, this.nativePtr, a.nativePtr);
    if (res == 0) {
      // Underflow
      return false;
    }
    if (res > 0) {
      return true;
    }
    throw Error("Incompatible currencies");
  }

  cmp(a: Amount) {
    // If we don't check this, the c code aborts.
    if (this.currency !== a.currency) {
      throw Error(`incomparable currencies (${this.currency} and ${a.currency})`);
    }
    return emsc.amount_cmp(this.nativePtr, a.nativePtr);
  }

  normalize() {
    emsc.amount_normalize(this.nativePtr);
  }
}


/**
 * Count the UTF-8 characters in a JavaScript string.
 */
function countUtf8Bytes(str: string): number {
  var s = str.length;
  // JavaScript strings are UTF-16 arrays
  for (let i = str.length - 1; i >= 0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) {
      // We need an extra byte in utf-8 here
      s++;
    } else if (code > 0x7ff && code <= 0xffff) {
      // We need two extra bytes in utf-8 here
      s += 2;
    }
    // Skip over the other surrogate
    if (code >= 0xDC00 && code <= 0xDFFF) {
      i--;
    }
  }
  return s;
}


/**
 * Managed reference to a contiguous block of memory in the Emscripten heap.
 * Can be converted from / to a serialized representation.
 * Should contain only data, not pointers.
 */
abstract class PackedArenaObject extends MallocArenaObject {
  abstract size(): number;

  constructor(a?: Arena) {
    super(a);
  }

  randomize(qual: RandomQuality = RandomQuality.STRONG): void {
    emsc.random_block(qual, this.nativePtr, this.size());
  }

  toCrock(): string {
    var d = emscAlloc.data_to_string_alloc(this.nativePtr, this.size());
    var s = Module.Pointer_stringify(d);
    emsc.free(d);
    return s;
  }

  toJson(): any {
    // Per default, the json encoding of
    // packed arena objects is just the crockford encoding.
    // Subclasses typically want to override this.
    return this.toCrock();
  }

  loadCrock(s: string) {
    this.alloc();
    // We need to get the javascript string
    // to the emscripten heap first.
    let buf = ByteArray.fromStringWithNull(s);
    let res = emsc.string_to_data(buf.nativePtr,
                                  s.length,
                                  this.nativePtr,
                                  this.size());
    buf.destroy();
    if (res < 1) {
      throw {error: "wrong encoding"};
    }
  }

  alloc() {
    // FIXME: should the client be allowed to call alloc multiple times?
    if (!this._nativePtr) {
      this.nativePtr = emscAlloc.malloc(this.size());
    }
  }

  hash(): HashCode {
    var x = new HashCode();
    x.alloc();
    emsc.hash(this.nativePtr, this.size(), x.nativePtr);
    return x;
  }

  hexdump() {
    let bytes: string[] = [];
    for (let i = 0; i < this.size(); i++) {
      let b = Module.getValue(this.nativePtr + i, "i8");
      b = (b + 256) % 256;
      bytes.push("0".concat(b.toString(16)).slice(-2));
    }
    let lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 8) {
      lines.push(bytes.slice(i, i + 8).join(","));
    }
    return lines.join("\n");
  }
}


export class AmountNbo extends PackedArenaObject {
  size() {
    return 24;
  }

  toJson(): any {
    let a = new SimpleArena();
    let am = new Amount(undefined, a);
    am.fromNbo(this);
    let json = am.toJson();
    a.destroy();
    return json;
  }
}


export class EddsaPrivateKey extends PackedArenaObject {
  static create(a?: Arena): EddsaPrivateKey {
    let obj = new EddsaPrivateKey(a);
    obj.nativePtr = emscAlloc.eddsa_key_create();
    return obj;
  }

  size() {
    return 32;
  }

  getPublicKey(a?: Arena): EddsaPublicKey {
    let obj = new EddsaPublicKey(a);
    obj.nativePtr = emscAlloc.eddsa_public_key_from_private(this.nativePtr);
    return obj;
  }

  static fromCrock: (s: string) => EddsaPrivateKey;
}
mixinStatic(EddsaPrivateKey, fromCrock);


export class EcdsaPrivateKey extends PackedArenaObject {
  static create(a?: Arena): EcdsaPrivateKey {
    let obj = new EcdsaPrivateKey(a);
    obj.nativePtr = emscAlloc.ecdsa_key_create();
    return obj;
  }

  size() {
    return 32;
  }

  getPublicKey(a?: Arena): EcdsaPublicKey {
    let obj = new EcdsaPublicKey(a);
    obj.nativePtr = emscAlloc.ecdsa_public_key_from_private(this.nativePtr);
    return obj;
  }

  static fromCrock: (s: string) => EcdsaPrivateKey;
}
mixinStatic(EcdsaPrivateKey, fromCrock);


export class EcdhePrivateKey extends PackedArenaObject {
  static create(a?: Arena): EcdhePrivateKey {
    let obj = new EcdhePrivateKey(a);
    obj.nativePtr = emscAlloc.ecdhe_key_create();
    return obj;
  }

  size() {
    return 32;
  }

  getPublicKey(a?: Arena): EcdhePublicKey {
    let obj = new EcdhePublicKey(a);
    obj.nativePtr = emscAlloc.ecdhe_public_key_from_private(this.nativePtr);
    return obj;
  }

  static fromCrock: (s: string) => EcdhePrivateKey;
}
mixinStatic(EcdhePrivateKey, fromCrock);


function fromCrock(s: string) {
  let x = new this();
  x.alloc();
  x.loadCrock(s);
  return x;
}


function mixin(obj: any, method: any, name?: string) {
  if (!name) {
    name = method.name;
  }
  if (!name) {
    throw Error("Mixin needs a name.");
  }
  obj.prototype[method.name] = method;
}


function mixinStatic(obj: any, method: any, name?: string) {
  if (!name) {
    name = method.name;
  }
  if (!name) {
    throw Error("Mixin needs a name.");
  }
  obj[method.name] = method;
}


export class EddsaPublicKey extends PackedArenaObject {
  size() {
    return 32;
  }

  static fromCrock: (s: string) => EddsaPublicKey;
}
mixinStatic(EddsaPublicKey, fromCrock);

export class EcdsaPublicKey extends PackedArenaObject {
  size() {
    return 32;
  }

  static fromCrock: (s: string) => EcdsaPublicKey;
}
mixinStatic(EcdsaPublicKey, fromCrock);


export class EcdhePublicKey extends PackedArenaObject {
  size() {
    return 32;
  }

  static fromCrock: (s: string) => EcdhePublicKey;
}
mixinStatic(EcdhePublicKey, fromCrock);


function makeFromCrock(decodeFn: (p: number, s: number) => number) {
  function fromCrock(s: string, a?: Arena) {
    let obj = new this(a);
    let buf = ByteArray.fromCrock(s);
    obj.setNative(decodeFn(buf.nativePtr,
                           buf.size()));
    buf.destroy();
    return obj;
  }

  return fromCrock;
}

function makeToCrock(encodeFn: (po: number,
                                ps: number) => number): () => string {
  function toCrock() {
    let ptr = emscAlloc.malloc(PTR_SIZE);
    let size = emscAlloc.rsa_blinding_key_encode(this.nativePtr, ptr);
    let res = new ByteArray(size, Module.getValue(ptr, '*'));
    let s = res.toCrock();
    emsc.free(ptr);
    res.destroy();
    return s;
  }

  return toCrock;
}

export class RsaBlindingKeySecret extends PackedArenaObject {
  size() {
    return 32;
  }

  /**
   * Create a random blinding key secret.
   */
  static create(a?: Arena): RsaBlindingKeySecret {
    let o = new RsaBlindingKeySecret(a);
    o.alloc();
    o.randomize();
    return o;
  }

  static fromCrock: (s: string) => RsaBlindingKeySecret;
}
mixinStatic(RsaBlindingKeySecret, fromCrock);


export class HashCode extends PackedArenaObject {
  size() {
    return 64;
  }

  static fromCrock: (s: string) => HashCode;

  random(qual: RandomQuality = RandomQuality.STRONG) {
    this.alloc();
    emsc.hash_create_random(qual, this.nativePtr);
  }
}
mixinStatic(HashCode, fromCrock);


export class ByteArray extends PackedArenaObject {
  private allocatedSize: number;

  size() {
    return this.allocatedSize;
  }

  constructor(desiredSize: number, init?: number, a?: Arena) {
    super(a);
    if (init === undefined) {
      this.nativePtr = emscAlloc.malloc(desiredSize);
    } else {
      this.nativePtr = init;
    }
    this.allocatedSize = desiredSize;
  }

  static fromStringWithoutNull(s: string, a?: Arena): ByteArray {
    // UTF-8 bytes, including 0-terminator
    let terminatedByteLength = countUtf8Bytes(s) + 1;
    let hstr = emscAlloc.malloc(terminatedByteLength);
    Module.stringToUTF8(s, hstr, terminatedByteLength);
    return new ByteArray(terminatedByteLength - 1, hstr, a);
  }

  static fromStringWithNull(s: string, a?: Arena): ByteArray {
    // UTF-8 bytes, including 0-terminator
    let terminatedByteLength = countUtf8Bytes(s) + 1;
    let hstr = emscAlloc.malloc(terminatedByteLength);
    Module.stringToUTF8(s, hstr, terminatedByteLength);
    return new ByteArray(terminatedByteLength, hstr, a);
  }

  static fromCrock(s: string, a?: Arena): ByteArray {
    let byteLength = countUtf8Bytes(s);
    let hstr = emscAlloc.malloc(byteLength + 1);
    Module.stringToUTF8(s, hstr, byteLength + 1);
    let decodedLen = Math.floor((byteLength * 5) / 8);
    let ba = new ByteArray(decodedLen, undefined, a);
    let res = emsc.string_to_data(hstr, byteLength, ba.nativePtr, decodedLen);
    emsc.free(hstr);
    if (res != GNUNET_OK) {
      throw Error("decoding failed");
    }
    return ba;
  }
}


export class EccSignaturePurpose extends PackedArenaObject {
  size() {
    return this.payloadSize + 8;
  }

  payloadSize: number;

  constructor(purpose: SignaturePurpose,
              payload: PackedArenaObject,
              a?: Arena) {
    super(a);
    this.nativePtr = emscAlloc.purpose_create(purpose,
                                              payload.nativePtr,
                                              payload.size());
    this.payloadSize = payload.size();
  }
}


abstract class SignatureStruct {
  abstract fieldTypes(): Array<any>;

  abstract purpose(): SignaturePurpose;

  private members: any = {};

  constructor(x: { [name: string]: any }) {
    for (let k in x) {
      this.set(k, x[k]);
    }
  }

  toPurpose(a?: Arena): EccSignaturePurpose {
    let totalSize = 0;
    for (let f of this.fieldTypes()) {
      let name = f[0];
      let member = this.members[name];
      if (!member) {
        throw Error(`Member ${name} not set`);
      }
      totalSize += member.size();
    }

    let buf = emscAlloc.malloc(totalSize);
    let ptr = buf;
    for (let f of this.fieldTypes()) {
      let name = f[0];
      let member = this.members[name];
      let size = member.size();
      emsc.memmove(ptr, member.nativePtr, size);
      ptr += size;
    }
    let ba = new ByteArray(totalSize, buf, a);
    return new EccSignaturePurpose(this.purpose(), ba);
  }


  toJson() {
    let res: any = {};
    for (let f of this.fieldTypes()) {
      let name = f[0];
      let member = this.members[name];
      if (!member) {
        throw Error(`Member ${name} not set`);
      }
      res[name] = member.toJson();
    }
    res["purpose"] = this.purpose();
    return res;
  }

  protected set(name: string, value: PackedArenaObject) {
    let typemap: any = {};
    for (let f of this.fieldTypes()) {
      typemap[f[0]] = f[1];
    }
    if (!(name in typemap)) {
      throw Error(`Key ${name} not found`);
    }
    if (!(value instanceof typemap[name])) {
      throw Error("Wrong type for ${name}");
    }
    this.members[name] = value;
  }
}


// It's redundant, but more type safe.
export interface WithdrawRequestPS_Args {
  reserve_pub: EddsaPublicKey;
  amount_with_fee: AmountNbo;
  withdraw_fee: AmountNbo;
  h_denomination_pub: HashCode;
  h_coin_envelope: HashCode;
}


export class WithdrawRequestPS extends SignatureStruct {
  constructor(w: WithdrawRequestPS_Args) {
    super(w);
  }

  purpose() {
    return SignaturePurpose.RESERVE_WITHDRAW;
  }

  fieldTypes() {
    return [
      ["reserve_pub", EddsaPublicKey],
      ["amount_with_fee", AmountNbo],
      ["withdraw_fee", AmountNbo],
      ["h_denomination_pub", HashCode],
      ["h_coin_envelope", HashCode]
    ];
  }
}


interface RefreshMeltCoinAffirmationPS_Args {
  session_hash: HashCode;
  amount_with_fee: AmountNbo;
  melt_fee: AmountNbo;
  coin_pub: EddsaPublicKey;
}

export class RefreshMeltCoinAffirmationPS extends SignatureStruct {

  constructor(w: RefreshMeltCoinAffirmationPS_Args) {
    super(w);
  }

  purpose() {
    return SignaturePurpose.WALLET_COIN_MELT;
  }

  fieldTypes() {
    return [
      ["session_hash", HashCode],
      ["amount_with_fee", AmountNbo],
      ["melt_fee", AmountNbo],
      ["coin_pub", EddsaPublicKey]
    ];
  }
}


export class AbsoluteTimeNbo extends PackedArenaObject {
  static fromTalerString(s: string): AbsoluteTimeNbo {
    let x = new AbsoluteTimeNbo();
    x.alloc();
    let r = /Date\(([0-9]+)\)/;
    let m = r.exec(s);
    if (!m || m.length != 2) {
      throw Error();
    }
    let n = parseInt(m[1]) * 1000000;
    // XXX: This only works up to 54 bit numbers.
    set64(x.nativePtr, n);
    return x;
  }

  size() {
    return 8;
  }
}


// XXX: This only works up to 54 bit numbers.
function set64(p: number, n: number) {
  for (let i = 0; i < 8; ++i) {
    Module.setValue(p + (7 - i), n & 0xFF, "i8");
    n = Math.floor(n / 256);
  }
}

// XXX: This only works up to 54 bit numbers.
function set32(p: number, n: number) {
  for (let i = 0; i < 4; ++i) {
    Module.setValue(p + (3 - i), n & 0xFF, "i8");
    n = Math.floor(n / 256);
  }
}


export class UInt64 extends PackedArenaObject {
  static fromNumber(n: number): UInt64 {
    let x = new UInt64();
    x.alloc();
    set64(x.nativePtr, n);
    return x;
  }

  size() {
    return 8;
  }
}


export class UInt32 extends PackedArenaObject {
  static fromNumber(n: number): UInt64 {
    let x = new UInt32();
    x.alloc();
    set32(x.nativePtr, n);
    return x;
  }

  size() {
    return 4;
  }
}


// It's redundant, but more type safe.
export interface DepositRequestPS_Args {
  h_contract: HashCode;
  h_wire: HashCode;
  timestamp: AbsoluteTimeNbo;
  refund_deadline: AbsoluteTimeNbo;
  transaction_id: UInt64;
  amount_with_fee: AmountNbo;
  deposit_fee: AmountNbo;
  merchant: EddsaPublicKey;
  coin_pub: EddsaPublicKey;
}


export class DepositRequestPS extends SignatureStruct {
  constructor(w: DepositRequestPS_Args) {
    super(w);
  }

  purpose() {
    return SignaturePurpose.WALLET_COIN_DEPOSIT;
  }

  fieldTypes() {
    return [
      ["h_contract", HashCode],
      ["h_wire", HashCode],
      ["timestamp", AbsoluteTimeNbo],
      ["refund_deadline", AbsoluteTimeNbo],
      ["transaction_id", UInt64],
      ["amount_with_fee", AmountNbo],
      ["deposit_fee", AmountNbo],
      ["merchant", EddsaPublicKey],
      ["coin_pub", EddsaPublicKey],
    ];
  }
}

export interface DenominationKeyValidityPS_args {
  master: EddsaPublicKey;
  start: AbsoluteTimeNbo;
  expire_withdraw: AbsoluteTimeNbo;
  expire_spend: AbsoluteTimeNbo;
  expire_legal: AbsoluteTimeNbo;
  value: AmountNbo;
  fee_withdraw: AmountNbo;
  fee_deposit: AmountNbo;
  fee_refresh: AmountNbo;
  fee_refund: AmountNbo;
  denom_hash: HashCode;
}

export class DenominationKeyValidityPS extends SignatureStruct {
  constructor(w: DenominationKeyValidityPS_args) {
    super(w);
  }

  purpose() {
    return SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY;
  }

  fieldTypes() {
    return [
      ["master", EddsaPublicKey],
      ["start", AbsoluteTimeNbo],
      ["expire_withdraw", AbsoluteTimeNbo],
      ["expire_spend", AbsoluteTimeNbo],
      ["expire_legal", AbsoluteTimeNbo],
      ["value", AmountNbo],
      ["fee_withdraw", AmountNbo],
      ["fee_deposit", AmountNbo],
      ["fee_refresh", AmountNbo],
      ["fee_refund", AmountNbo],
      ["denom_hash", HashCode]
    ];
  }
}


interface Encodeable {
  encode(arena?: Arena): ByteArray;
}

function makeEncode(encodeFn: any) {
  function encode(arena?: Arena) {
    let ptr = emscAlloc.malloc(PTR_SIZE);
    let len = encodeFn(this.nativePtr, ptr);
    let res = new ByteArray(len, undefined, arena);
    res.nativePtr = Module.getValue(ptr, '*');
    emsc.free(ptr);
    return res;
  }

  return encode;
}


export class RsaPublicKey extends MallocArenaObject implements Encodeable {
  static fromCrock: (s: string, a?: Arena) => RsaPublicKey;

  toCrock() {
    return this.encode().toCrock();
  }

  destroy() {
    emsc.rsa_public_key_free(this.nativePtr);
    this.nativePtr = 0;
  }

  encode: (arena?: Arena) => ByteArray;
}
mixinStatic(RsaPublicKey, makeFromCrock(emscAlloc.rsa_public_key_decode));
mixin(RsaPublicKey, makeEncode(emscAlloc.rsa_public_key_encode));


export class EddsaSignature extends PackedArenaObject {
  size() {
    return 64;
  }
}


export class RsaSignature extends MallocArenaObject implements Encodeable {
  static fromCrock: (s: string, a?: Arena) => RsaSignature;

  encode: (arena?: Arena) => ByteArray;

  destroy() {
    emsc.rsa_signature_free(this.nativePtr);
    this.nativePtr = 0;
  }
}
mixinStatic(RsaSignature, makeFromCrock(emscAlloc.rsa_signature_decode));
mixin(RsaSignature, makeEncode(emscAlloc.rsa_signature_encode));


export function rsaBlind(hashCode: HashCode,
                         blindingKey: RsaBlindingKeySecret,
                         pkey: RsaPublicKey,
                         arena?: Arena): ByteArray|null {
  let buf_ptr_out = emscAlloc.malloc(PTR_SIZE);
  let buf_size_out = emscAlloc.malloc(PTR_SIZE);
  let res = emscAlloc.rsa_blind(hashCode.nativePtr,
                                blindingKey.nativePtr,
                                pkey.nativePtr,
                                buf_ptr_out,
                                buf_size_out);
  let buf_ptr = Module.getValue(buf_ptr_out, '*');
  let buf_size = Module.getValue(buf_size_out, '*');
  emsc.free(buf_ptr_out);
  emsc.free(buf_size_out);
  if (res != GNUNET_OK) {
    // malicious key
    return null;
  }
  return new ByteArray(buf_size, buf_ptr, arena);
}


export function eddsaSign(purpose: EccSignaturePurpose,
                          priv: EddsaPrivateKey,
                          a?: Arena): EddsaSignature {
  let sig = new EddsaSignature(a);
  sig.alloc();
  let res = emsc.eddsa_sign(priv.nativePtr, purpose.nativePtr, sig.nativePtr);
  if (res < 1) {
    throw Error("EdDSA signing failed");
  }
  return sig;
}


export function eddsaVerify(purposeNum: number,
                            verify: EccSignaturePurpose,
                            sig: EddsaSignature,
                            pub: EddsaPublicKey,
                            a?: Arena): boolean {
  let r = emsc.eddsa_verify(purposeNum,
                            verify.nativePtr,
                            sig.nativePtr,
                            pub.nativePtr);
  return r === GNUNET_OK;
}


export function rsaUnblind(sig: RsaSignature,
                           bk: RsaBlindingKeySecret,
                           pk: RsaPublicKey,
                           a?: Arena): RsaSignature {
  let x = new RsaSignature(a);
  x.nativePtr = emscAlloc.rsa_unblind(sig.nativePtr,
                                      bk.nativePtr,
                                      pk.nativePtr);
  return x;
}


type TransferSecretP = HashCode;


export interface FreshCoin {
  priv: EddsaPrivateKey;
  blindingKey: RsaBlindingKeySecret;
}

export function ecdhEddsa(priv: EcdhePrivateKey,
                          pub: EddsaPublicKey): HashCode {
  let h = new HashCode();
  h.alloc();
  let res = emsc.ecdh_eddsa(priv.nativePtr, pub.nativePtr, h.nativePtr);
  if (res != GNUNET_OK) {
    throw Error("ecdh_eddsa failed");
  }
  return h;
}

export function setupFreshCoin(secretSeed: TransferSecretP,
                               coinIndex: number): FreshCoin {
  let priv = new EddsaPrivateKey();
  priv.isWeak = true;
  let blindingKey = new RsaBlindingKeySecret();
  blindingKey.isWeak = true;
  let buf = new ByteArray(priv.size() + blindingKey.size());

  emsc.setup_fresh_coin(secretSeed.nativePtr, coinIndex, buf.nativePtr);

  priv.nativePtr = buf.nativePtr;
  blindingKey.nativePtr = buf.nativePtr + priv.size();

  return {priv, blindingKey};
}
