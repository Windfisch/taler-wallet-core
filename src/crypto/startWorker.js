/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


// @ts-nocheck


/**
 * Start a crypto worker, using different worker
 * mechanisms depending on the environment.
 *
 * @returns {Worker}
 */
export function startWorker() {
  let workerCtor;
  let workerPath;
  if (typeof Worker !== "undefined") {
    // we're in the browser
    workerCtor = Worker;
    workerPath = "/dist/cryptoWorker-bundle.js";
  } else if (typeof "require" !== "undefined") {
    workerCtor = require("./nodeWorker").Worker;
    workerPath = __dirname + "/cryptoWorker.js";
  } else {
    throw Error("Can't create worker, unknown environment");
  }
  return new workerCtor(workerPath);
}
