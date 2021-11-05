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

import { ChallengeFeedbackStatus, ReducerState } from 'anastasis-core';
import { createExample, reducerStatesExample } from '../../utils';
import { SolveScreen as TestedComponent } from './SolveScreen';


export default {
  title: 'Pages/recovery/SolveScreen',
  component: TestedComponent,
  args: {
    order: 6,
  },
  argTypes: {
    onUpdate: { action: 'onUpdate' },
    onBack: { action: 'onBack' },
  },
};

export const NoInformation = createExample(TestedComponent, reducerStatesExample.challengeSolving);

export const NotSupportedChallenge = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'chall-type',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',

} as ReducerState);

export const MismatchedChallengeId = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'chall-type',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'no-no-no'
} as ReducerState);

export const SmsChallenge = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'SMS to 555-5555',
      type: 'sms',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',

} as ReducerState);

export const QuestionChallenge = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',

} as ReducerState);

export const EmailChallenge = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'Email to sebasjm@some-domain.com',
      type: 'email',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',

} as ReducerState);

export const PostChallenge = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'Letter to address in postal code ABC123',
      type: 'post',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',

} as ReducerState);


export const QuestionChallengeMessageFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.Message,
      message: 'Challenge should be solved'
    }
  }

} as ReducerState);

export const QuestionChallengeServerFailureFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.ServerFailure,
      http_status: 500,
      error_response: "Couldn't connect to mysql"
    }
  }

} as ReducerState);

export const QuestionChallengeRedirectFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.Redirect,
      http_status: 302,
      redirect_url: 'http://video.taler.net'
    }
  }

} as ReducerState);

export const QuestionChallengeMessageRateLimitExceededFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.RateLimitExceeded,
    }
  }

} as ReducerState);

export const QuestionChallengeUnsupportedFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.Unsupported,
      http_status: 500,
      unsupported_method: 'Question'
    }
  }

} as ReducerState);

export const QuestionChallengeTruthUnknownFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.TruthUnknown,
    }
  }

} as ReducerState);

export const QuestionChallengeAuthIbanFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.AuthIban,
      challenge_amount: "EUR:1",
      credit_iban: "DE12345789000",
      business_name: "Data Loss Incorporated",
      wire_transfer_subject: "Anastasis 987654321"
    }
  }

} as ReducerState);

export const QuestionChallengePaymentFeedback = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSolving,
  recovery_information: {
    challenges: [{
      cost: 'USD:1',
      instructions: 'does P equals NP?',
      type: 'question',
      uuid: 'ASDASDSAD!1'
    }],
    policies: [],
  },
  selected_challenge_uuid: 'ASDASDSAD!1',
  challenge_feedback: {
    'ASDASDSAD!1': {
      state: ChallengeFeedbackStatus.Payment,
      taler_pay_uri : "taler://pay/...",
      provider : "https://localhost:8080/",
      payment_secret : "3P4561HAMHRRYEYD6CM6J7TS5VTD5SR2K2EXJDZEFSX92XKHR4KG"
     }
  }
} as ReducerState);

