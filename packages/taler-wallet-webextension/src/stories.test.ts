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
import * as popup from "./popup/index.stories";
import * as wallet from "./wallet/index.stories";
import * as mui from "./mui/index.stories";

import { setupI18n } from "@gnu-taler/taler-util";
import { renderNodeOrBrowser } from "./test-utils";
setupI18n("en", { en: {} });

function testThisStory(st: any): any {
  describe(`render examples for ${(st as any).default.title}`, () => {
    Object.keys(st).forEach((k) => {
      const Component = (st as any)[k];
      if (k === "default" || !Component) return;

      // eslint-disable-next-line jest/expect-expect
      it(`example: ${k}`, () => {
        renderNodeOrBrowser(Component, Component.args);
      });
    });
  });
}

describe("render every storybook example", () => {
  [popup, wallet, mui].forEach(function testAll(st: any) {
    if (Array.isArray(st.default)) {
      st.default.forEach(testAll)
    } else {
      testThisStory(st)
    }
  });
});
