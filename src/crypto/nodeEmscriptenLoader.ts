
import { EmscEnvironment } from "./emscInterface";
import { CryptoImplementation } from "./cryptoImplementation";

import fs = require("fs");

export class NodeEmscriptenLoader {
  private cachedEmscEnvironment: EmscEnvironment | undefined = undefined;
  private cachedEmscEnvironmentPromise:
    | Promise<EmscEnvironment>
    | undefined = undefined;

    private async getWasmBinary(): Promise<Uint8Array> {
      // @ts-ignore
      const akonoGetData = global.__akono_getData;
      if (akonoGetData) {
        // We're running embedded node on Android
        console.log("reading wasm binary from akono");
        const data = akonoGetData("taler-emscripten-lib.wasm");
        // The data we get is base64-encoded binary data
        let buf = new Buffer(data, 'base64');
        return new Uint8Array(buf);
  
      } else {
        // We're in a normal node environment
        const binaryPath = __dirname + "/../../../emscripten/taler-emscripten-lib.wasm";
        const wasmBinary = new Uint8Array(fs.readFileSync(binaryPath));
        return wasmBinary;
      }
    }
  
    async getEmscriptenEnvironment(): Promise<EmscEnvironment> {
      if (this.cachedEmscEnvironment) {
        return this.cachedEmscEnvironment;
      }
  
      if (this.cachedEmscEnvironmentPromise) {
        return this.cachedEmscEnvironmentPromise;
      }
  
      let lib: any;
  
      const wasmBinary = await this.getWasmBinary();
  
      return new Promise((resolve, reject) => {
        // Arguments passed to the emscripten prelude
        const libArgs = {
          wasmBinary,
          onRuntimeInitialized: () => {
            if (!lib) {
              console.error("fatal emscripten initialization error");
              return;
            }
            this.cachedEmscEnvironmentPromise = undefined;
            this.cachedEmscEnvironment = new EmscEnvironment(lib);
            resolve(this.cachedEmscEnvironment);
          },
        };
  
        // Make sure that TypeScript doesn't try
        // to check the taler-emscripten-lib.
        const indirectRequire = require;
  
        const g = global;
  
        // unavoidable hack, so that emscripten detects
        // the environment as node even though importScripts
        // is present.
  
        // @ts-ignore
        const savedImportScripts = g.importScripts;
        // @ts-ignore
        delete g.importScripts;
        // @ts-ignore
        const savedCrypto = g.crypto;
        // @ts-ignore
        delete g.crypto;
  
        // Assume that the code is run from the dist/ directory.
        const libFn = indirectRequire(
          "../../../emscripten/taler-emscripten-lib.js",
        );
        lib = libFn(libArgs);
  
        // @ts-ignore
        g.importScripts = savedImportScripts;
        // @ts-ignore
        g.crypto = savedCrypto;
  
        if (!lib) {
          throw Error("could not load taler-emscripten-lib.js");
        }
  
        if (!lib.ccall) {
          throw Error(
            "sanity check failed: taler-emscripten lib does not have 'ccall'",
          );
        }
      });
    }
}
