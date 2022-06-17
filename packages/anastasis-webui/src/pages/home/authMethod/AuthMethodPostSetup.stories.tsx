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

import { createExample, reducerStatesExample } from "../../../utils/index.js";
import { authMethods as TestedComponent, KnownAuthMethods } from "./index.js";

export default {
  component: TestedComponent,
  args: {
    order: 5,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

const type: KnownAuthMethods = "post";

export const Empty = createExample(
  TestedComponent[type].setup,
  reducerStatesExample.authEditing,
  {
    configured: [],
  },
);

export const WithOneExample = createExample(
  TestedComponent[type].setup,
  reducerStatesExample.authEditing,
  {
    configured: [
      {
        challenge: "qwe",
        type,
        instructions: "Letter to address in postal code QWE456",
        remove: () => null,
      },
    ],
  },
);

export const WithMoreExamples = createExample(
  TestedComponent[type].setup,
  reducerStatesExample.authEditing,
  {
    configured: [
      {
        challenge: "qwe",
        type,
        instructions: "Letter to address in postal code QWE456",
        remove: () => null,
      },
      {
        challenge: "qwe",
        type,
        instructions: "Letter to address in postal code ABC123",
        remove: () => null,
      },
    ],
  },
);
