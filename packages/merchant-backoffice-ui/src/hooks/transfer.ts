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
import { MerchantBackend } from "../declaration.js";
import { useBackendContext } from "../context/backend.js";
import {
  request,
  HttpResponse,
  HttpError,
  HttpResponseOk,
  HttpResponsePaginated,
  useMatchMutate,
} from "./backend.js";
import useSWR from "swr";
import { useInstanceContext } from "../context/instance.js";
import { MAX_RESULT_SIZE, PAGE_SIZE } from "../utils/constants.js";
import { useEffect, useState } from "preact/hooks";

async function transferFetcher<T>(
  url: string,
  token: string,
  backend: string,
  payto_uri?: string,
  verified?: string,
  position?: string,
  delta?: number,
): Promise<HttpResponseOk<T>> {
  const params: any = {};
  if (payto_uri !== undefined) params.payto_uri = payto_uri;
  if (verified !== undefined) params.verified = verified;
  if (delta !== undefined) {
    params.limit = delta;
  }
  if (position !== undefined) params.offset = position;

  return request<T>(`${backend}${url}`, { token, params });
}

export function useTransferAPI(): TransferAPI {
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

  const informTransfer = async (
    data: MerchantBackend.Transfers.TransferInformation,
  ): Promise<
    HttpResponseOk<MerchantBackend.Transfers.MerchantTrackTransferResponse>
  > => {
    const res =
      await request<MerchantBackend.Transfers.MerchantTrackTransferResponse>(
        `${url}/private/transfers`,
        {
          method: "post",
          token,
          data,
        },
      );

    await mutateAll(/.*private\/transfers.*/);
    return res;
  };

  return { informTransfer };
}

export interface TransferAPI {
  informTransfer: (
    data: MerchantBackend.Transfers.TransferInformation,
  ) => Promise<
    HttpResponseOk<MerchantBackend.Transfers.MerchantTrackTransferResponse>
  >;
}

export interface InstanceTransferFilter {
  payto_uri?: string;
  verified?: "yes" | "no";
  position?: string;
}

export function useInstanceTransfers(
  args?: InstanceTransferFilter,
  updatePosition?: (id: string) => void,
): HttpResponsePaginated<MerchantBackend.Transfers.TransferList> {
  const { url: baseUrl, token: baseToken } = useBackendContext();
  const { token: instanceToken, id, admin } = useInstanceContext();

  const { url, token } = !admin
    ? { url: baseUrl, token: baseToken }
    : { url: `${baseUrl}/instances/${id}`, token: instanceToken };

  const [pageBefore, setPageBefore] = useState(1);
  const [pageAfter, setPageAfter] = useState(1);

  const totalAfter = pageAfter * PAGE_SIZE;
  const totalBefore = args?.position !== undefined ? pageBefore * PAGE_SIZE : 0;

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
  } = useSWR<HttpResponseOk<MerchantBackend.Transfers.TransferList>, HttpError>(
    [
      `/private/transfers`,
      token,
      url,
      args?.payto_uri,
      args?.verified,
      args?.position,
      totalBefore,
    ],
    transferFetcher,
  );
  const {
    data: afterData,
    error: afterError,
    isValidating: loadingAfter,
  } = useSWR<HttpResponseOk<MerchantBackend.Transfers.TransferList>, HttpError>(
    [
      `/private/transfers`,
      token,
      url,
      args?.payto_uri,
      args?.verified,
      args?.position,
      -totalAfter,
    ],
    transferFetcher,
  );

  //this will save last result
  const [lastBefore, setLastBefore] = useState<
    HttpResponse<MerchantBackend.Transfers.TransferList>
  >({ loading: true });
  const [lastAfter, setLastAfter] = useState<
    HttpResponse<MerchantBackend.Transfers.TransferList>
  >({ loading: true });
  useEffect(() => {
    if (afterData) setLastAfter(afterData);
    if (beforeData) setLastBefore(beforeData);
  }, [afterData, beforeData]);

  if (beforeError) return beforeError;
  if (afterError) return afterError;

  // if the query returns less that we ask, then we have reach the end or beginning
  const isReachingEnd =
    afterData && afterData.data.transfers.length < totalAfter;
  const isReachingStart =
    args?.position === undefined ||
    (beforeData && beforeData.data.transfers.length < totalBefore);

  const pagination = {
    isReachingEnd,
    isReachingStart,
    loadMore: () => {
      if (!afterData || isReachingEnd) return;
      if (afterData.data.transfers.length < MAX_RESULT_SIZE) {
        setPageAfter(pageAfter + 1);
      } else {
        const from = `${
          afterData.data.transfers[afterData.data.transfers.length - 1]
            .transfer_serial_id
        }`;
        if (from && updatePosition) updatePosition(from);
      }
    },
    loadMorePrev: () => {
      if (!beforeData || isReachingStart) return;
      if (beforeData.data.transfers.length < MAX_RESULT_SIZE) {
        setPageBefore(pageBefore + 1);
      } else if (beforeData) {
        const from = `${
          beforeData.data.transfers[beforeData.data.transfers.length - 1]
            .transfer_serial_id
        }`;
        if (from && updatePosition) updatePosition(from);
      }
    },
  };

  const transfers =
    !beforeData || !afterData
      ? []
      : (beforeData || lastBefore).data.transfers
          .slice()
          .reverse()
          .concat((afterData || lastAfter).data.transfers);
  if (loadingAfter || loadingBefore)
    return { loading: true, data: { transfers } };
  if (beforeData && afterData) {
    return { ok: true, data: { transfers }, ...pagination };
  }
  return { loading: true };
}
