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

import { Amounts, PrepareTipResult } from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../../test-utils.js";
import { useComponentState } from "./state.js";

describe("Tip CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          {
            talerTipUri: undefined,
            onCancel: async () => {
              null;
            },
            onSuccess: async () => { null; },
          },
          {
            prepareTip: async () => ({}),
            acceptTip: async () => ({}),
          } as any,
        ),
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
      expect(error.message).eq("ERROR_NO-URI-FOR-TIP");
    }

    await assertNoPendingUpdate();
  });

  it("should be ready for accepting the tip", async () => {
    let tipAccepted = false;

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          {
            talerTipUri: "taler://tip/asd",
            onCancel: async () => {
              null;
            },
            onSuccess: async () => { null; },
          },
          {
            prepareTip: async () =>
            ({
              accepted: tipAccepted,
              exchangeBaseUrl: "exchange url",
              merchantBaseUrl: "merchant url",
              tipAmountEffective: "EUR:1",
              walletTipId: "tip_id",
            } as PrepareTipResult as any),
            acceptTip: async () => {
              tipAccepted = true;
            },
          } as any,
        ),
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
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
      expect(state.merchantBaseUrl).eq("merchant url");
      expect(state.exchangeBaseUrl).eq("exchange url");
      if (state.accept.onClick === undefined) expect.fail();

      state.accept.onClick();
    }

    await waitNextUpdate();
    {
      const state = getLastResultOrThrow();

      if (state.status !== "accepted") expect.fail();
      if (state.error) expect.fail();
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
      expect(state.merchantBaseUrl).eq("merchant url");
      expect(state.exchangeBaseUrl).eq("exchange url");
    }
    await assertNoPendingUpdate();
  });

  it("should be ignored after clicking the ignore button", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          {
            talerTipUri: "taler://tip/asd",
            onCancel: async () => {
              null;
            },
            onSuccess: async () => { null; },
          },
          {
            prepareTip: async () =>
            ({
              exchangeBaseUrl: "exchange url",
              merchantBaseUrl: "merchant url",
              tipAmountEffective: "EUR:1",
              walletTipId: "tip_id",
            } as PrepareTipResult as any),
            acceptTip: async () => ({}),
          } as any,
        ),
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
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
      expect(state.merchantBaseUrl).eq("merchant url");
      expect(state.exchangeBaseUrl).eq("exchange url");
      // if (state.ignore.onClick === undefined) expect.fail();

      // state.ignore.onClick();
    }

    // await waitNextUpdate();
    // {
    //   const state = getLastResultOrThrow();

    //   if (state.status !== "ignored") expect.fail();
    //   if (state.error) expect.fail();
    // }
    await assertNoPendingUpdate();
  });

  it("should render accepted if the tip has been used previously", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          {
            talerTipUri: "taler://tip/asd",
            onCancel: async () => {
              null;
            },
            onSuccess: async () => { null; },
          },
          {
            prepareTip: async () =>
            ({
              accepted: true,
              exchangeBaseUrl: "exchange url",
              merchantBaseUrl: "merchant url",
              tipAmountEffective: "EUR:1",
              walletTipId: "tip_id",
            } as PrepareTipResult as any),
            acceptTip: async () => ({}),
          } as any,
        ),
      );

    {
      const { status, error } = getLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();

      if (state.status !== "accepted") expect.fail();
      if (state.error) expect.fail();
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
      expect(state.merchantBaseUrl).eq("merchant url");
      expect(state.exchangeBaseUrl).eq("exchange url");
    }
    await assertNoPendingUpdate();
  });
});
