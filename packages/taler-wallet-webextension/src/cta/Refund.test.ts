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

import { Amounts, NotificationType, PrepareRefundResult } from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../test-utils.js";
import { SubsHandler } from "./Pay.test.js";
import { useComponentState } from "./Refund.jsx";

// onUpdateNotification: subscriptions.saveSubscription,

describe("Refund CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState(undefined, {
        prepareRefund: async () => ({}),
        applyRefund: async () => ({}),
        onUpdateNotification: async () => ({})
      } as any),
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
      if (!hook) expect.fail();
      if (!hook.hasError) expect.fail();
      if (hook.operational) expect.fail();
      expect(hook.message).eq("ERROR_NO-URI-FOR-REFUND");
    }

    await assertNoPendingUpdate()
  });

  it("should be ready after loading", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState("taler://refund/asdasdas", {
        prepareRefund: async () => ({
          total: 0,
          applied: 0,
          failed: 0,
          amountEffectivePaid: 'EUR:2',
          info: {
            contractTermsHash: '123',
            merchant: {
              name: 'the merchant name'
            },
            orderId: 'orderId1',
            summary: 'the sumary'
          }
        } as PrepareRefundResult as any),
        applyRefund: async () => ({}),
        onUpdateNotification: async () => ({})
      } as any),
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate()

    {
      const state = getLastResultOrThrow()

      if (state.status !== 'ready') expect.fail();
      if (state.hook) expect.fail();
      expect(state.accept.onClick).not.undefined;
      expect(state.ignore.onClick).not.undefined;
      expect(state.merchantName).eq('the merchant name');
      expect(state.orderId).eq('orderId1');
      expect(state.products).undefined;
    }

    await assertNoPendingUpdate()
  });

  it("should be ignored after clicking the ignore button", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState("taler://refund/asdasdas", {
        prepareRefund: async () => ({
          total: 0,
          applied: 0,
          failed: 0,
          amountEffectivePaid: 'EUR:2',
          info: {
            contractTermsHash: '123',
            merchant: {
              name: 'the merchant name'
            },
            orderId: 'orderId1',
            summary: 'the sumary'
          }
        } as PrepareRefundResult as any),
        applyRefund: async () => ({}),
        onUpdateNotification: async () => ({})
      } as any),
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate()

    {
      const state = getLastResultOrThrow()

      if (state.status !== 'ready') expect.fail();
      if (state.hook) expect.fail();
      expect(state.accept.onClick).not.undefined;
      expect(state.merchantName).eq('the merchant name');
      expect(state.orderId).eq('orderId1');
      expect(state.products).undefined;

      if (state.ignore.onClick === undefined) expect.fail();
      state.ignore.onClick()
    }

    await waitNextUpdate()

    {
      const state = getLastResultOrThrow()

      if (state.status !== 'ignored') expect.fail();
      if (state.hook) expect.fail();
      expect(state.merchantName).eq('the merchant name');
    }

    await assertNoPendingUpdate()
  });

  it("should be in progress when doing refresh", async () => {
    let numApplied = 1;
    const subscriptions = new SubsHandler();

    function notifyMelt(): void {
      numApplied++;
      subscriptions.notifyEvent(NotificationType.RefreshMelted)
    }

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState("taler://refund/asdasdas", {
        prepareRefund: async () => ({
          total: 3,
          applied: numApplied,
          failed: 0,
          amountEffectivePaid: 'EUR:2',
          info: {
            contractTermsHash: '123',
            merchant: {
              name: 'the merchant name'
            },
            orderId: 'orderId1',
            summary: 'the sumary'
          }
        } as PrepareRefundResult as any),
        applyRefund: async () => ({}),
        onUpdateNotification: subscriptions.saveSubscription,
      } as any),
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading')
      expect(hook).undefined;
    }

    await waitNextUpdate()

    {
      const state = getLastResultOrThrow()

      if (state.status !== 'in-progress') expect.fail();
      if (state.hook) expect.fail();
      expect(state.merchantName).eq('the merchant name');
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"))
      expect(state.progress).closeTo(1 / 3, 0.01)

      notifyMelt()
    }

    await waitNextUpdate()

    {
      const state = getLastResultOrThrow()

      if (state.status !== 'in-progress') expect.fail();
      if (state.hook) expect.fail();
      expect(state.merchantName).eq('the merchant name');
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"))
      expect(state.progress).closeTo(2 / 3, 0.01)

      notifyMelt()
    }

    await waitNextUpdate()

    {
      const state = getLastResultOrThrow()

      if (state.status !== 'completed') expect.fail();
      if (state.hook) expect.fail();
      expect(state.merchantName).eq('the merchant name');
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"))
    }

    await assertNoPendingUpdate()
  });
});