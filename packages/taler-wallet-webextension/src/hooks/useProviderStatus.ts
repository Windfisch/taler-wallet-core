import { ProviderInfo } from "@gnu-taler/taler-wallet-core";
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";

export interface ProviderStatus {
  info?: ProviderInfo;
  sync: () => Promise<void>;
  remove: () => Promise<void>;
}

export function useProviderStatus(url: string): ProviderStatus | undefined {
  const [status, setStatus] = useState<ProviderStatus | undefined>(undefined);

  useEffect(() => {
    async function run() {
      //create a first list of backup info by currency
      const status = await wxApi.getBackupInfo();

      const providers = status.providers.filter(p => p.syncProviderBaseUrl === url);
      const info = providers.length ? providers[0] : undefined;

      async function sync() {
        if (info) {
          await wxApi.syncOneProvider(info.syncProviderBaseUrl);
        }
      }

      async function remove() {
        if (info) {
          await wxApi.removeProvider(info.syncProviderBaseUrl);
        }
      }

      setStatus({ info, sync, remove });
    }
    run();
  }, []);

  return status;
}
