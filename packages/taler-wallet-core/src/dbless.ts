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
 * Helper functions to run wallet functionality (withdrawal, deposit, refresh)
 * without a database or retry loop.
 *
 * Used for benchmarking, where we want to benchmark the exchange, but the
 * normal wallet would be too sluggish.
 */

/**
 * Imports.
 */
import {
  Amounts,
  AmountString,
  codecForAny,
  codecForBankWithdrawalOperationPostResponse,
  codecForDepositSuccess,
  codecForExchangeMeltResponse,
  codecForExchangeRevealResponse,
  codecForWithdrawResponse,
  DenominationPubKey,
  eddsaGetPublic,
  encodeCrock,
  ExchangeMeltRequest,
  ExchangeProtocolVersion,
  ExchangeWithdrawRequest,
  getRandomBytes,
  hashWire,
  Logger,
  parsePaytoUri,
  AbsoluteTime,
  UnblindedSignature,
  BankWithdrawDetails,
  parseWithdrawUri,
} from "@gnu-taler/taler-util";
import { TalerCryptoInterface } from "./crypto/cryptoImplementation.js";
import { DenominationRecord } from "./db.js";
import {
  assembleRefreshRevealRequest,
  ExchangeInfo,
  getBankWithdrawalInfo,
  HttpRequestLibrary,
  isWithdrawableDenom,
  readSuccessResponseJsonOrThrow,
} from "./index.browser.js";
import {
  BankAccessApi,
  BankApi,
  BankServiceHandle,
  getBankStatusUrl,
} from "./index.js";

const logger = new Logger("dbless.ts");

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

/**
 * Check the status of a reserve, use long-polling to wait
 * until the reserve actually has been created.
 */
export async function checkReserve(
  http: HttpRequestLibrary,
  exchangeBaseUrl: string,
  reservePub: string,
  longpollTimeoutMs: number = 500,
): Promise<void> {
  const reqUrl = new URL(`reserves/${reservePub}`, exchangeBaseUrl);
  if (longpollTimeoutMs) {
    reqUrl.searchParams.set("timeout_ms", `${longpollTimeoutMs}`);
  }
  const resp = await http.get(reqUrl.href);
  if (resp.status !== 200) {
    throw new Error("reserve not okay");
  }
}

export async function topupReserveWithDemobank(
  http: HttpRequestLibrary,
  reservePub: string,
  bankBaseUrl: string,
  exchangeInfo: ExchangeInfo,
  amount: AmountString,
) {
  const bankHandle: BankServiceHandle = {
    baseUrl: bankBaseUrl,
    bankAccessApiBaseUrl: "??", // FIXME!
    http,
  };
  const bankUser = await BankApi.createRandomBankUser(bankHandle);
  const wopi = await BankAccessApi.createWithdrawalOperation(
    bankHandle,
    bankUser,
    amount,
  );
  const bankInfo = await getBankWithdrawalInfo(http, wopi.taler_withdraw_uri);
  const bankStatusUrl = getBankStatusUrl(wopi.taler_withdraw_uri);
  if (!bankInfo.suggestedExchange) {
    throw Error("no suggested exchange");
  }
  const plainPaytoUris =
    exchangeInfo.wire.accounts.map((x) => x.payto_uri) ?? [];
  if (plainPaytoUris.length <= 0) {
    throw new Error();
  }
  const httpResp = await http.postJson(bankStatusUrl, {
    reserve_pub: reservePub,
    selected_exchange: plainPaytoUris[0],
  });
  await readSuccessResponseJsonOrThrow(
    httpResp,
    codecForBankWithdrawalOperationPostResponse(),
  );
  await BankApi.confirmWithdrawalOperation(bankHandle, bankUser, wopi);
}

export async function withdrawCoin(args: {
  http: HttpRequestLibrary;
  cryptoApi: TalerCryptoInterface;
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

export function findDenomOrThrow(
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

export async function depositCoin(args: {
  http: HttpRequestLibrary;
  cryptoApi: TalerCryptoInterface;
  exchangeBaseUrl: string;
  coin: CoinInfo;
  amount: AmountString;
  depositPayto?: string;
}) {
  const { coin, http, cryptoApi } = args;
  const depositPayto =
    args.depositPayto ?? "payto://x-taler-bank/localhost/foo";
  const wireSalt = encodeCrock(getRandomBytes(16));
  const timestampNow = AbsoluteTime.toTimestamp(AbsoluteTime.now());
  const contractTermsHash = encodeCrock(getRandomBytes(64));
  const depositTimestamp = timestampNow;
  const refundDeadline = timestampNow;
  const wireTransferDeadline = timestampNow;
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
    wire_transfer_deadline: wireTransferDeadline,
    refund_deadline: refundDeadline,
    coin_sig: dp.coin_sig,
    denom_pub_hash: dp.h_denom,
    merchant_pub: merchantPub,
  };
  const url = new URL(`coins/${dp.coin_pub}/deposit`, dp.exchange_url);
  const httpResp = await http.postJson(url.href, requestBody);
  await readSuccessResponseJsonOrThrow(httpResp, codecForDepositSuccess());
}

export async function refreshCoin(req: {
  http: HttpRequestLibrary;
  cryptoApi: TalerCryptoInterface;
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
      denomPubHash: x.denomPubHash,
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

  logger.info("requesting melt");

  const meltReqUrl = new URL(
    `coins/${oldCoin.coinPub}/melt`,
    oldCoin.exchangeBaseUrl,
  );

  logger.info("requesting melt done");

  const meltHttpResp = await http.postJson(meltReqUrl.href, meltReqBody);

  const meltResponse = await readSuccessResponseJsonOrThrow(
    meltHttpResp,
    codecForExchangeMeltResponse(),
  );

  const norevealIndex = meltResponse.noreveal_index;

  const revealRequest = await assembleRefreshRevealRequest({
    cryptoApi,
    derived: session,
    newDenoms: req.newDenoms.map((x) => ({
      count: 1,
      denomPubHash: x.denomPubHash,
    })),
    norevealIndex,
    oldCoinPriv: oldCoin.coinPriv,
    oldCoinPub: oldCoin.coinPub,
  });

  logger.info("requesting reveal");
  const reqUrl = new URL(
    `refreshes/${session.hash}/reveal`,
    oldCoin.exchangeBaseUrl,
  );

  const revealResp = await http.postJson(reqUrl.href, revealRequest);

  logger.info("requesting reveal done");

  const reveal = await readSuccessResponseJsonOrThrow(
    revealResp,
    codecForExchangeRevealResponse(),
  );

  // We could unblind here, but we only use this function to
  // benchmark the exchange.
}

export async function createFakebankReserve(args: {
  http: HttpRequestLibrary;
  fakebankBaseUrl: string;
  amount: string;
  reservePub: string;
  exchangeInfo: ExchangeInfo;
}): Promise<void> {
  const { http, fakebankBaseUrl, amount, reservePub } = args;
  const paytoUri = args.exchangeInfo.wire.accounts[0].payto_uri;
  const pt = parsePaytoUri(paytoUri);
  if (!pt) {
    throw Error("failed to parse payto URI");
  }
  const components = pt.targetPath.split("/");
  const creditorAcct = components[components.length - 1];
  const fbReq = await http.postJson(
    new URL(`${creditorAcct}/admin/add-incoming`, fakebankBaseUrl).href,
    {
      amount,
      reserve_pub: reservePub,
      debit_account: "payto://x-taler-bank/localhost/testdebtor",
    },
  );
  const fbResp = await readSuccessResponseJsonOrThrow(fbReq, codecForAny());
}
