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
 * Client for the Taler (demo-)bank.
 */

/**
 * Imports.
 */
import {
  AmountString,
  buildCodecForObject,
  Codec,
  codecForAny,
  codecForString,
  encodeCrock,
  getRandomBytes,
  j2s,
  Logger,
} from "@gnu-taler/taler-util";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrErrorCode,
  readSuccessResponseJsonOrThrow,
} from "./index.browser.js";

const logger = new Logger("bank-api-client.ts");

export enum CreditDebitIndicator {
  Credit = "credit",
  Debit = "debit",
}

export interface BankAccountBalanceResponse {
  balance: {
    amount: AmountString;
    credit_debit_indicator: CreditDebitIndicator;
  };
}

export interface BankServiceHandle {
  readonly baseUrl: string;
  readonly http: HttpRequestLibrary;
}

export interface BankUser {
  username: string;
  password: string;
  accountPaytoUri: string;
}

export interface WithdrawalOperationInfo {
  withdrawal_id: string;
  taler_withdraw_uri: string;
}

/**
 * FIXME: Rename, this is not part of the integration test harness anymore.
 */
export interface HarnessExchangeBankAccount {
  accountName: string;
  accountPassword: string;
  accountPaytoUri: string;
  wireGatewayApiBaseUrl: string;
}

/**
 * Helper function to generate the "Authorization" HTTP header.
 */
function makeBasicAuthHeader(username: string, password: string): string {
  const auth = `${username}:${password}`;
  const authEncoded: string = Buffer.from(auth).toString("base64");
  return `Basic ${authEncoded}`;
}

const codecForWithdrawalOperationInfo = (): Codec<WithdrawalOperationInfo> =>
  buildCodecForObject<WithdrawalOperationInfo>()
    .property("withdrawal_id", codecForString())
    .property("taler_withdraw_uri", codecForString())
    .build("WithdrawalOperationInfo");

export namespace BankApi {
  export async function registerAccount(
    bank: BankServiceHandle,
    username: string,
    password: string,
  ): Promise<BankUser> {
    const url = new URL("testing/register", bank.baseUrl);
    const resp = await bank.http.postJson(url.href, { username, password });
    let paytoUri = `payto://x-taler-bank/localhost/${username}`;
    if (resp.status !== 200 && resp.status !== 202) {
      logger.error(`${j2s(await resp.json())}`);
      throw new Error();
    }
    const respJson = await readSuccessResponseJsonOrThrow(resp, codecForAny());
    // LibEuFin demobank returns payto URI in response
    if (respJson.paytoUri) {
      paytoUri = respJson.paytoUri;
    }
    try {
      const respJson = await resp.json();
    } catch (e) {}
    return {
      password,
      username,
      accountPaytoUri: paytoUri,
    };
  }

  export async function createRandomBankUser(
    bank: BankServiceHandle,
  ): Promise<BankUser> {
    const username = "user-" + encodeCrock(getRandomBytes(10)).toLowerCase();
    const password = "pw-" + encodeCrock(getRandomBytes(10)).toLowerCase();
    return await registerAccount(bank, username, password);
  }

  export async function adminAddIncoming(
    bank: BankServiceHandle,
    params: {
      exchangeBankAccount: HarnessExchangeBankAccount;
      amount: string;
      reservePub: string;
      debitAccountPayto: string;
    },
  ) {
    let maybeBaseUrl = bank.baseUrl;
    let url = new URL(
      `taler-wire-gateway/${params.exchangeBankAccount.accountName}/admin/add-incoming`,
      maybeBaseUrl,
    );
    await bank.http.postJson(
      url.href,
      {
        amount: params.amount,
        reserve_pub: params.reservePub,
        debit_account: params.debitAccountPayto,
      },
      {
        headers: {
          Authorization: makeBasicAuthHeader(
            params.exchangeBankAccount.accountName,
            params.exchangeBankAccount.accountPassword,
          ),
        },
      },
    );
  }

  export async function confirmWithdrawalOperation(
    bank: BankServiceHandle,
    bankUser: BankUser,
    wopi: WithdrawalOperationInfo,
  ): Promise<void> {
    const url = new URL(
      `accounts/${bankUser.username}/withdrawals/${wopi.withdrawal_id}/confirm`,
      bank.baseUrl,
    );
    await bank.http.postJson(
      url.href,
      {},
      {
        headers: {
          Authorization: makeBasicAuthHeader(
            bankUser.username,
            bankUser.password,
          ),
        },
      },
    );
  }

  export async function abortWithdrawalOperation(
    bank: BankServiceHandle,
    bankUser: BankUser,
    wopi: WithdrawalOperationInfo,
  ): Promise<void> {
    const url = new URL(
      `accounts/${bankUser.username}/withdrawals/${wopi.withdrawal_id}/abort`,
      bank.baseUrl,
    );
    await bank.http.postJson(
      url.href,
      {},
      {
        headers: {
          Authorization: makeBasicAuthHeader(
            bankUser.username,
            bankUser.password,
          ),
        },
      },
    );
  }
}

export namespace BankAccessApi {
  export async function getAccountBalance(
    bank: BankServiceHandle,
    bankUser: BankUser,
  ): Promise<BankAccountBalanceResponse> {
    const url = new URL(`accounts/${bankUser.username}`, bank.baseUrl);
    const resp = await bank.http.get(url.href, {
      headers: {
        Authorization: makeBasicAuthHeader(
          bankUser.username,
          bankUser.password,
        ),
      },
    });
    return await resp.json();
  }

  export async function createWithdrawalOperation(
    bank: BankServiceHandle,
    bankUser: BankUser,
    amount: string,
  ): Promise<WithdrawalOperationInfo> {
    const url = new URL(
      `accounts/${bankUser.username}/withdrawals`,
      bank.baseUrl,
    );
    const resp = await bank.http.postJson(
      url.href,
      {
        amount,
      },
      {
        headers: {
          Authorization: makeBasicAuthHeader(
            bankUser.username,
            bankUser.password,
          ),
        },
      },
    );
    return readSuccessResponseJsonOrThrow(
      resp,
      codecForWithdrawalOperationInfo(),
    );
  }
}
