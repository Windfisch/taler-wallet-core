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
import { TestingContext } from ".";
import { MerchantBackend } from "../../../src/declaration.js";
import { useInstanceOrders, useOrderAPI, useOrderDetails } from "../../../src/hooks/order.js";
import {
  API_CREATE_ORDER,
  API_DELETE_ORDER,
  API_FORGET_ORDER_BY_ID,
  API_GET_ORDER_BY_ID,
  API_LIST_ORDERS, API_REFUND_ORDER_BY_ID, assertJustExpectedRequestWereMade, assertNextRequest, assertNoMoreRequestWereMade, AxiosMockEnvironment
} from "../../axiosMock.js";

describe("order api interaction with listing", () => {

  it("should evict cache when creating an order", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 0, paid: "yes" },
      response: {
        orders: [{ order_id: "1" } as MerchantBackend.Orders.OrderHistoryEntry],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, paid: "yes" },
      response: {
        orders: [{ order_id: "2" } as MerchantBackend.Orders.OrderHistoryEntry],
      },
    });


    const { result, waitForNextUpdate } = renderHook(() => {
      const newDate = (d: Date) => {
        console.log("new date", d);
      };
      const query = useInstanceOrders({ paid: "yes" }, newDate);
      const api = useOrderAPI();

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
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{ order_id: "1" }, { order_id: "2" }],
    });

    env.addRequestExpectation(API_CREATE_ORDER, {
      request: {
        order: { amount: "ARS:12", summary: "pay me" },
      },
      response: { order_id: "3" },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 0, paid: "yes" },
      response: {
        orders: [{ order_id: "1" } as any],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, paid: "yes" },
      response: {
        orders: [{ order_id: "2" } as any, { order_id: "3" } as any],
      },
    });

    act(async () => {
      await result.current?.api.createOrder({
        order: { amount: "ARS:12", summary: "pay me" },
      } as any);
    });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{ order_id: "1" }, { order_id: "2" }, { order_id: "3" }],
    });
  });
  it("should evict cache when doing a refund", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 0, paid: "yes" },
      response: {
        orders: [{ order_id: "1", amount: 'EUR:12', refundable: true } as MerchantBackend.Orders.OrderHistoryEntry],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, paid: "yes" },
      response: { orders: [], },
    });


    const { result, waitForNextUpdate } = renderHook(() => {
      const newDate = (d: Date) => {
        console.log("new date", d);
      };
      const query = useInstanceOrders({ paid: "yes" }, newDate);
      const api = useOrderAPI();

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
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{
        order_id: "1",
        amount: 'EUR:12',
        refundable: true,
      }],
    });

    env.addRequestExpectation(API_REFUND_ORDER_BY_ID('1'), {
      request: {
        reason: 'double pay',
        refund: 'EUR:1'
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 0, paid: "yes" },
      response: {
        orders: [{ order_id: "1", amount: 'EUR:12', refundable: false } as any],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, paid: "yes" },
      response: { orders: [], },
    });

    act(async () => {
      await result.current?.api.refundOrder('1', {
        reason: 'double pay',
        refund: 'EUR:1'
      });
    });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{
        order_id: "1",
        amount: 'EUR:12',
        refundable: false,
      }],
    });
  });
  it("should evict cache when deleting an order", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 0, paid: "yes" },
      response: {
        orders: [{ order_id: "1" } as MerchantBackend.Orders.OrderHistoryEntry],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, paid: "yes" },
      response: {
        orders: [{ order_id: "2" } as MerchantBackend.Orders.OrderHistoryEntry],
      },
    });


    const { result, waitForNextUpdate } = renderHook(() => {
      const newDate = (d: Date) => {
        console.log("new date", d);
      };
      const query = useInstanceOrders({ paid: "yes" }, newDate);
      const api = useOrderAPI();

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
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{ order_id: "1" }, { order_id: "2" }],
    });

    env.addRequestExpectation(API_DELETE_ORDER('1'), {});

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 0, paid: "yes" },
      response: {
        orders: [],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, paid: "yes" },
      response: {
        orders: [{ order_id: "2" } as any],
      },
    });

    act(async () => {
      await result.current?.api.deleteOrder('1');
    });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{ order_id: "2" }],
    });
  });

});

describe("order api interaction with details", () => {

  it("should evict cache when doing a refund", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_ORDER_BY_ID('1'), {
      // qparam: { delta: 0, paid: "yes" },
      response: {
        summary: 'description',
        refund_amount: 'EUR:0',
      } as unknown as MerchantBackend.Orders.CheckPaymentPaidResponse,
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      const query = useOrderDetails('1')
      const api = useOrderAPI();

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
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      summary: 'description',
      refund_amount: 'EUR:0',
    });

    env.addRequestExpectation(API_REFUND_ORDER_BY_ID('1'), {
      request: {
        reason: 'double pay',
        refund: 'EUR:1'
      },
    });

    env.addRequestExpectation(API_GET_ORDER_BY_ID('1'), {
      response: {
        summary: 'description',
        refund_amount: 'EUR:1',
      } as unknown as MerchantBackend.Orders.CheckPaymentPaidResponse,
    });

    act(async () => {
      await result.current?.api.refundOrder('1', {
        reason: 'double pay',
        refund: 'EUR:1'
      });
    });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      summary: 'description',
      refund_amount: 'EUR:1',
    });
  })
  it("should evict cache when doing a forget", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_ORDER_BY_ID('1'), {
      // qparam: { delta: 0, paid: "yes" },
      response: {
        summary: 'description',
        refund_amount: 'EUR:0',
      } as unknown as MerchantBackend.Orders.CheckPaymentPaidResponse,
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      const query = useOrderDetails('1')
      const api = useOrderAPI();

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
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      summary: 'description',
      refund_amount: 'EUR:0',
    });

    env.addRequestExpectation(API_FORGET_ORDER_BY_ID('1'), {
      request: {
        fields: ['$.summary']
      },
    });

    env.addRequestExpectation(API_GET_ORDER_BY_ID('1'), {
      response: {
        summary: undefined,
      } as unknown as MerchantBackend.Orders.CheckPaymentPaidResponse,
    });

    act(async () => {
      await result.current?.api.forgetOrder('1', {
        fields: ['$.summary']
      });
    });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      summary: undefined,
    });
  })
})

describe("order listing pagination", () => {

  it("should not load more if has reach the end", async () => {
    const env = new AxiosMockEnvironment();
    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 20, wired: "yes", date_ms: 12 },
      response: {
        orders: [{ order_id: "1" } as any],
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, wired: "yes", date_ms: 13 },
      response: {
        orders: [{ order_id: "2" } as any],
      },
    });


    const { result, waitForNextUpdate } = renderHook(() => {
      const newDate = (d: Date) => {
        console.log("new date", d);
      };
      const date = new Date(12);
      const query = useInstanceOrders({ wired: "yes", date }, newDate)
      return { query }
    }, { wrapper: TestingContext });

    assertJustExpectedRequestWereMade(env);

    await waitForNextUpdate();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [{ order_id: "1" }, { order_id: "2" }],
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
      orders: [
        { order_id: "1" },
        { order_id: "2" },
      ],
    });
  });

  it("should load more if result brings more that PAGE_SIZE", async () => {
    const env = new AxiosMockEnvironment();

    const ordersFrom0to20 = Array.from({ length: 20 }).map((e, i) => ({ order_id: String(i) }))
    const ordersFrom20to40 = Array.from({ length: 20 }).map((e, i) => ({ order_id: String(i + 20) }))
    const ordersFrom20to0 = [...ordersFrom0to20].reverse()

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 20, wired: "yes", date_ms: 12 },
      response: {
        orders: ordersFrom0to20,
      },
    });

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -20, wired: "yes", date_ms: 13 },
      response: {
        orders: ordersFrom20to40,
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      const newDate = (d: Date) => {
        console.log("new date", d);
      };
      const date = new Date(12);
      const query = useInstanceOrders({ wired: "yes", date }, newDate)
      return { query }
    }, { wrapper: TestingContext });

    assertJustExpectedRequestWereMade(env);

    await waitForNextUpdate({ timeout: 1 });

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      orders: [...ordersFrom20to0, ...ordersFrom20to40],
    });

    expect(result.current.query.isReachingEnd).toBeFalsy()
    expect(result.current.query.isReachingStart).toBeFalsy()

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: -40, wired: "yes", date_ms: 13 },
      response: {
        orders: [...ordersFrom20to40, { order_id: '41' }],
      },
    });

    await act(() => {
      if (!result.current?.query.ok) throw Error("not ok");
      result.current.query.loadMore();
    });
    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_ORDERS, {
      qparam: { delta: 40, wired: "yes", date_ms: 12 },
      response: {
        orders: [...ordersFrom0to20, { order_id: '-1' }],
      },
    });

    await act(() => {
      if (!result.current?.query.ok) throw Error("not ok");
      result.current.query.loadMorePrev();
    });
    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.data).toEqual({
      orders: [{ order_id: '-1' }, ...ordersFrom20to0, ...ordersFrom20to40, { order_id: '41' }],
    });
  });


});
