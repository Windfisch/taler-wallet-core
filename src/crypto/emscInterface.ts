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


/**
 * Medium-level interface to emscripten-compiled modules used
 * by the wallet.  Handles memory management by allocating by allocating
 * objects in arenas that then can be disposed of all at once.
 *
 * The high-level interface (using WebWorkers) is exposed in src/cryptoApi.ts.
 */

/**
 * Imports.
 */
import { AmountJson } from "../amounts";

/**
 * Size of a native pointer.  Must match the size
 * use when compiling via emscripten.
 */
const PTR_SIZE = 4;

const GNUNET_OK = 1;


/**
 * Signature of the function that retrieves emscripten
 * function implementations.
 */
export interface EmscFunGen {
  (name: string,
   ret: string,
   args: string[]): ((...x: Array<number|string>) => any);
  (name: string,
   ret: "number",
   args: string[]): ((...x: Array<number|string>) => number);
  (name: string,
   ret: "void",
   args: string[]): ((...x: Array<number|string>) => void);
  (name: string,
   ret: "string",
   args: string[]): ((...x: Array<number|string>) => string);
}


interface EmscLib {
  cwrap: EmscFunGen;

  ccall(name: string, ret: "number"|"string", argTypes: any[], args: any[]): any;

  stringToUTF8(s: string, addr: number, maxLength: number): void;

  onRuntimeInitialized(f: () => void): void;

  readBinary?: (filename: string) => Promise<ArrayBuffer>;

  calledRun?: boolean;

  _free(ptr: number): void;

  _malloc(n: number): number;

  UTF8ToString(p: number, len?: number): string;

  getValue(ptr: number, type: string, noSafe?: boolean): number;

  setValue(ptr: number, value: number, type: string, noSafe?: boolean): void;

  writeStringToMemory(s: string, buffer: number, dontAddNull?: boolean): void;
}

interface EmscFunctions {
  amount_add(a1: number, a2: number, a3: number): number;
  amount_cmp(a1: number, a2: number): number;
  amount_get_zero(a1: string, a2: number): number;
  amount_hton(a1: number, a2: number): void;
  amount_normalize(a1: number): void;
  amount_ntoh(a1: number, a2: number): void;
  amount_subtract(a1: number, a2: number, a3: number): number;
  ecdh_eddsa(a1: number, a2: number, a3: number): number;
  eddsa_sign(a1: number, a2: number, a3: number): number;
  eddsa_verify(a1: number, a2: number, a3: number, a4: number): number;
  free(ptr: number): void;
  get_currency(a: number): string;
  get_fraction(a: number): number;
  get_value(a: number): number;
  hash(a1: number, a2: number, a3: number): void;
  hash_context_abort(ctx: number): void;
  hash_context_finish(a1: number, a2: number): void;
  hash_context_read(a1: number, a2: number, a3: number): void;
  hash_create_random(a1: number, a2: number): void;
  memmove(a1: number, a2: number, a3: number): number;
  random_block(a1: number, a2: number, a3: number): void;
  rsa_blinding_key_free(a1: number): void;
  rsa_public_key_free(a1: number): void;
  rsa_private_key_free(a1: number): void;
  rsa_signature_free(a1: number): void;
  rsa_verify(msgHash: number, sig: number, pubKey: number): number;
  setup_fresh_coin(a1: number, a2: number, a3: number): void;
  string_to_data(a1: number, a2: number, a3: number, a4: number): number;
}

interface EmscAllocFunctions {
  data_to_string_alloc(a1: number, a2: number): number;
  ecdhe_key_create(): number;
  ecdhe_public_key_from_private(a1: number): number;
  ecdsa_key_create(): number;
  ecdsa_public_key_from_private(a1: number): number;
  eddsa_key_create(): number;
  eddsa_public_key_from_private(a1: number): number;
  /**
   * Note that value_1 and value_2 are the first 64-bit parameter,
   * and not two separate parameters (by the emscripten calling convention).
   */
  get_amount(value_1: number, value_2: number, fraction: number, currency: string): number;
  hash_context_start(): number;
  malloc(size: number): number;
  purpose_create(a1: number, a2: number, a3: number): number;
  rsa_blind(a1: number, a2: number, a3: number, a4: number, a5: number): number;
  rsa_blinding_key_create(a1: number): number;
  rsa_blinding_key_decode(a1: number, a2: number): number;
  rsa_blinding_key_encode(a1: number, a2: number): number;
  rsa_private_key_create(len: number): number;
  rsa_private_key_decode(a1: number, a2: number): number;
  rsa_private_key_encode(a1: number, a2: number): number;
  rsa_private_key_get_public(privKeyPtr: number): number;
  rsa_public_key_decode(a1: number, a2: number): number;
  rsa_public_key_encode(a1: number, a2: number): number;
  rsa_signature_decode(a1: number, a2: number): number;
  rsa_signature_encode(a1: number, a2: number): number;
  rsa_sign_blinded(keyPtr: number, msgPtr: number, msgLen: number): number;
  rsa_unblind(a1: number, a2: number, a3: number): number;
}

export class EmscEnvironment {

  /**
   * Emscripten functions that don't do any memory allocations.
   */
  public funcs: EmscFunctions;

  /**
   * Emscripten functions that allocate memory.
   */
  public allocFuncs: EmscAllocFunctions;

  public lib: EmscLib;

  constructor(lib: EmscLib) {
    const getEmsc: EmscFunGen = (name: string, ret: any, argTypes: any[]) => {
      return (...args: any[]) => {
        return lib.ccall(name, ret, argTypes, args);
      };
    };
    this.lib = lib;
    this.allocFuncs = {
      data_to_string_alloc: getEmsc("GNUNET_STRINGS_data_to_string_alloc", "number", ["number", "number"]),
      ecdhe_key_create: getEmsc("GNUNET_CRYPTO_ecdhe_key_create", "number", []),
      ecdhe_public_key_from_private: getEmsc( "TALER_WRALL_ecdhe_public_key_from_private", "number", ["number"]),
      ecdsa_key_create: getEmsc("GNUNET_CRYPTO_ecdsa_key_create", "number", []),
      ecdsa_public_key_from_private: getEmsc( "TALER_WRALL_ecdsa_public_key_from_private", "number", ["number"]),
      eddsa_key_create: getEmsc("GNUNET_CRYPTO_eddsa_key_create", "number", []),
      eddsa_public_key_from_private: getEmsc( "TALER_WRALL_eddsa_public_key_from_private", "number", ["number"]),
      get_amount: getEmsc("TALER_WRALL_get_amount", "number", ["number", "number", "number", "string"]),
      hash_context_start: getEmsc("GNUNET_CRYPTO_hash_context_start", "number", []),
      malloc: (size: number) => lib._malloc(size),
      purpose_create: getEmsc("TALER_WRALL_purpose_create", "number", ["number", "number", "number"]),
      rsa_blind: getEmsc("GNUNET_CRYPTO_rsa_blind", "number", ["number", "number", "number", "number", "number"]),
      rsa_blinding_key_create: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_create", "number", ["number"]),
      rsa_blinding_key_decode: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_decode", "number", ["number", "number"]),
      rsa_blinding_key_encode: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_encode", "number", ["number", "number"]),
      rsa_private_key_create: getEmsc("GNUNET_CRYPTO_rsa_private_key_create", "number", ["number"]),
      rsa_private_key_decode: getEmsc("GNUNET_CRYPTO_rsa_private_key_decode", "number", ["number", "number"]),
      rsa_private_key_encode: getEmsc("GNUNET_CRYPTO_rsa_private_key_encode", "number", ["number", "number"]),
      rsa_private_key_get_public: getEmsc("GNUNET_CRYPTO_rsa_private_key_get_public", "number", ["number"]),
      rsa_public_key_decode: getEmsc("GNUNET_CRYPTO_rsa_public_key_decode", "number", ["number", "number"]),
      rsa_public_key_encode: getEmsc("GNUNET_CRYPTO_rsa_public_key_encode", "number", ["number", "number"]),
      rsa_signature_decode: getEmsc("GNUNET_CRYPTO_rsa_signature_decode", "number", ["number", "number"]),
      rsa_signature_encode: getEmsc("GNUNET_CRYPTO_rsa_signature_encode", "number", ["number", "number"]),
      rsa_sign_blinded: getEmsc("GNUNET_CRYPTO_rsa_sign_blinded", "number", ["number", "number", "number"]),
      rsa_unblind: getEmsc("GNUNET_CRYPTO_rsa_unblind", "number", ["number", "number", "number"]),
    };
    this.funcs = {
      amount_add: getEmsc("TALER_amount_add", "number", ["number", "number", "number"]),
      amount_cmp: getEmsc("TALER_amount_cmp", "number", ["number", "number"]),
      amount_get_zero: getEmsc("TALER_amount_get_zero", "number", ["string", "number"]),
      amount_hton: getEmsc("TALER_amount_hton", "void", ["number", "number"]),
      amount_normalize: getEmsc("TALER_amount_normalize", "void", ["number"]),
      amount_ntoh: getEmsc("TALER_amount_ntoh", "void", ["number", "number"]),
      amount_subtract: getEmsc("TALER_amount_subtract", "number", ["number", "number", "number"]),
      ecdh_eddsa: getEmsc("GNUNET_CRYPTO_ecdh_eddsa", "number", ["number", "number", "number"]),
      eddsa_sign: getEmsc("GNUNET_CRYPTO_eddsa_sign", "number", ["number", "number", "number"]),
      eddsa_verify: getEmsc("GNUNET_CRYPTO_eddsa_verify", "number", ["number", "number", "number", "number"]),
      free: (ptr: number) => lib._free(ptr),
      get_currency: getEmsc("TALER_WR_get_currency", "string", ["number"]),
      get_fraction: getEmsc("TALER_WR_get_fraction", "number", ["number"]),
      get_value: getEmsc("TALER_WR_get_value", "number", ["number"]),
      hash: getEmsc("GNUNET_CRYPTO_hash", "void", ["number", "number", "number"]),
      hash_context_abort: getEmsc("GNUNET_CRYPTO_hash_context_abort", "void", ["number"]),
      hash_context_finish: getEmsc("GNUNET_CRYPTO_hash_context_finish", "void", ["number", "number"]),
      hash_context_read: getEmsc("GNUNET_CRYPTO_hash_context_read", "void", ["number", "number", "number"]),
      hash_create_random: getEmsc("GNUNET_CRYPTO_hash_create_random", "void", ["number", "number"]),
      memmove: getEmsc("memmove", "number", ["number", "number", "number"]),
      random_block: getEmsc("GNUNET_CRYPTO_random_block", "void", ["number", "number", "number"]),
      rsa_blinding_key_free: getEmsc("GNUNET_CRYPTO_rsa_blinding_key_free", "void", ["number"]),
      rsa_public_key_free: getEmsc("GNUNET_CRYPTO_rsa_public_key_free", "void", ["number"]),
      rsa_private_key_free: getEmsc("GNUNET_CRYPTO_rsa_private_key_free", "void", ["number"]),
      rsa_signature_free: getEmsc("GNUNET_CRYPTO_rsa_signature_free", "void", ["number"]),
      rsa_verify: getEmsc("GNUNET_CRYPTO_rsa_verify", "number", ["number", "number", "number"]),
      setup_fresh_coin: getEmsc("TALER_setup_fresh_coin", "void", ["number", "number", "number"]),
      string_to_data: getEmsc("GNUNET_STRINGS_string_to_data", "number", ["number", "number", "number", "number"]),
    };
  }
}


/**
 * Constants for signatures purposes, define what the signatures vouches for.
 */
export enum SignaturePurpose {
  RESERVE_WITHDRAW = 1200,
  WALLET_COIN_DEPOSIT = 1201,
  MASTER_DENOMINATION_KEY_VALIDITY = 1025,
  WALLET_COIN_MELT = 1202,
  TEST = 4242,
  MERCHANT_PAYMENT_OK = 1104,
  MASTER_WIRE_FEES = 1028,
  WALLET_COIN_PAYBACK = 1203,
  WALLET_COIN_LINK = 1204,
}


/**
 * Desired quality levels for random numbers.
 */
export enum RandomQuality {
  WEAK = 0,
  STRONG = 1,
  NONCE = 2,
}


/**
 * Object that is allocated in some arena.
 */
interface ArenaObject {
  destroy(): void;
}


/**
 * Context for cummulative hashing.
 */
export class HashContext implements ArenaObject {
  private hashContextPtr: number | undefined;

  constructor(private emsc: EmscEnvironment) {
    this.hashContextPtr = emsc.allocFuncs.hash_context_start();
  }

  /**
   * Add data to be hashed.
   */
  read(obj: PackedArenaObject): void {
    if (!this.hashContextPtr) {
      throw Error("assertion failed");
    }
    this.emsc.funcs.hash_context_read(this.hashContextPtr, obj.nativePtr, obj.size());
  }

  /**
   * Finish the hash computation.
   */
  finish(h: HashCode) {
    if (!this.hashContextPtr) {
      throw Error("assertion failed");
    }
    h.alloc();
    this.emsc.funcs.hash_context_finish(this.hashContextPtr, h.nativePtr);
  }

  /**
   * Abort hashing without computing the result.
   */
  destroy(): void {
    if (this.hashContextPtr) {
      this.emsc.funcs.hash_context_abort(this.hashContextPtr);
    }
    this.hashContextPtr = undefined;
  }
}


/**
 * Arena object that points to an allocated block of memory.
 */
abstract class MallocArenaObject implements ArenaObject {
  protected _nativePtr: number | undefined = undefined;

  /**
   * Is this a weak reference to the underlying memory?
   */
  isWeak = false;

  destroy(): void {
    if (this._nativePtr && !this.isWeak) {
      this.emsc.funcs.free(this.nativePtr);
      this._nativePtr = undefined;
    }
  }

  constructor(public emsc: EmscEnvironment, arena?: Arena) {
    if (!arena) {
      if (arenaStack.length === 0) {
        throw Error("No arena available");
      }
      arena = arenaStack[arenaStack.length - 1];
    }
    arena.put(this);
  }

  alloc(size: number) {
    if (this._nativePtr !== undefined) {
      throw Error("Double allocation");
    }
    this.nativePtr = this.emsc.allocFuncs.malloc(size);
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


/**
 * An arena stores objects that will be deallocated
 * at the same time.
 */
interface Arena {
  put(obj: ArenaObject): void;
  destroy(): void;
}


/**
 * Arena that must be manually destroyed.
 */
class SimpleArena implements Arena {
  protected heap: ArenaObject[];

  constructor() {
    this.heap = [];
  }

  put(obj: ArenaObject) {
    this.heap.push(obj);
  }

  destroy() {
    for (const obj of this.heap) {
      obj.destroy();
    }
    this.heap = [];
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

export const arenaStack: Arena[] = [];
arenaStack.push(new SyncArena());


/**
 * Representation of monetary value in a given currency.
 */
export class Amount extends MallocArenaObject {
  constructor(emsc: EmscEnvironment, args?: AmountJson, arena?: Arena) {
    super(emsc, arena);
    if (args) {
      this.nativePtr = emsc.allocFuncs.get_amount(args.value,
                                            0,
                                            args.fraction,
                                            args.currency);
    } else {
      this.nativePtr = emsc.allocFuncs.get_amount(0, 0, 0, "");
    }
  }

  static getZero(emsc: EmscEnvironment, currency: string, a?: Arena): Amount {
    const am = new Amount(emsc, undefined, a);
    const r = emsc.funcs.amount_get_zero(currency, am.nativePtr);
    if (r !== GNUNET_OK) {
      throw Error("invalid currency");
    }
    return am;
  }


  toNbo(a?: Arena): AmountNbo {
    const x = new AmountNbo(this.emsc, a);
    x.alloc();
    this.emsc.funcs.amount_hton(x.nativePtr, this.nativePtr);
    return x;
  }

  fromNbo(nbo: AmountNbo): void {
    this.emsc.funcs.amount_ntoh(this.nativePtr, nbo.nativePtr);
  }

  get value() {
    return this.emsc.funcs.get_value(this.nativePtr);
  }

  get fraction() {
    return this.emsc.funcs.get_fraction(this.nativePtr);
  }

  get currency(): string {
    return this.emsc.funcs.get_currency(this.nativePtr);
  }

  toJson(): AmountJson {
    return {
      currency: this.emsc.funcs.get_currency(this.nativePtr),
      fraction: this.emsc.funcs.get_fraction(this.nativePtr),
      value: this.emsc.funcs.get_value(this.nativePtr),
    };
  }

  /**
   * Add an amount to this amount.
   */
  add(a: Amount) {
    const res = this.emsc.funcs.amount_add(this.nativePtr, a.nativePtr, this.nativePtr);
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
    const res = this.emsc.funcs.amount_subtract(this.nativePtr, this.nativePtr, a.nativePtr);
    if (res === 0) {
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
    return this.emsc.funcs.amount_cmp(this.nativePtr, a.nativePtr);
  }

  normalize() {
    this.emsc.funcs.amount_normalize(this.nativePtr);
  }
}


/**
 * Count the UTF-8 characters in a JavaScript string.
 */
function countUtf8Bytes(str: string): number {
  let s = str.length;
  // JavaScript strings are UTF-16 arrays
  for (let i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i);
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

  constructor(emsc: EmscEnvironment, a?: Arena) {
    super(emsc, a);
  }

  randomize(qual: RandomQuality = RandomQuality.STRONG): void {
    this.emsc.funcs.random_block(qual, this.nativePtr, this.size());
  }

  toCrock(): string {
    const d = this.emsc.allocFuncs.data_to_string_alloc(this.nativePtr, this.size());
    const s = this.emsc.lib.UTF8ToString(d);
    this.emsc.funcs.free(d);
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
    const buf = ByteArray.fromStringWithNull(this.emsc, s);
    const res = this.emsc.funcs.string_to_data(buf.nativePtr,
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
      this.nativePtr = this.emsc.allocFuncs.malloc(this.size());
    }
  }

  hash(): HashCode {
    const x = new HashCode(this.emsc);
    x.alloc();
    this.emsc.funcs.hash(this.nativePtr, this.size(), x.nativePtr);
    return x;
  }

  hexdump() {
    const bytes: string[] = [];
    for (let i = 0; i < this.size(); i++) {
      let b = this.emsc.lib.getValue(this.nativePtr + i, "i8");
      b = (b + 256) % 256;
      bytes.push("0".concat(b.toString(16)).slice(-2));
    }
    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 8) {
      lines.push(bytes.slice(i, i + 8).join(","));
    }
    return lines.join("\n");
  }
}


/**
 * Amount, encoded for network transmission.
 */
export class AmountNbo extends PackedArenaObject {
  size() {
    return 24;
  }

  toJson(): any {
    const a = new SimpleArena();
    const am = new Amount(this.emsc, undefined, a);
    am.fromNbo(this);
    const json = am.toJson();
    a.destroy();
    return json;
  }
}


/**
 * Create a packed arena object from the base32 crockford encoding.
 */
function fromCrock<T extends PackedArenaObject>(emsc: EmscEnvironment, s: string, ctor: Ctor<T>): T {
  const x: T = new ctor(emsc);
  x.alloc();
  x.loadCrock(s);
  return x;
}


/**
 * Create a packed arena object from the base32 crockford encoding for objects
 * that have a special decoding function.
 */
function fromCrockDecoded<T extends MallocArenaObject>(emsc: EmscEnvironment, s: string,
                                                       ctor: Ctor<T>,
                                                       decodeFn: (p: number, s: number) => number): T {
  const obj = new ctor(emsc);
  const buf = ByteArray.fromCrock(emsc, s);
  obj.nativePtr = decodeFn(buf.nativePtr, buf.size());
  buf.destroy();
  return obj;
}


/**
 * Encode an object using a special encoding function.
 */
function encode<T extends MallocArenaObject>(obj: T, encodeFn: any, arena?: Arena): ByteArray {
  const ptr = obj.emsc.allocFuncs.malloc(PTR_SIZE);
  const len = encodeFn(obj.nativePtr, ptr);
  const res = new ByteArray(obj.emsc, len, undefined, arena);
  res.nativePtr = obj.emsc.lib.getValue(ptr, "*");
  obj.emsc.funcs.free(ptr);
  return res;
}


/**
 * Private EdDSA key.
 */
export class EddsaPrivateKey extends PackedArenaObject {
  static create(emsc: EmscEnvironment, a?: Arena): EddsaPrivateKey {
    const obj = new EddsaPrivateKey(emsc, a);
    obj.nativePtr = emsc.allocFuncs.eddsa_key_create();
    return obj;
  }

  size() {
    return 32;
  }

  getPublicKey(a?: Arena): EddsaPublicKey {
    const obj = new EddsaPublicKey(this.emsc, a);
    obj.nativePtr = this.emsc.allocFuncs.eddsa_public_key_from_private(this.nativePtr);
    return obj;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): EddsaPrivateKey {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Low-level handle to an EdDSA private key.
 */
export class EcdsaPrivateKey extends PackedArenaObject {
  static create(emsc: EmscEnvironment, a?: Arena): EcdsaPrivateKey {
    const obj = new EcdsaPrivateKey(emsc, a);
    obj.nativePtr = emsc.allocFuncs.ecdsa_key_create();
    return obj;
  }

  size() {
    return 32;
  }

  getPublicKey(a?: Arena): EcdsaPublicKey {
    const obj = new EcdsaPublicKey(this.emsc, a);
    obj.nativePtr = this.emsc.allocFuncs.ecdsa_public_key_from_private(this.nativePtr);
    return obj;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): EcdsaPrivateKey {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Low-level handle to an ECDHE private key.
 */
export class EcdhePrivateKey extends PackedArenaObject {
  static create(emsc: EmscEnvironment, a?: Arena): EcdhePrivateKey {
    const obj = new EcdhePrivateKey(emsc, a);
    obj.nativePtr = emsc.allocFuncs.ecdhe_key_create();
    return obj;
  }

  size() {
    return 32;
  }

  getPublicKey(a?: Arena): EcdhePublicKey {
    const obj = new EcdhePublicKey(this.emsc, a);
    obj.nativePtr = this.emsc.allocFuncs.ecdhe_public_key_from_private(this.nativePtr);
    return obj;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): EcdhePrivateKey {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Constructor for a given type.
 */
interface Ctor<T> {
  new(emsc: EmscEnvironment): T;
}


/**
 * Low-level handle to an EdDSA public key.
 */
export class EddsaPublicKey extends PackedArenaObject {
  size() {
    return 32;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): EddsaPublicKey {
    return fromCrock(emsc, s, this);
  }
}

/**
 * Low-level handle to an ECDSA public key.
 */
export class EcdsaPublicKey extends PackedArenaObject {
  size() {
    return 32;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): EcdsaPublicKey {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Low-level handle to an ECDHE public key.
 */
export class EcdhePublicKey extends PackedArenaObject {
  size() {
    return 32;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): EcdhePublicKey {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Low-level handle to a blinding key secret.
 */
export class RsaBlindingKeySecret extends PackedArenaObject {
  size() {
    return 32;
  }

  /**
   * Create a random blinding key secret.
   */
  static create(emsc: EmscEnvironment, a?: Arena): RsaBlindingKeySecret {
    const o = new RsaBlindingKeySecret(emsc, a);
    o.alloc();
    o.randomize();
    return o;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): RsaBlindingKeySecret {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Low-level handle to a hash code.
 */
export class HashCode extends PackedArenaObject {
  size() {
    return 64;
  }

  static fromCrock(emsc: EmscEnvironment, s: string): HashCode {
    return fromCrock(emsc, s, this);
  }

  random(qual: RandomQuality = RandomQuality.STRONG) {
    this.alloc();
    this.emsc.funcs.hash_create_random(qual, this.nativePtr);
  }
}


/**
 * Low-level handle to a byte array.
 */
export class ByteArray extends PackedArenaObject {
  private allocatedSize: number;

  size() {
    return this.allocatedSize;
  }

  constructor(public emsc: EmscEnvironment, desiredSize: number, init?: number, a?: Arena) {
    super(emsc, a);
    if (init === undefined) {
      this.nativePtr = this.emsc.allocFuncs.malloc(desiredSize);
    } else {
      this.nativePtr = init;
    }
    this.allocatedSize = desiredSize;
  }

  static fromStringWithoutNull(emsc: EmscEnvironment, s: string, a?: Arena): ByteArray {
    // UTF-8 bytes, including 0-terminator
    const terminatedByteLength = countUtf8Bytes(s) + 1;
    const hstr = emsc.allocFuncs.malloc(terminatedByteLength);
    emsc.lib.stringToUTF8(s, hstr, terminatedByteLength);
    return new ByteArray(emsc, terminatedByteLength - 1, hstr, a);
  }

  static fromStringWithNull(emsc: EmscEnvironment, s: string, a?: Arena): ByteArray {
    // UTF-8 bytes, including 0-terminator
    const terminatedByteLength = countUtf8Bytes(s) + 1;
    const hstr = emsc.allocFuncs.malloc(terminatedByteLength);
    emsc.lib.stringToUTF8(s, hstr, terminatedByteLength);
    return new ByteArray(emsc, terminatedByteLength, hstr, a);
  }

  static fromCrock(emsc: EmscEnvironment, s: string, a?: Arena): ByteArray {
    // this one is a bit more complicated than the other fromCrock functions,
    // since we don't have a fixed size
    const byteLength = countUtf8Bytes(s);
    const hstr = emsc.allocFuncs.malloc(byteLength + 1);
    emsc.lib.stringToUTF8(s, hstr, byteLength + 1);
    const decodedLen = Math.floor((byteLength * 5) / 8);
    const ba = new ByteArray(emsc, decodedLen, undefined, a);
    const res = emsc.funcs.string_to_data(hstr, byteLength, ba.nativePtr, decodedLen);
    emsc.funcs.free(hstr);
    if (res !== GNUNET_OK) {
      throw Error("decoding failed");
    }
    return ba;
  }
}


/**
 * Data to sign, together with a header that includes a purpose id
 * and size.
 */
export class EccSignaturePurpose extends PackedArenaObject {
  size() {
    return this.payloadSize + 8;
  }

  private payloadSize: number;

  constructor(emsc: EmscEnvironment,
              purpose: SignaturePurpose,
              payload: PackedArenaObject,
              a?: Arena) {
    super(emsc, a);
    this.nativePtr = emsc.allocFuncs.purpose_create(purpose,
                                                      payload.nativePtr,
                                                      payload.size());
    this.payloadSize = payload.size();
  }
}


abstract class SignatureStruct {
  abstract fieldTypes(): any[];

  abstract purpose(): SignaturePurpose;

  private members: any = {};

  constructor(public emsc: EmscEnvironment, x: { [name: string]: any }) {
    for (const k in x) {
      this.set(k, x[k]);
    }
  }

  toPurpose(a?: Arena): EccSignaturePurpose {
    let totalSize = 0;
    for (const f of this.fieldTypes()) {
      const name = f[0];
      const member = this.members[name];
      if (!member) {
        throw Error(`Member ${name} not set`);
      }
      totalSize += member.size();
    }

    const buf = this.emsc.allocFuncs.malloc(totalSize);
    let ptr = buf;
    for (const f of this.fieldTypes()) {
      const name = f[0];
      const member = this.members[name];
      const size = member.size();
      this.emsc.funcs.memmove(ptr, member.nativePtr, size);
      ptr += size;
    }
    const ba = new ByteArray(this.emsc, totalSize, buf, a);
    return new EccSignaturePurpose(this.emsc, this.purpose(), ba);
  }


  toJson() {
    const res: any = {};
    for (const f of this.fieldTypes()) {
      const name = f[0];
      const member = this.members[name];
      if (!member) {
        throw Error(`Member ${name} not set`);
      }
      res[name] = member.toJson();
    }
    res.purpose = this.purpose();
    return res;
  }

  protected set(name: string, value: PackedArenaObject) {
    const typemap: any = {};
    for (const f of this.fieldTypes()) {
      typemap[f[0]] = f[1];
    }
    if (!(name in typemap)) {
      throw Error(`Key ${name} not found`);
    }
    if (!(value instanceof typemap[name])) {
      throw Error(`Wrong type for ${name}`);
    }
    this.members[name] = value;
  }
}


/**
 * Arguments to constructor of [[WithdrawRequestPS]].
 */
export interface WithdrawRequestPS_Args {
  /**
   * Reserve public key.
   */
  reserve_pub: EddsaPublicKey;
  /**
   * Amount with fee.
   */
  amount_with_fee: AmountNbo;
  /**
   * Withdraw fee.
   */
  withdraw_fee: AmountNbo;
  /**
   * Hash of denomination public key.
   */
  h_denomination_pub: HashCode;
  /**
   * Hash of coin envelope.
   */
  h_coin_envelope: HashCode;
}


/**
 * Low-level handle to a WithdrawRequest signature structure.
 */
export class WithdrawRequestPS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: WithdrawRequestPS_Args) {
    super(emsc, w);
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
      ["h_coin_envelope", HashCode],
    ];
  }
}


/**
 * Arguments for constructor or [[PaybackRequestPS]].
 */
export interface PaybackRequestPS_args {
  coin_pub: EddsaPublicKey;
  h_denom_pub: HashCode;
  coin_blind: RsaBlindingKeySecret;
}


/**
 * Low-level handle to a PaybackRequest signature structure.
 */
export class PaybackRequestPS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: PaybackRequestPS_args) {
    super(emsc, w);
  }

  purpose() {
    return SignaturePurpose.WALLET_COIN_PAYBACK;
  }

  fieldTypes() {
    return [
      ["coin_pub", EddsaPublicKey],
      ["h_denom_pub", HashCode],
      ["coin_blind", RsaBlindingKeySecret],
    ];
  }
}


/**
 * Arguments for constructor of [[RefreshMeltCoinAffirmationPS]].
 */
interface RefreshMeltCoinAffirmationPS_Args {
  session_hash: HashCode;
  amount_with_fee: AmountNbo;
  melt_fee: AmountNbo;
  coin_pub: EddsaPublicKey;
}

/**
 * Low-level handle to a RefreshMeltCoinAffirmationPS signature structure.
 */
export class RefreshMeltCoinAffirmationPS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: RefreshMeltCoinAffirmationPS_Args) {
    super(emsc, w);
  }

  purpose() {
    return SignaturePurpose.WALLET_COIN_MELT;
  }

  fieldTypes() {
    return [
      ["session_hash", HashCode],
      ["amount_with_fee", AmountNbo],
      ["melt_fee", AmountNbo],
      ["coin_pub", EddsaPublicKey],
    ];
  }
}


/**
 * Arguments for constructor of [[MasterWireFeePS]].
 */
interface MasterWireFeePS_Args {
  /**
   * Hash of wire method.
   */
  h_wire_method: HashCode;
  /**
   * Start date.
   */
  start_date: AbsoluteTimeNbo;
  /**
   * End date.
   */
  end_date: AbsoluteTimeNbo;
  /**
   * Wire fee.
   */
  wire_fee: AmountNbo;
  /**
   * Closing fee.
   */
  closing_fee: AmountNbo;
}


/**
 * Low-level handle to a structure being signed over.
 */
export class MasterWireFeePS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: MasterWireFeePS_Args) {
    super(emsc, w);
  }

  purpose() {
    return SignaturePurpose.MASTER_WIRE_FEES;
  }

  fieldTypes() {
    return [
      ["h_wire_method", HashCode],
      ["start_date", AbsoluteTimeNbo],
      ["end_date", AbsoluteTimeNbo],
      ["wire_fee", AmountNbo],
      ["closing_fee", AmountNbo],
    ];
  }
}


/**
 * Low-level handle to an absolute time in network byte order (NBO).
 */
export class AbsoluteTimeNbo extends PackedArenaObject {
  static fromTalerString(emsc: EmscEnvironment, s: string): AbsoluteTimeNbo {
    const x = new AbsoluteTimeNbo(emsc);
    x.alloc();
    const r = /Date\(([0-9]+)\)/;
    const m = r.exec(s);
    if (!m || m.length !== 2) {
      throw Error();
    }
    const n = parseInt(m[1], 10) * 1000000;
    // XXX: This only works up to 54 bit numbers.
    set64(emsc, x.nativePtr, n);
    return x;
  }

  static fromStampSeconds(emsc: EmscEnvironment, stamp: number): AbsoluteTimeNbo {
    const x = new AbsoluteTimeNbo(emsc);
    x.alloc();
    // XXX: This only works up to 54 bit numbers.
    set64(emsc, x.nativePtr, stamp * 1000000);
    return x;
  }


  size() {
    return 8;
  }
}


// XXX: This only works up to 54 bit numbers.
function set64(emsc: EmscEnvironment, p: number, n: number) {
  for (let i = 0; i < 8; ++i) {
    emsc.lib.setValue(p + (7 - i), n & 0xFF, "i8");
    n = Math.floor(n / 256);
  }
}

// XXX: This only works up to 54 bit numbers.
function set32(emsc: EmscEnvironment, p: number, n: number) {
  for (let i = 0; i < 4; ++i) {
    emsc.lib.setValue(p + (3 - i), n & 0xFF, "i8");
    n = Math.floor(n / 256);
  }
}


/**
 * Low-level handle to an unsigned 64-bit value.
 */
export class UInt64 extends PackedArenaObject {
  static fromNumber(emsc: EmscEnvironment, n: number): UInt64 {
    const x = new UInt64(emsc);
    x.alloc();
    set64(emsc, x.nativePtr, n);
    return x;
  }

  size() {
    return 8;
  }
}


/**
 * Low-level handle to an unsigned 32-bit value.
 */
export class UInt32 extends PackedArenaObject {
  static fromNumber(emsc: EmscEnvironment, n: number): UInt32 {
    const x = new UInt32(emsc);
    x.alloc();
    set32(emsc, x.nativePtr, n);
    return x;
  }

  size() {
    return 4;
  }
}


/**
 * Argument to the constructor of [[DepositRequestPS]].
 */
export interface DepositRequestPS_Args {
  /**
   * Contract hash.
   */
  h_contract: HashCode;
  /**
   * Wire info hash.
   */
  h_wire: HashCode;
  /**
   * Timestamp.
   */
  timestamp: AbsoluteTimeNbo;
  /**
   * Refund deadline.
   */
  refund_deadline: AbsoluteTimeNbo;
  /**
   * Amount with fee.
   */
  amount_with_fee: AmountNbo;
  /**
   * Deposit fee.
   */
  deposit_fee: AmountNbo;
  /**
   * Merchant public key.
   */
  merchant: EddsaPublicKey;
  /**
   * Public key of the coin being deposited.
   */
  coin_pub: EddsaPublicKey;
}


/**
 * Low-level handle to a struct being signed over.
 */
export class DepositRequestPS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: DepositRequestPS_Args) {
    super(emsc, w);
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
      ["amount_with_fee", AmountNbo],
      ["deposit_fee", AmountNbo],
      ["merchant", EddsaPublicKey],
      ["coin_pub", EddsaPublicKey],
    ];
  }
}


interface CoinLinkSignaturePS_args {
  h_denom_pub: HashCode;
  old_coin_pub: EddsaPublicKey;
  transfer_pub: EcdhePublicKey;
  coin_envelope_hash: HashCode;
}


export class CoinLinkSignaturePS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: CoinLinkSignaturePS_args) {
    super(emsc, w);
  }

  purpose() {
    return SignaturePurpose.WALLET_COIN_LINK;
  }

  fieldTypes() {
    return [
      ["h_denom_pub", HashCode],
      ["old_coin_pub", EddsaPublicKey],
      ["transfer_pub", EcdhePublicKey],
      ["coin_envelope_hash", HashCode],
    ];
  }
}


/**
 * Arguments for constuctor of [[DenominationKeyValidityPS]].
 */
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


/**
 * Low-level handle to a structure being signed over.
 */
export class DenominationKeyValidityPS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: DenominationKeyValidityPS_args) {
    super(emsc, w);
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
      ["denom_hash", HashCode],
    ];
  }
}

/**
 * Arguments to constructor of [[PaymentSignaturePS]].
 */
export interface PaymentSignaturePS_args {
  /**
   * Contract hash.
   */
  contract_hash: HashCode;
}


/**
 * Low-level handle to a structure being signed over.
 */
export class PaymentSignaturePS extends SignatureStruct {
  constructor(emsc: EmscEnvironment, w: PaymentSignaturePS_args) {
    super(emsc, w);
  }

  purpose() {
    return SignaturePurpose.MERCHANT_PAYMENT_OK;
  }

  fieldTypes() {
    return [
      ["contract_hash", HashCode],
    ];
  }
}


/**
 * Low-level handle to an RsaPrivateKey.
 */
export class RsaPrivateKey extends MallocArenaObject {
  static fromCrock(emsc: EmscEnvironment, s: string): RsaPrivateKey {
    return fromCrockDecoded(emsc, s, this, emsc.allocFuncs.rsa_private_key_decode);
  }

  static create(emsc: EmscEnvironment, bitLen: number, a?: Arena): RsaPrivateKey {
    const obj = new RsaPrivateKey(emsc, a);
    obj.nativePtr = emsc.allocFuncs.rsa_private_key_create(bitLen);
    return obj;
  }

  toCrock() {
    return this.encode().toCrock();
  }


  getPublicKey(a?: Arena): RsaPublicKey {
    const obj = new RsaPublicKey(this.emsc, a);
    obj.nativePtr = this.emsc.allocFuncs.rsa_private_key_get_public(this.nativePtr);
    return obj;
  }

  destroy() {
    this.emsc.funcs.rsa_public_key_free(this.nativePtr);
    this.nativePtr = 0;
  }

  encode(arena?: Arena): ByteArray {
    return encode(this, this.emsc.allocFuncs.rsa_private_key_encode);
  }
}


/**
 * Low-level handle to an RsaPublicKey.
 */
export class RsaPublicKey extends MallocArenaObject {
  static fromCrock(emsc: EmscEnvironment, s: string): RsaPublicKey {
    return fromCrockDecoded(emsc, s, this, emsc.allocFuncs.rsa_public_key_decode);
  }

  toCrock() {
    return this.encode().toCrock();
  }

  destroy() {
    this.emsc.funcs.rsa_public_key_free(this.nativePtr);
    this.nativePtr = 0;
  }

  encode(arena?: Arena): ByteArray {
    return encode(this, this.emsc.allocFuncs.rsa_public_key_encode);
  }
}


/**
 * Low-level handle to an EddsaSignature.
 */
export class EddsaSignature extends PackedArenaObject {
  size() {
    return 64;
  }
  static fromCrock(emsc: EmscEnvironment, s: string): EddsaSignature {
    return fromCrock(emsc, s, this);
  }
}


/**
 * Low-level handle to an RsaSignature.
 */
export class RsaSignature extends MallocArenaObject {
  static fromCrock(emsc: EmscEnvironment, s: string, a?: Arena) {
    return fromCrockDecoded(emsc, s, this, emsc.allocFuncs.rsa_signature_decode);
  }

  encode(arena?: Arena): ByteArray {
    return encode(this, this.emsc.allocFuncs.rsa_signature_encode);
  }

  destroy() {
    this.emsc.funcs.rsa_signature_free(this.nativePtr);
    this.nativePtr = 0;
  }
}


/**
 * Blind a value so it can be blindly signed.
 */
export function rsaBlind(hashCode: HashCode,
                         blindingKey: RsaBlindingKeySecret,
                         pkey: RsaPublicKey,
                         arena?: Arena): ByteArray|null {
  const emsc: EmscEnvironment = hashCode.emsc;
  const buf_ptr_out = emsc.allocFuncs.malloc(PTR_SIZE);
  const buf_size_out = emsc.allocFuncs.malloc(PTR_SIZE);
  const res = emsc.allocFuncs.rsa_blind(hashCode.nativePtr,
                                          blindingKey.nativePtr,
                                          pkey.nativePtr,
                                          buf_ptr_out,
                                          buf_size_out);
  const buf_ptr = emsc.lib.getValue(buf_ptr_out, "*");
  const buf_size = emsc.lib.getValue(buf_size_out, "*");
  emsc.funcs.free(buf_ptr_out);
  emsc.funcs.free(buf_size_out);
  if (res !== GNUNET_OK) {
    // malicious key
    return null;
  }
  return new ByteArray(emsc, buf_size, buf_ptr, arena);
}


/**
 * Sign data using EdDSA.
 */
export function eddsaSign(purpose: EccSignaturePurpose,
                          priv: EddsaPrivateKey,
                          a?: Arena): EddsaSignature {
  const sig = new EddsaSignature(purpose.emsc, a);
  sig.alloc();
  const res = purpose.emsc.funcs.eddsa_sign(priv.nativePtr, purpose.nativePtr, sig.nativePtr);
  if (res < 1) {
    throw Error("EdDSA signing failed");
  }
  return sig;
}


/**
 * Verify EdDSA-signed data.
 */
export function eddsaVerify(purposeNum: number,
                            verify: EccSignaturePurpose,
                            sig: EddsaSignature,
                            pub: EddsaPublicKey,
                            a?: Arena): boolean {
  const r = verify.emsc.funcs.eddsa_verify(purposeNum,
                                      verify.nativePtr,
                                      sig.nativePtr,
                                      pub.nativePtr);
  return r === GNUNET_OK;
}


export function rsaVerify(h: HashCode,
                          sig: RsaSignature,
                          pub: RsaPublicKey) {
  const r = h.emsc.funcs.rsa_verify(h.nativePtr,
                                    sig.nativePtr,
                                    pub.nativePtr);
  return r === GNUNET_OK;
}


/**
 * Unblind a blindly signed value.
 */
export function rsaUnblind(sig: RsaSignature,
                           bk: RsaBlindingKeySecret,
                           pk: RsaPublicKey,
                           a?: Arena): RsaSignature {
  const x = new RsaSignature(sig.emsc, a);
  x.nativePtr = sig.emsc.allocFuncs.rsa_unblind(sig.nativePtr,
                                              bk.nativePtr,
                                              pk.nativePtr);
  return x;
}


type TransferSecretP = HashCode;

/**
 * A fresh coin generated from a sed.
 */
export interface FreshCoin {
  /**
   * The coin's private key.
   */
  priv: EddsaPrivateKey;
  /**
   * The blinding key to use for withdrawal.
   */
  blindingKey: RsaBlindingKeySecret;
}

/**
 * Diffie-Hellman operation between an ECDHE private key
 * and an EdDSA public key.
 */
export function ecdhEddsa(priv: EcdhePrivateKey,
                          pub: EddsaPublicKey): HashCode {
  const h = new HashCode(priv.emsc);
  h.alloc();
  const res = priv.emsc.funcs.ecdh_eddsa(priv.nativePtr, pub.nativePtr, h.nativePtr);
  if (res !== GNUNET_OK) {
    throw Error("ecdh_eddsa failed");
  }
  return h;
}

export function rsaSignBlinded(priv: RsaPrivateKey,
                               msg: ByteArray): RsaSignature {
  const sig = new RsaSignature(priv.emsc);
  sig.nativePtr = priv.emsc.allocFuncs.rsa_sign_blinded (priv.nativePtr,
                                                      msg.nativePtr,
                                                      msg.size());
  return sig;
}



/**
 * Derive a fresh coin from the given seed.  Used during refreshing.
 */
export function setupFreshCoin(secretSeed: TransferSecretP,
                               coinIndex: number): FreshCoin {
  const emsc: EmscEnvironment = secretSeed.emsc; 
  const priv = new EddsaPrivateKey(emsc);
  priv.isWeak = true;
  const blindingKey = new RsaBlindingKeySecret(emsc);
  blindingKey.isWeak = true;
  const buf = new ByteArray(emsc, priv.size() + blindingKey.size());

  emsc.funcs.setup_fresh_coin(secretSeed.nativePtr, coinIndex, buf.nativePtr);

  priv.nativePtr = buf.nativePtr;
  blindingKey.nativePtr = buf.nativePtr + priv.size();

  return { priv, blindingKey };
}
