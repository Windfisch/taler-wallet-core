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
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { NotificationType, TalerErrorDetail } from "@gnu-taler/taler-util";
import { TalerError } from "@gnu-taler/taler-wallet-core";
import { useEffect, useMemo, useState } from "preact/hooks";
import * as wxApi from "../wxApi.js";

export interface HookOk<T> {
  hasError: false;
  response: T;
}

export type HookError = HookGenericError | HookOperationalError;

export interface HookGenericError {
  hasError: true;
  operational: false;
  message: string;
}

export interface HookOperationalError {
  hasError: true;
  operational: true;
  details: TalerErrorDetail;
}

interface WithRetry {
  retry: () => void;
}

export type HookResponse<T> = HookOk<T> | HookError | undefined;
export type HookResponseWithRetry<T> =
  | ((HookOk<T> | HookError) & WithRetry)
  | undefined;

export function useAsyncAsHook<T>(
  fn: () => Promise<T | false>,
  deps?: any[],
): HookResponseWithRetry<T> {
  const [result, setHookResponse] = useState<HookResponse<T>>(undefined);

  const args = useMemo(
    () => ({
      fn,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    deps || [],
  );

  async function doAsync(): Promise<void> {
    try {
      const response = await args.fn();
      if (response === false) return;
      setHookResponse({ hasError: false, response });
    } catch (e) {
      if (e instanceof TalerError) {
        setHookResponse({
          hasError: true,
          operational: true,
          details: e.errorDetail,
        });
      } else if (e instanceof Error) {
        setHookResponse({
          hasError: true,
          operational: false,
          message: e.message,
        });
      }
    }
  }

  useEffect(() => {
    doAsync();
  }, [args]);

  if (!result) return undefined;
  return { ...result, retry: doAsync };
}
