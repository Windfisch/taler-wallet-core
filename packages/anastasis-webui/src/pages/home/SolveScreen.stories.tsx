/* eslint-disable @typescript-eslint/camelcase */
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

import { ReducerState } from 'anastasis-core';
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
  selected_challenge_uuid: 'ASDASDSAD!1'
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
  selected_challenge_uuid: 'ASDASDSAD!1'
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
  selected_challenge_uuid: 'ASDASDSAD!1'
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
  selected_challenge_uuid: 'ASDASDSAD!1'
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
  selected_challenge_uuid: 'ASDASDSAD!1'
} as ReducerState);