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

/**
 * Imports.
 */
import {
  AmountJson,
  AmountLike,
  Amounts,
  AmountString,
  codecForBankWithdrawalOperationPostResponse,
  codecForDepositSuccess,
  codecForExchangeMeltResponse,
  codecForWithdrawResponse,
  DenominationPubKey,
  eddsaGetPublic,
  encodeCrock,
  ExchangeMeltRequest,
  ExchangeProtocolVersion,
  ExchangeWithdrawRequest,
  getRandomBytes,
  getTimestampNow,
  hashWire,
  j2s,
  Timestamp,
  UnblindedSignature,
} from "@gnu-taler/taler-util";
import {
  BankAccessApi,
  BankApi,
  BankServiceHandle,
  CryptoApi,
  DenominationRecord,
  downloadExchangeInfo,
  ExchangeInfo,
  getBankWithdrawalInfo,
  HttpRequestLibrary,
  isWithdrawableDenom,
  NodeHttpLib,
  OperationFailedError,
  readSuccessResponseJsonOrThrow,
  SynchronousCryptoWorkerFactory,
} from "@gnu-taler/taler-wallet-core";
import { GlobalTestState } from "../harness/harness.js";
import { createSimpleTestkudosEnvironment } from "../harness/helpers.js";

const httpLib = new NodeHttpLib();

export interface ReserveKeypair {
  reservePub: string;
  reservePriv: string;
}

/**
 * Denormalized info about a coin.
 */
export interface CoinInfo {
  coinPub: string;
  coinPriv: string;
  exchangeBaseUrl: string;
  denomSig: UnblindedSignature;
  denomPub: DenominationPubKey;
  denomPubHash: string;
  feeDeposit: string;
  feeRefresh: string;
}

export function generateReserveKeypair(): ReserveKeypair {
  const priv = getRandomBytes(32);
  const pub = eddsaGetPublic(priv);
  return {
    reservePriv: encodeCrock(priv),
    reservePub: encodeCrock(pub),
  };
}

async function topupReserveWithDemobank(
  reservePub: string,
  bankBaseUrl: string,
  exchangeInfo: ExchangeInfo,
  amount: AmountString,
) {
  const bankHandle: BankServiceHandle = {
    baseUrl: bankBaseUrl,
    http: httpLib,
  };
  const bankUser = await BankApi.createRandomBankUser(bankHandle);
  const wopi = await BankAccessApi.createWithdrawalOperation(
    bankHandle,
    bankUser,
    amount,
  );
  const bankInfo = await getBankWithdrawalInfo(
    httpLib,
    wopi.taler_withdraw_uri,
  );
  const bankStatusUrl = bankInfo.extractedStatusUrl;
  if (!bankInfo.suggestedExchange) {
    throw Error("no suggested exchange");
  }
  const plainPaytoUris =
    exchangeInfo.wire.accounts.map((x) => x.payto_uri) ?? [];
  if (plainPaytoUris.length <= 0) {
    throw new Error();
  }
  const httpResp = await httpLib.postJson(bankStatusUrl, {
    reserve_pub: reservePub,
    selected_exchange: plainPaytoUris[0],
  });
  await readSuccessResponseJsonOrThrow(
    httpResp,
    codecForBankWithdrawalOperationPostResponse(),
  );
  await BankApi.confirmWithdrawalOperation(bankHandle, bankUser, wopi);
}

async function withdrawCoin(args: {
  http: HttpRequestLibrary;
  cryptoApi: CryptoApi;
  reserveKeyPair: ReserveKeypair;
  denom: DenominationRecord;
  exchangeBaseUrl: string;
}): Promise<CoinInfo> {
  const { http, cryptoApi, reserveKeyPair, denom, exchangeBaseUrl } = args;
  const planchet = await cryptoApi.createPlanchet({
    coinIndex: 0,
    denomPub: denom.denomPub,
    feeWithdraw: denom.feeWithdraw,
    reservePriv: reserveKeyPair.reservePriv,
    reservePub: reserveKeyPair.reservePub,
    secretSeed: encodeCrock(getRandomBytes(32)),
    value: denom.value,
  });

  const reqBody: ExchangeWithdrawRequest = {
    denom_pub_hash: planchet.denomPubHash,
    reserve_sig: planchet.withdrawSig,
    coin_ev: planchet.coinEv,
  };
  const reqUrl = new URL(
    `reserves/${planchet.reservePub}/withdraw`,
    exchangeBaseUrl,
  ).href;

  const resp = await http.postJson(reqUrl, reqBody);
  const r = await readSuccessResponseJsonOrThrow(
    resp,
    codecForWithdrawResponse(),
  );

  const ubSig = await cryptoApi.unblindDenominationSignature({
    planchet,
    evSig: r.ev_sig,
  });

  return {
    coinPriv: planchet.coinPriv,
    coinPub: planchet.coinPub,
    denomSig: ubSig,
    denomPub: denom.denomPub,
    denomPubHash: denom.denomPubHash,
    feeDeposit: Amounts.stringify(denom.feeDeposit),
    feeRefresh: Amounts.stringify(denom.feeRefresh),
    exchangeBaseUrl: args.exchangeBaseUrl,
  };
}

function findDenomOrThrow(
  exchangeInfo: ExchangeInfo,
  amount: AmountString,
): DenominationRecord {
  for (const d of exchangeInfo.keys.currentDenominations) {
    if (Amounts.cmp(d.value, amount) === 0 && isWithdrawableDenom(d)) {
      return d;
    }
  }
  throw new Error("no matching denomination found");
}

async function depositCoin(args: {
  http: HttpRequestLibrary;
  cryptoApi: CryptoApi;
  exchangeBaseUrl: string;
  coin: CoinInfo;
  amount: AmountString;
}) {
  const { coin, http, cryptoApi } = args;
  const depositPayto = "payto://x-taler-bank/localhost/foo";
  const wireSalt = encodeCrock(getRandomBytes(16));
  const contractTermsHash = encodeCrock(getRandomBytes(64));
  const depositTimestamp = getTimestampNow();
  const refundDeadline = getTimestampNow();
  const merchantPub = encodeCrock(getRandomBytes(32));
  const dp = await cryptoApi.signDepositPermission({
    coinPriv: coin.coinPriv,
    coinPub: coin.coinPub,
    contractTermsHash,
    denomKeyType: coin.denomPub.cipher,
    denomPubHash: coin.denomPubHash,
    denomSig: coin.denomSig,
    exchangeBaseUrl: args.exchangeBaseUrl,
    feeDeposit: Amounts.parseOrThrow(coin.feeDeposit),
    merchantPub,
    spendAmount: Amounts.parseOrThrow(args.amount),
    timestamp: depositTimestamp,
    refundDeadline: refundDeadline,
    wireInfoHash: hashWire(depositPayto, wireSalt),
  });
  const requestBody = {
    contribution: Amounts.stringify(dp.contribution),
    merchant_payto_uri: depositPayto,
    wire_salt: wireSalt,
    h_contract_terms: contractTermsHash,
    ub_sig: coin.denomSig,
    timestamp: depositTimestamp,
    wire_transfer_deadline: getTimestampNow(),
    refund_deadline: refundDeadline,
    coin_sig: dp.coin_sig,
    denom_pub_hash: dp.h_denom,
    merchant_pub: merchantPub,
  };
  const url = new URL(`coins/${dp.coin_pub}/deposit`, dp.exchange_url);
  const httpResp = await http.postJson(url.href, requestBody);
  await readSuccessResponseJsonOrThrow(httpResp, codecForDepositSuccess());
}

async function refreshCoin(req: {
  http: HttpRequestLibrary;
  cryptoApi: CryptoApi;
  oldCoin: CoinInfo;
  newDenoms: DenominationRecord[];
}): Promise<void> {
  const { cryptoApi, oldCoin, http } = req;
  const refreshSessionSeed = encodeCrock(getRandomBytes(32));
  const session = await cryptoApi.deriveRefreshSession({
    exchangeProtocolVersion: ExchangeProtocolVersion.V12,
    feeRefresh: Amounts.parseOrThrow(oldCoin.feeRefresh),
    kappa: 3,
    meltCoinDenomPubHash: oldCoin.denomPubHash,
    meltCoinPriv: oldCoin.coinPriv,
    meltCoinPub: oldCoin.coinPub,
    sessionSecretSeed: refreshSessionSeed,
    newCoinDenoms: req.newDenoms.map((x) => ({
      count: 1,
      denomPub: x.denomPub,
      feeWithdraw: x.feeWithdraw,
      value: x.value,
    })),
  });

  const meltReqBody: ExchangeMeltRequest = {
    coin_pub: oldCoin.coinPub,
    confirm_sig: session.confirmSig,
    denom_pub_hash: oldCoin.denomPubHash,
    denom_sig: oldCoin.denomSig,
    rc: session.hash,
    value_with_fee: Amounts.stringify(session.meltValueWithFee),
  };

  const reqUrl = new URL(
    `coins/${oldCoin.coinPub}/melt`,
    oldCoin.exchangeBaseUrl,
  );

  const resp = await http.postJson(reqUrl.href, meltReqBody);

  const meltResponse = await readSuccessResponseJsonOrThrow(
    resp,
    codecForExchangeMeltResponse(),
  );

  const norevealIndex = meltResponse.noreveal_index;

  
}

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runWalletDblessTest(t: GlobalTestState) {
  // Set up test environment

  const { bank, exchange } = await createSimpleTestkudosEnvironment(t);

  const http = new NodeHttpLib();
  const cryptoApi = new CryptoApi(new SynchronousCryptoWorkerFactory());

  try {
    // Withdraw digital cash into the wallet.

    const exchangeInfo = await downloadExchangeInfo(exchange.baseUrl, http);

    const reserveKeyPair = generateReserveKeypair();

    await topupReserveWithDemobank(
      reserveKeyPair.reservePub,
      bank.baseUrl,
      exchangeInfo,
      "TESTKUDOS:10",
    );

    await exchange.runWirewatchOnce();

    const d1 = findDenomOrThrow(exchangeInfo, "TESTKUDOS:8");

    const coin = await withdrawCoin({
      http,
      cryptoApi,
      reserveKeyPair,
      denom: d1,
      exchangeBaseUrl: exchange.baseUrl,
    });

    await depositCoin({
      amount: "TESTKUDOS:4",
      coin: coin,
      cryptoApi,
      exchangeBaseUrl: exchange.baseUrl,
      http,
    });

    const refreshDenoms = [
      findDenomOrThrow(exchangeInfo, "TESTKUDOS:1"),
      findDenomOrThrow(exchangeInfo, "TESTKUDOS:1"),
    ];

    const freshCoins = await refreshCoin({
      oldCoin: coin,
      cryptoApi,
      http,
      newDenoms: refreshDenoms,
    });
  } catch (e) {
    if (e instanceof OperationFailedError) {
      console.log(e);
      console.log(j2s(e.operationError));
    } else {
      console.log(e);
    }
    throw e;
  }
}

runWalletDblessTest.suites = ["wallet"];
