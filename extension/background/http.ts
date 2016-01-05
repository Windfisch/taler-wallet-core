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
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

"use strict";

interface HttpResponse {
  status: number;
  responseText: string;
}


function httpReq(method: string,
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



function httpGet(url: string|uri.URI) {
  return httpReq("get", url);
}


function httpPostJson(url: string|uri.URI, body) {
  return httpReq("post", url, {req: JSON.stringify(body)});
}


function httpPostForm(url: string|uri.URI, form) {
  return httpReq("post", url, {req: form});
}


class RequestException {
  constructor(detail) {

  }
}