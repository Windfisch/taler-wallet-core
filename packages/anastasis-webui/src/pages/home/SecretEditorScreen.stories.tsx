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

import { ReducerState } from "@gnu-taler/anastasis-core";
import { createExample, reducerStatesExample } from "../../utils/index.js";
import { SecretEditorScreen as TestedComponent } from "./SecretEditorScreen.js";

export default {
  title: "Pages/backup/SecretInput",
  component: TestedComponent,
  args: {
    order: 7,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const WithSecretNamePreselected = createExample(TestedComponent, {
  ...reducerStatesExample.secretEdition,
  secret_name: "someSecretName",
} as ReducerState);

export const WithoutName = createExample(TestedComponent, {
  ...reducerStatesExample.secretEdition,
} as ReducerState);
