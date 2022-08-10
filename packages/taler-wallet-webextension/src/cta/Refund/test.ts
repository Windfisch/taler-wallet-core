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
  AmountJson,
  Amounts, NotificationType,
  PrepareRefundResult
} from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../../test-utils.js";
import { SubsHandler } from "../Payment/test.js";
import { useComponentState } from "./state.js";

describe("Refund CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ talerRefundUri: undefined, cancel: async () => { null } }, {
          prepareRefund: async () => ({}),
          applyRefund: async () => ({}),
          onUpdateNotification: async () => ({}),
        } as any),
      );

    {
      const { status, error } = getLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const { status, error } = getLastResultOrThrow();

      expect(status).equals("loading-uri");
      if (!error) expect.fail();
      if (!error.hasError) expect.fail();
      if (error.operational) expect.fail();
      expect(error.message).eq("ERROR_NO-URI-FOR-REFUND");
    }

    await assertNoPendingUpdate();
  });

  it("should be ready after loading", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ talerRefundUri: "taler://refund/asdasdas", cancel: async () => { null } }, {
          prepareRefund: async () =>
          ({
            effectivePaid: "EUR:2",
            awaiting: "EUR:2",
            gone: "EUR:0",
            granted: "EUR:0",
            pending: false,
            proposalId: "1",
            info: {
              contractTermsHash: "123",
              merchant: {
                name: "the merchant name",
              },
              orderId: "orderId1",
              summary: "the summary",
            },
          } as PrepareRefundResult as any),
          applyRefund: async () => ({}),
          onUpdateNotification: async () => ({}),
        } as any),
      );

    {
      const { status, error } = getLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "ready") expect.fail();
      if (state.error) expect.fail();
      expect(state.accept.onClick).not.undefined;
      expect(state.ignore.onClick).not.undefined;
      expect(state.merchantName).eq("the merchant name");
      expect(state.orderId).eq("orderId1");
      expect(state.products).undefined;
    }

    await assertNoPendingUpdate();
  });

  it("should be ignored after clicking the ignore button", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ talerRefundUri: "taler://refund/asdasdas", cancel: async () => { null } }, {
          prepareRefund: async () =>
          ({
            effectivePaid: "EUR:2",
            awaiting: "EUR:2",
            gone: "EUR:0",
            granted: "EUR:0",
            pending: false,
            proposalId: "1",
            info: {
              contractTermsHash: "123",
              merchant: {
                name: "the merchant name",
              },
              orderId: "orderId1",
              summary: "the summary",
            },
          } as PrepareRefundResult as any),
          applyRefund: async () => ({}),
          onUpdateNotification: async () => ({}),
        } as any),
      );

    {
      const { status, error } = getLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "ready") expect.fail();
      if (state.error) expect.fail();
      expect(state.accept.onClick).not.undefined;
      expect(state.merchantName).eq("the merchant name");
      expect(state.orderId).eq("orderId1");
      expect(state.products).undefined;

      if (state.ignore.onClick === undefined) expect.fail();
      state.ignore.onClick();
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "ignored") expect.fail();
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
    }

    await assertNoPendingUpdate();
  });

  it("should be in progress when doing refresh", async () => {
    let granted = Amounts.getZero("EUR");
    const unit: AmountJson = { currency: "EUR", value: 1, fraction: 0 };
    const refunded: AmountJson = { currency: "EUR", value: 2, fraction: 0 };
    let awaiting: AmountJson = refunded;
    let pending = true;

    const subscriptions = new SubsHandler();

    function notifyMelt(): void {
      granted = Amounts.add(granted, unit).amount;
      pending = granted.value < refunded.value;
      awaiting = Amounts.sub(refunded, granted).amount;
      subscriptions.notifyEvent(NotificationType.RefreshMelted);
    }

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ talerRefundUri: "taler://refund/asdasdas", cancel: async () => { null } }, {
          prepareRefund: async () =>
          ({
            awaiting: Amounts.stringify(awaiting),
            effectivePaid: "EUR:2",
            gone: "EUR:0",
            granted: Amounts.stringify(granted),
            pending,
            proposalId: "1",
            info: {
              contractTermsHash: "123",
              merchant: {
                name: "the merchant name",
              },
              orderId: "orderId1",
              summary: "the summary",
            },
          } as PrepareRefundResult as any),
          applyRefund: async () => ({}),
          onUpdateNotification: subscriptions.saveSubscription,
        } as any),
      );

    {
      const { status, error } = getLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "in-progress") expect.fail("1");
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"));
      // expect(state.progress).closeTo(1 / 3, 0.01)

      notifyMelt();
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "in-progress") expect.fail("2");
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"));
      // expect(state.progress).closeTo(2 / 3, 0.01)

      notifyMelt();
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "completed") expect.fail("3");
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"));
    }

    await assertNoPendingUpdate();
  });
});
