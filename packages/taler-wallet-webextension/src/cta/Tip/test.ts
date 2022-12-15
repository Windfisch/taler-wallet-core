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

import { Amounts } from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { expect } from "chai";
import { tests } from "../../../../web-util/src/index.browser.js";
import { mountHook, nullFunction } from "../../test-utils.js";
import { createWalletApiMock } from "../../test-utils.js";
import { Props } from "./index.js";
import { useComponentState } from "./state.js";

describe("Tip CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    const props: Props = {
      talerTipUri: undefined,
      onCancel: nullFunction,
      onSuccess: nullFunction,
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentState,
      props,
      [
        ({ status, error }) => {
          expect(status).equals("loading");
          expect(error).undefined;
        },
        ({ status, error }) => {
          expect(status).equals("loading-uri");
          if (!error) expect.fail();
          if (!error.hasError) expect.fail();
          if (error.operational) expect.fail();
          expect(error.message).eq("ERROR_NO-URI-FOR-TIP");
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should be ready for accepting the tip", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    handler.addWalletCallResponse(WalletApiOperation.PrepareTip, undefined, {
      accepted: false,
      exchangeBaseUrl: "exchange url",
      merchantBaseUrl: "merchant url",
      tipAmountEffective: "EUR:1",
      walletTipId: "tip_id",
      expirationTimestamp: {
        t_s: 1,
      },
      tipAmountRaw: "",
    });

    const props: Props = {
      talerTipUri: "taler://tip/asd",
      onCancel: nullFunction,
      onSuccess: nullFunction,
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentState,
      props,
      [
        ({ status, error }) => {
          expect(status).equals("loading");
          expect(error).undefined;
        },
        (state) => {
          if (state.status !== "ready") {
            expect(state).eq({ status: "ready" });
            return;
          }
          if (state.error) expect.fail();
          expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
          expect(state.merchantBaseUrl).eq("merchant url");
          expect(state.exchangeBaseUrl).eq("exchange url");
          if (state.accept.onClick === undefined) expect.fail();

          handler.addWalletCallResponse(WalletApiOperation.AcceptTip);
          state.accept.onClick();

          handler.addWalletCallResponse(
            WalletApiOperation.PrepareTip,
            undefined,
            {
              accepted: true,
              exchangeBaseUrl: "exchange url",
              merchantBaseUrl: "merchant url",
              tipAmountEffective: "EUR:1",
              walletTipId: "tip_id",
              expirationTimestamp: {
                t_s: 1,
              },
              tipAmountRaw: "",
            },
          );
        },
        (state) => {
          if (state.status !== "accepted") expect.fail();
          if (state.error) expect.fail();
          expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
          expect(state.merchantBaseUrl).eq("merchant url");
          expect(state.exchangeBaseUrl).eq("exchange url");
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it.skip("should be ignored after clicking the ignore button", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    handler.addWalletCallResponse(WalletApiOperation.PrepareTip, undefined, {
      exchangeBaseUrl: "exchange url",
      merchantBaseUrl: "merchant url",
      tipAmountEffective: "EUR:1",
      walletTipId: "tip_id",
      accepted: false,
      expirationTimestamp: {
        t_s: 1,
      },
      tipAmountRaw: "",
    });

    const props: Props = {
      talerTipUri: "taler://tip/asd",
      onCancel: nullFunction,
      onSuccess: nullFunction,
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentState,
      props,
      [
        ({ status, error }) => {
          expect(status).equals("loading");
          expect(error).undefined;
        },
        (state) => {
          if (state.status !== "ready") expect.fail();
          if (state.error) expect.fail();
          expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
          expect(state.merchantBaseUrl).eq("merchant url");
          expect(state.exchangeBaseUrl).eq("exchange url");

          //FIXME: add ignore button
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should render accepted if the tip has been used previously", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    handler.addWalletCallResponse(WalletApiOperation.PrepareTip, undefined, {
      accepted: true,
      exchangeBaseUrl: "exchange url",
      merchantBaseUrl: "merchant url",
      tipAmountEffective: "EUR:1",
      walletTipId: "tip_id",
      expirationTimestamp: {
        t_s: 1,
      },
      tipAmountRaw: "",
    });

    const props: Props = {
      talerTipUri: "taler://tip/asd",
      onCancel: nullFunction,
      onSuccess: nullFunction,
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentState,
      props,
      [
        ({ status, error }) => {
          expect(status).equals("loading");
          expect(error).undefined;
        },
        (state) => {
          if (state.status !== "accepted") expect.fail();
          if (state.error) expect.fail();
          expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:1"));
          expect(state.merchantBaseUrl).eq("merchant url");
          expect(state.exchangeBaseUrl).eq("exchange url");
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
