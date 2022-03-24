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
import { useTalerActionURL } from "./useTalerActionURL"
import { mountHook } from "../test-utils";
import { IoCProviderForTesting } from "../context/iocContext";
import { h, VNode } from "preact";
import { expect } from "chai";

describe('useTalerActionURL hook', () => {

  it('should be set url to undefined when dismiss', async () => {

    const ctx = ({ children }: { children: any }): VNode => {
      return h(IoCProviderForTesting, {
        value: {
          findTalerUriInActiveTab: async () => "asd",
        }, children
      })
    }

    const { result, waitNextUpdate } = mountHook(useTalerActionURL, ctx)

    {
      const [url] = result.current!
      expect(url).undefined;
    }

    await waitNextUpdate("waiting for useEffect")

    {
      const [url] = result.current!
      expect(url).equals("asd");
    }

    const [, setDismissed] = result.current!
    setDismissed(true)

    await waitNextUpdate("after dismiss")

    {
      const [url] = result.current!
      if (url !== undefined) throw Error('invalid')
      expect(url).undefined;
    }

  })
})