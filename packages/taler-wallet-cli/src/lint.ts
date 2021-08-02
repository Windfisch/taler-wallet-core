/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
import { Configuration } from "@gnu-taler/taler-util";

/**
 * Do some basic checks in the configuration of a Taler deployment.
 */
export function lintDeployment() {
  const cfg = Configuration.load();
  const currencyEntry = cfg.getString("taler", "currency");
  let mainCurrency: string | undefined;

  if (!currencyEntry.value) {
    console.log("error: currency not defined in section TALER option CURRENCY");
  } else {
    mainCurrency = currencyEntry.value.toUpperCase();
  }

  if (mainCurrency === "KUDOS") {
    console.log(
      "warning: section TALER option CURRENCY contains toy currency value KUDOS",
    );
  }
}
