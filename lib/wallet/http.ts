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
 * @module Http
 * @author Florian Dold
 */

"use strict";


export interface HttpResponse {
  status: number;
  responseText: string;
}


export interface HttpRequestLibrary {
  req(method: string,
      url: string | uri.URI,
      options?: any): Promise<HttpResponse>;

  get(url: string | uri.URI): Promise<HttpResponse>;

  postJson(url: string | uri.URI, body: any): Promise<HttpResponse>;

  postForm(url: string | uri.URI, form: any): Promise<HttpResponse>;
}


export class BrowserHttpLib {
  req(method: string,
      url: string|uri.URI,
      options?: any): Promise<HttpResponse> {
    let urlString: string;
    if (url instanceof URI) {
      urlString = url.href();
    } else if (typeof url === "string") {
      urlString = url;
    }

    return new Promise((resolve, reject) => {
      let myRequest = new XMLHttpRequest();
      myRequest.open(method, urlString);
      if (options && options.req) {
        myRequest.send(options.req);
      } else {
        myRequest.send();
      }
      myRequest.addEventListener("readystatechange", (e) => {
        if (myRequest.readyState == XMLHttpRequest.DONE) {
          let resp = {
            status: myRequest.status,
            responseText: myRequest.responseText
          };
          resolve(resp);
        }
      });
    });
  }


  get(url: string|uri.URI) {
    return this.req("get", url);
  }


  postJson(url: string|uri.URI, body: any) {
    return this.req("post", url, {req: JSON.stringify(body)});
  }


  postForm(url: string|uri.URI, form: any) {
    return this.req("post", url, {req: form});
  }
}


export class RequestException {
  constructor(detail: any) {

  }
}
