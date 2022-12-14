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

import { tests } from "@gnu-taler/web-util/lib/index.browser";
import { SwrMockEnvironment } from "@gnu-taler/web-util/lib/tests/swr";
import { expect } from "chai";
import { TRANSACTION_API_EXAMPLE } from "../../endpoints.js";
import { Props } from "./index.js";
import { useComponentState } from "./state.js";


describe("Transaction states", () => {

  it("should query backend and render transactions", async () => {

    const env = new SwrMockEnvironment();

    const props: Props = {
      accountLabel: "myAccount",
      pageNumber: 0
    }

    env.addRequestExpectation(TRANSACTION_API_EXAMPLE.LIST_FIRST_PAGE, {
      response: {
        "transactions": [
          {
            "creditorIban": "DE159593",
            "creditorBic": "SANDBOXX",
            "creditorName": "exchange company",
            "debtorIban": "DE118695",
            "debtorBic": "SANDBOXX",
            "debtorName": "Name unknown",
            "amount": "1",
            "currency": "KUDOS",
            "subject": "Taler Withdrawal N588V8XE9TR49HKAXFQ20P0EQ0EYW2AC9NNANV8ZP5P59N6N0410",
            "date": "2022-12-12Z",
            "uid": "8PPFR9EM",
            "direction": "DBIT",
            "pmtInfId": null,
            "msgId": null
          },
          {
            "creditorIban": "DE159593",
            "creditorBic": "SANDBOXX",
            "creditorName": "exchange company",
            "debtorIban": "DE118695",
            "debtorBic": "SANDBOXX",
            "debtorName": "Name unknown",
            "amount": "5.00",
            "currency": "KUDOS",
            "subject": "HNEWWT679TQC5P1BVXJS48FX9NW18FWM6PTK2N80Z8GVT0ACGNK0",
            "date": "2022-12-07Z",
            "uid": "7FZJC3RJ",
            "direction": "DBIT",
            "pmtInfId": null,
            "msgId": null
          },
          {
            "creditorIban": "DE118695",
            "creditorBic": "SANDBOXX",
            "creditorName": "Name unknown",
            "debtorIban": "DE579516",
            "debtorBic": "SANDBOXX",
            "debtorName": "The Bank",
            "amount": "100",
            "currency": "KUDOS",
            "subject": "Sign-up bonus",
            "date": "2022-12-07Z",
            "uid": "I31A06J8",
            "direction": "CRDT",
            "pmtInfId": null,
            "msgId": null
          }
        ]
      }
    });

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {

        expect(status).equals("loading");
        expect(error).undefined;
      },
      ({ status, error }) => {

        expect(status).equals("ready");
        expect(error).undefined;
      },
    ], env.buildTestingContext())

    expect(hookBehavior).deep.eq({ result: "ok" })

    expect(env.assertJustExpectedRequestWereMade()).deep.eq({ result: "ok" })
  });

  it("should show error message on not found", async () => {

    const env = new SwrMockEnvironment();

    const props: Props = {
      accountLabel: "myAccount",
      pageNumber: 0
    }

    env.addRequestExpectation(TRANSACTION_API_EXAMPLE.LIST_NOT_FOUND, {});

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      ({ status, error }) => {
        expect(status).equals("loading-error");
        expect(error).deep.eq({
          hasError: true,
          operational: false,
          message: "Transactions page 0 was not found."
        });
      },
    ], env.buildTestingContext())

    expect(hookBehavior).deep.eq({ result: "ok" })
    expect(env.assertJustExpectedRequestWereMade()).deep.eq({ result: "ok" })
  });

  it("should show error message on server error", async () => {

    const env = new SwrMockEnvironment(false);

    const props: Props = {
      accountLabel: "myAccount",
      pageNumber: 0
    }

    env.addRequestExpectation(TRANSACTION_API_EXAMPLE.LIST_ERROR, {});

    const hookBehavior = await tests.hookBehaveLikeThis(useComponentState, props, [
      ({ status, error }) => {
        expect(status).equals("loading");
        expect(error).undefined;
      },
      ({ status, error }) => {
        expect(status).equals("loading-error");
        expect(error).deep.equal({
          hasError: true,
          operational: false,
          message: "Transaction page 0 could not be retrieved."
        });
      },
    ], env.buildTestingContext())

    expect(hookBehavior).deep.eq({ result: "ok" })
    expect(env.assertJustExpectedRequestWereMade()).deep.eq({ result: "ok" })
  });
});

