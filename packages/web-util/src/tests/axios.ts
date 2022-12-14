/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

// import axios, { AxiosPromise, AxiosRequestConfig } from "axios";
import * as axios from "axios";
import {
  setAxiosRequestAsTestingEnvironment,
  mockAxiosOnce,
} from "../utils/axios.js";

const TESTING_DEBUG_LOG = process.env["TESTING_DEBUG_LOG"] !== undefined;

const defaultCallback = (
  actualQuery?: axios.AxiosRequestConfig,
): axios.AxiosPromise<any> => {
  if (TESTING_DEBUG_LOG) {
    console.log("UNEXPECTED QUERY", actualQuery);
  }
  throw Error(
    "Default Axios mock callback is called, this mean that the test did a tried to use axios but there was no expectation in place, try using JEST_DEBUG_LOG env",
  );
};

setAxiosRequestAsTestingEnvironment(defaultCallback);

export type Query<Req, Res> = {
  method: axios.Method;
  url: string;
  code?: number;
};

type ExpectationValues = {
  query: Query<any, any>;
  params?: {
    auth?: string;
    request?: object;
    qparam?: Record<string, string>;
    response?: object;
  };
};

type TestValues = [
  axios.AxiosRequestConfig | undefined,
  ExpectationValues | undefined,
];

export class AxiosMockEnvironment {
  expectations: Array<
    | {
        query: Query<any, any>;
        auth?: string;
        params?: {
          request?: object;
          qparam?: Record<string, string>;
          response?: object;
        };
        result: { args: axios.AxiosRequestConfig | undefined };
      }
    | undefined
  > = [];
  // axiosMock: jest.MockedFunction<axios.AxiosStatic>

  addRequestExpectation<
    RequestType extends object,
    ResponseType extends object,
  >(
    expectedQuery: Query<RequestType, ResponseType>,
    params: {
      auth?: string;
      request?: RequestType;
      qparam?: any;
      response?: ResponseType;
    },
  ): void {
    const result = mockAxiosOnce(function (
      actualQuery?: axios.AxiosRequestConfig,
    ): axios.AxiosPromise {
      if (TESTING_DEBUG_LOG) {
        console.log("query to the backend is made", actualQuery);
      }
      if (!expectedQuery) {
        return Promise.reject("a query was made but it was not expected");
      }
      if (TESTING_DEBUG_LOG) {
        console.log("expected query:", params?.request);
        console.log("expected qparams:", params?.qparam);
        console.log("sending response:", params?.response);
      }

      const responseCode = expectedQuery.code || 200;

      //This response is what buildRequestOk is expecting in file hook/backend.ts
      if (responseCode >= 200 && responseCode < 300) {
        return Promise.resolve({
          data: params?.response,
          config: {
            data: params?.response,
            params: actualQuery?.params || {},
          },
          request: { params: actualQuery?.params || {} },
        } as any);
      }
      //This response is what buildRequestFailed is expecting in file hook/backend.ts
      return Promise.reject({
        response: {
          status: responseCode,
        },
        request: {
          data: params?.response,
          params: actualQuery?.params || {},
        },
      });
    } as any);

    this.expectations.push({ query: expectedQuery, params, result });
  }

  getLastTestValues(): TestValues {
    const expectedQuery = this.expectations.shift();

    return [expectedQuery?.result.args, expectedQuery];
  }
}
