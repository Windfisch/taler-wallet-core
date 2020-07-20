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

import { Codec } from "./codec";
import { OperationFailedError } from "../operations/errors";

/**
 * Helpers for doing XMLHttpRequest-s that are based on ES6 promises.
 * Allows for easy mocking for test cases.
 */

/**
 * An HTTP response that is returned by all request methods of this library.
 */
export interface HttpResponse {
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
 * The request library is bundled into an interface to m  responseJson: object & any;ake mocking easy.
 */
export interface HttpRequestLibrary {
  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse>;
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
        console.error("http request error");
        reject(Error("could not make XMLHttpRequest"));
      };

      myRequest.addEventListener("readystatechange", (e) => {
        if (myRequest.readyState === XMLHttpRequest.DONE) {
          if (myRequest.status === 0) {
            reject(
              Error(
                "HTTP Request failed (status code 0, maybe URI scheme is wrong?)",
              ),
            );
            return;
          }
          const makeJson = async (): Promise<any> => {
            let responseJson;
            try {
              responseJson = JSON.parse(myRequest.responseText);
            } catch (e) {
              throw Error("Invalid JSON from HTTP response");
            }
            if (responseJson === null || typeof responseJson !== "object") {
              throw Error("Invalid JSON from HTTP response");
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
              console.error("invalid header");
              return;
            }
            const value = parts.join(": ");
            headerMap.set(headerName, value);
          });
          const resp: HttpResponse = {
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
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    return this.req("post", url, JSON.stringify(body), opt);
  }

  stop(): void {
    // Nothing to do
  }
}

export interface PostJsonRequest<RespType> {
  http: HttpRequestLibrary;
  url: string;
  body: any;
  codec: Codec<RespType>;
}

/**
 * Helper for making Taler-style HTTP POST requests with a JSON payload and response.
 */
export async function httpPostTalerJson<RespType>(
  req: PostJsonRequest<RespType>,
): Promise<RespType> {
  const resp = await req.http.postJson(req.url, req.body);

  if (resp.status !== 200) {
    let exc: OperationFailedError | undefined = undefined;
    try {
      const errorJson = await resp.json();
      const m = `received error response (status ${resp.status})`;
      exc = new OperationFailedError({
        type: "protocol",
        message: m,
        details: {
          httpStatusCode: resp.status,
          errorResponse: errorJson,
        },
      });
    } catch (e) {
      const m = "could not parse response JSON";
      exc = new OperationFailedError({
        type: "network",
        message: m,
        details: {
          status: resp.status,
        },
      });
    }
    throw exc;
  }
  let json: any;
  try {
    json = await resp.json();
  } catch (e) {
    const m = "could not parse response JSON";
    throw new OperationFailedError({
      type: "network",
      message: m,
      details: {
        status: resp.status,
      },
    });
  }
  return req.codec.decode(json);
}


export interface GetJsonRequest<RespType> {
  http: HttpRequestLibrary;
  url: string;
  codec: Codec<RespType>;
}

/**
 * Helper for making Taler-style HTTP GET requests with a JSON payload.
 */
export async function httpGetTalerJson<RespType>(
  req: GetJsonRequest<RespType>,
): Promise<RespType> {
  const resp = await req.http.get(req.url);

  if (resp.status !== 200) {
    let exc: OperationFailedError | undefined = undefined;
    try {
      const errorJson = await resp.json();
      const m = `received error response (status ${resp.status})`;
      exc = new OperationFailedError({
        type: "protocol",
        message: m,
        details: {
          httpStatusCode: resp.status,
          errorResponse: errorJson,
        },
      });
    } catch (e) {
      const m = "could not parse response JSON";
      exc = new OperationFailedError({
        type: "network",
        message: m,
        details: {
          status: resp.status,
        },
      });
    }
    throw exc;
  }
  let json: any;
  try {
    json = await resp.json();
  } catch (e) {
    const m = "could not parse response JSON";
    throw new OperationFailedError({
      type: "network",
      message: m,
      details: {
        status: resp.status,
      },
    });
  }
  return req.codec.decode(json);
}
