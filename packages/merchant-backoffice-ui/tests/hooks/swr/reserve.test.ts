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

import { renderHook } from "@testing-library/preact-hooks";
import { act } from "preact/test-utils";
import { MerchantBackend } from "../../../src/declaration";
import {
  useInstanceReserves,
  useReserveDetails,
  useReservesAPI,
  useTipDetails,
} from "../../../src/hooks/reserves";
import {
  API_AUTHORIZE_TIP,
  API_AUTHORIZE_TIP_FOR_RESERVE,
  API_CREATE_RESERVE,
  API_DELETE_RESERVE,
  API_GET_RESERVE_BY_ID,
  API_GET_TIP_BY_ID,
  API_LIST_RESERVES,
  assertJustExpectedRequestWereMade,
  AxiosMockEnvironment,
} from "../../axiosMock";
import { TestingContext } from "./index";

describe("reserve api interaction with listing ", () => {
  it("should evict cache when creating a reserve", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_RESERVES, {
      response: {
        reserves: [
          {
            reserve_pub: "11",
          } as MerchantBackend.Tips.ReserveStatusEntry,
        ],
      },
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useReservesAPI();
        const query = useInstanceReserves();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      reserves: [{ reserve_pub: "11" }],
    });

    env.addRequestExpectation(API_CREATE_RESERVE, {
      request: {
        initial_balance: "ARS:3333",
        exchange_url: "http://url",
        wire_method: "iban",
      },
      response: {
        reserve_pub: "22",
        payto_uri: "payto",
      },
    });

    act(async () => {
      await result.current?.api.createReserve({
        initial_balance: "ARS:3333",
        exchange_url: "http://url",
        wire_method: "iban",
      });
      return;
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_RESERVES, {
      response: {
        reserves: [
          {
            reserve_pub: "11",
          } as MerchantBackend.Tips.ReserveStatusEntry,
          {
            reserve_pub: "22",
          } as MerchantBackend.Tips.ReserveStatusEntry,
        ],
      },
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      reserves: [
        {
          reserve_pub: "11",
        } as MerchantBackend.Tips.ReserveStatusEntry,
        {
          reserve_pub: "22",
        } as MerchantBackend.Tips.ReserveStatusEntry,
      ],
    });
  });

  it("should evict cache when deleting a reserve", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_RESERVES, {
      response: {
        reserves: [
          {
            reserve_pub: "11",
          } as MerchantBackend.Tips.ReserveStatusEntry,
          {
            reserve_pub: "22",
          } as MerchantBackend.Tips.ReserveStatusEntry,
          {
            reserve_pub: "33",
          } as MerchantBackend.Tips.ReserveStatusEntry,
        ],
      },
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useReservesAPI();
        const query = useInstanceReserves();

        return { query, api };
      },
      {
        wrapper: TestingContext,
      }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      reserves: [
        { reserve_pub: "11" },
        { reserve_pub: "22" },
        { reserve_pub: "33" },
      ],
    });

    env.addRequestExpectation(API_DELETE_RESERVE("11"), {});

    act(async () => {
      await result.current?.api.deleteReserve("11");
      return;
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_RESERVES, {
      response: {
        reserves: [
          {
            reserve_pub: "22",
          } as MerchantBackend.Tips.ReserveStatusEntry,
          {
            reserve_pub: "33",
          } as MerchantBackend.Tips.ReserveStatusEntry,
        ],
      },
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      reserves: [
        {
          reserve_pub: "22",
        } as MerchantBackend.Tips.ReserveStatusEntry,
        {
          reserve_pub: "33",
        } as MerchantBackend.Tips.ReserveStatusEntry,
      ],
    });
  });
});

describe("reserve api interaction with details", () => {
  it("should evict cache when adding a tip for a specific reserve", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_RESERVE_BY_ID("11"), {
      response: {
        payto_uri: "payto://here",
        tips: [{ reason: "why?", tip_id: "id1", total_amount: "USD:10" }],
      } as MerchantBackend.Tips.ReserveDetail,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useReservesAPI();
        const query = useReserveDetails("11");

        return { query, api };
      },
      {
        wrapper: TestingContext,
      }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      payto_uri: "payto://here",
      tips: [{ reason: "why?", tip_id: "id1", total_amount: "USD:10" }],
    });

    env.addRequestExpectation(API_AUTHORIZE_TIP_FOR_RESERVE("11"), {
      request: {
        amount: "USD:12",
        justification: "not",
        next_url: "http://taler.net",
      },
      response: {
        tip_id: "id2",
        taler_tip_uri: "uri",
        tip_expiration: { t_s: 1 },
        tip_status_url: "url",
      },
    });

    act(async () => {
      await result.current?.api.authorizeTipReserve("11", {
        amount: "USD:12",
        justification: "not",
        next_url: "http://taler.net",
      });
    });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    env.addRequestExpectation(API_GET_RESERVE_BY_ID("11"), {
      response: {
        payto_uri: "payto://here",
        tips: [
          { reason: "why?", tip_id: "id1", total_amount: "USD:10" },
          { reason: "not", tip_id: "id2", total_amount: "USD:12" },
        ],
      } as MerchantBackend.Tips.ReserveDetail,
    });

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      payto_uri: "payto://here",
      tips: [
        { reason: "why?", tip_id: "id1", total_amount: "USD:10" },
        { reason: "not", tip_id: "id2", total_amount: "USD:12" },
      ],
    });
  });

  it("should evict cache when adding a tip for a random reserve", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_RESERVE_BY_ID("11"), {
      response: {
        payto_uri: "payto://here",
        tips: [{ reason: "why?", tip_id: "id1", total_amount: "USD:10" }],
      } as MerchantBackend.Tips.ReserveDetail,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useReservesAPI();
        const query = useReserveDetails("11");

        return { query, api };
      },
      {
        wrapper: TestingContext,
      }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      payto_uri: "payto://here",
      tips: [{ reason: "why?", tip_id: "id1", total_amount: "USD:10" }],
    });

    env.addRequestExpectation(API_AUTHORIZE_TIP, {
      request: {
        amount: "USD:12",
        justification: "not",
        next_url: "http://taler.net",
      },
      response: {
        tip_id: "id2",
        taler_tip_uri: "uri",
        tip_expiration: { t_s: 1 },
        tip_status_url: "url",
      },
    });

    act(async () => {
      await result.current?.api.authorizeTip({
        amount: "USD:12",
        justification: "not",
        next_url: "http://taler.net",
      });
    });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    env.addRequestExpectation(API_GET_RESERVE_BY_ID("11"), {
      response: {
        payto_uri: "payto://here",
        tips: [
          { reason: "why?", tip_id: "id1", total_amount: "USD:10" },
          { reason: "not", tip_id: "id2", total_amount: "USD:12" },
        ],
      } as MerchantBackend.Tips.ReserveDetail,
    });

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      payto_uri: "payto://here",
      tips: [
        { reason: "why?", tip_id: "id1", total_amount: "USD:10" },
        { reason: "not", tip_id: "id2", total_amount: "USD:12" },
      ],
    });
  });
});

describe("reserve api interaction with tip details", () => {
  it("should list tips", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_TIP_BY_ID("11"), {
      response: {
        total_picked_up: "USD:12",
        reason: "not",
      } as MerchantBackend.Tips.TipDetails,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        // const api = useReservesAPI();
        const query = useTipDetails("11");

        return { query };
      },
      {
        wrapper: TestingContext,
      }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      total_picked_up: "USD:12",
      reason: "not",
    });
  });
});
