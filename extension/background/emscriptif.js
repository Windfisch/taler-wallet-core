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
// Size of a native pointer.
const PTR_SIZE = 4;
const GNUNET_OK = 1;
const GNUNET_YES = 1;
const GNUNET_NO = 0;
const GNUNET_SYSERR = -1;
let getEmsc = (...args) => Module.cwrap.apply(null, args);
var emsc = {
    free: (ptr) => Module._free(ptr),
    get_value: getEmsc('TALER_WR_get_value', 'number', ['number']),
    get_fraction: getEmsc('TALER_WR_get_fraction', 'number', ['number']),
    get_currency: getEmsc('TALER_WR_get_currency', 'string', ['number']),
    amount_add: getEmsc('TALER_amount_add', 'number', ['number', 'number', 'number']),
    amount_subtract: getEmsc('TALER_amount_subtract', 'number', ['number', 'number', 'number']),
    amount_normalize: getEmsc('TALER_amount_normalize', 'void', ['number']),
    amount_get_zero: getEmsc('TALER_amount_get_zero', 'number', ['string', 'number']),
    amount_cmp: getEmsc('TALER_amount_cmp', 'number', ['number', 'number']),
    amount_hton: getEmsc('TALER_amount_hton', 'void', ['number', 'number']),
    amount_ntoh: getEmsc('TALER_amount_ntoh', 'void', ['number', 'number']),
    hash: getEmsc('GNUNET_CRYPTO_hash', 'void', ['number', 'number', 'number']),
    memmove: getEmsc('memmove', 'number', ['number', 'number', 'number']),
    rsa_public_key_free: getEmsc('GNUNET_CRYPTO_rsa_public_key_free', 'void', ['number']),
    rsa_signature_free: getEmsc('GNUNET_CRYPTO_rsa_signature_free', 'void', ['number']),
    string_to_data: getEmsc('GNUNET_STRINGS_string_to_data', 'number', ['number', 'number', 'number', 'number']),
    eddsa_sign: getEmsc('GNUNET_CRYPTO_eddsa_sign', 'number', ['number', 'number', 'number']),
    hash_create_random: getEmsc('GNUNET_CRYPTO_hash_create_random', 'void', ['number', 'number']),
    rsa_blinding_key_destroy: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_free', 'void', ['number']),
};
var emscAlloc = {
    get_amount: getEmsc('TALER_WRALL_get_amount', 'number', ['number', 'number', 'number', 'string']),
    eddsa_key_create: getEmsc('GNUNET_CRYPTO_eddsa_key_create', 'number', []),
    eddsa_public_key_from_private: getEmsc('TALER_WRALL_eddsa_public_key_from_private', 'number', ['number']),
    data_to_string_alloc: getEmsc('GNUNET_STRINGS_data_to_string_alloc', 'number', ['number', 'number']),
    purpose_create: getEmsc('TALER_WRALL_purpose_create', 'number', ['number', 'number', 'number']),
    rsa_blind: getEmsc('GNUNET_CRYPTO_rsa_blind', 'number', ['number', 'number', 'number', 'number']),
    rsa_blinding_key_create: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_create', 'number', ['number']),
    rsa_blinding_key_encode: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_encode', 'number', ['number', 'number']),
    rsa_signature_encode: getEmsc('GNUNET_CRYPTO_rsa_signature_encode', 'number', ['number', 'number']),
    rsa_blinding_key_decode: getEmsc('GNUNET_CRYPTO_rsa_blinding_key_decode', 'number', ['number', 'number']),
    rsa_public_key_decode: getEmsc('GNUNET_CRYPTO_rsa_public_key_decode', 'number', ['number', 'number']),
    rsa_signature_decode: getEmsc('GNUNET_CRYPTO_rsa_signature_decode', 'number', ['number', 'number']),
    rsa_public_key_encode: getEmsc('GNUNET_CRYPTO_rsa_public_key_encode', 'number', ['number', 'number']),
    rsa_unblind: getEmsc('GNUNET_CRYPTO_rsa_unblind', 'number', ['number', 'number', 'number']),
    malloc: (size) => Module._malloc(size),
};
var SignaturePurpose;
(function (SignaturePurpose) {
    SignaturePurpose[SignaturePurpose["RESERVE_WITHDRAW"] = 1200] = "RESERVE_WITHDRAW";
    SignaturePurpose[SignaturePurpose["WALLET_COIN_DEPOSIT"] = 1201] = "WALLET_COIN_DEPOSIT";
})(SignaturePurpose || (SignaturePurpose = {}));
var RandomQuality;
(function (RandomQuality) {
    RandomQuality[RandomQuality["WEAK"] = 0] = "WEAK";
    RandomQuality[RandomQuality["STRONG"] = 1] = "STRONG";
    RandomQuality[RandomQuality["NONCE"] = 2] = "NONCE";
})(RandomQuality || (RandomQuality = {}));
class ArenaObject {
    constructor(arena) {
        this.nativePtr = null;
        if (!arena) {
            if (arenaStack.length == 0) {
                throw Error("No arena available");
            }
            arena = arenaStack[arenaStack.length - 1];
        }
        arena.put(this);
        this.arena = arena;
    }
    getNative() {
        // We want to allow latent allocation
        // of native wrappers, but we never want to
        // pass 'undefined' to emscripten.
        if (this._nativePtr === undefined) {
            throw Error("Native pointer not initialized");
        }
        return this._nativePtr;
    }
    free() {
        if (this.nativePtr !== undefined) {
            emsc.free(this.nativePtr);
            this.nativePtr = undefined;
        }
    }
    alloc(size) {
        if (this.nativePtr !== undefined) {
            throw Error("Double allocation");
        }
        this.nativePtr = emscAlloc.malloc(size);
    }
    setNative(n) {
        if (n === undefined) {
            throw Error("Native pointer must be a number or null");
        }
        this._nativePtr = n;
    }
    set nativePtr(v) {
        this.setNative(v);
    }
    get nativePtr() {
        return this.getNative();
    }
}
class DefaultArena {
    constructor() {
        this.heap = [];
    }
    put(obj) {
        this.heap.push(obj);
    }
    destroy() {
        for (let obj of this.heap) {
            obj.destroy();
        }
        this.heap = [];
    }
}
/**
 * Arena that destroys all its objects once control has returned to the message
 * loop and a small interval has passed.
 */
class SyncArena extends DefaultArena {
    constructor() {
        super();
        let me = this;
        this.timer = new Worker('background/timerThread.js');
        this.timer.onmessage = () => {
            this.destroy();
        };
        //this.timer.postMessage({interval: 50});
    }
    destroy() {
        super.destroy();
    }
}
let arenaStack = [];
arenaStack.push(new SyncArena());
class Amount extends ArenaObject {
    constructor(args, arena) {
        super(arena);
        if (args) {
            this.nativePtr = emscAlloc.get_amount(args.value, 0, args.fraction, args.currency);
        }
        else {
            this.nativePtr = emscAlloc.get_amount(0, 0, 0, "");
        }
    }
    destroy() {
        if (this.nativePtr != 0) {
            emsc.free(this.nativePtr);
        }
    }
    static getZero(currency, a) {
        let am = new Amount(null, a);
        let r = emsc.amount_get_zero(currency, am.getNative());
        if (r != GNUNET_OK) {
            throw Error("invalid currency");
        }
        return am;
    }
    toNbo(a) {
        let x = new AmountNbo(a);
        x.alloc();
        emsc.amount_hton(x.nativePtr, this.nativePtr);
        return x;
    }
    fromNbo(nbo) {
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
class PackedArenaObject extends ArenaObject {
    constructor(a) {
        super(a);
    }
    toCrock() {
        var d = emscAlloc.data_to_string_alloc(this.nativePtr, this.size());
        var s = Module.Pointer_stringify(d);
        emsc.free(d);
        return s;
    }
    loadCrock(s) {
        this.alloc();
        // We need to get the javascript string
        // to the emscripten heap first.
        let buf = ByteArray.fromString(s);
        let res = emsc.string_to_data(buf.nativePtr, s.length, this.nativePtr, this.size());
        buf.destroy();
        if (res < 1) {
            throw { error: "wrong encoding" };
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
    hash() {
        var x = new HashCode();
        x.alloc();
        emsc.hash(this.nativePtr, this.size(), x.nativePtr);
        return x;
    }
    hexdump() {
        let bytes = [];
        for (let i = 0; i < this.size(); i++) {
            let b = Module.getValue(this.getNative() + i, "i8");
            b = (b + 256) % 256;
            bytes.push("0".concat(b.toString(16)).slice(-2));
        }
        let lines = [];
        for (let i = 0; i < bytes.length; i += 8) {
            lines.push(bytes.slice(i, i + 8).join(","));
        }
        return lines.join("\n");
    }
}
class AmountNbo extends PackedArenaObject {
    size() {
        return 24;
    }
}
class EddsaPrivateKey extends PackedArenaObject {
    static create(a) {
        let obj = new EddsaPrivateKey(a);
        obj.nativePtr = emscAlloc.eddsa_key_create();
        return obj;
    }
    size() {
        return 32;
    }
    getPublicKey(a) {
        let obj = new EddsaPublicKey(a);
        obj.nativePtr = emscAlloc.eddsa_public_key_from_private(this.nativePtr);
        return obj;
    }
}
mixinStatic(EddsaPrivateKey, fromCrock);
function fromCrock(s) {
    let x = new this();
    x.alloc();
    x.loadCrock(s);
    return x;
}
function mixin(obj, method, name) {
    if (!name) {
        name = method.name;
    }
    if (!name) {
        throw Error("Mixin needs a name.");
    }
    obj.prototype[method.name] = method;
}
function mixinStatic(obj, method, name) {
    if (!name) {
        name = method.name;
    }
    if (!name) {
        throw Error("Mixin needs a name.");
    }
    obj[method.name] = method;
}
class EddsaPublicKey extends PackedArenaObject {
    size() {
        return 32;
    }
}
mixinStatic(EddsaPublicKey, fromCrock);
function makeFromCrock(decodeFn) {
    function fromCrock(s, a) {
        let obj = new this(a);
        let buf = ByteArray.fromCrock(s);
        obj.setNative(decodeFn(buf.getNative(), buf.size()));
        buf.destroy();
        return obj;
    }
    return fromCrock;
}
function makeToCrock(encodeFn) {
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
class RsaBlindingKey extends ArenaObject {
    constructor(...args) {
        super(...args);
        this.toCrock = makeToCrock(emscAlloc.rsa_blinding_key_encode);
    }
    static create(len, a) {
        let o = new RsaBlindingKey(a);
        o.nativePtr = emscAlloc.rsa_blinding_key_create(len);
        return o;
    }
    destroy() {
        // TODO
    }
}
mixinStatic(RsaBlindingKey, makeFromCrock(emscAlloc.rsa_blinding_key_decode));
class HashCode extends PackedArenaObject {
    size() {
        return 64;
    }
    random(qualStr) {
        let qual;
        switch (qualStr) {
            case "weak":
                qual = RandomQuality.WEAK;
                break;
            case "strong":
            case null:
            case undefined:
                qual = RandomQuality.STRONG;
                break;
            case "nonce":
                qual = RandomQuality.NONCE;
                break;
                break;
            default:
                throw Error(format("unknown crypto quality: {0}", qual));
        }
        this.alloc();
        emsc.hash_create_random(qual, this.nativePtr);
    }
}
mixinStatic(HashCode, fromCrock);
class ByteArray extends PackedArenaObject {
    constructor(desiredSize, init, a) {
        super(a);
        if (init === undefined || init === null) {
            this.nativePtr = emscAlloc.malloc(desiredSize);
        }
        else {
            this.nativePtr = init;
        }
        this.allocatedSize = desiredSize;
    }
    size() {
        return this.allocatedSize;
    }
    static fromString(s, a) {
        let hstr = emscAlloc.malloc(s.length + 1);
        Module.writeStringToMemory(s, hstr);
        return new ByteArray(s.length, hstr, a);
    }
    static fromCrock(s, a) {
        let hstr = emscAlloc.malloc(s.length + 1);
        Module.writeStringToMemory(s, hstr);
        let decodedLen = Math.floor((s.length * 5) / 8);
        let ba = new ByteArray(decodedLen, null, a);
        let res = emsc.string_to_data(hstr, s.length, ba.nativePtr, decodedLen);
        emsc.free(hstr);
        if (res != GNUNET_OK) {
            throw Error("decoding failed");
        }
        return ba;
    }
}
class EccSignaturePurpose extends PackedArenaObject {
    constructor(purpose, payload, a) {
        super(a);
        this.nativePtr = emscAlloc.purpose_create(purpose, payload.nativePtr, payload.size());
        this.payloadSize = payload.size();
    }
    size() {
        return this.payloadSize + 8;
    }
}
class SignatureStruct {
    constructor(x) {
        this.members = {};
        for (let k in x) {
            this.set(k, x[k]);
        }
    }
    toPurpose(a) {
        let totalSize = 0;
        for (let f of this.fieldTypes()) {
            let name = f[0];
            let member = this.members[name];
            if (!member) {
                throw Error(format("Member {0} not set", name));
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
    set(name, value) {
        let typemap = {};
        for (let f of this.fieldTypes()) {
            typemap[f[0]] = f[1];
        }
        if (!(name in typemap)) {
            throw Error(format("Key {0} not found", name));
        }
        if (!(value instanceof typemap[name])) {
            throw Error(format("Wrong type for {0}", name));
        }
        this.members[name] = value;
    }
}
class WithdrawRequestPS extends SignatureStruct {
    constructor(w) {
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
class AbsoluteTimeNbo extends PackedArenaObject {
    static fromTalerString(s) {
        let x = new AbsoluteTimeNbo();
        x.alloc();
        let r = /Date\(([0-9]+)\)/;
        let m = r.exec(s);
        if (m.length != 2) {
            throw Error();
        }
        let n = parseInt(m[1]) * 1000000;
        // XXX: This only works up to 54 bit numbers.
        set64(x.getNative(), n);
        return x;
    }
    size() {
        return 8;
    }
}
// XXX: This only works up to 54 bit numbers.
function set64(p, n) {
    for (let i = 0; i < 8; ++i) {
        Module.setValue(p + (7 - i), n & 0xFF, "i8");
        n = Math.floor(n / 256);
    }
}
class UInt64 extends PackedArenaObject {
    static fromNumber(n) {
        let x = new UInt64();
        x.alloc();
        console.log("Creating UINT64 with", n);
        set64(x.getNative(), n);
        return x;
    }
    size() {
        return 8;
    }
}
class DepositRequestPS extends SignatureStruct {
    constructor(w) {
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
function makeEncode(encodeFn) {
    function encode(arena) {
        let ptr = emscAlloc.malloc(PTR_SIZE);
        let len = encodeFn(this.getNative(), ptr);
        let res = new ByteArray(len, null, arena);
        res.setNative(Module.getValue(ptr, '*'));
        emsc.free(ptr);
        return res;
    }
    return encode;
}
class RsaPublicKey extends ArenaObject {
    toCrock() {
        return this.encode().toCrock();
    }
    destroy() {
        emsc.rsa_public_key_free(this.nativePtr);
        this.nativePtr = 0;
    }
}
mixinStatic(RsaPublicKey, makeFromCrock(emscAlloc.rsa_public_key_decode));
mixin(RsaPublicKey, makeEncode(emscAlloc.rsa_public_key_encode));
class EddsaSignature extends PackedArenaObject {
    size() {
        return 64;
    }
}
class RsaSignature extends ArenaObject {
    destroy() {
        emsc.rsa_signature_free(this.getNative());
        this.setNative(0);
    }
}
mixinStatic(RsaSignature, makeFromCrock(emscAlloc.rsa_signature_decode));
mixin(RsaSignature, makeEncode(emscAlloc.rsa_signature_encode));
function rsaBlind(hashCode, blindingKey, pkey, arena) {
    let ptr = emscAlloc.malloc(PTR_SIZE);
    let s = emscAlloc.rsa_blind(hashCode.nativePtr, blindingKey.nativePtr, pkey.nativePtr, ptr);
    return new ByteArray(s, Module.getValue(ptr, '*'), arena);
}
function eddsaSign(purpose, priv, a) {
    let sig = new EddsaSignature(a);
    sig.alloc();
    let res = emsc.eddsa_sign(priv.nativePtr, purpose.nativePtr, sig.nativePtr);
    if (res < 1) {
        throw Error("EdDSA signing failed");
    }
    return sig;
}
function rsaUnblind(sig, bk, pk, a) {
    let x = new RsaSignature(a);
    x.nativePtr = emscAlloc.rsa_unblind(sig.nativePtr, bk.nativePtr, pk.nativePtr);
    return x;
}
