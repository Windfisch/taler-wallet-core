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

import { useSWRConfig } from "swr";
import axios, { AxiosError, AxiosResponse } from "axios";
import { MerchantBackend } from "../declaration.js";
import { useBackendContext } from "../context/backend.js";
import { useEffect, useState } from "preact/hooks";
import { DEFAULT_REQUEST_TIMEOUT } from "../utils/constants.js";
import { axiosHandler, removeAxiosCancelToken } from "../utils/switchableAxios.js";

export function useMatchMutate(): (
  re: RegExp,
  value?: unknown
) => Promise<any> {
  const { cache, mutate } = useSWRConfig();

  if (!(cache instanceof Map)) {
    throw new Error(
      "matchMutate requires the cache provider to be a Map instance"
    );
  }

  return function matchRegexMutate(re: RegExp, value?: unknown) {
    const allKeys = Array.from(cache.keys());
    // console.log(allKeys)
    const keys = allKeys.filter((key) => re.test(key));
    // console.log(allKeys.length, keys.length)
    const mutations = keys.map((key) => {
      // console.log(key)
      mutate(key, value, true);
    });
    return Promise.all(mutations);
  };
}

export type HttpResponse<T> =
  | HttpResponseOk<T>
  | HttpResponseLoading<T>
  | HttpError;
export type HttpResponsePaginated<T> =
  | HttpResponseOkPaginated<T>
  | HttpResponseLoading<T>
  | HttpError;

export interface RequestInfo {
  url: string;
  hasToken: boolean;
  params: unknown;
  data: unknown;
  status: number;
}

interface HttpResponseLoading<T> {
  ok?: false;
  loading: true;
  clientError?: false;
  serverError?: false;

  data?: T;
}
export interface HttpResponseOk<T> {
  ok: true;
  loading?: false;
  clientError?: false;
  serverError?: false;

  data: T;
  info?: RequestInfo;
}

export type HttpResponseOkPaginated<T> = HttpResponseOk<T> & WithPagination;

export interface WithPagination {
  loadMore: () => void;
  loadMorePrev: () => void;
  isReachingEnd?: boolean;
  isReachingStart?: boolean;
}

export type HttpError =
  | HttpResponseClientError
  | HttpResponseServerError
  | HttpResponseUnexpectedError;
export interface SwrError {
  info: unknown;
  status: number;
  message: string;
}
export interface HttpResponseServerError {
  ok?: false;
  loading?: false;
  clientError?: false;
  serverError: true;

  error?: MerchantBackend.ErrorDetail;
  status: number;
  message: string;
  info?: RequestInfo;
}
interface HttpResponseClientError {
  ok?: false;
  loading?: false;
  clientError: true;
  serverError?: false;

  info?: RequestInfo;
  isUnauthorized: boolean;
  isNotfound: boolean;
  status: number;
  error?: MerchantBackend.ErrorDetail;
  message: string;
}

interface HttpResponseUnexpectedError {
  ok?: false;
  loading?: false;
  clientError?: false;
  serverError?: false;

  info?: RequestInfo;
  status?: number;
  error: unknown;
  message: string;
}

type Methods = "get" | "post" | "patch" | "delete" | "put";

interface RequestOptions {
  method?: Methods;
  token?: string;
  data?: unknown;
  params?: unknown;
}

function buildRequestOk<T>(
  res: AxiosResponse<T>,
  url: string,
  hasToken: boolean
): HttpResponseOk<T> {
  return {
    ok: true,
    data: res.data,
    info: {
      params: res.config.params,
      data: res.config.data,
      url,
      hasToken,
      status: res.status,
    },
  };
}

// function buildResponse<T>(data?: T, error?: MerchantBackend.ErrorDetail, isValidating?: boolean): HttpResponse<T> {
//   if (isValidating) return {loading: true}
//   if (error) return buildRequestFailed()
// }

function buildRequestFailed(
  ex: AxiosError<MerchantBackend.ErrorDetail>,
  url: string,
  hasToken: boolean
):
  | HttpResponseClientError
  | HttpResponseServerError
  | HttpResponseUnexpectedError {
  const status = ex.response?.status;

  const info: RequestInfo = {
    data: ex.request?.data,
    params: ex.request?.params,
    url,
    hasToken,
    status: status || 0,
  };

  if (status && status >= 400 && status < 500) {
    const error: HttpResponseClientError = {
      clientError: true,
      isNotfound: status === 404,
      isUnauthorized: status === 401,
      status,
      info,
      message: ex.response?.data?.hint || ex.message,
      error: ex.response?.data,
    };
    return error;
  }
  if (status && status >= 500 && status < 600) {
    const error: HttpResponseServerError = {
      serverError: true,
      status,
      info,
      message:
        `${ex.response?.data?.hint} (code ${ex.response?.data?.code})` ||
        ex.message,
      error: ex.response?.data,
    };
    return error;
  }

  const error: HttpResponseUnexpectedError = {
    info,
    status,
    error: ex,
    message: ex.message,
  };

  return error;
}

const CancelToken = axios.CancelToken;
let source = CancelToken.source();

export function cancelPendingRequest(): void {
  source.cancel("canceled by the user");
  source = CancelToken.source();
}

export function isAxiosError<T>(
  error: AxiosError | any
): error is AxiosError<T> {
  return error && error.isAxiosError;
}

export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<HttpResponseOk<T>> {
  const headers = options.token
    ? { Authorization: `Bearer ${options.token}` }
    : undefined;

  try {
    const res = await axiosHandler({
      url,
      responseType: "json",
      headers,
      cancelToken: !removeAxiosCancelToken ? source.token : undefined,
      method: options.method || "get",
      data: options.data,
      params: options.params,
      timeout: DEFAULT_REQUEST_TIMEOUT * 1000,
    });
    return buildRequestOk<T>(res, url, !!options.token);
  } catch (e) {
    if (isAxiosError<MerchantBackend.ErrorDetail>(e)) {
      const error = buildRequestFailed(e, url, !!options.token);
      throw error;
    }
    throw e;
  }
}

export function multiFetcher<T>(
  urls: string[],
  token: string,
  backend: string
): Promise<HttpResponseOk<T>[]> {
  return Promise.all(urls.map((url) => fetcher<T>(url, token, backend)));
}

export function fetcher<T>(
  url: string,
  token: string,
  backend: string
): Promise<HttpResponseOk<T>> {
  return request<T>(`${backend}${url}`, { token });
}

export function useBackendInstancesTestForAdmin(): HttpResponse<MerchantBackend.Instances.InstancesResponse> {
  const { url, token } = useBackendContext();

  type Type = MerchantBackend.Instances.InstancesResponse;

  const [result, setResult] = useState<HttpResponse<Type>>({ loading: true });

  useEffect(() => {
    request<Type>(`${url}/management/instances`, { token })
      .then((data) => setResult(data))
      .catch((error) => setResult(error));
  }, [url, token]);

  return result;
}

export function useBackendConfig(): HttpResponse<MerchantBackend.VersionResponse> {
  const { url, token } = useBackendContext();

  type Type = MerchantBackend.VersionResponse;

  const [result, setResult] = useState<HttpResponse<Type>>({ loading: true });

  useEffect(() => {
    request<Type>(`${url}/config`, { token })
      .then((data) => setResult(data))
      .catch((error) => setResult(error));
  }, [url, token]);

  return result;
}
