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
import { MerchantBackend } from '../declaration';
import { useBackendContext } from '../context/backend';
import { fetcher, HttpError, HttpResponse, HttpResponseOk, request, SwrError } from './backend';
import useSWR, { mutate } from 'swr';
import { useInstanceContext } from '../context/instance';


interface InstanceAPI {
  updateInstance: (data: MerchantBackend.Instances.InstanceReconfigurationMessage) => Promise<void>;
  deleteInstance: () => Promise<void>;
  clearToken: () => Promise<void>;
  setNewToken: (token: string) => Promise<void>;
}

export function useManagementAPI(instanceId: string) : InstanceAPI {
  const { url, token } = useBackendContext()

  const updateInstance = async (instance: MerchantBackend.Instances.InstanceReconfigurationMessage): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}`, {
      method: 'patch',
      token,
      data: instance
    })

    mutate([`/private/`, token, url], null)
  };

  const deleteInstance = async (): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}`, {
      method: 'delete',
      token,
    })

    mutate([`/private/`, token, url], null)
  }

  const clearToken = async (): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}/auth`, {
      method: 'post',
      token,
      data: { method: 'external' }
    })

    mutate([`/private/`, token, url], null)
  }

  const setNewToken = async (newToken: string): Promise<void> => {
    await request(`${url}/management/instances/${instanceId}/auth`, {
      method: 'post',
      token,
      data: { method: 'token', token: newToken }
    })

    mutate([`/private/`, token, url], null)
  }

  return { updateInstance, deleteInstance, setNewToken, clearToken }
}

export function useInstanceAPI(): InstanceAPI {
  const { url: baseUrl, token: adminToken } = useBackendContext()
  const { token: instanceToken, id, admin } = useInstanceContext()

  const { url, token } = !admin ? {
    url: baseUrl, token: adminToken
  } : {
    url: `${baseUrl}/instances/${id}`, token: instanceToken
  };

  const updateInstance = async (instance: MerchantBackend.Instances.InstanceReconfigurationMessage): Promise<void> => {
    await request(`${url}/private/`, {
      method: 'patch',
      token,
      data: instance
    })

    if (adminToken) mutate(['/private/instances', adminToken, baseUrl], null)
    mutate([`/private/`, token, url], null)
  };

  const deleteInstance = async (): Promise<void> => {
    await request(`${url}/private/`, {
      method: 'delete',
      token: adminToken,
    })

    if (adminToken) mutate(['/private/instances', adminToken, baseUrl], null)
    mutate([`/private/`, token, url], null)
  }

  const clearToken = async (): Promise<void> => {
    await request(`${url}/private/auth`, {
      method: 'post',
      token,
      data: { method: 'external' }
    })

    mutate([`/private/`, token, url], null)
  }

  const setNewToken = async (newToken: string): Promise<void> => {
    await request(`${url}/private/auth`, {
      method: 'post',
      token,
      data: { method: 'token', token: newToken }
    })

    mutate([`/private/`, token, url], null)
  }

  return { updateInstance, deleteInstance, setNewToken, clearToken }
}


export function useInstanceDetails(): HttpResponse<MerchantBackend.Instances.QueryInstancesResponse> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin ? {
    url: baseUrl, token: baseToken
  } : {
    url: `${baseUrl}/instances/${id}`, token: instanceToken
  }

  const { data, error, isValidating } = useSWR<HttpResponseOk<MerchantBackend.Instances.QueryInstancesResponse>, HttpError>([`/private/`, token, url], fetcher, {
    refreshInterval:0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    errorRetryCount: 0,
    errorRetryInterval: 1,
    shouldRetryOnError: false,
  })

  if (isValidating) return {loading:true, data: data?.data}
  if (data) return data
  if (error) return error
  return {loading: true}
}

export function useManagedInstanceDetails(instanceId: string): HttpResponse<MerchantBackend.Instances.QueryInstancesResponse> {
  const { url, token } = useBackendContext();

  const { data, error, isValidating } = useSWR<HttpResponseOk<MerchantBackend.Instances.QueryInstancesResponse>, HttpError>([`/management/instances/${instanceId}`, token, url], fetcher, {
    refreshInterval:0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    errorRetryCount: 0,
    errorRetryInterval: 1,
    shouldRetryOnError: false,
  })

  if (isValidating) return {loading:true, data: data?.data}
  if (data) return data
  if (error) return error
  return {loading: true}
}

export function useBackendInstances(): HttpResponse<MerchantBackend.Instances.InstancesResponse> {
  const { url } = useBackendContext()
  const { token } = useInstanceContext();

  const { data, error, isValidating } = useSWR<HttpResponseOk<MerchantBackend.Instances.InstancesResponse>, HttpError>(['/management/instances', token, url], fetcher)

  if (isValidating) return {loading:true, data: data?.data}
  if (data) return data
  if (error) return error
  return {loading: true}
}
