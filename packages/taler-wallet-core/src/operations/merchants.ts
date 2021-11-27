/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A..

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
import {
  canonicalizeBaseUrl,
  Logger,
  URL,
  codecForMerchantConfigResponse,
  LibtoolVersion,
} from "@gnu-taler/taler-util";
import { InternalWalletState, MerchantInfo } from "../common.js";
import { readSuccessResponseJsonOrThrow } from "../index.js";

const logger = new Logger("taler-wallet-core:merchants.ts");

export async function getMerchantInfo(
  ws: InternalWalletState,
  merchantBaseUrl: string,
): Promise<MerchantInfo> {
  const canonBaseUrl = canonicalizeBaseUrl(merchantBaseUrl);

  const existingInfo = ws.merchantInfoCache[canonBaseUrl];
  if (existingInfo) {
    return existingInfo;
  }

  const configUrl = new URL("config", canonBaseUrl);
  const resp = await ws.http.get(configUrl.href);

  const configResp = await readSuccessResponseJsonOrThrow(
    resp,
    codecForMerchantConfigResponse(),
  );

  logger.info(
    `merchant "${canonBaseUrl}" reports protocol ${configResp.version}"`,
  );

  const parsedVersion = LibtoolVersion.parseVersion(configResp.version);
  if (!parsedVersion) {
    throw Error("invalid merchant version");
  }

  const merchantInfo: MerchantInfo = {
    protocolVersionCurrent: parsedVersion.current,
  };

  ws.merchantInfoCache[canonBaseUrl] = merchantInfo;
  return merchantInfo;
}
