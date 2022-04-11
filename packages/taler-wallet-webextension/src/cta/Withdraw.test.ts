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

import { ExchangeListItem } from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../test-utils.js";
import { useComponentState } from "./Withdraw.js";

const exchanges: ExchangeListItem[] = [{
  currency: 'ARS',
  exchangeBaseUrl: 'http://exchange.demo.taler.net',
  paytoUris: [],
  tos: {
    acceptedVersion: '',
  }
}]

describe("Withdraw CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState(undefined, {
        listExchanges: async () => ({ exchanges }),
        getWithdrawalDetailsForUri: async ({ talerWithdrawUri }: any) => ({
          amount: 'ARS:2',
          possibleExchanges: exchanges,
        })
      } as any),
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading-uri')
      expect(hook).undefined;
    }

    await waitNextUpdate()

    {
      const { status, hook } = getLastResultOrThrow()

      expect(status).equals('loading-uri')
      expect(hook).deep.equals({ "hasError": true, "operational": false, "message": "ERROR_NO-URI-FOR-WITHDRAWAL" });
    }

    await assertNoPendingUpdate()
  });

  it("should tell the user that there is not known exchange", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } = mountHook(() =>
      useComponentState('taler-withdraw://', {
        listExchanges: async () => ({ exchanges }),
        getWithdrawalDetailsForUri: async ({ talerWithdrawUri }: any) => ({
          amount: 'EUR:2',
          possibleExchanges: [],
        })
      } as any),
    );

    {
      const { status, hook } = getLastResultOrThrow()
      expect(status).equals('loading-uri')
      expect(hook).undefined;
    }

    await waitNextUpdate()

    {
      const { status, hook } = getLastResultOrThrow()

      expect(status).equals('loading-exchange')

      expect(hook).deep.equals({ "hasError": true, "operational": false, "message": "ERROR_NO-DEFAULT-EXCHANGE" });
    }

    await assertNoPendingUpdate()
  });

});