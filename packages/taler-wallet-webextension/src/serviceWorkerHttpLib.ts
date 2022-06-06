/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
 * Imports.
 */
import { RequestThrottler, TalerErrorCode } from "@gnu-taler/taler-util";
import {
  Headers,
  HttpRequestLibrary,
  HttpRequestOptions,
  HttpResponse,
  TalerError,
} from "@gnu-taler/taler-wallet-core";

/**
 * An implementation of the [[HttpRequestLibrary]] using the
 * browser's XMLHttpRequest.
 */
export class ServiceWorkerHttpLib implements HttpRequestLibrary {
  private throttle = new RequestThrottler();
  private throttlingEnabled = true;

  async fetch(
    requestUrl: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    const requestMethod = options?.method ?? "GET";
    const requestBody = options?.body;
    const requestHeader = options?.headers;

    if (this.throttlingEnabled && this.throttle.applyThrottle(requestUrl)) {
      const parsedUrl = new URL(requestUrl);
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_HTTP_REQUEST_THROTTLED,
        {
          requestMethod,
          requestUrl,
          throttleStats: this.throttle.getThrottleStats(requestUrl),
        },
        `request to origin ${parsedUrl.origin} was throttled`,
      );
    }

    const response = await fetch(requestUrl, {
      headers: requestHeader,
      body: requestBody,
      method: requestMethod,
      // timeout: options?.timeout
    });

    const headerMap = new Headers();
    response.headers.forEach((value, key) => {
      headerMap.set(key, value);
    });
    return {
      headers: headerMap,
      status: response.status,
      requestMethod,
      requestUrl,
      json: makeJsonHandler(response, requestUrl),
      text: makeTextHandler(response, requestUrl),
      bytes: async () => (await response.blob()).arrayBuffer(),
    };
  }

  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse> {
    return this.fetch(url, {
      method: "GET",
      ...opt,
    });
  }

  // FIXME: "Content-Type: application/json" goes here,
  // after Sebastian suggestion.
  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    return this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...opt,
    });
  }

  stop(): void {
    // Nothing to do
  }
}

function makeTextHandler(response: Response, requestUrl: string) {
  return async function getJsonFromResponse(): Promise<any> {
    let respText;
    try {
      respText = await response.text();
    } catch (e) {
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
        {
          requestUrl,
          httpStatusCode: response.status,
        },
        "Invalid JSON from HTTP response",
      );
    }
    return respText;
  };
}

function makeJsonHandler(response: Response, requestUrl: string) {
  return async function getJsonFromResponse(): Promise<any> {
    let responseJson;
    try {
      responseJson = await response.json();
    } catch (e) {
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
        {
          requestUrl,
          httpStatusCode: response.status,
        },
        "Invalid JSON from HTTP response",
      );
    }
    if (responseJson === null || typeof responseJson !== "object") {
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
        {
          requestUrl,
          httpStatusCode: response.status,
        },
        "Invalid JSON from HTTP response",
      );
    }
    return responseJson;
  };
}
