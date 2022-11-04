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

import { h } from "preact";
import { ProductList } from "../src/components/product/ProductList.js";
// See: https://github.com/preactjs/enzyme-adapter-preact-pure
// import { shallow } from 'enzyme';
import * as backend from "../src/context/config.js";
import { render, findAllByText } from "@testing-library/preact";
import * as i18n from "../src/context/translation.js";

import * as jedLib from "jed";
const handler = new jedLib.Jed("en");

describe("Initial Test of the Sidebar", () => {
  beforeEach(() => {
    jest
      .spyOn(backend, "useConfigContext")
      .mockImplementation(() => ({ version: "", currency: "" }));
    jest.spyOn(i18n, "useTranslationContext").mockImplementation(() => ({
      changeLanguage: () => null,
      handler,
      lang: "en",
    }));
  });
  test("Product list renders a table", () => {
    const context = render(
      <ProductList
        list={[
          {
            description: "description of the product",
            image: "asdasda",
            price: "USD:10",
            quantity: 1,
            taxes: [{ name: "VAT", tax: "EUR:1" }],
            unit: "book",
          },
        ]}
      />,
    );

    expect(context.findAllByText("description of the product")).toBeDefined();
    // expect(context.find('table tr td img').map(img => img.prop('src'))).toEqual('');
  });
});
