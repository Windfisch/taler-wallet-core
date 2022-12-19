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
import { useEffect, useState } from "preact/hooks";
import useSWR, { useSWRConfig } from "swr";
import { useBackendContext } from "../context/backend.js";
import { useInstanceContext } from "../context/instance.js";
import { MerchantBackend } from "../declaration.js";
import { MAX_RESULT_SIZE, PAGE_SIZE } from "../utils/constants.js";
import {
  fetcher,
  HttpError,
  HttpResponse,
  HttpResponseOk,
  HttpResponsePaginated,
  request,
  useMatchMutate,
} from "./backend.js";

export interface OrderAPI {
  //FIXME: add OutOfStockResponse on 410
  createOrder: (
    data: MerchantBackend.Orders.PostOrderRequest,
  ) => Promise<HttpResponseOk<MerchantBackend.Orders.PostOrderResponse>>;
  forgetOrder: (
    id: string,
    data: MerchantBackend.Orders.ForgetRequest,
  ) => Promise<HttpResponseOk<void>>;
  refundOrder: (
    id: string,
    data: MerchantBackend.Orders.RefundRequest,
  ) => Promise<HttpResponseOk<MerchantBackend.Orders.MerchantRefundResponse>>;
  deleteOrder: (id: string) => Promise<HttpResponseOk<void>>;
  getPaymentURL: (id: string) => Promise<HttpResponseOk<string>>;
}

type YesOrNo = "yes" | "no";

export function orderFetcher<T>(
  url: string,
  token: string,
  backend: string,
  paid?: YesOrNo,
  refunded?: YesOrNo,
  wired?: YesOrNo,
  searchDate?: Date,
  delta?: number,
): Promise<HttpResponseOk<T>> {
  const date_ms =
    delta && delta < 0 && searchDate
      ? searchDate.getTime() + 1
      : searchDate?.getTime();
  const params: any = {};
  if (paid !== undefined) params.paid = paid;
  if (delta !== undefined) params.delta = delta;
  if (refunded !== undefined) params.refunded = refunded;
  if (wired !== undefined) params.wired = wired;
  if (date_ms !== undefined) params.date_ms = date_ms;
  return request<T>(`${backend}${url}`, { token, params });
}

export function useOrderAPI(): OrderAPI {
  const mutateAll = useMatchMutate();
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

  const createOrder = async (
    data: MerchantBackend.Orders.PostOrderRequest,
  ): Promise<HttpResponseOk<MerchantBackend.Orders.PostOrderResponse>> => {
    const res = await request<MerchantBackend.Orders.PostOrderResponse>(
      `${url}/private/orders`,
      {
        method: "post",
        token,
        data,
      },
    );
    await mutateAll(/.*private\/orders.*/);
    // mutate('')
    return res;
  };
  const refundOrder = async (
    orderId: string,
    data: MerchantBackend.Orders.RefundRequest,
  ): Promise<HttpResponseOk<MerchantBackend.Orders.MerchantRefundResponse>> => {
    mutateAll(/@"\/private\/orders"@/);
    const res = request<MerchantBackend.Orders.MerchantRefundResponse>(
      `${url}/private/orders/${orderId}/refund`,
      {
        method: "post",
        token,
        data,
      },
    );

    // order list returns refundable information, so we must evict everything
    await mutateAll(/.*private\/orders.*/);
    return res;
  };

  const forgetOrder = async (
    orderId: string,
    data: MerchantBackend.Orders.ForgetRequest,
  ): Promise<HttpResponseOk<void>> => {
    mutateAll(/@"\/private\/orders"@/);
    const res = request<void>(`${url}/private/orders/${orderId}/forget`, {
      method: "patch",
      token,
      data,
    });
    // we may be forgetting some fields that are pare of the listing, so we must evict everything
    await mutateAll(/.*private\/orders.*/);
    return res;
  };
  const deleteOrder = async (
    orderId: string,
  ): Promise<HttpResponseOk<void>> => {
    mutateAll(/@"\/private\/orders"@/);
    const res = request<void>(`${url}/private/orders/${orderId}`, {
      method: "delete",
      token,
    });
    await mutateAll(/.*private\/orders.*/);
    return res;
  };

  const getPaymentURL = async (
    orderId: string,
  ): Promise<HttpResponseOk<string>> => {
    return request<MerchantBackend.Orders.MerchantOrderStatusResponse>(
      `${url}/private/orders/${orderId}`,
      {
        method: "get",
        token,
      },
    ).then((res) => {
      const url =
        res.data.order_status === "unpaid"
          ? res.data.taler_pay_uri
          : res.data.contract_terms.fulfillment_url;
      const response: HttpResponseOk<string> = res as any;
      response.data = url || "";
      return response;
    });
  };

  return { createOrder, forgetOrder, deleteOrder, refundOrder, getPaymentURL };
}

export function useOrderDetails(
  oderId: string,
): HttpResponse<MerchantBackend.Orders.MerchantOrderStatusResponse> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken };

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Orders.MerchantOrderStatusResponse>,
    HttpError
  >([`/private/orders/${oderId}`, token, url], fetcher, {
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

export interface InstanceOrderFilter {
  paid?: YesOrNo;
  refunded?: YesOrNo;
  wired?: YesOrNo;
  date?: Date;
}

export function useInstanceOrders(
  args?: InstanceOrderFilter,
  updateFilter?: (d: Date) => void,
): HttpResponsePaginated<MerchantBackend.Orders.OrderHistory> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken };

  const [pageBefore, setPageBefore] = useState(1);
  const [pageAfter, setPageAfter] = useState(1);

  const totalAfter = pageAfter * PAGE_SIZE;
  const totalBefore = args?.date ? pageBefore * PAGE_SIZE : 0;

  /**
   * FIXME: this can be cleaned up a little
   *
   * the logic of double query should be inside the orderFetch so from the hook perspective and cache
   * is just one query and one error status
   */
  const {
    data: beforeData,
    error: beforeError,
    isValidating: loadingBefore,
  } = useSWR<HttpResponseOk<MerchantBackend.Orders.OrderHistory>, HttpError>(
    [
      `/private/orders`,
      token,
      url,
      args?.paid,
      args?.refunded,
      args?.wired,
      args?.date,
      totalBefore,
    ],
    orderFetcher,
  );
  const {
    data: afterData,
    error: afterError,
    isValidating: loadingAfter,
  } = useSWR<HttpResponseOk<MerchantBackend.Orders.OrderHistory>, HttpError>(
    [
      `/private/orders`,
      token,
      url,
      args?.paid,
      args?.refunded,
      args?.wired,
      args?.date,
      -totalAfter,
    ],
    orderFetcher,
  );

  //this will save last result
  const [lastBefore, setLastBefore] = useState<
    HttpResponse<MerchantBackend.Orders.OrderHistory>
  >({ loading: true });
  const [lastAfter, setLastAfter] = useState<
    HttpResponse<MerchantBackend.Orders.OrderHistory>
  >({ loading: true });
  useEffect(() => {
    if (afterData) setLastAfter(afterData);
    if (beforeData) setLastBefore(beforeData);
  }, [afterData, beforeData]);

  if (beforeError) return beforeError;
  if (afterError) return afterError;

  // if the query returns less that we ask, then we have reach the end or beginning
  const isReachingEnd = afterData && afterData.data.orders.length < totalAfter;
  const isReachingStart =
    args?.date === undefined ||
    (beforeData && beforeData.data.orders.length < totalBefore);

  const pagination = {
    isReachingEnd,
    isReachingStart,
    loadMore: () => {
      if (!afterData || isReachingEnd) return;
      if (afterData.data.orders.length < MAX_RESULT_SIZE) {
        setPageAfter(pageAfter + 1);
      } else {
        const from =
          afterData.data.orders[afterData.data.orders.length - 1].timestamp.t_s;
        if (from && from !== "never" && updateFilter)
          updateFilter(new Date(from * 1000));
      }
    },
    loadMorePrev: () => {
      if (!beforeData || isReachingStart) return;
      if (beforeData.data.orders.length < MAX_RESULT_SIZE) {
        setPageBefore(pageBefore + 1);
      } else if (beforeData) {
        const from =
          beforeData.data.orders[beforeData.data.orders.length - 1].timestamp
            .t_s;
        if (from && from !== "never" && updateFilter)
          updateFilter(new Date(from * 1000));
      }
    },
  };

  const orders =
    !beforeData || !afterData
      ? []
      : (beforeData || lastBefore).data.orders
          .slice()
          .reverse()
          .concat((afterData || lastAfter).data.orders);
  if (loadingAfter || loadingBefore) return { loading: true, data: { orders } };
  if (beforeData && afterData) {
    return { ok: true, data: { orders }, ...pagination };
  }
  return { loading: true };
}
