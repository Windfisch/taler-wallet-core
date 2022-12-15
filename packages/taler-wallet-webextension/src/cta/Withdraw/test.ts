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
import { tests } from "../../../../web-util/src/index.browser.js";
import { mountHook } from "../../test-utils.js";
import { createWalletApiMock } from "../../test-utils.js";
import { useComponentStateFromURI } from "./state.js";

const exchanges: ExchangeListItem[] = [
  {
    currency: "ARS",
    exchangeBaseUrl: "http://exchange.demo.taler.net",
    paytoUris: [],
    tosStatus: ExchangeTosStatus.Accepted,
    exchangeStatus: ExchangeEntryStatus.Ok,
    permanent: true,
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
  } as Partial<ExchangeListItem> as ExchangeListItem,
];

const nullFunction = async (): Promise<void> => {
  null;
};

describe("Withdraw CTA states", () => {
  it("should tell the user that the URI is missing", async () => {
    const { handler, TestingContext } = createWalletApiMock();

    const props = {
      talerWithdrawUri: undefined,
      cancel: nullFunction,
      onSuccess: nullFunction,
    };

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentStateFromURI,
      props,
      [
        ({ status }) => {
          expect(status).equals("loading");
        },
        ({ status, error }) => {
          if (status != "uri-error") expect.fail();
          if (!error) expect.fail();
          if (!error.hasError) expect.fail();
          if (error.operational) expect.fail();
          expect(error.message).eq("ERROR_NO-URI-FOR-WITHDRAWAL");
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should tell the user that there is not known exchange", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerWithdrawUri: "taler-withdraw://",
      cancel: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.GetWithdrawalDetailsForUri,
      undefined,
      {
        amount: "EUR:2",
        possibleExchanges: [],
      },
    );

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentStateFromURI,
      props,
      [
        ({ status }) => {
          expect(status).equals("loading");
        },
        ({ status, error }) => {
          expect(status).equals("no-exchange");
          expect(error).undefined;
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should be able to withdraw if tos are ok", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerWithdrawUri: "taler-withdraw://",
      cancel: nullFunction,
      onSuccess: nullFunction,
    };

    handler.addWalletCallResponse(
      WalletApiOperation.GetWithdrawalDetailsForUri,
      undefined,
      {
        amount: "ARS:2",
        possibleExchanges: exchanges,
        defaultExchangeBaseUrl: exchanges[0].exchangeBaseUrl,
      },
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetWithdrawalDetailsForAmount,
      undefined,
      {
        amountRaw: "ARS:2",
        amountEffective: "ARS:2",
        paytoUris: ["payto://"],
        tosAccepted: true,
        ageRestrictionOptions: [],
      },
    );

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentStateFromURI,
      props,
      [
        ({ status }) => {
          expect(status).equals("loading");
        },
        ({ status, error }) => {
          expect(status).equals("loading");
          expect(error).undefined;
        },
        (state) => {
          expect(state.status).equals("success");
          if (state.status !== "success") return;

          expect(state.toBeReceived).deep.equal(Amounts.parseOrThrow("ARS:2"));
          expect(state.withdrawalFee).deep.equal(Amounts.parseOrThrow("ARS:0"));
          expect(state.chosenAmount).deep.equal(Amounts.parseOrThrow("ARS:2"));

          expect(state.doWithdrawal.onClick).not.undefined;
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });

  it("should accept the tos before withdraw", async () => {
    const { handler, TestingContext } = createWalletApiMock();
    const props = {
      talerWithdrawUri: "taler-withdraw://",
      cancel: nullFunction,
      onSuccess: nullFunction,
    };

    const exchangeWithNewTos = exchanges.map((e) => ({
      ...e,
      tosStatus: ExchangeTosStatus.New,
    }));

    handler.addWalletCallResponse(
      WalletApiOperation.GetWithdrawalDetailsForUri,
      undefined,
      {
        amount: "ARS:2",
        possibleExchanges: exchangeWithNewTos,
        defaultExchangeBaseUrl: exchangeWithNewTos[0].exchangeBaseUrl,
      },
    );
    handler.addWalletCallResponse(
      WalletApiOperation.GetWithdrawalDetailsForAmount,
      undefined,
      {
        amountRaw: "ARS:2",
        amountEffective: "ARS:2",
        paytoUris: ["payto://"],
        tosAccepted: false,
        ageRestrictionOptions: [],
      },
    );

    handler.addWalletCallResponse(
      WalletApiOperation.GetWithdrawalDetailsForUri,
      undefined,
      {
        amount: "ARS:2",
        possibleExchanges: exchanges,
        defaultExchangeBaseUrl: exchanges[0].exchangeBaseUrl,
      },
    );

    const hookBehavior = await tests.hookBehaveLikeThis(
      useComponentStateFromURI,
      props,
      [
        ({ status }) => {
          expect(status).equals("loading");
        },
        ({ status, error }) => {
          expect(status).equals("loading");
          expect(error).undefined;
        },
        (state) => {
          expect(state.status).equals("success");
          if (state.status !== "success") return;

          expect(state.toBeReceived).deep.equal(Amounts.parseOrThrow("ARS:2"));
          expect(state.withdrawalFee).deep.equal(Amounts.parseOrThrow("ARS:0"));
          expect(state.chosenAmount).deep.equal(Amounts.parseOrThrow("ARS:2"));

          expect(state.doWithdrawal.onClick).undefined;

          state.onTosUpdate();
        },
        (state) => {
          expect(state.status).equals("success");
          if (state.status !== "success") return;

          expect(state.toBeReceived).deep.equal(Amounts.parseOrThrow("ARS:2"));
          expect(state.withdrawalFee).deep.equal(Amounts.parseOrThrow("ARS:0"));
          expect(state.chosenAmount).deep.equal(Amounts.parseOrThrow("ARS:2"));

          expect(state.doWithdrawal.onClick).not.undefined;
        },
      ],
      TestingContext,
    );

    expect(hookBehavior).deep.equal({ result: "ok" });
    expect(handler.getCallingQueueState()).eq("empty");
  });
});
