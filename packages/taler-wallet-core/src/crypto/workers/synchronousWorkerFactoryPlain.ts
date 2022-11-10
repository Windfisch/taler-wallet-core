/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import { CryptoWorkerFactory } from "./cryptoDispatcher.js";
import { CryptoWorker } from "./cryptoWorkerInterface.js";
import { SynchronousCryptoWorkerPlain } from "./synchronousWorkerPlain.js";

/**
 * The synchronous crypto worker produced by this factory doesn't run in the
 * background, but actually blocks the caller until the operation is done.
 */
export class SynchronousCryptoWorkerFactoryPlain implements CryptoWorkerFactory {
  startWorker(): CryptoWorker {
    return new SynchronousCryptoWorkerPlain();
  }

  getConcurrency(): number {
    return 1;
  }
}
