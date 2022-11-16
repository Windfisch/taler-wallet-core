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

import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { expect } from "chai";
import {
  createWalletApiMock,
  mountHook,
  nullFunction,
} from "../../test-utils.js";
import { Props } from "./index.js";
import { useComponentState } from "./state.js";

const props: Props = {
  currency: "KUDOS",
  onBack: nullFunction,
  onComplete: nullFunction,
  onPaymentRequired: nullFunction,
};
describe("AddBackupProvider states", () => {
  it("should start in 'select-provider' state", async () => {
    const { handler, mock } = createWalletApiMock();

    // handler.addWalletCallResponse(
    //   WalletApiOperation.ListKnownBankAccounts,
    //   undefined,
    //   {
    //     accounts: [],
    //   },
    // );

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const state = pullLastResultOrThrow();
      expect(state.status).equal("select-provider");
      if (state.status !== "select-provider") return;
      expect(state.name.value).eq("");
      expect(state.url.value).eq("");
    }

    //FIXME: this should not make an extra update
    /**
     * this may be due to useUrlState because is using an effect over
     * a dependency with a timeout
     */
    // NOTE: do not remove this comment, keeping as an example
    // await waitForStateUpdate()
    // {
    //   const state = pullLastResultOrThrow();
    //   expect(state.status).equal("select-provider");
    //   if (state.status !== "select-provider") return;
    //   expect(state.name.value).eq("")
    //   expect(state.url.value).eq("")
    // }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
