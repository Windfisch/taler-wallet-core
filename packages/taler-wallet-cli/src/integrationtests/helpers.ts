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
 * Helpers to create typical test environments.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports
 */
import {
  GlobalTestState,
  DbInfo,
  ExchangeService,
  WalletCli,
  MerchantService,
  setupDb,
  BankService,
  ExchangeBankAccount,
  MerchantServiceInterface,
  BankApi,
  BankAccessApi,
  MerchantPrivateApi,
  ExchangeServiceInterface,
} from "./harness";
import {
  AmountString,
  Duration,
  PreparePayResultType,
  ConfirmPayResultType,
  ContractTerms,
} from "taler-wallet-core";
import { FaultInjectedMerchantService } from "./faultInjection";
import { defaultCoinConfig } from "./denomStructures";

export interface SimpleTestEnvironment {
  commonDb: DbInfo;
  bank: BankService;
  exchange: ExchangeService;
  exchangeBankAccount: ExchangeBankAccount;
  merchant: MerchantService;
  wallet: WalletCli;
}

/**
 * Run a test case with a simple TESTKUDOS Taler environment, consisting
 * of one exchange, one bank and one merchant.
 */
export async function createSimpleTestkudosEnvironment(
  t: GlobalTestState,
): Promise<SimpleTestEnvironment> {
  const db = await setupDb(t);

  const bank = await BankService.create(t, {
    allowRegistrations: true,
    currency: "TESTKUDOS",
    database: db.connStr,
    httpPort: 8082,
  });

  const exchange = ExchangeService.create(t, {
    name: "testexchange-1",
    currency: "TESTKUDOS",
    httpPort: 8081,
    database: db.connStr,
  });

  const merchant = await MerchantService.create(t, {
    name: "testmerchant-1",
    currency: "TESTKUDOS",
    httpPort: 8083,
    database: db.connStr,
  });

  const exchangeBankAccount = await bank.createExchangeAccount(
    "MyExchange",
    "x",
  );
  exchange.addBankAccount("1", exchangeBankAccount);

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

  await bank.start();

  await bank.pingUntilAvailable();

  exchange.addOfferedCoins(defaultCoinConfig);

  await exchange.start();
  await exchange.pingUntilAvailable();

  merchant.addExchange(exchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  await merchant.addInstance({
    id: "minst1",
    name: "minst1",
    paytoUris: ["payto://x-taler-bank/minst1"],
  });

  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [`payto://x-taler-bank/merchant-default`],
  });

  console.log("setup done!");

  const wallet = new WalletCli(t);

  return {
    commonDb: db,
    exchange,
    merchant,
    wallet,
    bank,
    exchangeBankAccount,
  };
}

export interface FaultyMerchantTestEnvironment {
  commonDb: DbInfo;
  bank: BankService;
  exchange: ExchangeService;
  exchangeBankAccount: ExchangeBankAccount;
  merchant: MerchantService;
  faultyMerchant: FaultInjectedMerchantService;
  wallet: WalletCli;
}

/**
 * Run a test case with a simple TESTKUDOS Taler environment, consisting
 * of one exchange, one bank and one merchant.
 */
export async function createFaultInjectedMerchantTestkudosEnvironment(
  t: GlobalTestState,
): Promise<FaultyMerchantTestEnvironment> {
  const db = await setupDb(t);

  const bank = await BankService.create(t, {
    allowRegistrations: true,
    currency: "TESTKUDOS",
    database: db.connStr,
    httpPort: 8082,
  });

  const exchange = ExchangeService.create(t, {
    name: "testexchange-1",
    currency: "TESTKUDOS",
    httpPort: 8081,
    database: db.connStr,
  });

  const merchant = await MerchantService.create(t, {
    name: "testmerchant-1",
    currency: "TESTKUDOS",
    httpPort: 8083,
    database: db.connStr,
  });

  const faultyMerchant = new FaultInjectedMerchantService(t, merchant, 9083);

  const exchangeBankAccount = await bank.createExchangeAccount(
    "MyExchange",
    "x",
  );
  exchange.addBankAccount("1", exchangeBankAccount);

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

  await bank.start();

  await bank.pingUntilAvailable();

  exchange.addOfferedCoins(defaultCoinConfig);

  await exchange.start();
  await exchange.pingUntilAvailable();

  merchant.addExchange(exchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  await merchant.addInstance({
    id: "minst1",
    name: "minst1",
    paytoUris: ["payto://x-taler-bank/minst1"],
  });

  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [`payto://x-taler-bank/merchant-default`],
  });

  console.log("setup done!");

  const wallet = new WalletCli(t);

  return {
    commonDb: db,
    exchange,
    merchant,
    wallet,
    bank,
    exchangeBankAccount,
    faultyMerchant,
  };
}

/**
 * Withdraw balance.
 */
export async function startWithdrawViaBank(
  t: GlobalTestState,
  p: {
    wallet: WalletCli;
    bank: BankService;
    exchange: ExchangeServiceInterface;
    amount: AmountString;
  },
): Promise<void> {
  const { wallet, bank, exchange, amount } = p;

  const user = await BankApi.createRandomBankUser(bank);
  const wop = await BankAccessApi.createWithdrawalOperation(bank, user, amount);

  // Hand it to the wallet

  const r1 = await wallet.apiRequest("getWithdrawalDetailsForUri", {
    talerWithdrawUri: wop.taler_withdraw_uri,
  });
  t.assertTrue(r1.type === "response");

  await wallet.runPending();

  // Confirm it

  await BankApi.confirmWithdrawalOperation(bank, user, wop);

  // Withdraw

  const r2 = await wallet.apiRequest("acceptBankIntegratedWithdrawal", {
    exchangeBaseUrl: exchange.baseUrl,
    talerWithdrawUri: wop.taler_withdraw_uri,
  });
  t.assertTrue(r2.type === "response");
}

/**
 * Withdraw balance.
 */
export async function withdrawViaBank(
  t: GlobalTestState,
  p: {
    wallet: WalletCli;
    bank: BankService;
    exchange: ExchangeServiceInterface;
    amount: AmountString;
  },
): Promise<void> {
  const { wallet } = p;

  await startWithdrawViaBank(t, p);

  await wallet.runUntilDone();

  // Check balance

  const balApiResp = await wallet.apiRequest("getBalances", {});
  t.assertTrue(balApiResp.type === "response");
}

export async function applyTimeTravel(
  timetravelDuration: Duration,
  s: {
    exchange?: ExchangeService;
    merchant?: MerchantService;
    wallet?: WalletCli;
  },
): Promise<void> {
  if (s.exchange) {
    await s.exchange.stop();
    s.exchange.setTimetravel(timetravelDuration);
    await s.exchange.start();
    await s.exchange.pingUntilAvailable();
  }

  if (s.merchant) {
    await s.merchant.stop();
    s.merchant.setTimetravel(timetravelDuration);
    await s.merchant.start();
    await s.merchant.pingUntilAvailable();
  }

  if (s.wallet) {
    s.wallet.setTimetravel(timetravelDuration);
  }
}

/**
 * Make a simple payment and check that it succeeded.
 */
export async function makeTestPayment(
  t: GlobalTestState,
  args: {
    merchant: MerchantServiceInterface;
    wallet: WalletCli;
    order: Partial<ContractTerms>;
    instance?: string;
  },
): Promise<void> {
  // Set up order.

  const { wallet, merchant } = args;
  const instance = args.instance ?? "default";

  const orderResp = await MerchantPrivateApi.createOrder(merchant, instance, {
    order: args.order,
  });

  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  // Make wallet pay for the order

  const preparePayResult = await wallet.preparePay({
    talerPayUri: orderStatus.taler_pay_uri,
  });

  t.assertTrue(
    preparePayResult.status === PreparePayResultType.PaymentPossible,
  );

  const r2 = await wallet.confirmPay({
    proposalId: preparePayResult.proposalId,
  });

  t.assertTrue(r2.type === ConfirmPayResultType.Done);

  // Check if payment was successful.

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
    instance,
  });

  t.assertTrue(orderStatus.order_status === "paid");
}
