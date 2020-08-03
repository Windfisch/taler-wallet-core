
import { httpLib, OperationFailedError, Logger } from "taler-wallet-core";
import { TalerErrorCode } from "taler-wallet-core/lib/TalerErrorCode";

const logger = new Logger("browserHttpLib");

/**
 * An implementation of the [[HttpRequestLibrary]] using the
 * browser's XMLHttpRequest.
 */
export class BrowserHttpLib implements httpLib.HttpRequestLibrary {
  private req(
    method: string,
    url: string,
    requestBody?: any,
    options?: httpLib.HttpRequestOptions,
  ): Promise<httpLib.HttpResponse> {
    return new Promise<httpLib.HttpResponse>((resolve, reject) => {
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
          const headerMap: httpLib.Headers = new httpLib.Headers();
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
          const resp: httpLib.HttpResponse = {
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

  get(url: string, opt?: httpLib.HttpRequestOptions): Promise<httpLib.HttpResponse> {
    return this.req("get", url, undefined, opt);
  }

  postJson(
    url: string,
    body: unknown,
    opt?: httpLib.HttpRequestOptions,
  ): Promise<httpLib.HttpResponse> {
    return this.req("post", url, JSON.stringify(body), opt);
  }

  stop(): void {
    // Nothing to do
  }
}