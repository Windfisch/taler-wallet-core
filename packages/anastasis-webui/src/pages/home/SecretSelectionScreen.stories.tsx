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
import {
  SecretSelectionScreen,
  SecretSelectionScreenFound,
} from "./SecretSelectionScreen.js";

export default {
  title: "Secret selection",
  component: SecretSelectionScreen,
  args: {
    order: 4,
  },
};

export const Example = createExample(
  SecretSelectionScreenFound,
  {
    ...reducerStatesExample.secretSelection,
    recovery_document: {
      provider_url: "https://kudos.demo.anastasis.lu/",
      secret_name: "secretName",
      version: 1,
    },
  } as ReducerState,
  {
    policies: [
      {
        secret_name: "The secret name 1",
        attribute_mask: 1,
        policy_hash: "abcdefghijklmnopqrstuvwxyz",
        providers: [
          {
            url: "http://someurl",
            version: 1,
          },
        ],
      },
      {
        secret_name: "The secret name 2",
        attribute_mask: 1,
        policy_hash: "abcdefghijklmnopqrstuvwxyz",
        providers: [
          {
            url: "http://someurl",
            version: 1,
          },
        ],
      },
    ],
  },
);

export const NoRecoveryDocumentFound = createExample(SecretSelectionScreen, {
  ...reducerStatesExample.secretSelection,
  recovery_document: undefined,
} as ReducerState);
