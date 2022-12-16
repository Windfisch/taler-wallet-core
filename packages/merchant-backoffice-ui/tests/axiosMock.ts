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
import * as axios from 'axios';
import { MerchantBackend } from "../src/declaration.js";
import { mockAxiosOnce, setAxiosRequestAsTestingEnvironment } from "../src/utils/switchableAxios.js";
// import { mockAxiosOnce, setAxiosRequestAsTestingEnvironment } from "../src/hooks/backend.js";

export type Query<Req, Res> = (GetQuery | PostQuery | DeleteQuery | PatchQuery) & RequestResponse<Req, Res>

interface RequestResponse<Req, Res> {
  code?: number,
}
interface GetQuery { get: string }
interface PostQuery { post: string }
interface DeleteQuery { delete: string }
interface PatchQuery { patch: string }


const JEST_DEBUG_LOG = process.env['JEST_DEBUG_LOG'] !== undefined

type ExpectationValues = { query: Query<any, any>; params?: { auth?: string, request?: any, qparam?: any, response?: any } }

type TestValues = [axios.AxiosRequestConfig | undefined, ExpectationValues | undefined]

const defaultCallback = (actualQuery?: axios.AxiosRequestConfig): axios.AxiosPromise<any> => {
  if (JEST_DEBUG_LOG) {
    console.log('UNEXPECTED QUERY', actualQuery)
  }
  throw Error('Default Axios mock callback is called, this mean that the test did a tried to use axios but there was no expectation in place, try using JEST_DEBUG_LOG env')
}

setAxiosRequestAsTestingEnvironment(
  defaultCallback
);

export class AxiosMockEnvironment {
  expectations: Array<{
    query: Query<any, any>,
    auth?: string,
    params?: { request?: any, qparam?: any, response?: any },
    result: { args: axios.AxiosRequestConfig | undefined }
  } | undefined> = []
  // axiosMock: jest.MockedFunction<axios.AxiosStatic>

  addRequestExpectation<RequestType, ResponseType>(expectedQuery: Query<RequestType, ResponseType>, params: { auth?: string, request?: RequestType, qparam?: any, response?: ResponseType }): void {
    const result = mockAxiosOnce(function (actualQuery?: axios.AxiosRequestConfig): axios.AxiosPromise {

      if (JEST_DEBUG_LOG) {
        console.log('query to the backend is made', actualQuery)
      }
      if (!expectedQuery) {
        return Promise.reject("a query was made but it was not expected")
      }
      if (JEST_DEBUG_LOG) {
        console.log('expected query:', params?.request)
        console.log('expected qparams:', params?.qparam)
        console.log('sending response:', params?.response)
      }

      const responseCode = expectedQuery.code || 200

      //This response is what buildRequestOk is expecting in file hook/backend.ts
      if (responseCode >= 200 && responseCode < 300) {
        return Promise.resolve({
          data: params?.response, config: {
            data: params?.response,
            params: actualQuery?.params || {},
          }, request: { params: actualQuery?.params || {} }
        } as any);
      }
      //This response is what buildRequestFailed is expecting in file hook/backend.ts
      return Promise.reject({
        response: {
          status: responseCode
        },
        request: {
          data: params?.response,
          params: actualQuery?.params || {},
        }
      })

    } as any)

    this.expectations.push(expectedQuery ? { query: expectedQuery, params, result } : undefined)
  }

  getLastTestValues(): TestValues {
    const expectedQuery = this.expectations.shift()

    return [
      expectedQuery?.result.args, expectedQuery
    ]
  }

}

export function assertJustExpectedRequestWereMade(env: AxiosMockEnvironment): void {
  let size = env.expectations.length
  while (size-- > 0) {
    assertNextRequest(env)
  }
  assertNoMoreRequestWereMade(env)
}

export function assertNoMoreRequestWereMade(env: AxiosMockEnvironment): void {
  const [actualQuery, expectedQuery] = env.getLastTestValues()

  expect(actualQuery).toBeUndefined();
  expect(expectedQuery).toBeUndefined();
}

export function assertNextRequest(env: AxiosMockEnvironment): void {
  const [actualQuery, expectedQuery] = env.getLastTestValues()

  if (!actualQuery) {
    //expected one query but the tested component didn't execute one
    expect(actualQuery).toBe(expectedQuery);
    return
  }

  if (!expectedQuery) {
    const errorMessage = 'a query was made to the backend but the test explicitly expected no query';
    if (JEST_DEBUG_LOG) {
      console.log(errorMessage, actualQuery)
    }
    throw Error(errorMessage)
  }
  if ('get' in expectedQuery.query) {
    expect(actualQuery.method).toBe('get');
    expect(actualQuery.url).toBe(expectedQuery.query.get);
  }
  if ('post' in expectedQuery.query) {
    expect(actualQuery.method).toBe('post');
    expect(actualQuery.url).toBe(expectedQuery.query.post);
  }
  if ('delete' in expectedQuery.query) {
    expect(actualQuery.method).toBe('delete');
    expect(actualQuery.url).toBe(expectedQuery.query.delete);
  }
  if ('patch' in expectedQuery.query) {
    expect(actualQuery.method).toBe('patch');
    expect(actualQuery.url).toBe(expectedQuery.query.patch);
  }

  if (expectedQuery.params?.request) {
    expect(actualQuery.data).toMatchObject(expectedQuery.params.request)
  }
  if (expectedQuery.params?.qparam) {
    expect(actualQuery.params).toMatchObject(expectedQuery.params.qparam)
  }

  if (expectedQuery.params?.auth) {
    expect(actualQuery.headers.Authorization).toBe(expectedQuery.params?.auth)
  }

}

////////////////////
// ORDER
////////////////////

export const API_CREATE_ORDER: Query<
  MerchantBackend.Orders.PostOrderRequest,
  MerchantBackend.Orders.PostOrderResponse
> = {
  post: "http://backend/instances/default/private/orders",
};

export const API_GET_ORDER_BY_ID = (
  id: string
): Query<
  unknown,
  MerchantBackend.Orders.MerchantOrderStatusResponse
> => ({
  get: `http://backend/instances/default/private/orders/${id}`,
});

export const API_LIST_ORDERS: Query<
  unknown,
  MerchantBackend.Orders.OrderHistory
> = {
  get: "http://backend/instances/default/private/orders",
};

export const API_REFUND_ORDER_BY_ID = (
  id: string
): Query<
  MerchantBackend.Orders.RefundRequest,
  MerchantBackend.Orders.MerchantRefundResponse
> => ({
  post: `http://backend/instances/default/private/orders/${id}/refund`,
});

export const API_FORGET_ORDER_BY_ID = (
  id: string
): Query<
  MerchantBackend.Orders.ForgetRequest,
  unknown
> => ({
  patch: `http://backend/instances/default/private/orders/${id}/forget`,
});

export const API_DELETE_ORDER = (
  id: string
): Query<
  MerchantBackend.Orders.ForgetRequest,
  unknown
> => ({
  delete: `http://backend/instances/default/private/orders/${id}`,
});

////////////////////
// TRANSFER
////////////////////

export const API_LIST_TRANSFERS: Query<
  unknown,
  MerchantBackend.Transfers.TransferList
> = {
  get: "http://backend/instances/default/private/transfers",
};

export const API_INFORM_TRANSFERS: Query<
  MerchantBackend.Transfers.TransferInformation,
  MerchantBackend.Transfers.MerchantTrackTransferResponse
> = {
  post: "http://backend/instances/default/private/transfers",
};

////////////////////
// PRODUCT
////////////////////

export const API_CREATE_PRODUCT: Query<
  MerchantBackend.Products.ProductAddDetail,
  unknown
> = {
  post: "http://backend/instances/default/private/products",
};

export const API_LIST_PRODUCTS: Query<
  unknown,
  MerchantBackend.Products.InventorySummaryResponse
> = {
  get: "http://backend/instances/default/private/products",
};

export const API_GET_PRODUCT_BY_ID = (
  id: string
): Query<unknown, MerchantBackend.Products.ProductDetail> => ({
  get: `http://backend/instances/default/private/products/${id}`,
});

export const API_UPDATE_PRODUCT_BY_ID = (
  id: string
): Query<
  MerchantBackend.Products.ProductPatchDetail,
  MerchantBackend.Products.InventorySummaryResponse
> => ({
  patch: `http://backend/instances/default/private/products/${id}`,
});

export const API_DELETE_PRODUCT = (
  id: string
): Query<
  unknown, unknown
> => ({
  delete: `http://backend/instances/default/private/products/${id}`,
});

////////////////////
// RESERVES
////////////////////

export const API_CREATE_RESERVE: Query<
  MerchantBackend.Tips.ReserveCreateRequest,
  MerchantBackend.Tips.ReserveCreateConfirmation
> = {
  post: "http://backend/instances/default/private/reserves",
};
export const API_LIST_RESERVES: Query<
  unknown,
  MerchantBackend.Tips.TippingReserveStatus
> = {
  get: "http://backend/instances/default/private/reserves",
};

export const API_GET_RESERVE_BY_ID = (
  pub: string
): Query<unknown, MerchantBackend.Tips.ReserveDetail> => ({
  get: `http://backend/instances/default/private/reserves/${pub}`,
});

export const API_GET_TIP_BY_ID = (
  pub: string
): Query<
  unknown,
  MerchantBackend.Tips.TipDetails
> => ({
  get: `http://backend/instances/default/private/tips/${pub}`,
});

export const API_AUTHORIZE_TIP_FOR_RESERVE = (
  pub: string
): Query<
  MerchantBackend.Tips.TipCreateRequest,
  MerchantBackend.Tips.TipCreateConfirmation
> => ({
  post: `http://backend/instances/default/private/reserves/${pub}/authorize-tip`,
});

export const API_AUTHORIZE_TIP: Query<
  MerchantBackend.Tips.TipCreateRequest,
  MerchantBackend.Tips.TipCreateConfirmation
> = ({
  post: `http://backend/instances/default/private/tips`,
});


export const API_DELETE_RESERVE = (
  id: string
): Query<unknown, unknown> => ({
  delete: `http://backend/instances/default/private/reserves/${id}`,
});


////////////////////
// INSTANCE ADMIN
////////////////////

export const API_CREATE_INSTANCE: Query<
  MerchantBackend.Instances.InstanceConfigurationMessage,
  unknown
> = {
  post: "http://backend/management/instances",
};

export const API_GET_INSTANCE_BY_ID = (
  id: string
): Query<
  unknown,
  MerchantBackend.Instances.QueryInstancesResponse
> => ({
  get: `http://backend/management/instances/${id}`,
});

export const API_GET_INSTANCE_KYC_BY_ID = (
  id: string
): Query<
  unknown,
  MerchantBackend.Instances.AccountKycRedirects
> => ({
  get: `http://backend/management/instances/${id}/kyc`,
});

export const API_LIST_INSTANCES: Query<
  unknown,
  MerchantBackend.Instances.InstancesResponse
> = {
  get: "http://backend/management/instances",
};

export const API_UPDATE_INSTANCE_BY_ID = (
  id: string
): Query<
  MerchantBackend.Instances.InstanceReconfigurationMessage,
  unknown
> => ({
  patch: `http://backend/management/instances/${id}`,
});

export const API_UPDATE_INSTANCE_AUTH_BY_ID = (
  id: string
): Query<
  MerchantBackend.Instances.InstanceAuthConfigurationMessage,
  unknown
> => ({
  post: `http://backend/management/instances/${id}/auth`,
});

export const API_DELETE_INSTANCE = (
  id: string
): Query<unknown, unknown> => ({
  delete: `http://backend/management/instances/${id}`,
});

////////////////////
// INSTANCE 
////////////////////

export const API_GET_CURRENT_INSTANCE: Query<
  unknown,
  MerchantBackend.Instances.QueryInstancesResponse
> = ({
  get: `http://backend/instances/default/private/`,
});

export const API_GET_CURRENT_INSTANCE_KYC: Query<
  unknown,
  MerchantBackend.Instances.AccountKycRedirects
> =
  ({
    get: `http://backend/instances/default/private/kyc`,
  });

export const API_UPDATE_CURRENT_INSTANCE: Query<
  MerchantBackend.Instances.InstanceReconfigurationMessage,
  unknown
> = {
  patch: `http://backend/instances/default/private/`,
};

export const API_UPDATE_CURRENT_INSTANCE_AUTH: Query<
  MerchantBackend.Instances.InstanceAuthConfigurationMessage,
  unknown
> = {
  post: `http://backend/instances/default/private/auth`,
};

export const API_DELETE_CURRENT_INSTANCE: Query<
  unknown,
  unknown
> = ({
  delete: `http://backend/instances/default/private`,
});


