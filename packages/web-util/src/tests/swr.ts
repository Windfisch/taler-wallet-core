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

import { ComponentChildren, FunctionalComponent, h, VNode } from "preact";
import { MockEnvironment, Query } from "./mock.js";
import { SWRConfig } from "swr";

export { Query };
/**
 * Helper for hook that use SWR inside.
 * 
 * buildTestingContext() will return a testing context
 * 
 */
export class SwrMockEnvironment extends MockEnvironment {
  constructor(debug = false) {
    super(debug);
  }

  mockApiIfNeeded(): void {
    null; // do nothing
  }

  public buildTestingContext(): FunctionalComponent<{
    children: ComponentChildren;
  }> {
    const __REGISTER_REQUEST = this.registerRequest.bind(this);
    return function TestingContext({
      children,
    }: {
      children: ComponentChildren;
    }): VNode {
      return h(
        SWRConfig,
        {
          value: {
            fetcher: (url: string, options: object) => {
              const mocked = __REGISTER_REQUEST(
                {
                  method: "get",
                  url,
                },
                {},
              );
              if (!mocked) return undefined;
              if (mocked.status > 400) {
                const e: any = Error("simulated error for testing");
                //example error handling from https://swr.vercel.app/docs/error-handling
                e.status = mocked.status;
                throw e;
              }
              return mocked.payload;
            },
            //These options are set for ending the test faster
            //otherwise SWR will create timeouts that will live after the test finished
            loadingTimeout: 0,
            dedupingInterval: 0,
            shouldRetryOnError: false,
            errorRetryInterval: 0,
            errorRetryCount: 0,
            //clean cache for every test
            provider: () => new Map(),
          },
        },
        children,
      );
    };
  }
}
