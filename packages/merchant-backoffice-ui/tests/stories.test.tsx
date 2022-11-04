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
import { h, VNode } from "preact";
import * as config from "../src/context/config.js";
import * as i18n from "../src/context/translation.js";
import { cleanup, render as originalRender } from "@testing-library/preact";
import { SWRConfig } from "swr";

import fs from "fs";

function getFiles(dir: string, files_: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}

const STORIES_NAME_REGEX = RegExp(".*.stories.tsx");

function render(vnode: VNode) {
  return originalRender(
    <SWRConfig
      value={{
        provider: () => new Map(),
      }}
    >
      {vnode}
    </SWRConfig>,
  );
}

import * as jedLib from "jed";
const handler = new jedLib.Jed("en");

describe("storybook testing", () => {
  it("render every story", () => {
    jest
      .spyOn(config, "useConfigContext")
      .mockImplementation(() => ({ version: "1.0.0", currency: "EUR" }));
    jest.spyOn(i18n, "useTranslationContext").mockImplementation(() => ({
      changeLanguage: () => null,
      handler,
      lang: "en",
    }));

    getFiles("./src")
      .filter((f) => STORIES_NAME_REGEX.test(f))
      .map((f) => {
        // const f = "./src/paths/instance/transfers/list/List.stories.tsx";
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const s = require(`../${f}`);

        delete s.default;
        Object.keys(s).forEach((k) => {
          const Component = s[k];
          const vdom = <Component {...Component.args} />;
          expect(() => {
            const { unmount } = render(vdom);
            unmount();
          }).not.toThrow(); //`problem rendering ${f} example ${k}`
          cleanup();
        });
      });
  });
});
