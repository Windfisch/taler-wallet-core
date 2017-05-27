/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


const fs = require("fs");
const vm = require("vm");

process.once("message", (obj: any) => {
  const g: any = global as any;

  (g as any).self = {
    close: () => {
      process.exit(0);
    },
    postMessage: (msg: any) => {
      const str: string = JSON.stringify({data: msg});
      if (process.send) {
        process.send(str);
      }
    },
    onmessage: undefined,
    onerror: (err: any) => {
      const str: string = JSON.stringify({error: err.message, stack: err.stack});
      if (process.send) {
        process.send(str);
      }
    },
    addEventListener: (event: "error" | "message", fn: (x: any) => void) => {
      if (event == "error") {
        g.onerror = fn;
      } else if (event == "message") {
        g.onmessage = fn;
      }
    },
  };

  g.__dirname = obj.cwd;
  g.__filename = __filename;
  //g.require = require;
  //g.module = module;
  //g.exports = module.exports;

  g.importScripts = (...files: string[]) => {
    if (files.length > 0) {
      vm.createScript(files.map(file => fs.readFileSync(file, "utf8")).join("\n")).runInThisContext();
    }
  };

  Object.keys(g.self).forEach(key => {
    g[key] = g.self[key];
  });

  process.on("message", (msg: any) => {
    try {
      (g.onmessage || g.self.onmessage || (() => {}))(JSON.parse(msg));
    } catch (err) {
      (g.onerror || g.self.onerror || (() => {}))(err);
    }
  });

  process.on("error", (err: any) => {
    (g.onerror || g.self.onerror || (() => {}))(err);
  });

  require(obj.scriptFilename);
});
