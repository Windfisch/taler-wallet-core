/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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
 * API to access the Taler crypto worker thread.
 * @author Florian Dold
 */

import {
  CryptoWorker,
  CryptoWorkerFactory,
  SynchronousCryptoWorker,
} from "@gnu-taler/taler-wallet-core";

export class SynchronousCryptoWorkerFactory implements CryptoWorkerFactory {
  startWorker(): CryptoWorker {
    return new SynchronousCryptoWorker();
  }

  getConcurrency(): number {
    return 1;
  }
}
