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
import { setupI18n } from "@gnu-taler/taler-util";
import { renderNodeOrBrowser } from "./test-utils.js";
import * as pages from "./pages/home/index.storiesNo.js";

setupI18n("en", { en: {} });

function testThisStory(st: any): any {
  describe(`render examples for ${(st as any).default.title}`, () => {
    Object.keys(st).forEach((k) => {
      const Component = (st as any)[k];
      if (k === "default" || !Component) return;

      it(`example: ${k}`, () => {
        renderNodeOrBrowser(Component, Component.args);
      });
    });
  });
}

describe("render every storybook example", () => {
  [pages].forEach(function testAll(st: any) {
    if (Array.isArray(st.default)) {
      st.default.forEach(testAll);
    } else {
      testThisStory(st);
    }
  });
});
