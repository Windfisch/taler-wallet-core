/*

  This file is part of TALER
  Copyright (C) 2014, 2015 Christian Grothoff (and other contributing authors)

  TALER is free software; you can redistribute it and/or modify it under the
  terms of the GNU General Public License as published by the Free Software
  Foundation; either version 3, or (at your option) any later version.

  TALER is distributed in the hope that it will be useful, but WITHOUT ANY
  WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
  A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  TALER; see the file COPYING. If not, see <http://www.gnu.org/licenses/>
*/

"use strict";

declare var Module : any;


// Size of a native pointer.
const PTR_SIZE = 4;

let getEmsc = Module.cwrap;

var emsc = {
  free: (ptr) => Module._free(ptr),
  get_value: getEmsc('TALER_WR_get_value',
                     'number',
                     ['number']),
  get_fraction: getEmsc('TALER_WR_get_fraction',
                        'number',
                        ['number']),
  get_currency: getEmsc('TALER_WR_get_currency',
                        'string',
                        ['number']),
  amount_add: getEmsc('TALER_amount_add',
                      'void',
                      ['number', 'number', 'number']),
  amount_subtract: getEmsc('TALER_amount_subtract',
                           'void',
                           ['number', 'number', 'number']),
  amount_normalize: getEmsc('TALER_amount_normalize',
                            'void',
                            ['number']),
  amount_cmp: getEmsc('TALER_amount_cmp',
                      'number',
                      ['number', 'number']),
  amount_hton: getEmsc('TALER_amount_hton',
                      'void',
                      ['number', 'number']),
  amount_ntoh: getEmsc('TALER_amount_ntoh',
                      'void',
                      ['number', 'number']),
  hash: getEmsc('GNUNET_CRYPTO_hash',
                'void',
                ['number', 'number', 'number']),
  memmove: getEmsc('memmove',
                   'number',
                   ['number', 'number', 'number']),
  rsa_public_key_free: getEmsc('GNUNET_CRYPTO_rsa_public_key_free',
                               'void',
                               ['number']),
  string_to_data: getEmsc('GNUNET_STRINGS_string_to_data',
                          'void',
                          ['number', 'number', 'number', 'number'])
};

var emscAlloc = {
  get_amount: getEmsc('TALER_WRALL_get_amount',
                      'number',
                      ['number', 'number', 'number', 'string']),
  eddsa_key_create: getEmsc('GNUNET_CRYPTO_eddsa_key_create',
                            'number'),
  eddsa_public_key_from_private: getEmsc('TALER_WRALL_eddsa_public_key_from_private',
                                         'number',
                                         ['number']),
  data_to_string_alloc: getEmsc('GNUNET_STRINGS_data_to_string_alloc',
                                'number',
                                ['number', 'number']),
  purpose_create: getEmsc('TALER_WRALL_purpose_create',
                          'number',
                          ['number', 'number', 'number']),
  rsa_blind: getEmsc('GNUNET_CRYPTO_rsa_blind',
                          'number',
                          ['number', 'number', 'number', 'number']),
  rsa_blinding_key_create: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_create',
                               'void',
                               ['number']),
  rsa_blinding_key_encode: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_encode',
                               'void',
                               ['number', 'number']),
  rsa_blinding_key_decode: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_decode',
                               'number',
                               ['number', 'number']),
  rsa_public_key_decode: getEmsc('GNUNET_CRYPTO_rsa_public_key_decode',
                               'number',
                               ['number', 'number']),
  malloc: (size: number) => Module._malloc(size),
};


enum SignaturePurpose {
}


abstract class ArenaObject {
  nativePtr: number;
  arena: Arena;
  abstract destroy(): void;

  constructor(arena?: Arena) {
    this.nativePtr = 0;
    if (!arena)
      arena = defaultArena;
    arena.put(this);
    this.arena = arena;
  }
}

class Arena {
  heap: Array<ArenaObject>;
  constructor () {
    this.heap = [];
  }

  put(obj) {
    this.heap.push(obj);
  }

  destroy(obj) {
    // XXX: todo
  }
}


// Arena to track allocations that do not use an explicit arena.
var defaultArena = new Arena();


class Amount extends ArenaObject {
  constructor(args?: any, arena?: Arena) {
    super(arena);
    if (args) {
      this.nativePtr = emscAlloc.get_amount(args.value, 0, args.fraction, args.currency);
    } else {
      this.nativePtr = emscAlloc.get_amount(0, 0, 0, "");
    }
  }

  destroy() {
    if (this.nativePtr != 0) {
      emsc.free(this.nativePtr);
    }
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

  get currency() {
    return emsc.get_currency(this.nativePtr);
  }

  toJson() {
    return {
      value: emsc.get_value(this.nativePtr),
      fraction: emsc.get_fraction(this.nativePtr),
      currency: emsc.get_currency(this.nativePtr)
    };
  }

  /**
   * Add an amount to this amount.
   */
  add(a) {
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
  sub(a) {
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

  cmp(a) {
    return emsc.amount_cmp(this.nativePtr, a.nativePtr);
  }

  normalize() {
    emsc.amount_normalize(this.nativePtr);
  }
}


abstract class PackedArenaObject extends ArenaObject {
  abstract size(): number;

  constructor(a?: Arena) {
    super(a);
  }

  stringEncode(): string {
    var d = emscAlloc.data_to_string_alloc(this.nativePtr, this.size());
    var s = Module.Pointer_stringify(d);
    emsc.free(d);
    return s;
  }

  stringDecode(s: string) {
    this.alloc();
    // We need to get the javascript string
    // to the emscripten heap first.
    let buf = ByteArray.fromString(s);
    let res = emsc.string_to_data(buf.nativePtr, s.length, this.nativePtr, this.size());
    buf.destroy();
    if (res < 1) {
      throw {error: "wrong encoding"};
    }
  }

  alloc() {
    if (this.nativePtr === null) {
      this.nativePtr = emscAlloc.malloc(this.size());
    }
  }

  destroy() {
    emsc.free(this.nativePtr);
    this.nativePtr = 0;
  }

  hash(): HashCode {
    var x = new HashCode();
    emsc.hash(this.nativePtr, this.size(), x.nativePtr);
    return x;
  }
}


class AmountNbo extends PackedArenaObject {
  size() { return 24; }
}


class EddsaPrivateKey extends PackedArenaObject {
  static create(a?: Arena): EddsaPrivateKey {
    let obj = new EddsaPrivateKey(a);
    obj.nativePtr = emscAlloc.eddsa_key_create();
    return obj;
  }

  size() { return 32; }

  getPublicKey(a?: Arena): EddsaPublicKey {
    let obj = new EddsaPublicKey(a);
    obj.nativePtr = emscAlloc.eddsa_public_key_from_private(this.nativePtr);
    return obj;
  }
}


class EddsaPublicKey extends PackedArenaObject {
  size() { return 32; }
}


class RsaBlindingKey extends ArenaObject {
  static create(len: number, a?: Arena) {
    let o = new RsaBlindingKey(a);
    o.nativePtr = emscAlloc.rsa_blinding_key_create(len);
    return o;
  }

  stringEncode(): string {
    let ptr = emscAlloc.malloc(PTR_SIZE);
    let size = emscAlloc.rsa_blinding_key_encode(this.nativePtr, ptr);
    let res = new ByteArray(size, Module.getValue(ptr, '*'));
    let s = res.stringEncode();
    emsc.free(ptr);
    res.destroy();
    return s;
  }

  destroy() {
    // TODO
  }
}


class HashCode extends PackedArenaObject {
  size() { return 64; }
}


class ByteArray extends PackedArenaObject {
  private allocatedSize: number;
  size() { return this.allocatedSize; }

  constructor(desiredSize: number, init: number, a?: Arena) {
    super(a);
    if (init === undefined || init === null) {
      this.nativePtr = emscAlloc.malloc(desiredSize);
    } else {
      this.nativePtr = init;
    }
    this.allocatedSize = desiredSize;
  }

  static fromString(s: string, a?: Arena): ByteArray {
    let hstr = emscAlloc.malloc(s.length + 1);
    Module.writeStringToMemory(s, hstr);
    return new ByteArray(s.length, hstr, a);
  }
}


class EccSignaturePurpose extends PackedArenaObject {
  size() { return this.payload.size() + 8; }
  payload: PackedArenaObject;
  constructor(purpose: SignaturePurpose, payload: PackedArenaObject, a?: Arena) {
    super(a);
    this.nativePtr = emscAlloc.purpose_create(purpose, payload.nativePtr, payload.size());
  }
}


abstract class SignatureStruct {
  abstract fieldTypes(): Array<any>;
  abstract purpose(): SignaturePurpose;
  private members: any = {};
  toPurpose(a?: Arena): EccSignaturePurpose {
    let totalSize = 0;
    for (let f of this.fieldTypes()) {
      let name = f[0];
      let member = this.members[name];
      if (!member) {
        throw Error(format("Member {0} not set", name));
      }
      totalSize += this.members[name].size();
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
    let x = new EccSignaturePurpose(this.purpose(), ba, a);
    return x;
  }
  set(name: string, value: any) {
    let typemap: any = {}
    for (let f of this.fieldTypes()) {
      typemap[f[0]] = f[1];
    }
    if (!(name in typemap)) {
      throw {error: "Key not found", key: name};
    }
    if (!(value instanceof typemap[name])) {
      throw {error: "Wrong type", key: name};
    }
    // TODO: check type!
    this.members[name] = value;
  }
}


class WithdrawRequestPS extends SignatureStruct {
  purpose() { return undefined; }
  fieldTypes() {
    return [
       ["reserve_pub", EddsaPublicKey],
       ["amount_with_fee", Amount],
       ["withdraw_fee", Amount],
       ["h_denomination_pub", HashCode],
       ["h_coin_envelope", HashCode]];
  }
}


class RsaPublicKey extends ArenaObject {
  static stringDecode(s: string, a?: Arena): RsaPublicKey {
    let obj = new RsaPublicKey(a);
    let buf = ByteArray.fromString(s);
    obj.nativePtr = emscAlloc.rsa_public_key_decode(buf.nativePtr, s.length);
    buf.destroy();
    return obj;
  }

  destroy() {
    emsc.rsa_public_key_free(this.nativePtr);
    this.nativePtr = 0;
  }
}

class EddsaSignature extends PackedArenaObject {
  size() { return 64; }
}


function rsaBlind(hashCode: HashCode,
                  blindingKey: RsaBlindingKey, 
                  pkey: RsaPublicKey,
                  arena?: Arena): ByteArray
{
  let ptr = emscAlloc.malloc(PTR_SIZE);
  let s = emscAlloc.rsa_blind(hashCode.nativePtr, blindingKey.nativePtr, pkey.nativePtr, ptr);
  let res = new ByteArray(s, Module.getValue(ptr, '*'), arena);
  return res;
}


function eddsaSign(purpose: EccSignaturePurpose,
                   priv: EddsaPrivateKey,
                   a?: Arena): EddsaSignature
{
  throw "Not implemented";
}

