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
import useSWR, { useSWRConfig } from "swr";
import { useBackendContext } from "../context/backend";
import { useInstanceContext } from "../context/instance";
import { MerchantBackend, WithId } from "../declaration";
import {
  fetcher,
  HttpError,
  HttpResponse,
  HttpResponseOk,
  multiFetcher,
  request,
  useMatchMutate
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
  const mutateAll = useMatchMutate();
  const { mutate } = useSWRConfig();
  const { url: baseUrl, token: adminToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: adminToken, }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken, };

  const createProduct = async (
    data: MerchantBackend.Products.ProductAddDetail
  ): Promise<void> => {
    const res = await request(`${url}/private/products`, {
      method: "post",
      token,
      data,
    });

    return await mutateAll(/.*"\/private\/products.*/);
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

    return await mutateAll(/.*"\/private\/products.*/);
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    await request(`${url}/private/products/${productId}`, {
      method: "delete",
      token,
    });
    await mutate([`/private/products`, token, url]);
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

    return await mutateAll(/.*"\/private\/products.*/);
  };

  return { createProduct, updateProduct, deleteProduct, lockProduct };
}

export function useInstanceProducts(): HttpResponse<
  (MerchantBackend.Products.ProductDetail & WithId)[]
> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken, }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken, };

  const { data: list, error: listError } = useSWR<
    HttpResponseOk<MerchantBackend.Products.InventorySummaryResponse>,
    HttpError
  >([`/private/products`, token, url], fetcher, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
  });

  const paths = (list?.data.products || []).map(
    (p) => `/private/products/${p.product_id}`
  );
  const { data: products, error: productError } = useSWR<
    HttpResponseOk<MerchantBackend.Products.ProductDetail>[],
    HttpError
  >([paths, token, url], multiFetcher, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
  });


  if (listError) return listError;
  if (productError) return productError;

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
