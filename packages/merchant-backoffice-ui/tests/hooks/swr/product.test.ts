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

import { renderHook } from "@testing-library/preact-hooks";
import { act } from "preact/test-utils";
import { TestingContext } from ".";
import { MerchantBackend } from "../../../src/declaration.js";
import { useInstanceProducts, useProductAPI, useProductDetails } from "../../../src/hooks/product.js";
import {
  API_CREATE_PRODUCT,
  API_DELETE_PRODUCT, API_GET_PRODUCT_BY_ID,
  API_LIST_PRODUCTS,
  API_UPDATE_PRODUCT_BY_ID,
  assertJustExpectedRequestWereMade,
  assertNextRequest,
  AxiosMockEnvironment
} from "../../axiosMock.js";

describe("product api interaction with listing", () => {
  it("should evict cache when creating a product", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_PRODUCTS, {
      response: {
        products: [{ product_id: "1234" }],
      },
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:12" } as MerchantBackend.Products.ProductDetail,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const query = useInstanceProducts();
        const api = useProductAPI();
        return { api, query };
      },
      { wrapper: TestingContext }
    ); // get products -> loading

    expect(result.current).toBeDefined();
    if (!result.current) {
      return;
    }
    expect(result.current.query.loading).toBeTruthy();
    await waitForNextUpdate({ timeout: 1 });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);
    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual([
      { id: "1234", price: "ARS:12" },
    ]);

    env.addRequestExpectation(API_CREATE_PRODUCT, {
      request: { price: "ARS:23" } as MerchantBackend.Products.ProductAddDetail,
    });

    env.addRequestExpectation(API_LIST_PRODUCTS, {
      response: {
        products: [{ product_id: "1234" }, { product_id: "2345" }],
      },
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:12" } as MerchantBackend.Products.ProductDetail,
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:12" } as MerchantBackend.Products.ProductDetail,
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("2345"), {
      response: { price: "ARS:23" } as MerchantBackend.Products.ProductDetail,
    });

    act(async () => {
      await result.current?.api.createProduct({
        price: "ARS:23",
      } as any);
    });

    assertNextRequest(env);
    await waitForNextUpdate({ timeout: 1 });
    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual([
      {
        id: "1234",
        price: "ARS:12",
      },
      {
        id: "2345",
        price: "ARS:23",
      },
    ]);
  });

  it("should evict cache when updating a product", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_PRODUCTS, {
      response: {
        products: [{ product_id: "1234" }],
      },
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:12" } as MerchantBackend.Products.ProductDetail,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const query = useInstanceProducts();
        const api = useProductAPI();
        return { api, query };
      },
      { wrapper: TestingContext }
    ); // get products -> loading

    expect(result.current).toBeDefined();
    if (!result.current) {
      return;
    }
    expect(result.current.query.loading).toBeTruthy();
    await waitForNextUpdate({ timeout: 1 });

    await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);
    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual([
      { id: "1234", price: "ARS:12" },
    ]);

    env.addRequestExpectation(API_UPDATE_PRODUCT_BY_ID("1234"), {
      request: { price: "ARS:13" } as MerchantBackend.Products.ProductPatchDetail,
    });

    env.addRequestExpectation(API_LIST_PRODUCTS, {
      response: {
        products: [{ product_id: "1234" }],
      },
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:13" } as MerchantBackend.Products.ProductDetail,
    });

    act(async () => {
      await result.current?.api.updateProduct("1234", {
        price: "ARS:13",
      } as any);
    });

    assertNextRequest(env);
    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual([
      {
        id: "1234",
        price: "ARS:13",
      },
    ]);
  });

  it("should evict cache when deleting a product", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_PRODUCTS, {
      response: {
        products: [{ product_id: "1234" }, { product_id: "2345" }],
      },
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:12" } as MerchantBackend.Products.ProductDetail,
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("2345"), {
      response: { price: "ARS:23" } as MerchantBackend.Products.ProductDetail,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const query = useInstanceProducts();
        const api = useProductAPI();
        return { api, query };
      },
      { wrapper: TestingContext }
    ); // get products -> loading

    expect(result.current).toBeDefined();
    if (!result.current) {
      return;
    }
    expect(result.current.query.loading).toBeTruthy();
    await waitForNextUpdate({ timeout: 1 });

    await waitForNextUpdate({ timeout: 1 });
    // await waitForNextUpdate({ timeout: 1 });
    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual([
      { id: "1234", price: "ARS:12" },
      { id: "2345", price: "ARS:23" },
    ]);

    env.addRequestExpectation(API_DELETE_PRODUCT("2345"), {});

    env.addRequestExpectation(API_LIST_PRODUCTS, {
      response: {
        products: [{ product_id: "1234" }],
      },
    });
    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("1234"), {
      response: { price: "ARS:13" } as MerchantBackend.Products.ProductDetail,
    });

    act(async () => {
      await result.current?.api.deleteProduct("2345");
    });

    assertNextRequest(env);
    await waitForNextUpdate({ timeout: 1 });
    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual([
      {
        id: "1234",
        price: "ARS:13",
      },
    ]);
  });

});

describe("product api interaction with details", () => {
  it("should evict cache when updating a product", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("12"), {
      response: {
        description: "this is a description",
      } as MerchantBackend.Products.ProductDetail,
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      const query = useProductDetails("12");
      const api = useProductAPI();
      return { query, api };
    }, { wrapper: TestingContext });

    expect(result.current).toBeDefined();
    if (!result.current) {
      return;
    }
    expect(result.current.query.loading).toBeTruthy();
    await waitForNextUpdate();

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      description: "this is a description",
    });

    env.addRequestExpectation(API_UPDATE_PRODUCT_BY_ID("12"), {
      request: { description: "other description" } as MerchantBackend.Products.ProductPatchDetail,
    });

    env.addRequestExpectation(API_GET_PRODUCT_BY_ID("12"), {
      response: {
        description: "other description",
      } as MerchantBackend.Products.ProductDetail,
    });

    act(async () => {
      return await result.current?.api.updateProduct("12", {
        description: "other description",
      } as any);
    });

    assertNextRequest(env);
    await waitForNextUpdate();

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      description: "other description",
    });
  })
})