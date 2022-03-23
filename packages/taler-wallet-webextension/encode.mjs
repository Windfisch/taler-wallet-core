import {encodeCrock, stringToBytes} from "../taler-util/lib/talerCrypto.js";
const pepe =process.argv[2]
console.log(pepe, encodeCrock(stringToBytes(pepe)));
