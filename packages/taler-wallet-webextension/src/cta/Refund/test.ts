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
  Amounts, NotificationType, OrderShortInfo, PrepareRefundResult
} from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { expect } from "chai";
import { mountHook } from "../../test-utils.js";
import { createWalletApiMock } from "../../test-utils.js";
import { useComponentState } from "./state.js";

describe("Refund CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { handler, mock } = createWalletApiMock();

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          {
            talerRefundUri: undefined,
            cancel: async () => {
              null;
            },
            onSuccess: async () => {
              null;
            },
          },
          mock
          // {
          //   prepareRefund: async () => ({}),
          //   applyRefund: async () => ({}),
          //   onUpdateNotification: async () => ({}),
          // } as any,
        ),
      );

    {
      const { status, error } = pullLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    expect(await waitForStateUpdate()).true;

    {
      const { status, error } = pullLastResultOrThrow();

      expect(status).equals("loading-uri");
      if (!error) expect.fail();
      if (!error.hasError) expect.fail();
      if (error.operational) expect.fail();
      expect(error.message).eq("ERROR_NO-URI-FOR-REFUND");
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty")
  });

  it("should be ready after loading", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = {
      talerRefundUri: "taler://refund/asdasdas",
      cancel: async () => {
        null;
      },
      onSuccess: async () => {
        null;
      },
    }

    handler.addWalletCallResponse(WalletApiOperation.PrepareRefund, undefined, {
      awaiting: "EUR:2",
      effectivePaid: "EUR:2",
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
      } as OrderShortInfo,
    })

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          props, mock
          //   {
          //     prepareRefund: async () =>
          //     ({
          //       effectivePaid: "EUR:2",
          //       awaiting: "EUR:2",
          //       gone: "EUR:0",
          //       granted: "EUR:0",
          //       pending: false,
          //       proposalId: "1",
          //       info: {
          //         contractTermsHash: "123",
          //         merchant: {
          //           name: "the merchant name",
          //         },
          //         orderId: "orderId1",
          //         summary: "the summary",
          //       },
          //     } as PrepareRefundResult as any),
          //     applyRefund: async () => ({}),
          //     onUpdateNotification: async () => ({}),
          //   } as any,
        ),
      );

    {
      const { status, error } = pullLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "ready") expect.fail();
      if (state.error) expect.fail();
      expect(state.accept.onClick).not.undefined;
      expect(state.ignore.onClick).not.undefined;
      expect(state.merchantName).eq("the merchant name");
      expect(state.orderId).eq("orderId1");
      expect(state.products).undefined;
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty")
  });

  it("should be ignored after clicking the ignore button", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = {
      talerRefundUri: "taler://refund/asdasdas",
      cancel: async () => {
        null;
      },
      onSuccess: async () => {
        null;
      },
    }

    handler.addWalletCallResponse(WalletApiOperation.PrepareRefund, undefined, {
      awaiting: "EUR:2",
      effectivePaid: "EUR:2",
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
      } as OrderShortInfo,
    })
    // handler.addWalletCall(WalletApiOperation.ApplyRefund)
    // handler.addWalletCall(WalletApiOperation.PrepareRefund, undefined, {
    //   awaiting: "EUR:1",
    //   effectivePaid: "EUR:2",
    //   gone: "EUR:0",
    //   granted: "EUR:1",
    //   pending: true,
    //   proposalId: "1",
    //   info: {
    //     contractTermsHash: "123",
    //     merchant: {
    //       name: "the merchant name",
    //     },
    //     orderId: "orderId1",
    //     summary: "the summary",
    //   } as OrderShortInfo,
    // })
    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          props, mock
          // {
          //   prepareRefund: async () =>
          //   ({
          //     effectivePaid: "EUR:2",
          //     awaiting: "EUR:2",
          //     gone: "EUR:0",
          //     granted: "EUR:0",
          //     pending: false,
          //     proposalId: "1",
          //     info: {
          //       contractTermsHash: "123",
          //       merchant: {
          //         name: "the merchant name",
          //       },
          //       orderId: "orderId1",
          //       summary: "the summary",
          //     },
          //   } as PrepareRefundResult as any),
          //   applyRefund: async () => ({}),
          //   onUpdateNotification: async () => ({}),
          // } as any,
        ),
      );

    {
      const { status, error } = pullLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "ready") {
        expect(state).eq({})
        return;
      }
      if (state.error) {
        expect(state).eq({})
        return;
      }
      expect(state.accept.onClick).not.undefined;
      expect(state.merchantName).eq("the merchant name");
      expect(state.orderId).eq("orderId1");
      expect(state.products).undefined;

      if (state.ignore.onClick === undefined) expect.fail();
      state.ignore.onClick();
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "ignored") {
        expect(state).eq({})
        return;
      }
      if (state.error) {
        expect(state).eq({})
        return;
      }
      expect(state.merchantName).eq("the merchant name");
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty")
  });

  it("should be in progress when doing refresh", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = {
      talerRefundUri: "taler://refund/asdasdas",
      cancel: async () => {
        null;
      },
      onSuccess: async () => {
        null;
      },
    }

    handler.addWalletCallResponse(WalletApiOperation.PrepareRefund, undefined, {
      awaiting: "EUR:2",
      effectivePaid: "EUR:2",
      gone: "EUR:0",
      granted: "EUR:0",
      pending: true,
      proposalId: "1",
      info: {
        contractTermsHash: "123",
        merchant: {
          name: "the merchant name",
        },
        orderId: "orderId1",
        summary: "the summary",
      } as OrderShortInfo,
    })
    handler.addWalletCallResponse(WalletApiOperation.PrepareRefund, undefined, {
      awaiting: "EUR:1",
      effectivePaid: "EUR:2",
      gone: "EUR:0",
      granted: "EUR:1",
      pending: true,
      proposalId: "1",
      info: {
        contractTermsHash: "123",
        merchant: {
          name: "the merchant name",
        },
        orderId: "orderId1",
        summary: "the summary",
      } as OrderShortInfo,
    })
    handler.addWalletCallResponse(WalletApiOperation.PrepareRefund, undefined, {
      awaiting: "EUR:0",
      effectivePaid: "EUR:2",
      gone: "EUR:0",
      granted: "EUR:2",
      pending: false,
      proposalId: "1",
      info: {
        contractTermsHash: "123",
        merchant: {
          name: "the merchant name",
        },
        orderId: "orderId1",
        summary: "the summary",
      } as OrderShortInfo,
    })

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState(
          props, mock
        ),
      );

    {
      const { status, error } = pullLastResultOrThrow();
      expect(status).equals("loading");
      expect(error).undefined;
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "in-progress") {
        expect(state).eq({})
        return;
      }
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"));
      // expect(state.progress).closeTo(1 / 3, 0.01)

      handler.notifyEventFromWallet(NotificationType.RefreshMelted)
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "in-progress") {
        expect(state).eq({})
        return;
      }
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"));
      // expect(state.progress).closeTo(2 / 3, 0.01)

      handler.notifyEventFromWallet(NotificationType.RefreshMelted)
    }

    expect(await waitForStateUpdate()).true;

    {
      const state = pullLastResultOrThrow();

      if (state.status !== "ready") {
        expect(state).eq({})
        return;
      }
      if (state.error) expect.fail();
      expect(state.merchantName).eq("the merchant name");
      expect(state.products).undefined;
      expect(state.amount).deep.eq(Amounts.parseOrThrow("EUR:2"));
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty")
  });
});
