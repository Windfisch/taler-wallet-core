import {
  HttpRequestLibrary,
  HttpResponse,
  HttpRequestOptions,
} from "../../taler-wallet-core/src/util/http";
export {
  handleWorkerError,
  handleWorkerMessage,
} from "../../taler-wallet-core/src/crypto/workers/nodeThreadWorker";
export declare class AndroidHttpLib implements HttpRequestLibrary {
  private sendMessage;
  useNfcTunnel: boolean;
  private nodeHttpLib;
  private requestId;
  private requestMap;
  constructor(sendMessage: (m: string) => void);
  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse>;
  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<import("../../taler-wallet-core/src/util/http").HttpResponse>;
  handleTunnelResponse(msg: any): void;
}
export declare function installAndroidWalletListener(): void;
//# sourceMappingURL=index.d.ts.map
