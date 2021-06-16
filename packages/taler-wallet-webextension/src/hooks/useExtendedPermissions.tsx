import { useState, useEffect } from "preact/hooks";
import * as wxApi from "../wxApi";
import { handleExtendedPerm } from "../wallet/welcome";


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
