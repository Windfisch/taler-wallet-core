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

import {
  ChallengeFeedbackStatus,
  ReducerState,
} from "@gnu-taler/anastasis-core";
import { createExample, reducerStatesExample } from "../../../utils/index.js";
import { authMethods as TestedComponent, KnownAuthMethods } from "./index.js";

export default {
  title: "Auth method: Email solve",
  component: TestedComponent,
  args: {
    order: 5,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

const type: KnownAuthMethods = "email";

export const WithoutFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information: {
      challenges: [
        {
          instructions: "Email to me@domain.com",
          type: "question",
          uuid: "uuid-1",
        },
      ],
      policies: [],
    },
    selected_challenge_uuid: "uuid-1",
  } as ReducerState,
  {
    id: "uuid-1",
  },
);

export const PaymentFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information: {
      challenges: [
        {
          instructions: "Email to me@domain.com",
          type: "question",
          uuid: "uuid-1",
        },
      ],
      policies: [],
    },
    selected_challenge_uuid: "uuid-1",
    challenge_feedback: {
      "uuid-1": {
        state: ChallengeFeedbackStatus.TalerPayment,
        taler_pay_uri: "taler://pay/...",
        provider: "https://localhost:8080/",
        payment_secret: "3P4561HAMHRRYEYD6CM6J7TS5VTD5SR2K2EXJDZEFSX92XKHR4KG",
      },
    },
  } as ReducerState,
  {
    id: "uuid-1",
  },
);
