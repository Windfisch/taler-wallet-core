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
  ExchangeFullDetails,
  GetExchangeTosResult,
} from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../../test-utils.js";
import { useComponentStateFromURI } from "./state.js";

const exchanges: ExchangeFullDetails[] = [
  {
    currency: "ARS",
    exchangeBaseUrl: "http://exchange.demo.taler.net",
    paytoUris: [],
    tos: {
      acceptedVersion: "v1",
      currentVersion: "v1",
    },
    auditors: [
      {
        auditor_pub: "pubpubpubpubpub",
        auditor_url: "https://audotor.taler.net",
        denomination_keys: [],
      },
    ],
    denomFees: {
      deposit: [],
      refresh: [],
      refund: [],
      withdraw: [],
    },
    globalFees: [],
    transferFees: {},
    wireInfo: {
      accounts: [],
      feesForType: {},
    },
  } as Partial<ExchangeFullDetails> as ExchangeFullDetails,
];

describe("Withdraw CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentStateFromURI(
          {
            talerWithdrawUri: undefined,
            cancel: async () => {
              null;
            },
            onSuccess: async () => {
              null;
            },
          },
          {
            listExchanges: async () => ({ exchanges }),
            getWithdrawalDetailsForUri: async ({ talerWithdrawUri }: any) => ({
              amount: "ARS:2",
              possibleExchanges: exchanges,
            }),
          } as any,
        ),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equals("loading");
    }

    await waitNextUpdate();

    {
      const { status, error } = getLastResultOrThrow();

      if (status != "loading-error") expect.fail();
      if (!error) expect.fail();
      if (!error.hasError) expect.fail();
      if (error.operational) expect.fail();
      expect(error.message).eq("ERROR_NO-URI-FOR-WITHDRAWAL");
    }

    await assertNoPendingUpdate();
  });

  it("should tell the user that there is not known exchange", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentStateFromURI(
          {
            talerWithdrawUri: "taler-withdraw://",
            cancel: async () => {
              null;
            },
            onSuccess: async () => {
              null;
            },
          },
          {
            listExchanges: async () => ({ exchanges }),
            getWithdrawalDetailsForUri: async ({ talerWithdrawUri }: any) => ({
              amount: "EUR:2",
              possibleExchanges: [],
            }),
          } as any,
        ),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equals("loading", "1");
    }

    await waitNextUpdate();

    {
      const { status, error } = getLastResultOrThrow();

      expect(status).equals("no-exchange", "3");

      expect(error).undefined;
    }

    await assertNoPendingUpdate();
  });

  it("should be able to withdraw if tos are ok", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentStateFromURI(
          {
            talerWithdrawUri: "taler-withdraw://",
            cancel: async () => {
              null;
            },
            onSuccess: async () => {
              null;
            },
          },
          {
            listExchanges: async () => ({ exchanges }),
            getWithdrawalDetailsForUri: async ({ talerWithdrawUri }: any) => ({
              amount: "ARS:2",
              possibleExchanges: exchanges,
              defaultExchangeBaseUrl: exchanges[0].exchangeBaseUrl,
            }),
            getExchangeTos: async (): Promise<GetExchangeTosResult> => ({
              contentType: "text",
              content: "just accept",
              acceptedEtag: "v1",
              currentEtag: "v1",
            }),
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

      expect(status).equals("loading");

      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();
      expect(state.status).equals("success");
      if (state.status !== "success") return;

      expect(state.toBeReceived).deep.equal(Amounts.parseOrThrow("ARS:2"));
      expect(state.withdrawalFee).deep.equal(Amounts.parseOrThrow("ARS:0"));
      expect(state.chosenAmount).deep.equal(Amounts.parseOrThrow("ARS:2"));

      expect(state.doWithdrawal.onClick).not.undefined;
    }

    await assertNoPendingUpdate();
  });

  it("should be accept the tos before withdraw", async () => {
    const listExchangesResponse = {
      exchanges: exchanges.map((e) => ({
        ...e,
        tos: {
          ...e.tos,
          acceptedVersion: undefined,
        },
      })) as ExchangeFullDetails[],
    };

    function updateAcceptedVersionToCurrentVersion(): void {
      listExchangesResponse.exchanges = listExchangesResponse.exchanges.map(
        (e) => ({
          ...e,
          tos: {
            ...e.tos,
            acceptedVersion: e.tos.currentVersion,
          },
        }),
      );
    }

    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentStateFromURI(
          {
            talerWithdrawUri: "taler-withdraw://",
            cancel: async () => {
              null;
            },
            onSuccess: async () => {
              null;
            },
          },
          {
            listExchanges: async () => ({ exchanges }),
            getWithdrawalDetailsForUri: async ({ talerWithdrawUri }: any) => ({
              amount: "ARS:2",
              possibleExchanges: exchanges,
              defaultExchangeBaseUrl: exchanges[0].exchangeBaseUrl,
            }),
            getExchangeTos: async (): Promise<GetExchangeTosResult> => ({
              contentType: "text",
              content: "just accept",
              acceptedEtag: "v1",
              currentEtag: "v2",
            }),
            setExchangeTosAccepted: async () => ({}),
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

      expect(status).equals("loading");

      expect(error).undefined;
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();
      expect(state.status).equals("success");
      if (state.status !== "success") return;

      expect(state.toBeReceived).deep.equal(Amounts.parseOrThrow("ARS:2"));
      expect(state.withdrawalFee).deep.equal(Amounts.parseOrThrow("ARS:0"));
      expect(state.chosenAmount).deep.equal(Amounts.parseOrThrow("ARS:2"));

      expect(state.doWithdrawal.onClick).undefined;

      updateAcceptedVersionToCurrentVersion();
      state.onTosUpdate();
    }

    await waitNextUpdate();

    {
      const state = getLastResultOrThrow();
      expect(state.status).equals("success");
      if (state.status !== "success") return;

      expect(state.toBeReceived).deep.equal(Amounts.parseOrThrow("ARS:2"));
      expect(state.withdrawalFee).deep.equal(Amounts.parseOrThrow("ARS:0"));
      expect(state.chosenAmount).deep.equal(Amounts.parseOrThrow("ARS:2"));

      expect(state.doWithdrawal.onClick).not.undefined;
    }

    await assertNoPendingUpdate();
  });
});
