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
import { ContinentSelectionScreen as TestedComponent } from "./ContinentSelectionScreen.js";

export default {
  title: "Pages/Location",
  component: TestedComponent,
  args: {
    order: 2,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const BackupSelectContinent = createExample(
  TestedComponent,
  reducerStatesExample.backupSelectContinent,
);

export const BackupSelectCountry = createExample(TestedComponent, {
  ...reducerStatesExample.backupSelectContinent,
  selected_continent: "Testcontinent",
} as ReducerState);

export const RecoverySelectContinent = createExample(
  TestedComponent,
  reducerStatesExample.recoverySelectContinent,
);

export const RecoverySelectCountry = createExample(TestedComponent, {
  ...reducerStatesExample.recoverySelectContinent,
  selected_continent: "Testcontinent",
} as ReducerState);
