/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { Logger } from "../util/logging";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrThrow,
  checkSuccessResponseOrThrow,
} from "../util/http";
import { codecForAny } from "../util/codec";
import { AmountString } from "../types/talerTypes";
import { InternalWalletState } from "./state";
import { createTalerWithdrawReserve } from "./reserves";
import { URL } from "../util/url";

const logger = new Logger("operations/testing.ts");

interface BankUser {
  username: string;
  password: string;
}

interface BankWithdrawalResponse {
  taler_withdraw_uri: string;
  withdrawal_id: string;
}

/**
 * Generate a random alphanumeric ID.  Does *not* use cryptographically
 * secure randomness.
 */
function makeId(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Helper function to generate the "Authorization" HTTP header.
 */
function makeAuth(username: string, password: string): string {
  const auth = `${username}:${password}`;
  const authEncoded: string = Buffer.from(auth).toString("base64");
  return `Basic ${authEncoded}`;
}

export async function withdrawTestBalance(
  ws: InternalWalletState,
  amount = "TESTKUDOS:10",
  bankBaseUrl = "https://bank.test.taler.net/",
  exchangeBaseUrl = "https://exchange.test.taler.net/",
): Promise<void> {
  const bankUser = await registerRandomBankUser(ws.http, bankBaseUrl);
  logger.trace(`Registered bank user ${JSON.stringify(bankUser)}`);

  const wresp = await createBankWithdrawalUri(
    ws.http,
    bankBaseUrl,
    bankUser,
    amount,
  );

  await createTalerWithdrawReserve(
    ws,
    wresp.taler_withdraw_uri,
    exchangeBaseUrl,
  );

  await confirmBankWithdrawalUri(
    ws.http,
    bankBaseUrl,
    bankUser,
    wresp.withdrawal_id,
  );
}

async function createBankWithdrawalUri(
  http: HttpRequestLibrary,
  bankBaseUrl: string,
  bankUser: BankUser,
  amount: AmountString,
): Promise<BankWithdrawalResponse> {
  const reqUrl = new URL(
    `accounts/${bankUser.username}/withdrawals`,
    bankBaseUrl,
  ).href;
  const resp = await http.postJson(
    reqUrl,
    {
      amount,
    },
    {
      headers: {
        Authorization: makeAuth(bankUser.username, bankUser.password),
      },
    },
  );
  const respJson = await readSuccessResponseJsonOrThrow(resp, codecForAny);
  return respJson;
}

async function confirmBankWithdrawalUri(
  http: HttpRequestLibrary,
  bankBaseUrl: string,
  bankUser: BankUser,
  withdrawalId: string,
): Promise<void> {
  const reqUrl = new URL(
    `accounts/${bankUser.username}/withdrawals/${withdrawalId}/confirm`,
    bankBaseUrl,
  ).href;
  const resp = await http.postJson(
    reqUrl,
    {},
    {
      headers: {
        Authorization: makeAuth(bankUser.username, bankUser.password),
      },
    },
  );
  await readSuccessResponseJsonOrThrow(resp, codecForAny);
  return;
}

async function registerRandomBankUser(
  http: HttpRequestLibrary,
  bankBaseUrl: string,
): Promise<BankUser> {
  const reqUrl = new URL("testing/register", bankBaseUrl).href;
  const randId = makeId(8);
  const bankUser: BankUser = {
    username: `testuser-${randId}`,
    password: `testpw-${randId}`,
  };

  const resp = await http.postJson(reqUrl, bankUser);
  await checkSuccessResponseOrThrow(resp);
  return bankUser;
}
