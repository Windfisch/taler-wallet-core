/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>

 SPDX-License-Identifier: AGPL3.0-or-later
*/

/**
 * Imports.
 */
import {
  Headers,
  HttpRequestLibrary,
  HttpRequestOptions,
  HttpResponse,
} from "../util/http";
import { RequestThrottler } from "../util/RequestThrottler";
import Axios from "axios";

/**
 * Implementation of the HTTP request library interface for node.
 */
export class NodeHttpLib implements HttpRequestLibrary {
  private throttle = new RequestThrottler();
  private throttlingEnabled = true;

  /**
   * Set whether requests should be throttled.
   */
  setThrottling(enabled: boolean): void {
    this.throttlingEnabled = enabled;
  }

  private async req(
    method: "post" | "get",
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    if (this.throttlingEnabled && this.throttle.applyThrottle(url)) {
      throw Error("request throttled");
    }
    const resp = await Axios({
      method,
      url: url,
      responseType: "text",
      headers: opt?.headers,
      validateStatus: () => true,
      transformResponse: (x) => x,
      data: body,
    });

    const respText = resp.data;
    if (typeof respText !== "string") {
      throw Error("unexpected response type");
    }
    const makeJson = async (): Promise<any> => {
      let responseJson;
      try {
        responseJson = JSON.parse(respText);
      } catch (e) {
        throw Error("Invalid JSON from HTTP response");
      }
      if (responseJson === null || typeof responseJson !== "object") {
        throw Error("Invalid JSON from HTTP response");
      }
      return responseJson;
    };
    const headers = new Headers();
    for (const hn of Object.keys(resp.headers)) {
      headers.set(hn, resp.headers[hn]);
    }
    return {
      headers,
      status: resp.status,
      text: async () => resp.data,
      json: makeJson,
    };
  }

  async get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse> {
    return this.req("get", url, undefined, opt);
  }

  async postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    return this.req("post", url, body, opt);
  }
}
