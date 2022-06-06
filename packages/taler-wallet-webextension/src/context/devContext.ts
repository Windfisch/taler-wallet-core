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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { createContext, h, VNode } from "preact";
import { useContext } from "preact/hooks";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

interface Type {
  devMode: boolean;
  toggleDevMode: () => Promise<void>;
}
const Context = createContext<Type>({
  devMode: false,
  toggleDevMode: async () => {
    return;
  },
});

export const useDevContext = (): Type => useContext(Context);

export const DevContextProviderForTesting = ({
  value,
  children,
}: {
  value: boolean;
  children: any;
}): VNode => {
  return h(Context.Provider, {
    value: {
      devMode: value,
      toggleDevMode: async () => {
        return;
      },
    },
    children,
  });
};

export const DevContextProvider = ({ children }: { children: any }): VNode => {
  const [value, setter] = useLocalStorage("devMode");
  const devMode = value === "true";
  const toggleDevMode = async (): Promise<void> =>
    setter((v) => (!v ? "true" : undefined));
  children =
    children.length === 1 && typeof children === "function"
      ? children({ devMode })
      : children;
  return h(Context.Provider, { value: { devMode, toggleDevMode }, children });
};
