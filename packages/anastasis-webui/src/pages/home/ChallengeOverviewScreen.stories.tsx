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

import {
  ChallengeFeedbackStatus,
  RecoveryStates,
  ReducerState,
} from "@gnu-taler/anastasis-core";
import { createExample, reducerStatesExample } from "../../utils/index.js";
import { ChallengeOverviewScreen as TestedComponent } from "./ChallengeOverviewScreen.js";

export default {
  title: "Pages/recovery/SolveChallenge/Overview",
  component: TestedComponent,
  args: {
    order: 5,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const OneUnsolvedPolicy = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{ uuid: "1" }]],
    challenges: [
      {
        instructions: "just go for it",
        type: "question",
        uuid: "1",
      },
    ],
  },
} as ReducerState);

export const SomePoliciesOneSolved = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{ uuid: "1" }, { uuid: "2" }], [{ uuid: "uuid-3" }]],
    challenges: [
      {
        instructions: "this question cost 1 USD",
        type: "question",
        uuid: "1",
      },
      {
        instructions: "answering this question is free",
        type: "question",
        uuid: "2",
      },
      {
        instructions: "this question is already answered",
        type: "question",
        uuid: "uuid-3",
      },
    ],
  },
  challenge_feedback: {
    "uuid-3": {
      state: "solved",
    },
  },
} as ReducerState);

export const OneBadConfiguredPolicy = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{ uuid: "1" }, { uuid: "2" }]],
    challenges: [
      {
        instructions: "this policy has a missing uuid (the other auth method)",
        type: "totp",
        uuid: "1",
      },
    ],
  },
} as ReducerState);

export const OnePolicyWithAllTheChallenges = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [
      [
        { uuid: "1" },
        { uuid: "2" },
        { uuid: "3" },
        { uuid: "4" },
        { uuid: "5" },
        { uuid: "6" },
        { uuid: "7" },
        { uuid: "8" },
      ],
    ],
    challenges: [
      {
        instructions: "Does P equals NP?",
        type: "question",
        uuid: "1",
      },
      {
        instructions: "SMS to 555-555",
        type: "sms",
        uuid: "2",
      },
      {
        instructions: "Email to qwe@asd.com",
        type: "email",
        uuid: "3",
      },
      {
        instructions: 'Enter 8 digits code for "Anastasis"',
        type: "totp",
        uuid: "4",
      },
      {
        //
        instructions: "Wire transfer from ASDXCVQWE123123 with holder Florian",
        type: "iban",
        uuid: "5",
      },
      {
        instructions: "Join a video call",
        type: "video", //Enter 8 digits code for "Anastasis"
        uuid: "7",
      },
      {},
      {
        instructions: "Letter to address in postal code DE123123",
        type: "post", //Enter 8 digits code for "Anastasis"
        uuid: "8",
      },
      {
        instructions: "instruction for an unknown type of challenge",
        type: "new-type-of-challenge",
        uuid: "6",
      },
    ],
  },
} as ReducerState);

export const OnePolicyWithAllTheChallengesInDifferentState = createExample(
  TestedComponent,
  {
    ...reducerStatesExample.challengeSelecting,
    recovery_state: RecoveryStates.ChallengeSelecting,
    recovery_information: {
      policies: [
        [
          { uuid: "uuid-1" },
          { uuid: "uuid-2" },
          { uuid: "uuid-3" },
          { uuid: "uuid-4" },
          { uuid: "uuid-5" },
          { uuid: "uuid-6" },
          { uuid: "uuid-7" },
          { uuid: "uuid-8" },
          { uuid: "uuid-9" },
        ],
      ],
      challenges: [
        {
          instructions: 'in state "solved"',
          type: "question",
          uuid: "uuid-1",
        },
        {
          instructions: 'in state "message"',
          type: "question",
          uuid: "uuid-2",
        },
        {
          instructions: 'in state "auth iban"',
          type: "question",
          uuid: "uuid-3",
        },
        {
          instructions: 'in state "payment "',
          type: "question",
          uuid: "uuid-4",
        },
        {
          instructions: 'in state "rate limit"',
          type: "question",
          uuid: "uuid-5",
        },
        {
          instructions: 'in state "redirect"',
          type: "question",
          uuid: "uuid-6",
        },
        {
          instructions: 'in state "server failure"',
          type: "question",
          uuid: "uuid-7",
        },
        {
          instructions: 'in state "truth unknown"',
          type: "question",
          uuid: "uuid-8",
        },
        {
          instructions: 'in state "unsupported"',
          type: "question",
          uuid: "uuid-9",
        },
      ],
    },
    challenge_feedback: {
      "uuid-1": { state: ChallengeFeedbackStatus.Solved.toString() },
      "uuid-3": {
        state: ChallengeFeedbackStatus.IbanInstructions.toString(),
        challenge_amount: "EUR:1",
        target_iban: "DE12345789000",
        target_business_name: "Data Loss Incorporated",
        wire_transfer_subject: "Anastasis 987654321",
      },
      "uuid-4": {
        state: ChallengeFeedbackStatus.TalerPayment.toString(),
        taler_pay_uri: "taler://pay/...",
        provider: "https://localhost:8080/",
        payment_secret: "3P4561HAMHRRYEYD6CM6J7TS5VTD5SR2K2EXJDZEFSX92XKHR4KG",
      },
      "uuid-5": {
        state: ChallengeFeedbackStatus.RateLimitExceeded.toString(),
        // "error_code": 8121
      },
      "uuid-7": {
        state: ChallengeFeedbackStatus.ServerFailure.toString(),
        http_status: 500,
        error_response: "some error message or error object",
      },
      "uuid-8": {
        state: ChallengeFeedbackStatus.TruthUnknown.toString(),
        // "error_code": 8108
      },
      "uuid-9": { state: ChallengeFeedbackStatus.Unsupported.toString() },
    },
  } as ReducerState,
);
export const NoPolicies = createExample(
  TestedComponent,
  reducerStatesExample.challengeSelecting,
);
