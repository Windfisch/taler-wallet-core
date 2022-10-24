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

import { h, createContext, VNode, ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

interface Type {
  useSWR: typeof useSWR;
  useSWRInfinite: typeof useSWRInfinite;
}

const Context = createContext<Type>({} as any);

export const useFetchContext = (): Type => useContext(Context);
export const FetchContextProvider = ({
  children,
}: {
  children: ComponentChildren;
}): VNode => {
  return h(Context.Provider, { value: { useSWR, useSWRInfinite }, children });
};

export const FetchContextProviderTesting = ({
  children,
  data,
}: {
  children: ComponentChildren;
  data: any;
}): VNode => {
  return h(Context.Provider, {
    value: { useSWR: () => data, useSWRInfinite },
    children,
  });
};
