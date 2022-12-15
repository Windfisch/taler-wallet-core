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

import { ComponentChildren, createContext, h, VNode } from "preact";
import { useContext } from "preact/hooks";
import { wxApi, WxApiType } from "../wxApi.js";

type Type = WxApiType;

const initial = wxApi;

const Context = createContext<Type>(initial);

type Props = Partial<WxApiType> & {
  children: ComponentChildren;
};

export const BackendProvider = ({
  wallet,
  background,
  listener,
  children,
}: Props): VNode => {
  return h(Context.Provider, {
    value: {
      wallet: wallet ?? initial.wallet,
      background: background ?? initial.background,
      listener: listener ?? initial.listener,
    },
    children,
  });
};

export const useBackendContext = (): Type => useContext(Context);
