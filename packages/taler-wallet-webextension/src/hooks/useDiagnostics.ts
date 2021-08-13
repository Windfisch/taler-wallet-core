import { WalletDiagnostics } from "@gnu-taler/taler-util";
import { useEffect, useState } from "preact/hooks";
import * as wxApi from "../wxApi";

export function useDiagnostics(): [WalletDiagnostics | undefined, boolean] {
  const [timedOut, setTimedOut] = useState(false);
  const [diagnostics, setDiagnostics] = useState<WalletDiagnostics | undefined>(
    undefined
  );

  useEffect(() => {
    let gotDiagnostics = false;
    setTimeout(() => {
      if (!gotDiagnostics) {
        console.error("timed out");
        setTimedOut(true);
      }
    }, 1000);
    const doFetch = async (): Promise<void> => {
      const d = await wxApi.getDiagnostics();
      console.log("got diagnostics", d);
      gotDiagnostics = true;
      setDiagnostics(d);
    };
    console.log("fetching diagnostics");
    doFetch();
  }, []);
  return [diagnostics, timedOut]
}