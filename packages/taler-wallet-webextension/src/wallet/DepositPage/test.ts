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

import { Amounts, Balance, BalancesResponse, DepositGroupFees, parsePaytoUri, stringifyPaytoUri } from "@gnu-taler/taler-util";
import { expect } from "chai";
import { mountHook } from "../../test-utils.js";

import * as wxApi from "../../wxApi.js";
import { useComponentState } from "./state.js";

const currency = "EUR";
const withoutFee = async (): Promise<DepositGroupFees> => ({
  coin: Amounts.parseOrThrow(`${currency}:0`),
  wire: Amounts.parseOrThrow(`${currency}:0`),
  refresh: Amounts.parseOrThrow(`${currency}:0`),
});

const withSomeFee = async (): Promise<DepositGroupFees> => ({
  coin: Amounts.parseOrThrow(`${currency}:1`),
  wire: Amounts.parseOrThrow(`${currency}:1`),
  refresh: Amounts.parseOrThrow(`${currency}:1`),
});

const freeJustForIBAN = async (account: string): Promise<DepositGroupFees> =>
  /IBAN/i.test(account) ? withSomeFee() : withoutFee();

const someBalance = [
  {
    available: "EUR:10",
  } as Balance,
];

const nullFunction: any = () => null;
type VoidFunction = () => void;

describe("DepositPage states", () => {

  it("should have status 'no-enough-balance' when balance is empty", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
          getBalance: async () =>
          ({
            balances: [{ available: `${currency}:0` }],
          } as Partial<BalancesResponse>),
          listKnownBankAccounts: async () => ({ accounts: {} }),
        } as Partial<typeof wxApi> as any),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("loading");
    }

    await waitNextUpdate();

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("no-enough-balance");
    }

    await assertNoPendingUpdate();
  });

  // it("should have status 'no-accounts' when balance is not empty and accounts is empty", async () => {
  //   const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
  //     mountHook(() =>
  //       useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
  //         getBalance: async () =>
  //         ({
  //           balances: [{ available: `${currency}:1` }],
  //         } as Partial<BalancesResponse>),
  //         listKnownBankAccounts: async () => ({ accounts: {} }),
  //       } as Partial<typeof wxApi> as any),
  //     );

  //   {
  //     const { status } = getLastResultOrThrow();
  //     expect(status).equal("loading");
  //   }

  //   await waitNextUpdate();
  //   {
  //     const r = getLastResultOrThrow();
  //     if (r.status !== "no-accounts") expect.fail();
  //     expect(r.cancelHandler.onClick).not.undefined;
  //   }

  //   await assertNoPendingUpdate();
  // });

  const ibanPayto = {
    uri: parsePaytoUri("payto://iban/ES8877998399652238")!,
    kyc_completed: false,
    currency: "EUR",
    alias: "my iban account"
  };
  const talerBankPayto = {
    uri: parsePaytoUri("payto://x-taler-bank/ES8877998399652238")!,
    kyc_completed: false,
    currency: "EUR",
    alias: "my taler account"
  };

  it("should have status 'ready' but unable to deposit ", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
          getBalance: async () =>
          ({
            balances: [{ available: `${currency}:1` }],
          } as Partial<BalancesResponse>),
          listKnownBankAccounts: async () => ({ accounts: [ibanPayto] }),
        } as Partial<typeof wxApi> as any),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("loading");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("0");
      expect(r.depositHandler.onClick).undefined;
    }

    await assertNoPendingUpdate();
  });

  it.skip("should not be able to deposit more than the balance ", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
          getBalance: async () =>
          ({
            balances: [{ available: `${currency}:1` }],
          } as Partial<BalancesResponse>),
          listKnownBankAccounts: async () => ({ accounts: [ibanPayto] }),
          getFeeForDeposit: withoutFee,
        } as Partial<typeof wxApi> as any),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("loading");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("0");
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));

      r.amount.onInput("10");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.depositHandler.onClick).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.depositHandler.onClick).undefined;
    }

    await assertNoPendingUpdate();
  });

  it.skip("should calculate the fee upon entering amount ", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
          getBalance: async () =>
          ({
            balances: [{ available: `${currency}:1` }],
          } as Partial<BalancesResponse>),
          listKnownBankAccounts: async () => ({ accounts: [ibanPayto] }),
          getFeeForDeposit: withSomeFee,
        } as Partial<typeof wxApi> as any),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("loading");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("0");
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));

      r.amount.onInput("10");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:10`));
      expect(r.depositHandler.onClick).undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:7`));
      expect(r.depositHandler.onClick).undefined;
    }

    await assertNoPendingUpdate();
  });

  it("should calculate the fee upon selecting account ", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
          getBalance: async () =>
          ({
            balances: [{ available: `${currency}:1` }],
          } as Partial<BalancesResponse>),
          listKnownBankAccounts: async () => ({
            accounts: [ibanPayto, talerBankPayto],
          }),
          getFeeForDeposit: freeJustForIBAN,
        } as Partial<typeof wxApi> as any),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("loading");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("0");
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:0`));

      if (r.account.onChange === undefined) expect.fail();
      r.account.onChange(stringifyPaytoUri(ibanPayto.uri));
    }

    await waitNextUpdate("");

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(ibanPayto.uri));
      expect(r.amount.value).eq("0");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.depositHandler.onClick).undefined;

    }

    await waitNextUpdate("");

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(ibanPayto.uri));
      expect(r.amount.value).eq("0");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.depositHandler.onClick).undefined;

      r.amount.onInput("10");
    }

    await waitNextUpdate("");

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(ibanPayto.uri));
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:7`));
      expect(r.depositHandler.onClick).undefined;

    }

    await waitNextUpdate("");

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(ibanPayto.uri));
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:7`));
      expect(r.depositHandler.onClick).undefined;


      if (r.account.onChange === undefined) expect.fail();
      r.account.onChange(stringifyPaytoUri(talerBankPayto.uri));
    }

    await waitNextUpdate("");

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(talerBankPayto.uri));
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:7`));
      expect(r.depositHandler.onClick).undefined;

    }

    await waitNextUpdate("");

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq(stringifyPaytoUri(talerBankPayto.uri));
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:10`));
      expect(r.depositHandler.onClick).undefined;
    }

    await assertNoPendingUpdate();
  });

  it.skip("should be able to deposit if has the enough balance ", async () => {
    const { getLastResultOrThrow, waitNextUpdate, assertNoPendingUpdate } =
      mountHook(() =>
        useComponentState({ currency, onCancel: nullFunction, onSuccess: nullFunction }, {
          getBalance: async () =>
          ({
            balances: [{ available: `${currency}:15` }],
          } as Partial<BalancesResponse>),
          listKnownBankAccounts: async () => ({ accounts: [ibanPayto] }),
          getFeeForDeposit: withSomeFee,
        } as Partial<typeof wxApi> as any),
      );

    {
      const { status } = getLastResultOrThrow();
      expect(status).equal("loading");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("0");
      expect(r.depositHandler.onClick).undefined;
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));

      r.amount.onInput("10");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:0`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:10`));
      expect(r.depositHandler.onClick).undefined;

    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("10");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:7`));
      expect(r.depositHandler.onClick).not.undefined;

      r.amount.onInput("13");
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("13");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:10`));
      expect(r.depositHandler.onClick).not.undefined;
    }

    await waitNextUpdate();

    {
      const r = getLastResultOrThrow();
      if (r.status !== "ready") expect.fail();
      expect(r.cancelHandler.onClick).not.undefined;
      expect(r.currency).eq(currency);
      expect(r.account.value).eq("");
      expect(r.amount.value).eq("13");
      expect(r.totalFee).deep.eq(Amounts.parseOrThrow(`${currency}:3`));
      expect(r.totalToDeposit).deep.eq(Amounts.parseOrThrow(`${currency}:10`));
      expect(r.depositHandler.onClick).not.undefined;
    }

    await assertNoPendingUpdate();
  });
});