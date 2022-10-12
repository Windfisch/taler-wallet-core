/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems SA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Implementation of dev experiments, i.e. scenarios
 * triggered by taler://dev-experiment URIs.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */

import { Logger } from "@gnu-taler/taler-util";
import { InternalWalletState } from "./internal-wallet-state.js";

const logger = new Logger("dev-experiments.ts");

export async function applyDevExperiment(
  ws: InternalWalletState,
  uri: string,
): Promise<void> {
  logger.info(`applying dev experiment ${uri}`);
}
