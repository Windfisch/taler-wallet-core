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
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { AmountJson, Amounts, BalancesResponse, ConfirmPayResult, ConfirmPayResultType, NotificationType, PreparePayResult, PreparePayResultType } from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../test-utils.js";
import * as wxApi from "../wxApi.js";
import { useComponentState } from "./Pay.jsx";

const nullFunction: any = () => null;
type VoidFunction = () => void;

type Subs = {
  [key in NotificationType]?: VoidFunction
}

class SubsHandler {
  private subs: Subs = {};

  constructor() {
    this.saveSubscription = this.saveSubscription.bind(this);
  }

  saveSubscription(messageTypes: NotificationType[], callback: VoidFunction): VoidFunction {
    messageTypes.forEach(m => {
      this.subs[m] = callback;
    })
    return nullFunction;
  }

  notifyEvent(event: NotificationType): void {
    const cb = this.subs[event];
    if (cb === undefined) expect.fail(`Expected to have a subscription for ${event}`);
    cb()
  }
}


describe("Pay CTA states", () => {
  it("should tell the user that the URI is missing", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState(undefined, {
        onUpdateNotification: nullFunction,
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate()

    {
      const { status, hook } = getLastResultOrThrow()

      expect(status).equals('loading')
      if (hook === undefined) expect.fail()
      expect(hook.hasError).true;
      expect(hook.operational).false;
    }

    await assertNoPendingUpdate()
  });

  it("should response with no balance", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: nullFunction,
        preparePay: async () => ({
          amountRaw: 'USD:10',
          status: PreparePayResultType.InsufficientBalance,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: []
        } as Partial<BalancesResponse>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).undefined;
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:10'))
      expect(r.payHandler.onClick).undefined;
    }

    await assertNoPendingUpdate()
  });

  it("should not be able to pay if there is no enough balance", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: nullFunction,
        preparePay: async () => ({
          amountRaw: 'USD:10',
          status: PreparePayResultType.InsufficientBalance,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: [{
            available: 'USD:5'
          }]
        } as Partial<BalancesResponse>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:5'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:10'))
      expect(r.payHandler.onClick).undefined;
    }

    await assertNoPendingUpdate()
  });

  it("should be able to pay (without fee)", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: nullFunction,
        preparePay: async () => ({
          amountRaw: 'USD:10',
          amountEffective: 'USD:10',
          status: PreparePayResultType.PaymentPossible,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: [{
            available: 'USD:15'
          }]
        } as Partial<BalancesResponse>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:10'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:0'))
      expect(r.payHandler.onClick).not.undefined;
    }

    await assertNoPendingUpdate()
  });

  it("should be able to pay (with fee)", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: nullFunction,
        preparePay: async () => ({
          amountRaw: 'USD:9',
          amountEffective: 'USD:10',
          status: PreparePayResultType.PaymentPossible,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: [{
            available: 'USD:15'
          }]
        } as Partial<BalancesResponse>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      expect(r.payHandler.onClick).not.undefined;
    }

    await assertNoPendingUpdate()
  });

  it("should get confirmation done after pay successfully", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: nullFunction,
        preparePay: async () => ({
          amountRaw: 'USD:9',
          amountEffective: 'USD:10',
          status: PreparePayResultType.PaymentPossible,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: [{
            available: 'USD:15'
          }]
        } as Partial<BalancesResponse>),
        confirmPay: async () => ({
          type: ConfirmPayResultType.Done,
          contractTerms: {}
        } as Partial<ConfirmPayResult>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      if (r.payHandler.onClick === undefined) expect.fail();
      r.payHandler.onClick()
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'confirmed') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      if (r.payResult.type !== ConfirmPayResultType.Done) expect.fail();
      expect(r.payResult.contractTerms).not.undefined;
      expect(r.payHandler.onClick).undefined;
    }

    await assertNoPendingUpdate()
  });

  it("should not stay in ready state after pay with error", async () => {

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: nullFunction,
        preparePay: async () => ({
          amountRaw: 'USD:9',
          amountEffective: 'USD:10',
          status: PreparePayResultType.PaymentPossible,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: [{
            available: 'USD:15'
          }]
        } as Partial<BalancesResponse>),
        confirmPay: async () => ({
          type: ConfirmPayResultType.Pending,
          lastError: { code: 1 },
        } as Partial<ConfirmPayResult>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      if (r.payHandler.onClick === undefined) expect.fail();
      r.payHandler.onClick()
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      expect(r.payHandler.onClick).undefined;
      if (r.payHandler.error === undefined) expect.fail();
      //FIXME: error message here is bad
      expect(r.payHandler.error.errorDetail.hint).eq("could not confirm payment")
      expect(r.payHandler.error.errorDetail.payResult).deep.equal({
        type: ConfirmPayResultType.Pending,
        lastError: { code: 1 }
      })
    }

    await assertNoPendingUpdate()
  });

  it("should update balance if a coins is withdraw", async () => {
    const subscriptions = new SubsHandler();
    let availableBalance = Amounts.parseOrThrow("USD:10");

    function notifyCoinWithdrawn(newAmount: AmountJson): void {
      availableBalance = Amounts.add(availableBalance, newAmount).amount
      subscriptions.notifyEvent(NotificationType.CoinWithdrawn)
    }

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taller://pay', {
        onUpdateNotification: subscriptions.saveSubscription,
        preparePay: async () => ({
          amountRaw: 'USD:9',
          amountEffective: 'USD:10',
          status: PreparePayResultType.PaymentPossible,
        } as Partial<PreparePayResult>),
        getBalance: async () => ({
          balances: [{
            available: Amounts.stringify(availableBalance)
          }]
        } as Partial<BalancesResponse>),
      } as Partial<typeof wxApi> as any)
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:10'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      expect(r.payHandler.onClick).not.undefined;

      notifyCoinWithdrawn(Amounts.parseOrThrow("USD:5"));
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow()
      if (r.status !== 'ready') expect.fail()
      expect(r.balance).deep.equal(Amounts.parseOrThrow('USD:15'));
      expect(r.amount).deep.equal(Amounts.parseOrThrow('USD:9'))
      expect(r.totalFees).deep.equal(Amounts.parseOrThrow('USD:1'))
      expect(r.payHandler.onClick).not.undefined;
    }

    await assertNoPendingUpdate()
  });


});