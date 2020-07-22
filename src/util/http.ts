/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Helpers for doing XMLHttpRequest-s that are based on ES6 promises.
 * Allows for easy mocking for test cases.
 */

/**
 * Imports
 */
import { Codec } from "./codec";
import { OperationFailedError, makeErrorDetails } from "../operations/errors";
import { TalerErrorCode } from "../TalerErrorCode";
import { Logger } from "./logging";

const logger = new Logger("http.ts");

/**
 * An HTTP response that is returned by all request methods of this library.
 */
export interface HttpResponse {
  requestUrl: string;
  status: number;
  headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
}

export interface HttpRequestOptions {
  headers?: { [name: string]: string };
}

export enum HttpResponseStatus {
  Ok = 200,
  Gone = 210,
}

/**
 * Headers, roughly modeled after the fetch API's headers object.
 */
export class Headers {
  private headerMap = new Map<string, string>();

  get(name: string): string | null {
    const r = this.headerMap.get(name.toLowerCase());
    if (r) {
      return r;
    }
    return null;
  }

  set(name: string, value: string): void {
    const normalizedName = name.toLowerCase();
    const existing = this.headerMap.get(normalizedName);
    if (existing !== undefined) {
      this.headerMap.set(normalizedName, existing + "," + value);
    } else {
      this.headerMap.set(normalizedName, value);
    }
  }
}

/**
 * Interface for the HTTP request library used by the wallet.
 *
 * The request library is bundled into an interface to make mocking and
 * request tunneling easy.
 */
export interface HttpRequestLibrary {
  /**
   * Make an HTTP GET request.
   */
  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make an HTTP POST request with a JSON body.
   */
  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse>;
}

/**
 * An implementation of the [[HttpRequestLibrary]] using the
 * browser's XMLHttpRequest.
 */
export class BrowserHttpLib implements HttpRequestLibrary {
  private req(
    method: string,
    url: string,
    requestBody?: any,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    return new Promise<HttpResponse>((resolve, reject) => {
      const myRequest = new XMLHttpRequest();
      myRequest.open(method, url);
      if (options?.headers) {
        for (const headerName in options.headers) {
          myRequest.setRequestHeader(headerName, options.headers[headerName]);
        }
      }
      myRequest.setRequestHeader;
      if (requestBody) {
        myRequest.send(requestBody);
      } else {
        myRequest.send();
      }

      myRequest.onerror = (e) => {
        logger.error("http request error");
        reject(
          OperationFailedError.fromCode(
            TalerErrorCode.WALLET_NETWORK_ERROR,
            "Could not make request",
            {
              requestUrl: url,
            },
          ),
        );
      };

      myRequest.addEventListener("readystatechange", (e) => {
        if (myRequest.readyState === XMLHttpRequest.DONE) {
          if (myRequest.status === 0) {
            const exc = OperationFailedError.fromCode(
              TalerErrorCode.WALLET_NETWORK_ERROR,
              "HTTP request failed (status 0, maybe URI scheme was wrong?)",
              {
                requestUrl: url,
              },
            );
            reject(exc);
            return;
          }
          const makeJson = async (): Promise<any> => {
            let responseJson;
            try {
              responseJson = JSON.parse(myRequest.responseText);
            } catch (e) {
              throw OperationFailedError.fromCode(
                TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
                "Invalid JSON from HTTP response",
                {
                  requestUrl: url,
                  httpStatusCode: myRequest.status,
                },
              );
            }
            if (responseJson === null || typeof responseJson !== "object") {
              throw OperationFailedError.fromCode(
                TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
                "Invalid JSON from HTTP response",
                {
                  requestUrl: url,
                  httpStatusCode: myRequest.status,
                },
              );
            }
            return responseJson;
          };

          const headers = myRequest.getAllResponseHeaders();
          const arr = headers.trim().split(/[\r\n]+/);

          // Create a map of header names to values
          const headerMap = new Headers();
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
            requestUrl: url,
            status: myRequest.status,
            headers: headerMap,
            json: makeJson,
            text: async () => myRequest.responseText,
          };
          resolve(resp);
        }
      });
    });
  }

  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse> {
    return this.req("get", url, undefined, opt);
  }

  postJson(
    url: string,
    body: unknown,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    return this.req("post", url, JSON.stringify(body), opt);
  }

  stop(): void {
    // Nothing to do
  }
}

type TalerErrorResponse = {
  code: number;
} & unknown;

type ResponseOrError<T> =
  | { isError: false; response: T }
  | { isError: true; talerErrorResponse: TalerErrorResponse };

export async function readSuccessResponseJsonOrErrorCode<T>(
  httpResponse: HttpResponse,
  codec: Codec<T>,
): Promise<ResponseOrError<T>> {
  if (!(httpResponse.status >= 200 && httpResponse.status < 300)) {
    const errJson = await httpResponse.json();
    const talerErrorCode = errJson.code;
    if (typeof talerErrorCode !== "number") {
      throw new OperationFailedError(
        makeErrorDetails(
          TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
          "Error response did not contain error code",
          {
            requestUrl: httpResponse.requestUrl,
          },
        ),
      );
    }
    return {
      isError: true,
      talerErrorResponse: errJson,
    };
  }
  const respJson = await httpResponse.json();
  let parsedResponse: T;
  try {
    parsedResponse = codec.decode(respJson);
  } catch (e) {
    throw OperationFailedError.fromCode(
      TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
      "Response invalid",
      {
        requestUrl: httpResponse.requestUrl,
        httpStatusCode: httpResponse.status,
        validationError: e.toString(),
      },
    );
  }
  return {
    isError: false,
    response: parsedResponse,
  };
}

export function throwUnexpectedRequestError(
  httpResponse: HttpResponse,
  talerErrorResponse: TalerErrorResponse,
): never {
  throw new OperationFailedError(
    makeErrorDetails(
      TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
      "Unexpected error code in response",
      {
        requestUrl: httpResponse.requestUrl,
        httpStatusCode: httpResponse.status,
        errorResponse: talerErrorResponse,
      },
    ),
  );
}

export async function readSuccessResponseJsonOrThrow<T>(
  httpResponse: HttpResponse,
  codec: Codec<T>,
): Promise<T> {
  const r = await readSuccessResponseJsonOrErrorCode(httpResponse, codec);
  if (!r.isError) {
    return r.response;
  }
  throwUnexpectedRequestError(httpResponse, r.talerErrorResponse);
}

export async function readSuccessResponseTextOrErrorCode<T>(
  httpResponse: HttpResponse,
): Promise<ResponseOrError<string>> {
  if (!(httpResponse.status >= 200 && httpResponse.status < 300)) {
    const errJson = await httpResponse.json();
    const talerErrorCode = errJson.code;
    if (typeof talerErrorCode !== "number") {
      throw new OperationFailedError(
        makeErrorDetails(
          TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
          "Error response did not contain error code",
          {
            requestUrl: httpResponse.requestUrl,
          },
        ),
      );
    }
    return {
      isError: true,
      talerErrorResponse: errJson,
    };
  }
  const respJson = await httpResponse.text();
  return {
    isError: false,
    response: respJson,
  };
}

export async function readSuccessResponseTextOrThrow<T>(
  httpResponse: HttpResponse,
): Promise<string> {
  const r = await readSuccessResponseTextOrErrorCode(httpResponse);
  if (!r.isError) {
    return r.response;
  }
  throwUnexpectedRequestError(httpResponse, r.talerErrorResponse);
}
