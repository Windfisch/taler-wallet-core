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
import { useEffect } from "preact/hooks";
import useSWR, { trigger, useSWRInfinite, cache, mutate } from "swr";
import { useBackendContext } from "../context/backend";
// import { useFetchContext } from '../context/fetch';
import { useInstanceContext } from "../context/instance";
import { MerchantBackend, WithId } from "../declaration";
import {
  fetcher,
  HttpError,
  HttpResponse,
  HttpResponseOk,
  mutateAll,
  request,
} from "./backend";

export interface ProductAPI {
  createProduct: (
    data: MerchantBackend.Products.ProductAddDetail
  ) => Promise<void>;
  updateProduct: (
    id: string,
    data: MerchantBackend.Products.ProductPatchDetail
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  lockProduct: (
    id: string,
    data: MerchantBackend.Products.LockRequest
  ) => Promise<void>;
}

export function useProductAPI(): ProductAPI {
  const { url: baseUrl, token: adminToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? {
        url: baseUrl,
        token: adminToken,
      }
    : {
        url: `${baseUrl}/instances/${id}`,
        token: instanceToken,
      };

  const createProduct = async (
    data: MerchantBackend.Products.ProductAddDetail
  ): Promise<void> => {
    await request(`${url}/private/products`, {
      method: "post",
      token,
      data,
    });

    await mutateAll(/@"\/private\/products"@/, null);
  };

  const updateProduct = async (
    productId: string,
    data: MerchantBackend.Products.ProductPatchDetail
  ): Promise<void> => {
    const r = await request(`${url}/private/products/${productId}`, {
      method: "patch",
      token,
      data,
    });

    await mutateAll(/@"\/private\/products\/.*"@/);
    return Promise.resolve();
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    await request(`${url}/private/products/${productId}`, {
      method: "delete",
      token,
    });

    await mutateAll(/@"\/private\/products"@/);
  };

  const lockProduct = async (
    productId: string,
    data: MerchantBackend.Products.LockRequest
  ): Promise<void> => {
    await request(`${url}/private/products/${productId}/lock`, {
      method: "post",
      token,
      data,
    });

    await mutateAll(/@"\/private\/products"@/);
  };

  return { createProduct, updateProduct, deleteProduct, lockProduct };
}

export function useInstanceProducts(): HttpResponse<
  (MerchantBackend.Products.ProductDetail & WithId)[]
> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();
  // const { useSWR, useSWRInfinite } = useFetchContext();

  const { url, token } = !admin
    ? {
        url: baseUrl,
        token: baseToken,
      }
    : {
        url: `${baseUrl}/instances/${id}`,
        token: instanceToken,
      };

  const {
    data: list,
    error: listError,
    isValidating: listLoading,
  } = useSWR<
    HttpResponseOk<MerchantBackend.Products.InventorySummaryResponse>,
    HttpError
  >([`/private/products`, token, url], fetcher, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
  });

  const {
    data: products,
    error: productError,
    setSize,
    size,
  } = useSWRInfinite<
    HttpResponseOk<MerchantBackend.Products.ProductDetail>,
    HttpError
  >(
    (pageIndex: number) => {
      if (!list?.data || !list.data.products.length || listError || listLoading)
        return null;
      return [
        `/private/products/${list.data.products[pageIndex].product_id}`,
        token,
        url,
      ];
    },
    fetcher,
    {
      revalidateAll: true,
    }
  );

  useEffect(() => {
    if (list?.data && list.data.products.length > 0) {
      setSize(list.data.products.length);
    }
  }, [list?.data.products.length, listLoading]);

  if (listLoading) return { loading: true, data: [] };
  if (listError) return listError;
  if (productError) return productError;
  if (list?.data && list.data.products.length === 0) {
    return { ok: true, data: [] };
  }
  if (products) {
    const dataWithId = products.map((d) => {
      //take the id from the queried url
      return {
        ...d.data,
        id: d.info?.url.replace(/.*\/private\/products\//, "") || "",
      };
    });
    return { ok: true, data: dataWithId };
  }
  return { loading: true };
}

export function useProductDetails(
  productId: string
): HttpResponse<MerchantBackend.Products.ProductDetail> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? {
        url: baseUrl,
        token: baseToken,
      }
    : {
        url: `${baseUrl}/instances/${id}`,
        token: instanceToken,
      };

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Products.ProductDetail>,
    HttpError
  >([`/private/products/${productId}`, token, url], fetcher, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
  });

  if (isValidating) return { loading: true, data: data?.data };
  if (data) return data;
  if (error) return error;
  return { loading: true };
}
