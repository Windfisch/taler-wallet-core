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
import { MerchantBackend } from "../declaration";
import {
  fetcher,
  HttpError,
  HttpResponse,
  HttpResponseOk,
  request,
  useMatchMutate,
} from "./backend";

interface InstanceAPI {
  updateInstance: (
    data: MerchantBackend.Instances.InstanceReconfigurationMessage
  ) => Promise<void>;
  deleteInstance: () => Promise<void>;
  clearToken: () => Promise<void>;
  setNewToken: (token: string) => Promise<void>;
}

export function useAdminAPI(): AdminAPI {
  const { url, token } = useBackendContext();
  const mutateAll = useMatchMutate();

  const createInstance = async (
    instance: MerchantBackend.Instances.InstanceConfigurationMessage
  ): Promise<void> => {
    await request(`${url}/management/instances`, {
      method: "post",
      token,
      data: instance,
    });

    mutateAll(/\/management\/instances/);
  };

  const deleteInstance = async (id: string): Promise<void> => {
    await request(`${url}/management/instances/${id}`, {
      method: "delete",
      token,
    });

    mutateAll(/\/management\/instances/);
  };

  const purgeInstance = async (id: string): Promise<void> => {
    await request(`${url}/management/instances/${id}`, {
      method: "delete",
      token,
      params: {
        purge: "YES",
      },
    });

    mutateAll(/\/management\/instances/);
  };

  return { createInstance, deleteInstance, purgeInstance };
}

export interface AdminAPI {
  createInstance: (
    data: MerchantBackend.Instances.InstanceConfigurationMessage
  ) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  purgeInstance: (id: string) => Promise<void>;
}

export function useManagementAPI(instanceId: string): InstanceAPI {
  const mutateAll = useMatchMutate();
  const { url, token, updateLoginStatus } = useBackendContext();

  const updateInstance = async (
    instance: MerchantBackend.Instances.InstanceReconfigurationMessage
  ): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}`, {
      method: "patch",
      token,
      data: instance,
    });

    mutateAll(/\/management\/instances/);
  };

  const deleteInstance = async (): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}`, {
      method: "delete",
      token,
    });

    mutateAll(/\/management\/instances/);
  };

  const clearToken = async (): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}/auth`, {
      method: "post",
      token,
      data: { method: "external" },
    });

    mutateAll(/\/management\/instances/);
  };

  const setNewToken = async (newToken: string): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}/auth`, {
      method: "post",
      token,
      data: { method: "token", token: newToken },
    });

    updateLoginStatus(url, newToken)
    mutateAll(/\/management\/instances/);
  };

  return { updateInstance, deleteInstance, setNewToken, clearToken };
}

export function useInstanceAPI(): InstanceAPI {
  const { mutate } = useSWRConfig();
  const { url: baseUrl, token: adminToken, updateLoginStatus } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: adminToken }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken };

  const updateInstance = async (
    instance: MerchantBackend.Instances.InstanceReconfigurationMessage
  ): Promise<void> => {
    await request(`${url}/private/`, {
      method: "patch",
      token,
      data: instance,
    });

    if (adminToken) mutate(["/private/instances", adminToken, baseUrl], null);
    mutate([`/private/`, token, url], null);
  };

  const deleteInstance = async (): Promise<void> => {
    await request(`${url}/private/`, {
      method: "delete",
      token: adminToken,
    });

    if (adminToken) mutate(["/private/instances", adminToken, baseUrl], null);
    mutate([`/private/`, token, url], null);
  };

  const clearToken = async (): Promise<void> => {
    await request(`${url}/private/auth`, {
      method: "post",
      token,
      data: { method: "external" },
    });

    mutate([`/private/`, token, url], null);
  };

  const setNewToken = async (newToken: string): Promise<void> => {
    await request(`${url}/private/auth`, {
      method: "post",
      token,
      data: { method: "token", token: newToken },
    });

    updateLoginStatus(baseUrl, newToken)
    mutate([`/private/`, token, url], null);
  };

  return { updateInstance, deleteInstance, setNewToken, clearToken };
}

export function useInstanceDetails(): HttpResponse<MerchantBackend.Instances.QueryInstancesResponse> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken };

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Instances.QueryInstancesResponse>,
    HttpError
  >([`/private/`, token, url], fetcher, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    errorRetryCount: 0,
    errorRetryInterval: 1,
    shouldRetryOnError: false,
  });

  if (isValidating) return { loading: true, data: data?.data };
  if (data) return data;
  if (error) return error;
  return { loading: true };
}

type KYCStatus =
  | { type: "ok" }
  | { type: "redirect"; status: MerchantBackend.Instances.AccountKycRedirects };

export function useInstanceKYCDetails(): HttpResponse<KYCStatus> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken };

  const { data, error } = useSWR<
    HttpResponseOk<MerchantBackend.Instances.AccountKycRedirects>,
    HttpError
  >([`/private/kyc`, token, url], fetcher, {
    refreshInterval: 5000,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    errorRetryCount: 0,
    errorRetryInterval: 1,
    shouldRetryOnError: false,
  });

  if (data) {
    if (data.info?.status === 202)
      return { ok: true, data: { type: "redirect", status: data.data } };
    return { ok: true, data: { type: "ok" } };
  }
  if (error) return error;
  return { loading: true };
}

export function useManagedInstanceDetails(
  instanceId: string
): HttpResponse<MerchantBackend.Instances.QueryInstancesResponse> {
  const { url, token } = useBackendContext();

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Instances.QueryInstancesResponse>,
    HttpError
  >([`/management/instances/${instanceId}`, token, url], fetcher, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    errorRetryCount: 0,
    errorRetryInterval: 1,
    shouldRetryOnError: false,
  });

  if (isValidating) return { loading: true, data: data?.data };
  if (data) return data;
  if (error) return error;
  return { loading: true };
}

export function useBackendInstances(): HttpResponse<MerchantBackend.Instances.InstancesResponse> {
  const { url } = useBackendContext();
  const { token } = useInstanceContext();

  const { data, error, isValidating } = useSWR<
    HttpResponseOk<MerchantBackend.Instances.InstancesResponse>,
    HttpError
  >(["/management/instances", token, url], fetcher);

  if (isValidating) return { loading: true, data: data?.data };
  if (data) return data;
  if (error) return error;
  return { loading: true };
}
