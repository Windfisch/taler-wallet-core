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
import {
  HistoryQuery,
  HistoryEvent,
  WalletBalance,
  WalletBalanceEntry,
  ReturnCoinsRequest,
  CoinWithDenom,
} from "../walletTypes";
import { oneShotIter, runWithWriteTransaction, oneShotGet, oneShotIterIndex, oneShotPut } from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, TipRecord, CoinStatus, CoinsReturnRecord, CoinRecord } from "../dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { Logger } from "../util/logging";
import { canonicalJson } from "../util/helpers";
import { ContractTerms } from "../talerTypes";
import { selectPayCoins } from "./pay";

const logger = new Logger("return.ts");

async function getCoinsForReturn(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  amount: AmountJson,
): Promise<CoinWithDenom[] | undefined> {
  const exchange = await oneShotGet(
    ws.db,
    Stores.exchanges,
    exchangeBaseUrl,
  );
  if (!exchange) {
    throw Error(`Exchange ${exchangeBaseUrl} not known to the wallet`);
  }

  const coins: CoinRecord[] = await oneShotIterIndex(
    ws.db,
    Stores.coins.exchangeBaseUrlIndex,
    exchange.baseUrl,
  ).toArray();

  if (!coins || !coins.length) {
    return [];
  }

  const denoms = await oneShotIterIndex(
    ws.db,
    Stores.denominations.exchangeBaseUrlIndex,
    exchange.baseUrl,
  ).toArray();

  // Denomination of the first coin, we assume that all other
  // coins have the same currency
  const firstDenom = await oneShotGet(ws.db, Stores.denominations, [
    exchange.baseUrl,
    coins[0].denomPub,
  ]);
  if (!firstDenom) {
    throw Error("db inconsistent");
  }
  const currency = firstDenom.value.currency;

  const cds: CoinWithDenom[] = [];
  for (const coin of coins) {
    const denom = await oneShotGet(ws.db, Stores.denominations, [
      exchange.baseUrl,
      coin.denomPub,
    ]);
    if (!denom) {
      throw Error("db inconsistent");
    }
    if (denom.value.currency !== currency) {
      console.warn(
        `same pubkey for different currencies at exchange ${exchange.baseUrl}`,
      );
      continue;
    }
    if (coin.suspended) {
      continue;
    }
    if (coin.status !== CoinStatus.Fresh) {
      continue;
    }
    cds.push({ coin, denom });
  }

  const res = selectPayCoins(denoms, cds, amount, amount);
  if (res) {
    return res.cds;
  }
  return undefined;
}


/**
 * Trigger paying coins back into the user's account.
 */
export async function returnCoins(
  ws: InternalWalletState,
  req: ReturnCoinsRequest,
): Promise<void> {
  logger.trace("got returnCoins request", req);
  const wireType = (req.senderWire as any).type;
  logger.trace("wireType", wireType);
  if (!wireType || typeof wireType !== "string") {
    console.error(`wire type must be a non-empty string, not ${wireType}`);
    return;
  }
  const stampSecNow = Math.floor(new Date().getTime() / 1000);
  const exchange = await oneShotGet(ws.db, Stores.exchanges, req.exchange);
  if (!exchange) {
    console.error(`Exchange ${req.exchange} not known to the wallet`);
    return;
  }
  const exchangeDetails = exchange.details;
  if (!exchangeDetails) {
    throw Error("exchange information needs to be updated first.");
  }
  logger.trace("selecting coins for return:", req);
  const cds = await getCoinsForReturn(ws, req.exchange, req.amount);
  logger.trace(cds);

  if (!cds) {
    throw Error("coin return impossible, can't select coins");
  }

  const { priv, pub } = await ws.cryptoApi.createEddsaKeypair();

  const wireHash = await ws.cryptoApi.hashString(
    canonicalJson(req.senderWire),
  );

  const contractTerms: ContractTerms = {
    H_wire: wireHash,
    amount: Amounts.toString(req.amount),
    auditors: [],
    exchanges: [
      { master_pub: exchangeDetails.masterPublicKey, url: exchange.baseUrl },
    ],
    extra: {},
    fulfillment_url: "",
    locations: [],
    max_fee: Amounts.toString(req.amount),
    merchant: {},
    merchant_pub: pub,
    order_id: "none",
    pay_deadline: `/Date(${stampSecNow + 30 * 5})/`,
    wire_transfer_deadline: `/Date(${stampSecNow + 60 * 5})/`,
    merchant_base_url: "taler://return-to-account",
    products: [],
    refund_deadline: `/Date(${stampSecNow + 60 * 5})/`,
    timestamp: `/Date(${stampSecNow})/`,
    wire_method: wireType,
  };

  const contractTermsHash = await ws.cryptoApi.hashString(
    canonicalJson(contractTerms),
  );

  const payCoinInfo = await ws.cryptoApi.signDeposit(
    contractTerms,
    cds,
    Amounts.parseOrThrow(contractTerms.amount),
  );

  logger.trace("pci", payCoinInfo);

  const coins = payCoinInfo.sigs.map(s => ({ coinPaySig: s }));

  const coinsReturnRecord: CoinsReturnRecord = {
    coins,
    contractTerms,
    contractTermsHash,
    exchange: exchange.baseUrl,
    merchantPriv: priv,
    wire: req.senderWire,
  };

  await runWithWriteTransaction(
    ws.db,
    [Stores.coinsReturns, Stores.coins],
    async tx => {
      await tx.put(Stores.coinsReturns, coinsReturnRecord);
      for (let c of payCoinInfo.updatedCoins) {
        await tx.put(Stores.coins, c);
      }
    },
  );
  ws.badge.showNotification();
  ws.notifier.notify();

  depositReturnedCoins(ws, coinsReturnRecord);
}

async function depositReturnedCoins(
  ws: InternalWalletState,
  coinsReturnRecord: CoinsReturnRecord,
): Promise<void> {
  for (const c of coinsReturnRecord.coins) {
    if (c.depositedSig) {
      continue;
    }
    const req = {
      H_wire: coinsReturnRecord.contractTerms.H_wire,
      coin_pub: c.coinPaySig.coin_pub,
      coin_sig: c.coinPaySig.coin_sig,
      contribution: c.coinPaySig.contribution,
      denom_pub: c.coinPaySig.denom_pub,
      h_contract_terms: coinsReturnRecord.contractTermsHash,
      merchant_pub: coinsReturnRecord.contractTerms.merchant_pub,
      pay_deadline: coinsReturnRecord.contractTerms.pay_deadline,
      refund_deadline: coinsReturnRecord.contractTerms.refund_deadline,
      timestamp: coinsReturnRecord.contractTerms.timestamp,
      ub_sig: c.coinPaySig.ub_sig,
      wire: coinsReturnRecord.wire,
      wire_transfer_deadline: coinsReturnRecord.contractTerms.pay_deadline,
    };
    logger.trace("req", req);
    const reqUrl = new URL("deposit", coinsReturnRecord.exchange);
    const resp = await ws.http.postJson(reqUrl.href, req);
    if (resp.status !== 200) {
      console.error("deposit failed due to status code", resp);
      continue;
    }
    const respJson = resp.responseJson;
    if (respJson.status !== "DEPOSIT_OK") {
      console.error("deposit failed", resp);
      continue;
    }

    if (!respJson.sig) {
      console.error("invalid 'sig' field", resp);
      continue;
    }

    // FIXME: verify signature

    // For every successful deposit, we replace the old record with an updated one
    const currentCrr = await oneShotGet(
      ws.db,
      Stores.coinsReturns,
      coinsReturnRecord.contractTermsHash,
    );
    if (!currentCrr) {
      console.error("database inconsistent");
      continue;
    }
    for (const nc of currentCrr.coins) {
      if (nc.coinPaySig.coin_pub === c.coinPaySig.coin_pub) {
        nc.depositedSig = respJson.sig;
      }
    }
    await oneShotPut(ws.db, Stores.coinsReturns, currentCrr);
    ws.notifier.notify();
  }
}
