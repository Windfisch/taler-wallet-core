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
 * An HTTP response that is returned by all request methods of this library.
 */
export interface HttpResponse {
  status: number;
  headers: { [name: string]: string };
  json(): Promise<any>;
  text(): Promise<string>;
}

export interface HttpRequestOptions {
  headers?: { [name: string]: string };
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

      myRequest.onerror = e => {
        console.error("http request error");
        reject(Error("could not make XMLHttpRequest"));
      };

      myRequest.addEventListener("readystatechange", e => {
        if (myRequest.readyState === XMLHttpRequest.DONE) {
          if (myRequest.status === 0) {
            reject(
              Error(
                "HTTP Request failed (status code 0, maybe URI scheme is wrong?)",
              ),
            );
            return;
          }
          const makeJson = async () => {
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
          const headerMap: { [name: string]: string } = {};
          arr.forEach(function(line) {
            const parts = line.split(": ");
            const header = parts.shift();
            const value = parts.join(": ");
            headerMap[header!] = value;
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

  get(url: string, opt?: HttpRequestOptions) {
    return this.req("get", url, undefined, opt);
  }

  postJson(url: string, body: any, opt?: HttpRequestOptions) {
    return this.req("post", url, JSON.stringify(body), opt);
  }

  stop() {
    // Nothing to do
  }
}
