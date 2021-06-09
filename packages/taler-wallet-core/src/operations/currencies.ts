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
import { ExchangeRecord } from "../db.js";
import { Logger } from "@gnu-taler/taler-util";
import { getExchangeDetails } from "./exchanges.js";
import { InternalWalletState } from "./state.js";

const logger = new Logger("currencies.ts");

export interface TrustInfo {
  isTrusted: boolean;
  isAudited: boolean;
}

/**
 * Check if and how an exchange is trusted and/or audited.
 */
export async function getExchangeTrust(
  ws: InternalWalletState,
  exchangeInfo: ExchangeRecord,
): Promise<TrustInfo> {
  let isTrusted = false;
  let isAudited = false;

  return await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      exchangesTrustStore: x.exchangeTrust,
      auditorTrust: x.auditorTrust,
    }))
    .runReadOnly(async (tx) => {
      const exchangeDetails = await getExchangeDetails(
        tx,
        exchangeInfo.baseUrl,
      );

      if (!exchangeDetails) {
        throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
      }
      const exchangeTrustRecord = await tx.exchangesTrustStore.indexes.byExchangeMasterPub.get(
        exchangeDetails.masterPublicKey,
      );
      if (
        exchangeTrustRecord &&
        exchangeTrustRecord.uids.length > 0 &&
        exchangeTrustRecord.currency === exchangeDetails.currency
      ) {
        isTrusted = true;
      }

      for (const auditor of exchangeDetails.auditors) {
        const auditorTrustRecord = await tx.auditorTrust.indexes.byAuditorPub.get(
          auditor.auditor_pub,
        );
        if (auditorTrustRecord && auditorTrustRecord.uids.length > 0) {
          isAudited = true;
          break;
        }
      }

      return { isTrusted, isAudited };
    });
}
