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
import { useBackendContext } from "../context/backend.js";
import { useInstanceContext } from "../context/instance.js";
import { MerchantBackend } from "../declaration.js";
import {
  fetcher,
  HttpError,
  HttpResponse,
  HttpResponseOk,
  request,
  useMatchMutate,
} from "./backend.js";

export function useReservesAPI(): ReserveMutateAPI {
  const mutateAll = useMatchMutate();
  const { mutate } = useSWRConfig();
  const { url: baseUrl, token: adminToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: adminToken, }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken, };

  const createReserve = async (
    data: MerchantBackend.Tips.ReserveCreateRequest
  ): Promise<
    HttpResponseOk<MerchantBackend.Tips.ReserveCreateConfirmation>
  > => {
    const res = await request<MerchantBackend.Tips.ReserveCreateConfirmation>(
      `${url}/private/reserves`,
      {
        method: "post",
        token,
        data,
      }
    );

    //evict reserve list query
    await mutateAll(/.*private\/reserves.*/);

    return res;
  };

  const authorizeTipReserve = async (
    pub: string,
    data: MerchantBackend.Tips.TipCreateRequest
  ): Promise<HttpResponseOk<MerchantBackend.Tips.TipCreateConfirmation>> => {
    const res = await request<MerchantBackend.Tips.TipCreateConfirmation>(
      `${url}/private/reserves/${pub}/authorize-tip`,
      {
        method: "post",
        token,
        data,
      }
    );

    //evict reserve details query
    await mutate([`/private/reserves/${pub}`, token, url]);

    return res;
  };

  const authorizeTip = async (
    data: MerchantBackend.Tips.TipCreateRequest
  ): Promise<HttpResponseOk<MerchantBackend.Tips.TipCreateConfirmation>> => {
    const res = await request<MerchantBackend.Tips.TipCreateConfirmation>(
      `${url}/private/tips`,
      {
        method: "post",
        token,
        data,
      }
    );

    //evict all details query
    await mutateAll(/.*private\/reserves\/.*/);

    return res;
  };

  const deleteReserve = async (pub: string): Promise<HttpResponse<void>> => {
    const res = await request<void>(`${url}/private/reserves/${pub}`, {
      method: "delete",
      token,
    });

    //evict reserve list query
    await mutateAll(/.*private\/reserves.*/);

    return res;
  };

  return { createReserve, authorizeTip, authorizeTipReserve, deleteReserve };
}

export interface ReserveMutateAPI {
  createReserve: (
    data: MerchantBackend.Tips.ReserveCreateRequest
  ) => Promise<HttpResponseOk<MerchantBackend.Tips.ReserveCreateConfirmation>>;
  authorizeTipReserve: (
    id: string,
    data: MerchantBackend.Tips.TipCreateRequest
  ) => Promise<HttpResponseOk<MerchantBackend.Tips.TipCreateConfirmation>>;
  authorizeTip: (
    data: MerchantBackend.Tips.TipCreateRequest
  ) => Promise<HttpResponseOk<MerchantBackend.Tips.TipCreateConfirmation>>;
  deleteReserve: (id: string) => Promise<HttpResponse<void>>;
}

export function useInstanceReserves(): HttpResponse<MerchantBackend.Tips.TippingReserveStatus> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken, }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken, };

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Tips.TippingReserveStatus>,
    HttpError
  >([`/private/reserves`, token, url], fetcher);

  if (isValidating) return { loading: true, data: data?.data };
  if (data) return data;
  if (error) return error;
  return { loading: true };
}

export function useReserveDetails(
  reserveId: string
): HttpResponse<MerchantBackend.Tips.ReserveDetail> {
  const { url: baseUrl } = useBackendContext();
  const { token, id: instanceId, admin } = useInstanceContext();

  const url = !admin ? baseUrl : `${baseUrl}/instances/${instanceId}`;

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Tips.ReserveDetail>,
    HttpError
  >([`/private/reserves/${reserveId}`, token, url], reserveDetailFetcher, {
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

export function useTipDetails(
  tipId: string
): HttpResponse<MerchantBackend.Tips.TipDetails> {
  const { url: baseUrl } = useBackendContext();
  const { token, id: instanceId, admin } = useInstanceContext();

  const url = !admin ? baseUrl : `${baseUrl}/instances/${instanceId}`;

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Tips.TipDetails>,
    HttpError
  >([`/private/tips/${tipId}`, token, url], tipsDetailFetcher, {
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

function reserveDetailFetcher<T>(
  url: string,
  token: string,
  backend: string
): Promise<HttpResponseOk<T>> {
  return request<T>(`${backend}${url}`, {
    token,
    params: {
      tips: "yes",
    },
  });
}

function tipsDetailFetcher<T>(
  url: string,
  token: string,
  backend: string
): Promise<HttpResponseOk<T>> {
  return request<T>(`${backend}${url}`, {
    token,
    params: {
      pickups: "yes",
    },
  });
}
