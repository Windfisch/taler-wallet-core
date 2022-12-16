/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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

import { act, renderHook } from "@testing-library/preact-hooks";
import { TestingContext } from "./index.js";
import { useInstanceTransfers, useTransferAPI } from "../../../src/hooks/transfer.js";
import {
  API_INFORM_TRANSFERS,
  API_LIST_TRANSFERS,
  assertJustExpectedRequestWereMade,
  assertNoMoreRequestWereMade,
  AxiosMockEnvironment,
} from "../../axiosMock.js";
import { MerchantBackend } from "../../../src/declaration.js";

describe("transfer api interaction with listing", () => {

  it("should evict cache when informing a transfer", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: 0 },
      response: {
        transfers: [{ wtid: "2" } as MerchantBackend.Transfers.TransferDetails],
      },
    });
    // FIXME: is this query really needed? if the hook is rendered without
    // position argument then then backend is returning the newest and no need
    // to this second query 
    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: -20 },
      response: {
        transfers: [],
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      const moveCursor = (d: string) => {
        console.log("new position", d);
      };
      const query = useInstanceTransfers({}, moveCursor);
      const api = useTransferAPI();

      return { query, api };
    }, { wrapper: TestingContext });

    expect(result.current).toBeDefined();
    if (!result.current) {
      return;
    }

    expect(result.current.query.loading).toBeTruthy();
    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();
    if (!result.current.query.ok) return;

    expect(result.current.query.data).toEqual({
      transfers: [{ wtid: "2" }],
    });

    env.addRequestExpectation(API_INFORM_TRANSFERS, {
      request: {
        wtid: '3',
        credit_amount: 'EUR:1',
        exchange_url: 'exchange.url',
        payto_uri: 'payto://'
      },
      response: { total: '' } as any,
    });

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: 0 },
      response: {
        transfers: [{ wtid: "2" } as any, { wtid: "3" } as any],
      },
    });

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: -20 },
      response: {
        transfers: [],
      },
    });

    act(async () => {
      await result.current?.api.informTransfer({
        wtid: '3',
        credit_amount: 'EUR:1',
        exchange_url: 'exchange.url',
        payto_uri: 'payto://'
      });
    });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      transfers: [{ wtid: "3" }, { wtid: "2" }],
    });
  });

});

describe("transfer listing pagination", () => {

  it("should not load more if has reach the end", async () => {
    const env = new AxiosMockEnvironment();
    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: 0, payto_uri: 'payto://' },
      response: {
        transfers: [{ wtid: "2" } as any],
      },
    });

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: -20, payto_uri: 'payto://' },
      response: {
        transfers: [{ wtid: "1" } as any],
      },
    });


    const { result, waitForNextUpdate } = renderHook(() => {
      const moveCursor = (d: string) => {
        console.log("new position", d);
      };
      const query = useInstanceTransfers({ payto_uri: 'payto://' }, moveCursor)
      return { query }
    }, { wrapper: TestingContext });

    assertJustExpectedRequestWereMade(env);

    await waitForNextUpdate();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      transfers: [{ wtid: "2" }, { wtid: "1" }],
    });

    expect(result.current.query.isReachingEnd).toBeTruthy()
    expect(result.current.query.isReachingStart).toBeTruthy()

    await act(() => {
      if (!result.current?.query.ok) throw Error("not ok");
      result.current.query.loadMore();
    });
    assertNoMoreRequestWereMade(env);

    await act(() => {
      if (!result.current?.query.ok) throw Error("not ok");
      result.current.query.loadMorePrev();
    });
    assertNoMoreRequestWereMade(env);

    expect(result.current.query.data).toEqual({
      transfers: [
        { wtid: "2" },
        { wtid: "1" },
      ],
    });
  });

  it("should load more if result brings more that PAGE_SIZE", async () => {
    const env = new AxiosMockEnvironment();

    const transfersFrom0to20 = Array.from({ length: 20 }).map((e, i) => ({ wtid: String(i) }))
    const transfersFrom20to40 = Array.from({ length: 20 }).map((e, i) => ({ wtid: String(i + 20) }))
    const transfersFrom20to0 = [...transfersFrom0to20].reverse()

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: 20, payto_uri: 'payto://' },
      response: {
        transfers: transfersFrom0to20,
      },
    });

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: -20, payto_uri: 'payto://' },
      response: {
        transfers: transfersFrom20to40,
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      const moveCursor = (d: string) => {
        console.log("new position", d);
      };
      const query = useInstanceTransfers({ payto_uri: 'payto://', position: '1' }, moveCursor)
      return { query }
    }, { wrapper: TestingContext });

    assertJustExpectedRequestWereMade(env);

    await waitForNextUpdate({ timeout: 1 });

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      transfers: [...transfersFrom20to0, ...transfersFrom20to40],
    });

    expect(result.current.query.isReachingEnd).toBeFalsy()
    expect(result.current.query.isReachingStart).toBeFalsy()

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: -40, payto_uri: 'payto://', offset: "1" },
      response: {
        transfers: [...transfersFrom20to40, { wtid: '41' }],
      },
    });

    await act(() => {
      if (!result.current?.query.ok) throw Error("not ok");
      result.current.query.loadMore();
    });
    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_TRANSFERS, {
      qparam: { limit: 40, payto_uri: 'payto://', offset: "1" },
      response: {
        transfers: [...transfersFrom0to20, { wtid: '-1' }],
      },
    });

    await act(() => {
      if (!result.current?.query.ok) throw Error("not ok");
      result.current.query.loadMorePrev();
    });
    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.data).toEqual({
      transfers: [{ wtid: '-1' }, ...transfersFrom20to0, ...transfersFrom20to40, { wtid: '41' }],
    });
  });


});
