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

import { createContext, h, VNode } from "preact";
import { useContext } from "preact/hooks";
import { platform } from "../platform/api.js";

interface Type {
  findTalerUriInActiveTab: () => Promise<string | undefined>;
}
const Context = createContext<Type>({
  findTalerUriInActiveTab: async () => undefined,
});

/**
 * Inversion of control Context
 *
 * This context act as a proxy between API that need to be replaced in
 * different environments
 *
 * @returns
 */
export const useIocContext = (): Type => useContext(Context);

export const IoCProviderForTesting = ({
  value,
  children,
}: {
  value: Type;
  children: any;
}): VNode => {
  return h(Context.Provider, { value, children });
};

export const IoCProviderForRuntime = ({
  children,
}: {
  children: any;
}): VNode => {
  return h(Context.Provider, {
    value: { findTalerUriInActiveTab: platform.findTalerUriInActiveTab },
    children,
  });
};
