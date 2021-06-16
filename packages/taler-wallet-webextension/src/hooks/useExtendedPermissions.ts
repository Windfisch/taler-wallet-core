import { useState, useEffect } from "preact/hooks";
import * as wxApi from "../wxApi";
import { getPermissionsApi } from "../compat";
import { extendedPermissions } from "../permissions";


export function useExtendedPermissions(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(false);

  const toggle = () => {
    setEnabled(v => !v);
    handleExtendedPerm(enabled).then(result => {
      setEnabled(result);
    });
  };

  useEffect(() => {
    async function getExtendedPermValue(): Promise<void> {
      const res = await wxApi.getExtendedPermissions();
      setEnabled(res.newValue);
    }
    getExtendedPermValue();
  }, []);
  return [enabled, toggle];
}

async function handleExtendedPerm(isEnabled: boolean): Promise<boolean> {
  let nextVal: boolean | undefined;

  if (!isEnabled) {
    const granted = await new Promise<boolean>((resolve, reject) => {
      // We set permissions here, since apparently FF wants this to be done
      // as the result of an input event ...
      getPermissionsApi().request(extendedPermissions, (granted: boolean) => {
        if (chrome.runtime.lastError) {
          console.error("error requesting permissions");
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        console.log("permissions granted:", granted);
        resolve(granted);
      });
    });
    const res = await wxApi.setExtendedPermissions(granted);
    nextVal = res.newValue;
  } else {
    const res = await wxApi.setExtendedPermissions(false);
    nextVal = res.newValue;
  }
  console.log("new permissions applied:", nextVal ?? false);
  return nextVal ?? false
}