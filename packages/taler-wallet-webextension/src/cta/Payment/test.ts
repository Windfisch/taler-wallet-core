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
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import {
  Amounts,
  ConfirmPayResult,
  ConfirmPayResultType,
  NotificationType,
  PreparePayResultInsufficientBalance,
  PreparePayResultPaymentPossible,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { expect } from "chai";
import { tests } from "../../../../web-util/src/index.browser.js";
import { mountHook, nullFunction } from "../../test-utils.js";
import { createWalletApiMock } from "../../test-utils.js";
import { useComponentState } from "./state.js";

describe("Payment CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: undefined,
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      ({ status, error }) => {
        expect(status).equals("loading-uri");
        if (error === undefined) expect.fail();
        expect(error.hasError).true;
        expect(error.operational).false;
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");

  });

  it("should response with no balance", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.InsufficientBalance,
        amountRaw: "USD:10",
      } as PreparePayResultInsufficientBalance,
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      { balances: [] },
    );

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "no-balance-for-currency") {
          expect(state).eq({});
          return;
        }
        expect(state.balance).undefined;
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:10"));
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should not be able to pay if there is no enough balance", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.InsufficientBalance,
        amountRaw: "USD:10",
      } as PreparePayResultInsufficientBalance,
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:5",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "no-enough-balance") expect.fail();
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:5"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:10"));
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should be able to pay (without fee)", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.PaymentPossible,
        amountRaw: "USD:10",
        amountEffective: "USD:10",
      } as PreparePayResultPaymentPossible,
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:15",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );
    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "ready") {
          expect(state).eq({});
          return;
        }
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:15"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:10"));
        expect(state.payHandler.onClick).not.undefined;
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");

  });

  it("should be able to pay (with fee)", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.PaymentPossible,
        amountRaw: "USD:9",
        amountEffective: "USD:10",
      } as PreparePayResultPaymentPossible,
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:15",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );
    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "ready") expect.fail();
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:15"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:9"));
        expect(state.payHandler.onClick).not.undefined;
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should get confirmation done after pay successfully", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.PaymentPossible,
        amountRaw: "USD:9",
        amountEffective: "USD:10",
      } as PreparePayResultPaymentPossible,
    );

    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:15",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );
    handler.addWalletCallResponse(WalletApiOperation.ConfirmPay, undefined, {
      type: ConfirmPayResultType.Done,
      contractTerms: {},
    } as ConfirmPayResult);

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "ready") {
          expect(state).eq({});
          return;
        }
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:15"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:9"));
        if (state.payHandler.onClick === undefined) expect.fail();
        state.payHandler.onClick();
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");

  });

  it("should not stay in ready state after pay with error", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };
    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.PaymentPossible,
        amountRaw: "USD:9",
        amountEffective: "USD:10",
      } as PreparePayResultPaymentPossible,
    );

    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:15",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );
    handler.addWalletCallResponse(WalletApiOperation.ConfirmPay, undefined, {
      type: ConfirmPayResultType.Pending,
      lastError: { code: 1 },
    } as ConfirmPayResult);

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "ready") expect.fail();
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:15"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:9"));
        // expect(r.totalFees).deep.equal(Amounts.parseOrThrow("USD:1"));
        if (state.payHandler.onClick === undefined) expect.fail();
        state.payHandler.onClick();
      },
      (state) => {
        if (state.status !== "ready") expect.fail();
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:15"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:9"));
        // expect(r.totalFees).deep.equal(Amounts.parseOrThrow("USD:1"));
        expect(state.payHandler.onClick).undefined;
        if (state.payHandler.error === undefined) expect.fail();
        //FIXME: error message here is bad
        expect(state.payHandler.error.errorDetail.hint).eq(
          "could not confirm payment",
        );
        expect(state.payHandler.error.errorDetail.payResult).deep.equal({
          type: ConfirmPayResultType.Pending,
          lastError: { code: 1 },
        });
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");

  });

  it("should update balance if a coins is withdraw", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    const props = {
      talerPayUri: "taller://pay",
      cancel: nullFunction,
      goToWalletManualWithdraw: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.PaymentPossible,
        amountRaw: "USD:9",
        amountEffective: "USD:10",
      } as PreparePayResultPaymentPossible,
    );

    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:10",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );

    handler.addWalletCallResponse(
      WalletApiOperation.PreparePayForUri,
      undefined,
      {
        status: PreparePayResultType.PaymentPossible,
        amountRaw: "USD:9",
        amountEffective: "USD:10",
      } as PreparePayResultPaymentPossible,
    );

    handler.addWalletCallResponse(
      WalletApiOperation.GetBalances,
      {},
      {
        balances: [
          {
            available: "USD:15",
            hasPendingTransactions: false,
            pendingIncoming: "USD:0",
            pendingOutgoing: "USD:0",
            requiresUserInput: false,
          },
        ],
      },
    );

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      (state) => {
        if (state.status !== "ready") expect.fail()
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:10"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:9"));
        // expect(r.totalFees).deep.equal(Amounts.parseOrThrow("USD:1"));
        expect(state.payHandler.onClick).not.undefined;

        handler.notifyEventFromWallet(NotificationType.CoinWithdrawn);
      },
      (state) => {
        if (state.status !== "ready") expect.fail()
        expect(state.balance).deep.equal(Amounts.parseOrThrow("USD:15"));
        expect(state.amount).deep.equal(Amounts.parseOrThrow("USD:9"));
        // expect(r.totalFees).deep.equal(Amounts.parseOrThrow("USD:1"));
        expect(state.payHandler.onClick).not.undefined;
      },
    ], TestingContext)

    expect(hookBehavior).deep.equal({ result: "ok" })
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
