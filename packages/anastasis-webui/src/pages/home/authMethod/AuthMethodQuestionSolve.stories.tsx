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
  component: TestedComponent,
  args: {
    order: 5,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

const type: KnownAuthMethods = "question";

export const WithoutFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information: {
      challenges: [
        {
          instructions: "does P equals NP?",
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

const recovery_information = {
  challenges: [
    {
      instructions: "does P equal NP?",
      type: "question",
      uuid: "ASDASDSAD!1",
    },
  ],
  policies: [],
};

export const CodeInFileFeedback = createExample(TestedComponent[type].solve, {
  ...reducerStatesExample.challengeSolving,
  recovery_information,
  selected_challenge_uuid: "ASDASDSAD!1",
  challenge_feedback: {
    "ASDASDSAD!1": {
      state: ChallengeFeedbackStatus.CodeInFile,
      filename: "asd",
      display_hint: "hint",
    },
  },
} as ReducerState);

export const CodeSentFeedback = createExample(TestedComponent[type].solve, {
  ...reducerStatesExample.challengeSolving,
  recovery_information,
  selected_challenge_uuid: "ASDASDSAD!1",
  challenge_feedback: {
    "ASDASDSAD!1": {
      state: ChallengeFeedbackStatus.CodeSent,
      address_hint: "asdasd",
      display_hint: "qweqweqw",
    },
  },
} as ReducerState);

export const SolvedFeedback = createExample(TestedComponent[type].solve, {
  ...reducerStatesExample.challengeSolving,
  recovery_information,
  selected_challenge_uuid: "ASDASDSAD!1",
  challenge_feedback: {
    "ASDASDSAD!1": {
      state: ChallengeFeedbackStatus.Solved,
    },
  },
} as ReducerState);

export const ServerFailureFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information,
    selected_challenge_uuid: "ASDASDSAD!1",
    challenge_feedback: {
      "ASDASDSAD!1": {
        state: ChallengeFeedbackStatus.ServerFailure,
        http_status: 500,
      },
    },
  } as ReducerState,
);

export const TruthUnknownFeedback = createExample(TestedComponent[type].solve, {
  ...reducerStatesExample.challengeSolving,
  recovery_information,
  selected_challenge_uuid: "ASDASDSAD!1",
  challenge_feedback: {
    "ASDASDSAD!1": {
      state: ChallengeFeedbackStatus.TruthUnknown,
    },
  },
} as ReducerState);

export const TalerPaymentFeedback = createExample(TestedComponent[type].solve, {
  ...reducerStatesExample.challengeSolving,
  recovery_information,
  selected_challenge_uuid: "ASDASDSAD!1",
  challenge_feedback: {
    "ASDASDSAD!1": {
      state: ChallengeFeedbackStatus.TalerPayment,
      payment_secret: "secret",
      provider: "asdasdas",
      taler_pay_uri: "taler://pay/...",
    },
  },
} as ReducerState);

export const UnsupportedFeedback = createExample(TestedComponent[type].solve, {
  ...reducerStatesExample.challengeSolving,
  recovery_information,
  selected_challenge_uuid: "ASDASDSAD!1",
  challenge_feedback: {
    "ASDASDSAD!1": {
      state: ChallengeFeedbackStatus.Unsupported,
      unsupported_method: "method",
    },
  },
} as ReducerState);

export const RateLimitExceededFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information,
    selected_challenge_uuid: "ASDASDSAD!1",
    challenge_feedback: {
      "ASDASDSAD!1": {
        state: ChallengeFeedbackStatus.RateLimitExceeded,
      },
    },
  } as ReducerState,
);

export const IbanInstructionsFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information,
    selected_challenge_uuid: "ASDASDSAD!1",
    challenge_feedback: {
      "ASDASDSAD!1": {
        state: ChallengeFeedbackStatus.IbanInstructions,
        challenge_amount: "EUR:1",
        target_iban: "DE12345789000",
        target_business_name: "Data Loss Incorporated",
        wire_transfer_subject: "Anastasis 987654321",
        answer_code: 987654321,
      },
    },
  } as ReducerState,
);

export const IncorrectAnswerFeedback = createExample(
  TestedComponent[type].solve,
  {
    ...reducerStatesExample.challengeSolving,
    recovery_information,
    selected_challenge_uuid: "ASDASDSAD!1",
    challenge_feedback: {
      "ASDASDSAD!1": {
        state: ChallengeFeedbackStatus.IncorrectAnswer,
      },
    },
  } as ReducerState,
);

// export const AuthIbanFeedback = createExample(TestedComponent[type].solve, {
//   ...reducerStatesExample.challengeSolving,
//   recovery_information: {
//     challenges: [
//       {
//         instructions: "does P equals NP?",
//         type: "question",
//         uuid: "ASDASDSAD!1",
//       },
//     ],
//     policies: [],
//   },
//   selected_challenge_uuid: "ASDASDSAD!1",
//   challenge_feedback: {
//     "ASDASDSAD!1": ibanFeedback,
//   },
// } as ReducerState);

// export const PaymentFeedback = createExample(TestedComponent[type].solve, {
//   ...reducerStatesExample.challengeSolving,
//   recovery_information: {
//     challenges: [
//       {
//         instructions: "does P equals NP?",
//         type: "question",
//         uuid: "ASDASDSAD!1",
//       },
//     ],
//     policies: [],
//   },
//   selected_challenge_uuid: "ASDASDSAD!1",
//   challenge_feedback: {
//     "ASDASDSAD!1": {
//       state: ChallengeFeedbackStatus.TalerPayment,
//       taler_pay_uri: "taler://pay/...",
//       provider: "https://localhost:8080/",
//       payment_secret: "3P4561HAMHRRYEYD6CM6J7TS5VTD5SR2K2EXJDZEFSX92XKHR4KG",
//     },
//   },
// } as ReducerState);
