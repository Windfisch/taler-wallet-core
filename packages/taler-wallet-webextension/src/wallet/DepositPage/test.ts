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
  DepositGroupFees,
  parsePaytoUri,
  stringifyPaytoUri,
} from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { expect } from "chai";
import {
  createWalletApiMock,
  mountHook,
  nullFunction,
} from "../../test-utils.js";

import { useComponentState } from "./state.js";

const currency = "EUR";
const withoutFee = (): DepositGroupFees => ({
  coin: Amounts.stringify(`${currency}:0`),
  wire: Amounts.stringify(`${currency}:0`),
  refresh: Amounts.stringify(`${currency}:0`),
});

const withSomeFee = (): DepositGroupFees => ({
  coin: Amounts.stringify(`${currency}:1`),
  wire: Amounts.stringify(`${currency}:1`),
  refresh: Amounts.stringify(`${currency}:1`),
});

describe("DepositPage states", () => {
  it("should have status 'no-enough-balance' when balance is empty", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = { currency, onCancel: nullFunction, onSuccess: nullFunction };

    handler.addWalletCallResponse(WalletApiOperation.GetBalances, undefined, {
      balances: [
        {
          available: `${currency}:0`,
          hasPendingTransactions: false,
          pendingIncoming: `${currency}:0`,
          pendingOutgoing: `${currency}:0`,
          requiresUserInput: false,
        },
      ],
    });
    handler.addWalletCallResponse(
      WalletApiOperation.ListKnownBankAccounts,
      undefined,
      {
        accounts: [],
      },
    );

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("no-enough-balance");
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should have status 'no-accounts' when balance is not empty and accounts is empty", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = { currency, onCancel: nullFunction, onSuccess: nullFunction };

    handler.addWalletCallResponse(WalletApiOperation.GetBalances, undefined, {
      balances: [
        {
          available: `${currency}:1`,
          hasPendingTransactions: false,
          pendingIncoming: `${currency}:0`,
          pendingOutgoing: `${currency}:0`,
          requiresUserInput: false,
        },
      ],
    });
    handler.addWalletCallResponse(
      WalletApiOperation.ListKnownBankAccounts,
      undefined,
      {
        accounts: [],
      },
    );
    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;
    {
      const r = pullLastResultOrThrow();
      if (r.status !== "no-accounts") expect.fail();
      // expect(r.cancelHandler.onClick).not.undefined;
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });

  const ibanPayto = {
    uri: parsePaytoUri("payto://iban/ES8877998399652238")!,
    kyc_completed: false,
    currency: "EUR",
    alias: "my iban account",
  };
  const talerBankPayto = {
    uri: parsePaytoUri("payto://x-taler-bank/ES8877998399652238")!,
    kyc_completed: false,
    currency: "EUR",
    alias: "my taler account",
  };

  it("should have status 'ready' but unable to deposit ", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = { currency, onCancel: nullFunction, onSuccess: nullFunction };

    handler.addWalletCallResponse(WalletApiOperation.GetBalances, undefined, {
      balances: [
        {
          available: `${currency}:1`,
          hasPendingTransactions: false,
          pendingIncoming: `${currency}:0`,
          pendingOutgoing: `${currency}:0`,
          requiresUserInput: false,
        },
      ],
    });
    handler.addWalletCallResponse(
      WalletApiOperation.ListKnownBankAccounts,
      undefined,
      {
        accounts: [ibanPayto],
      },
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withoutFee(),
    );

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;
    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }
    expect(await waitForStateUpdate()).true;

    {
      const r = pullLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(ibanPayto.uri));
      expect(r.amount.value).deep.eq(Amounts.parseOrThrow("EUR:0"));
      expect(r.depositHandler.onClick).undefined;
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should not be able to deposit more than the balance ", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = { currency, onCancel: nullFunction, onSuccess: nullFunction };

    handler.addWalletCallResponse(WalletApiOperation.GetBalances, undefined, {
      balances: [
        {
          available: `${currency}:5`,
          hasPendingTransactions: false,
          pendingIncoming: `${currency}:0`,
          pendingOutgoing: `${currency}:0`,
          requiresUserInput: false,
        },
      ],
    });
    handler.addWalletCallResponse(
      WalletApiOperation.ListKnownBankAccounts,
      undefined,
      {
        accounts: [talerBankPayto, ibanPayto],
      },
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withoutFee(),
    );

    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withoutFee(),
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withoutFee(),
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withoutFee(),
    );

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;
    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;
    const accountSelected = stringifyPaytoUri(ibanPayto.uri);

    {
      const r = pullLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(talerBankPayto.uri));
      expect(r.amount.value).deep.eq(Amounts.parseOrThrow("EUR:0"));
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.account.onChange).not.undefined;

      r.account.onChange!(accountSelected);
    }

    expect(await waitForStateUpdate()).true;

    {
      const r = pullLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(accountSelected);
      expect(r.amount.value).deep.eq(Amounts.parseOrThrow("EUR:0"));
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.depositHandler.onClick).undefined;
    }

    await assertNoPendingUpdate();
  });

  // it("should calculate the fee upon entering amount ", async () => {
  //   const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
  //     mountHook(() =>
  //       useComponentState(
  //         { currency, onCancel: nullFunction, onSuccess: nullFunction },
  //         {
  //           getBalance: async () =>
  //           ({
  //             balances: [{ available: `${currency}:1` }],
  //           } as Partial<BalancesResponse>),
  //           listKnownBankAccounts: async () => ({ accounts: [ibanPayto] }),
  //           getFeeForDeposit: withSomeFee,
  //         } as Partial<typeof wxApi> as any,
  //       ),
  //     );

  //   {
  //     const { status } = getLastResultOrThrow();
  //     expect(status).equal("loading");
  //   }

  //   await waitNextUpdate();

  //   {
  //     const r = getLastResultOrThrow();
  //     if (r.status !== "ready") expect.fail();
  //     expect(r.cancelHandler.onClick).not.undefined;
  //     expect(r.currency).eq(currency);
  //     expect(r.account.value).eq(accountSelected);
  //     expect(r.amount.value).eq("0");
  //     expect(r.depositHandler.onClick).undefined;
  //     expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));

  //     r.amount.onInput("10");
  //   }

  //   expect(await waitForStateUpdate()).true;

  //   {
  //     const r = pullLastResultOrThrow();
  //     if (r.status !== "ready") expect.fail();
  //     expect(r.cancelHandler.onClick).not.undefined;
  //     expect(r.currency).eq(currency);
  //     expect(r.account.value).eq(accountSelected);
  //     expect(r.amount.value).eq("10");
  //     expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
  //     expect(r.depositHandler.onClick).undefined;

  //     r.amount.onInput("3");
  //   }

  //   expect(await waitForStateUpdate()).true;

  //   {
  //     const r = pullLastResultOrThrow();
  //     if (r.status !== "ready") expect.fail();
  //     expect(r.cancelHandler.onClick).not.undefined;
  //     expect(r.currency).eq(currency);
  //     expect(r.account.value).eq(accountSelected);
  //     expect(r.amount.value).eq("3");
  //     expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
  //     expect(r.depositHandler.onClick).not.undefined;
  //   }

  //   await assertNoPendingUpdate();
  //   expect(handler.getCallingQueueState()).eq("empty")
  // });

  it("should calculate the fee upon entering amount ", async () => {
    const { handler, mock } = createWalletApiMock();
    const props = { currency, onCancel: nullFunction, onSuccess: nullFunction };

    handler.addWalletCallResponse(WalletApiOperation.GetBalances, undefined, {
      balances: [
        {
          available: `${currency}:10`,
          hasPendingTransactions: false,
          pendingIncoming: `${currency}:0`,
          pendingOutgoing: `${currency}:0`,
          requiresUserInput: false,
        },
      ],
    });
    handler.addWalletCallResponse(
      WalletApiOperation.ListKnownBankAccounts,
      undefined,
      {
        accounts: [talerBankPayto, ibanPayto],
      },
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withoutFee(),
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withSomeFee(),
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetFeeForDeposit,
      undefined,
      withSomeFee(),
    );

    const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
      mountHook(() => useComponentState(props, mock));

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;

    {
      const { status } = pullLastResultOrThrow();
      expect(status).equal("loading");
    }

    expect(await waitForStateUpdate()).true;
    const accountSelected = stringifyPaytoUri(ibanPayto.uri);

    {
      const r = pullLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(talerBankPayto.uri));
      expect(r.amount.value).deep.eq(Amounts.parseOrThrow("EUR:0"));
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.account.onChange).not.undefined;

      r.account.onChange!(accountSelected);
    }

    expect(await waitForStateUpdate()).true;

    {
      const r = pullLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(accountSelected);
      expect(r.amount.value).deep.eq(Amounts.parseOrThrow("EUR:0"));
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));

      expect(r.amount.onInput).not.undefined;
      if (!r.amount.onInput) return;
      r.amount.onInput(Amounts.parseOrThrow("EUR:10"));
    }

    expect(await waitForStateUpdate()).true;

    {
      const r = pullLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(accountSelected);
      expect(r.amount.value).deep.eq(Amounts.parseOrThrow("EUR:10"));
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:7`));
      expect(r.depositHandler.onClick).not.undefined;
    }

    await assertNoPendingUpdate();
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
