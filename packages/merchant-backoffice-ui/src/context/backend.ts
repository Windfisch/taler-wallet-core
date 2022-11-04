/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/

import { createContext, h, VNode } from 'preact'
import { useCallback, useContext, useState } from 'preact/hooks'
import { useBackendDefaultToken, useBackendURL } from "../hooks/index.js";

interface BackendContextType {
  url: string;
  token?: string;
  triedToLog: boolean;
  resetBackend: () => void;
  clearAllTokens: () => void;
  addTokenCleaner: (c: () => void) => void;
  updateLoginStatus: (url: string, token?: string) => void;
}

const BackendContext = createContext<BackendContextType>({
  url: '',
  token: undefined,
  triedToLog: false,
  resetBackend: () => null,
  clearAllTokens: () => null,
  addTokenCleaner: () => null,
  updateLoginStatus: () => null,
})

function useBackendContextState(defaultUrl?: string, initialToken?: string): BackendContextType {
  const [url, triedToLog, changeBackend, resetBackend] = useBackendURL(defaultUrl);
  const [token, _updateToken] = useBackendDefaultToken(initialToken);
  const updateToken = (t?: string) => {
    _updateToken(t)
  }

  const tokenCleaner = useCallback(() => { updateToken(undefined) }, [])
  const [cleaners, setCleaners] = useState([tokenCleaner])
  const addTokenCleaner = (c: () => void) => setCleaners(cs => [...cs, c])
  const addTokenCleanerMemo = useCallback((c: () => void) => { addTokenCleaner(c) }, [tokenCleaner])

  const clearAllTokens = () => {
    cleaners.forEach(c => c())
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && /^backend-token/.test(k)) localStorage.removeItem(k)
    }
    resetBackend()
  }

  const updateLoginStatus = (url: string, token?: string) => {
    changeBackend(url);
    if (token) updateToken(token);
  };


  return { url, token, triedToLog, updateLoginStatus, resetBackend, clearAllTokens, addTokenCleaner: addTokenCleanerMemo }
}

export const BackendContextProvider = ({ children, defaultUrl, initialToken }: { children: any, defaultUrl?: string, initialToken?: string }): VNode => {
  const value = useBackendContextState(defaultUrl, initialToken)

  return h(BackendContext.Provider, { value, children });
}

export const useBackendContext = (): BackendContextType => useContext(BackendContext);
