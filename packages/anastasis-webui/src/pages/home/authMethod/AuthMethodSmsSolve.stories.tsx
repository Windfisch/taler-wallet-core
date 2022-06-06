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

import { ReducerState } from "@gnu-taler/anastasis-core";
import { createExample, reducerStatesExample } from "../../../utils/index.js";
import { authMethods as TestedComponent, KnownAuthMethods } from "./index.js";

export default {
  title: "Pages/recovery/SolveChallenge/AuthMethods/sms",
  component: TestedComponent,
  args: {
    order: 5,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

const type: KnownAuthMethods = "sms";

export const WithoutFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information: {
      challenges: [
        {
          instructions: "SMS to +54 11 2233 4455",
          type: "question",
          uuid: "AHCC4ZJ3Z1AF8TWBKGVGEKCQ3R7HXHJ51MJ45NHNZMHYZTKJ9NW0",
        },
      ],
      policies: [],
    },
    selected_challenge_uuid:
      "AHCC4ZJ3Z1AF8TWBKGVGEKCQ3R7HXHJ51MJ45NHNZMHYZTKJ9NW0",
  } as ReducerState,
  {
    id: "AHCC4ZJ3Z1AF8TWBKGVGEKCQ3R7HXHJ51MJ45NHNZMHYZTKJ9NW0",
  },
);
