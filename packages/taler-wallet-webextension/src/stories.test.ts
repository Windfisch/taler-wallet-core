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
import { setupI18n } from "@gnu-taler/taler-util";
import { parseGroupImport } from "@gnu-taler/web-util/lib/index.browser";
import { setupPlatform } from "./platform/api.js";
import chromeAPI from "./platform/chrome.js";
import { renderNodeOrBrowser } from "./test-utils.js";

import * as components from "./components/index.stories.js";
import * as cta from "./cta/index.stories.js";
import * as mui from "./mui/index.stories.js";
import * as popup from "./popup/index.stories.js";
import * as wallet from "./wallet/index.stories.js";

setupI18n("en", { en: {} });
setupPlatform(chromeAPI);

describe("All the examples:", () => {
  const cms = parseGroupImport({ popup, wallet, cta, mui, components });
  cms.forEach((group) => {
    describe(`Example for group "${group.title}:"`, () => {
      group.list.forEach((component) => {
        describe(`Component ${component.name}:`, () => {
          component.examples.forEach((example) => {
            it(`should render example: ${example.name}`, () => {
              renderNodeOrBrowser(
                example.render.component,
                example.render.props,
              );
            });
          });
        });
      });
    });
  });
});
