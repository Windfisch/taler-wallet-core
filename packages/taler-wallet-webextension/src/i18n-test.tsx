/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems SA

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import test from "ava";
import { internalSetStrings, str, Translate, strings } from "./i18n";
import React from "react";
import { render } from "enzyme";
import { configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";

configure({ adapter: new Adapter() });

const testStrings = {
  domain: "messages",
  locale_data: {
    messages: {
      str1: ["foo1"],
      str2: [""],
      "str3 %1$s / %2$s": ["foo3 %2$s ; %1$s"],
      "": {
        domain: "messages",
        plural_forms: "nplurals=2; plural=(n != 1);",
        lang: "",
      },
    },
  },
};

test("str translation", (t) => {
  // Alias, so we nly use the function for lookups, not for string extranction.
  const strAlias = str;
  const TranslateAlias = Translate;
  internalSetStrings(testStrings);
  t.is(strAlias`str1`, "foo1");
  t.is(strAlias`str2`, "str2");
  const a = "a";
  const b = "b";
  t.is(strAlias`str3 ${a} / ${b}`, "foo3 b ; a");
  const r = render(<TranslateAlias>str1</TranslateAlias>);
  t.is(r.text(), "foo1");

  const r2 = render(
    <TranslateAlias>
      str3 <span>{a}</span> / <span>{b}</span>
    </TranslateAlias>,
  );
  t.is(r2.text(), "foo3 b ; a");

  t.pass();
});

test("existing str translation", (t) => {
  internalSetStrings(strings);
  t.pass();
});
