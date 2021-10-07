import { md5, sha1, sha512, sha3 } from 'hash-wasm';

async function run() {
  console.log('MD5:', await md5('demo'));

  const int8Buffer = new Uint8Array([0, 1, 2, 3]);
  console.log('SHA1:', await sha1(int8Buffer));
  console.log('SHA512:', await sha512(int8Buffer));

  const int32Buffer = new Uint32Array([1056, 641]);
  console.log('SHA3-256:', await sha3(int32Buffer, 256));
}

run();