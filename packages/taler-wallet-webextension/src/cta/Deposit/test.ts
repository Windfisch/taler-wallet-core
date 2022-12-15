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
import { expect } from "chai";
import { createWalletApiMock } from "../../test-utils.js";
import { useComponentState } from "./state.js";
import { tests } from "@gnu-taler/web-util/lib/index.browser";
import { Props } from "./index.js";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";

describe("Deposit CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    const props: Props = {
      talerDepositUri: undefined,
      amountStr: undefined,
      cancel: async () => {
        null;
      },
      onSuccess: async () => {
        null;
      },
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentState,
      props,
      [
        ({ status }) => {
          expect(status).equals("loading");
        },
        ({ status, error }) => {
          expect(status).equals("loading-uri");

          if (!error) expect.fail();
          if (!error.hasError) expect.fail();
          if (error.operational) expect.fail();
          expect(error.message).eq("ERROR_NO-URI-FOR-DEPOSIT");
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should be ready after loading", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    handler.addWalletCallResponse(
      WalletApiOperation.PrepareDeposit,
      undefined,
      {
        effectiveDepositAmount: "EUR:1",
        totalDepositCost: "EUR:1.2",
      },
    );

    const props = {
      talerDepositUri: "payto://refund/asdasdas",
      amountStr: "EUR:1",
      cancel: async () => {
        null;
      },
      onSuccess: async () => {
        null;
      },
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentState,
      props,
      [
        ({ status }) => {
          expect(status).equals("loading");
        },
        (state) => {
          if (state.status !== "ready") expect.fail();
          if (state.error) expect.fail();
          expect(state.confirm.onClick).not.undefined;
          expect(state.cost).deep.eq(Amounts.parseOrThrow("EUR:1.2"));
          expect(state.fee).deep.eq(Amounts.parseOrThrow("EUR:0.2"));
          expect(state.effective).deep.eq(Amounts.parseOrThrow("EUR:1"));
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
