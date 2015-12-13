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
                      ['number', 'number'])
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
  malloc: (size : number) => Module._malloc(size),
};

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
    let res = emsc.amount_subtract(this.nativePtr, a.nativePtr, this.nativePtr);
    if (res == 0) {
      // Underflow
      return false;
    }
    if (res > 0) {
      return true;
    }
    throw "Incompatible currencies";
  }

  cmp(a) {
    return emsc.amount_cmp(this.nativePtr, a.nativePtr);
  }

  normalize() {
    emsc.amount_normalize(this.nativePtr);
  }
}


class EddsaPrivateKey extends ArenaObject {
  static create(a?: Arena): EddsaPrivateKey {
    let k = new EddsaPrivateKey(a);
    k.nativePtr = emscAlloc.eddsa_key_create();
    return k;
  }

  destroy() {
    // TODO
  }

  getPublicKey(): EddsaPublicKey {
    let pk = new EddsaPublicKey(this.arena);
    pk.nativePtr = emscAlloc.eddsa_public_key_from_private(this.nativePtr);
    return pk;
  }

  encode(): string {
    throw "not implemented";
  }
}


class EddsaPublicKey extends ArenaObject {
  destroy() {
    // TODO
  }

  encode(): string {
    throw "not implemented";
  }
}


class RsaBlindingKey extends ArenaObject {
  destroy() {
    // TODO
  }
}


class HashCode extends ArenaObject {
  destroy() {
    // TODO
  }
}


class ByteArray extends ArenaObject {
  destroy() {
    // TODO
  }
}


class RsaPublicKey extends ArenaObject {
  destroy() {
    // TODO
  }
}


function rsaBlind(hashCode: HashCode,
                  blindingKey: RsaBlindingKey, 
                  pkey: RsaPublicKey,
                  arena?: Arena): ByteArray
{
  return null;
}

