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

/**
 * Imports.
 */
import {
  HttpRequestLibrary,
  HttpRequestOptions,
  HttpResponse,
  Headers,
  TalerError,
} from "@gnu-taler/taler-wallet-core";
import {
  Logger,
  RequestThrottler,
  stringToBytes,
  TalerErrorCode,
} from "@gnu-taler/taler-util";

const logger = new Logger("browserHttpLib");

/**
 * An implementation of the [[HttpRequestLibrary]] using the
 * browser's XMLHttpRequest.
 */
export class BrowserHttpLib implements HttpRequestLibrary {
  private throttle = new RequestThrottler();
  private throttlingEnabled = true;

  fetch(
    requestUrl: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    const requestMethod = options?.method ?? "GET";
    const requestBody = options?.body;

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

    return new Promise<HttpResponse>((resolve, reject) => {
      const myRequest = new XMLHttpRequest();
      myRequest.open(requestMethod, requestUrl);
      if (options?.headers) {
        for (const headerName in options.headers) {
          myRequest.setRequestHeader(headerName, options.headers[headerName]);
        }
      }
      myRequest.responseType = "arraybuffer";
      if (requestBody) {
        if (requestBody instanceof ArrayBuffer) {
          myRequest.send(requestBody);
        } else if (ArrayBuffer.isView(requestBody)) {
          myRequest.send(requestBody);
        } else if (typeof requestBody === "string") {
          myRequest.send(requestBody);
        } else {
          myRequest.send(JSON.stringify(requestBody));
        }
      } else {
        myRequest.send();
      }

      myRequest.onerror = (e) => {
        logger.error("http request error");
        reject(
          TalerError.fromDetail(
            TalerErrorCode.WALLET_NETWORK_ERROR,
            {
              requestUrl: requestUrl,
            },
            "Could not make request",
          ),
        );
      };

      myRequest.addEventListener("readystatechange", (e) => {
        if (myRequest.readyState === XMLHttpRequest.DONE) {
          if (myRequest.status === 0) {
            const exc = TalerError.fromDetail(
              TalerErrorCode.WALLET_NETWORK_ERROR,
              {
                requestUrl: requestUrl,
              },
              "HTTP request failed (status 0, maybe URI scheme was wrong?)",
            );
            reject(exc);
            return;
          }
          const makeText = async (): Promise<string> => {
            const td = new TextDecoder();
            return td.decode(myRequest.response);
          };
          const makeJson = async (): Promise<any> => {
            let responseJson;
            try {
              const td = new TextDecoder();
              const responseString = td.decode(myRequest.response);
              responseJson = JSON.parse(responseString);
            } catch (e) {
              throw TalerError.fromDetail(
                TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
                {
                  requestUrl: requestUrl,
                  httpStatusCode: myRequest.status,
                },
                "Invalid JSON from HTTP response",
              );
            }
            if (responseJson === null || typeof responseJson !== "object") {
              throw TalerError.fromDetail(
                TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
                {
                  requestUrl: requestUrl,
                  httpStatusCode: myRequest.status,
                },
                "Invalid JSON from HTTP response",
              );
            }
            return responseJson;
          };

          const headers = myRequest.getAllResponseHeaders();
          const arr = headers.trim().split(/[\r\n]+/);

          // Create a map of header names to values
          const headerMap: Headers = new Headers();
          arr.forEach(function (line) {
            const parts = line.split(": ");
            const headerName = parts.shift();
            if (!headerName) {
              logger.warn("skipping invalid header");
              return;
            }
            const value = parts.join(": ");
            headerMap.set(headerName, value);
          });
          const resp: HttpResponse = {
            requestUrl: requestUrl,
            status: myRequest.status,
            headers: headerMap,
            requestMethod: requestMethod,
            json: makeJson,
            text: makeText,
            bytes: async () => myRequest.response,
          };
          resolve(resp);
        }
      });
    });
  }

  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse> {
    return this.fetch(url, {
      method: "GET",
      ...opt,
    });
  }

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
