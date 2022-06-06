/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
// import { cancelPendingRequest } from "./backend.js";

export interface Options {
  slowTolerance: number;
}

export interface AsyncOperationApi<T> {
  request: (...a: any) => void;
  cancel: () => void;
  data: T | undefined;
  isSlow: boolean;
  isLoading: boolean;
  error: string | undefined;
}

export function useIsMounted() {
  const isMountedRef = useRef(true);
  const isMounted = useCallback(() => isMountedRef.current, []);

  useEffect(() => {
    return () => void (isMountedRef.current = false);
  }, []);

  return isMounted;
}

export function useAsync<T>(
  fn?: (...args: any) => Promise<T>,
  { slowTolerance: tooLong }: Options = { slowTolerance: 1000 },
): AsyncOperationApi<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(undefined);
  const [isSlow, setSlow] = useState(false);
  const isMounted = useIsMounted();

  const request = async (...args: any) => {
    if (!fn) return;
    setLoading(true);
    const handler = setTimeout(() => {
      if (!isMounted()) {
        return;
      }
      setSlow(true);
    }, tooLong);

    try {
      console.log("calling async", args);
      const result = await fn(...args);
      console.log("async back", result);
      if (!isMounted()) {
        // Possibly calling fn(...) resulted in the component being unmounted.
        return;
      }
      setData(result);
    } catch (error) {
      setError(error);
    }
    setLoading(false);
    setSlow(false);
    clearTimeout(handler);
  };

  function cancel() {
    // cancelPendingRequest()
    setLoading(false);
    setSlow(false);
  }

  return {
    request,
    cancel,
    data,
    isSlow,
    isLoading,
    error,
  };
}
