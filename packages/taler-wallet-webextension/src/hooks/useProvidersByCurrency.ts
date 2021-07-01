import { Amounts } from "@gnu-taler/taler-util";
import { ProviderInfo } from "@gnu-taler/taler-wallet-core/src/operations/backup";
import { useEffect, useState } from "preact/hooks";

import * as wxApi from "../wxApi";

export interface ProvidersByCurrency {
  [s: string]: ProviderInfo | undefined
}
export interface BackupStatus {
  deviceName: string;
  providers: ProvidersByCurrency
}

export function useBackupStatus(): BackupStatus | undefined {
  const [status, setStatus] = useState<BackupStatus | undefined>(undefined)
  useEffect(() => {
    async function run() {
      //create a first list of backup info by currency
      const status = await wxApi.getBackupInfo()
      const providers = status.providers.reduce((p, c) => {
        if (c.terms) {
          p[Amounts.parseOrThrow(c.terms.annualFee).currency] = c
        }
        return p
      }, {} as ProvidersByCurrency)

      //add all the known currency with no backup info
      const list = await wxApi.listKnownCurrencies()
      const currencies = list.exchanges.map(e => e.name).concat(list.auditors.map(a => a.name))
      currencies.forEach(c => {
        if (!providers[c]) {
          providers[c] = undefined
        }
      })

      setStatus({ deviceName: status.deviceId, providers })
    }
    run()
  }, [])

  return status
}

