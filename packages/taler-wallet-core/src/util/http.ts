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
import { Duration, Timestamp, getTimestampNow } from "./time";

const logger = new Logger("http.ts");

/**
 * An HTTP response that is returned by all request methods of this library.
 */
export interface HttpResponse {
  requestUrl: string;
  requestMethod: string;
  status: number;
  headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
}

export interface HttpRequestOptions {
  headers?: { [name: string]: string };
  timeout?: Duration;
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
            requestMethod: httpResponse.requestMethod,
            httpStatusCode: httpResponse.status,
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

export function getHttpResponseErrorDetails(
  httpResponse: HttpResponse,
): Record<string, unknown> {
  return {
    requestUrl: httpResponse.requestUrl,
    httpStatusCode: httpResponse.status,
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
            httpStatusCode: httpResponse.status,
            requestUrl: httpResponse.requestUrl,
            requestMethod: httpResponse.requestMethod,
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

export async function checkSuccessResponseOrThrow(
  httpResponse: HttpResponse,
): Promise<void> {
  if (!(httpResponse.status >= 200 && httpResponse.status < 300)) {
    const errJson = await httpResponse.json();
    const talerErrorCode = errJson.code;
    if (typeof talerErrorCode !== "number") {
      throw new OperationFailedError(
        makeErrorDetails(
          TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
          "Error response did not contain error code",
          {
            httpStatusCode: httpResponse.status,
            requestUrl: httpResponse.requestUrl,
            requestMethod: httpResponse.requestMethod,
          },
        ),
      );
    }
    throwUnexpectedRequestError(httpResponse, errJson);
  }
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

/**
 * Get the timestamp at which the response's content is considered expired.
 */
export function getExpiryTimestamp(httpResponse: HttpResponse): Timestamp {
  const expiryDateMs = new Date(
    httpResponse.headers.get("expiry") ?? "",
  ).getTime();
  if (Number.isNaN(expiryDateMs)) {
    return getTimestampNow();
  } else {
    return {
      t_ms: expiryDateMs,
    }
  }
}
