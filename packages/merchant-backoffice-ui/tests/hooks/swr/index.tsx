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

import { ComponentChildren, h, VNode } from "preact";
import { SWRConfig } from "swr";
import { BackendContextProvider } from "../../../src/context/backend";
import { InstanceContextProvider } from "../../../src/context/instance";

interface TestingContextProps {
  children?: ComponentChildren;
}
export function TestingContext({ children }: TestingContextProps): VNode {
  return (
    <BackendContextProvider defaultUrl="http://backend" initialToken="token">
      <InstanceContextProvider
        value={{
          token: "token",
          id: "default",
          admin: true,
          changeToken: () => null,
        }}
      >
        <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
      </InstanceContextProvider>
    </BackendContextProvider>
  );
}
