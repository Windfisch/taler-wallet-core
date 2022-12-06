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
import { BackupFinishedScreen as TestedComponent } from "./BackupFinishedScreen.js";

export default {
  title: "Backup finish",
  component: TestedComponent,
  args: {
    order: 8,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const WithoutName = createExample(
  TestedComponent,
  reducerStatesExample.backupFinished,
);

export const WithName = createExample(TestedComponent, {
  ...reducerStatesExample.backupFinished,
  secret_name: "super_secret",
} as ReducerState);

export const WithDetails = createExample(TestedComponent, {
  ...reducerStatesExample.backupFinished,
  secret_name: "super_secret",
  success_details: {
    "https://anastasis.demo.taler.net/": {
      policy_expiration: {
        t_s: "never",
      },
      policy_version: 0,
    },
    "https://kudos.demo.anastasis.lu/": {
      policy_expiration: {
        t_s: new Date().getTime() + 60 * 60 * 24,
      },
      policy_version: 1,
    },
  },
} as ReducerState);
