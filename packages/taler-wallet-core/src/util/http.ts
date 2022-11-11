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
 *
 * The API is inspired by the HTML5 fetch API.
 */

/**
 * Imports
 */
import {
  Logger,
  Duration,
  AbsoluteTime,
  TalerErrorDetail,
  Codec,
  j2s,
  CancellationToken,
} from "@gnu-taler/taler-util";
import { TalerErrorCode } from "@gnu-taler/taler-util";
import { makeErrorDetail, TalerError } from "../errors.js";

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
  bytes(): Promise<ArrayBuffer>;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 60000;

export interface HttpRequestOptions {
  method?: "POST" | "PUT" | "GET";
  headers?: { [name: string]: string };

  /**
   * Timeout after which the request should be aborted.
   */
  timeout?: Duration;

  /**
   * Cancellation token that should abort the request when
   * cancelled.
   */
  cancellationToken?: CancellationToken;

  body?: string | ArrayBuffer | Object;
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

  toJSON(): any {
    const m: Record<string, string> = {};
    this.headerMap.forEach((v, k) => (m[k] = v));
    return m;
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
   *
   * FIXME: Get rid of this, we want the API surface to be minimal.
   */
  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make an HTTP POST request with a JSON body.
   *
   * FIXME: Get rid of this, we want the API surface to be minimal.
   */
  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse>;

  /**
   * Make an HTTP POST request with a JSON body.
   */
  fetch(url: string, opt?: HttpRequestOptions): Promise<HttpResponse>;
}

type TalerErrorResponse = {
  code: number;
} & unknown;

type ResponseOrError<T> =
  | { isError: false; response: T }
  | { isError: true; talerErrorResponse: TalerErrorResponse };

export async function readTalerErrorResponse(
  httpResponse: HttpResponse,
): Promise<TalerErrorDetail> {
  const errJson = await httpResponse.json();
  const talerErrorCode = errJson.code;
  if (typeof talerErrorCode !== "number") {
    logger.warn(
      `malformed error response (status ${httpResponse.status}): ${j2s(
        errJson,
      )}`,
    );
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
      {
        requestUrl: httpResponse.requestUrl,
        requestMethod: httpResponse.requestMethod,
        httpStatusCode: httpResponse.status,
      },
      "Error response did not contain error code",
    );
  }
  return errJson;
}

export async function readUnexpectedResponseDetails(
  httpResponse: HttpResponse,
): Promise<TalerErrorDetail> {
  const errJson = await httpResponse.json();
  const talerErrorCode = errJson.code;
  if (typeof talerErrorCode !== "number") {
    return makeErrorDetail(
      TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
      {
        requestUrl: httpResponse.requestUrl,
        requestMethod: httpResponse.requestMethod,
        httpStatusCode: httpResponse.status,
      },
      "Error response did not contain error code",
    );
  }
  return makeErrorDetail(
    TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
    {
      requestUrl: httpResponse.requestUrl,
      httpStatusCode: httpResponse.status,
      errorResponse: errJson,
    },
    `Unexpected HTTP status (${httpResponse.status}) in response`,
  );
}

export async function readSuccessResponseJsonOrErrorCode<T>(
  httpResponse: HttpResponse,
  codec: Codec<T>,
): Promise<ResponseOrError<T>> {
  if (!(httpResponse.status >= 200 && httpResponse.status < 300)) {
    return {
      isError: true,
      talerErrorResponse: await readTalerErrorResponse(httpResponse),
    };
  }
  const respJson = await httpResponse.json();
  let parsedResponse: T;
  try {
    parsedResponse = codec.decode(respJson);
  } catch (e: any) {
    throw TalerError.fromDetail(
      TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
      {
        requestUrl: httpResponse.requestUrl,
        httpStatusCode: httpResponse.status,
        validationError: e.toString(),
      },
      "Response invalid",
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
  throw TalerError.fromDetail(
    TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
    {
      requestUrl: httpResponse.requestUrl,
      httpStatusCode: httpResponse.status,
      errorResponse: talerErrorResponse,
    },
    `Unexpected HTTP status ${httpResponse.status} in response`,
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
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
        {
          httpStatusCode: httpResponse.status,
          requestUrl: httpResponse.requestUrl,
          requestMethod: httpResponse.requestMethod,
        },
        "Error response did not contain error code",
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
      throw TalerError.fromDetail(
        TalerErrorCode.WALLET_RECEIVED_MALFORMED_RESPONSE,
        {
          httpStatusCode: httpResponse.status,
          requestUrl: httpResponse.requestUrl,
          requestMethod: httpResponse.requestMethod,
        },
        "Error response did not contain error code",
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
export function getExpiry(
  httpResponse: HttpResponse,
  opt: { minDuration?: Duration },
): AbsoluteTime {
  const expiryDateMs = new Date(
    httpResponse.headers.get("expiry") ?? "",
  ).getTime();
  let t: AbsoluteTime;
  if (Number.isNaN(expiryDateMs)) {
    t = AbsoluteTime.now();
  } else {
    t = {
      t_ms: expiryDateMs,
    };
  }
  if (opt.minDuration) {
    const t2 = AbsoluteTime.addDuration(AbsoluteTime.now(), opt.minDuration);
    return AbsoluteTime.max(t, t2);
  }
  return t;
}
