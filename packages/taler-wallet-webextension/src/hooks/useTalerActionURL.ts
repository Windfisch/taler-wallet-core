/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { useEffect, useState } from "preact/hooks";
import { useIocContext } from "../context/iocContext.js";

export interface UriLocation {
  uri: string;
  location: "clipboard" | "activeTab"
}

export function useTalerActionURL(): [
  UriLocation | undefined,
  (s: boolean) => void,
] {
  const [talerActionUrl, setTalerActionUrl] = useState<UriLocation | undefined>(
    undefined,
  );
  const [dismissed, setDismissed] = useState(false);
  const { findTalerUriInActiveTab, findTalerUriInClipboard } = useIocContext();
  useEffect(() => {
    async function check(): Promise<void> {
      const clipUri = await findTalerUriInClipboard();
      if (clipUri) {
        setTalerActionUrl({
          location: "clipboard",
          uri: clipUri
        });
        return;
      }
      const tabUri = await findTalerUriInActiveTab();
      if (tabUri) {
        setTalerActionUrl({
          location: "activeTab",
          uri: tabUri
        });
        return;
      }
    }
    check();
  }, []);

  const url = dismissed ? undefined : talerActionUrl;
  return [url, setDismissed];
}
