import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";


export interface BackupDeviceName {
  name: string;
  update: (s:string) => Promise<void>
}


export function useBackupDeviceName(): BackupDeviceName {
  const [status, setStatus] = useState<BackupDeviceName>({
    name: '',
    update: () => Promise.resolve()
  })

  useEffect(() => {
    async function run() {
      //create a first list of backup info by currency
      const status = await wxApi.getBackupInfo()

      async function update(newName: string) {
        await wxApi.setWalletDeviceId(newName)
        setStatus(old => ({ ...old, name: newName }))  
      }

      setStatus({ name: status.deviceId, update })
    }
    run()
  }, [])

  return status
}

