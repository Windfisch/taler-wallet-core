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
  ExchangeEntryStatus,
  ExchangeListItem,
  ExchangeTosStatus,
} from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { expect } from "chai";
import { createWalletApiMock, mountHook } from "../../test-utils.js";
import { useComponentState } from "./state.js";

const exchangeArs: ExchangeListItem = {
  currency: "ARS",
  exchangeBaseUrl: "http://",
  tosStatus: ExchangeTosStatus.Accepted,
  exchangeStatus: ExchangeEntryStatus.Ok,
  paytoUris: [],
  permanent: true,
  ageRestrictionOptions: [],
};

describe("Destination selection states", () => {
  it("should select currency if no amount specified", async () => {
    const { handler, mock } = createWalletApiMock();

    handler.addWalletCallResponse(
      WalletApiOperation.ListExchanges,
      {},
      {
        exchanges: [exchangeArs],
      },
    );

    const props = {
      type: "get" as const,
      goToWalletManualWithdraw: () => {
        return null;
      },
      goToWalletWalletInvoice: () => {
        null;
      },
    };
    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "loading") expect.fail();
      if (state.error) expect.fail();
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "select-currency") expect.fail();
      if (state.error) expect.fail();
      expect(state.currencies).deep.eq({
        ARS: "ARS",
        "": "Select a currency",
      });

      state.onCurrencySelected(exchangeArs.currency!);
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "ready") expect.fail();
      if (state.error) expect.fail();
      expect(state.goToBank.onClick).eq(undefined);
      expect(state.goToWallet.onClick).eq(undefined);

      expect(state.amountHandler.value).deep.eq(Amounts.parseOrThrow("ARS:0"));
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should be possible to start with an amount specified in request params", async () => {
    const { handler, mock } = createWalletApiMock();

    const props = {
      type: "get" as const,
      goToWalletManualWithdraw: () => {
        return null;
      },
      goToWalletWalletInvoice: () => {
        null;
      },
      amount: "ARS:2",
    };
    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "ready") expect.fail();
      if (state.error) expect.fail();
      expect(state.goToBank.onClick).not.eq(undefined);
      expect(state.goToWallet.onClick).not.eq(undefined);

      expect(state.amountHandler.value).deep.eq(Amounts.parseOrThrow("ARS:2"));
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
