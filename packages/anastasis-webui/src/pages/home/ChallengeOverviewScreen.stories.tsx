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

import { RecoveryStates, ReducerState } from 'anastasis-core';
import { createExample, reducerStatesExample } from '../../utils';
import { ChallengeOverviewScreen as TestedComponent } from './ChallengeOverviewScreen';


export default {
  title: 'Pages/recovery/ChallengeOverviewScreen',
  component: TestedComponent,
  args: {
    order: 5,
  },
  argTypes: {
    onUpdate: { action: 'onUpdate' },
    onBack: { action: 'onBack' },
  },
};

export const OneUnsolvedPolicy = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{ uuid: '1' }]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'just go for it',
      type: 'question',
      uuid: '1',
    }]
  },
} as ReducerState);

export const SomePoliciesOneSolved = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{ uuid: '1' }, { uuid: '2' }], [{ uuid: 'uuid-3' }]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'this question cost 1 USD',
      type: 'question',
      uuid: '1',
    }, {
      cost: 'USD:0',
      instructions: 'answering this question is free',
      type: 'question',
      uuid: '2',
    }, {
      cost: 'USD:1',
      instructions: 'this question is already answered',
      type: 'question',
      uuid: 'uuid-3',
    }]
  },
  challenge_feedback: {
    'uuid-3': {
      state: 'solved'
    }
  },
} as ReducerState);

export const OneBadConfiguredPolicy = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{ uuid: '1' }, { uuid: '2' }]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'this policy has a missing uuid (the other auth method)',
      type: 'totp',
      uuid: '1',
    }],
  },
} as ReducerState);

export const OnePolicyWithAllTheChallenges = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[
      { uuid: '1' },
      { uuid: '2' },
      { uuid: '3' },
      { uuid: '4' },
      { uuid: '5' },
      { uuid: '6' },
      { uuid: '7' },
      { uuid: '8' },
    ]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'Does P equals NP?',
      type: 'question',
      uuid: '1',
    },{
      cost: 'USD:1',
      instructions: 'SMS to 555-555',
      type: 'sms',
      uuid: '2',
    },{
      cost: 'USD:1',
      instructions: 'Email to qwe@asd.com',
      type: 'email',
      uuid: '3',
    },{
      cost: 'USD:1',
      instructions: 'Enter 8 digits code for "Anastasis"',
      type: 'totp',
      uuid: '4',
    },{//
      cost: 'USD:0',
      instructions: 'Wire transfer from ASDXCVQWE123123 with holder Florian',
      type: 'iban',
      uuid: '5',
    },{
      cost: 'USD:1',
      instructions: 'Join a video call',
      type: 'video',//Enter 8 digits code for "Anastasis"
      uuid: '7',
    },{
    },{
      cost: 'USD:1',
      instructions: 'Letter to address in postal code DE123123',
      type: 'post',//Enter 8 digits code for "Anastasis"
      uuid: '8',
    },{
      cost: 'USD:1',
      instructions: 'instruction for an unknown type of challenge',
      type: 'new-type-of-challenge',
      uuid: '6',
    }],
  },
} as ReducerState);


export const OnePolicyWithAllTheChallengesInDifferentState = createExample(TestedComponent, {
  ...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[
      { uuid: '1' },
      { uuid: '2' },
      { uuid: '3' },
      { uuid: '4' },
      { uuid: '5' },
      { uuid: '6' },
      { uuid: '7' },
      { uuid: '8' },
      { uuid: '9' },
      { uuid: '10' },
    ]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'in state "solved"',
      type: 'question',
      uuid: '1',
    },{
      cost: 'USD:1',
      instructions: 'in state "hint"',
      type: 'question',
      uuid: '2',
    },{
      cost: 'USD:1',
      instructions: 'in state "details"',
      type: 'question',
      uuid: '3',
    },{
      cost: 'USD:1',
      instructions: 'in state "body"',
      type: 'question',
      uuid: '4',
    },{
      cost: 'USD:1',
      instructions: 'in state "redirect"',
      type: 'question',
      uuid: '5',
    },{
      cost: 'USD:1',
      instructions: 'in state "server-failure"',
      type: 'question',
      uuid: '6',
    },{
      cost: 'USD:1',
      instructions: 'in state "truth-unknown"',
      type: 'question',
      uuid: '7',
    },{
      cost: 'USD:1',
      instructions: 'in state "rate-limit-exceeded"',
      type: 'question',
      uuid: '8',
    },{
      cost: 'USD:1',
      instructions: 'in state "authentication-timeout"',
      type: 'question',
      uuid: '9',
    },{
      cost: 'USD:1',
      instructions: 'in state "external-instructions"',
      type: 'question',
      uuid: '10',
    }],
  },
  challenge_feedback: {
    1: { state: 'solved' },
    2: { state: 'hint' },
    3: { state: 'details' },
    4: { state: 'body' },
    5: { state: 'redirect' },
    6: { state: 'server-failure' },
    7: { state: 'truth-unknown' },
    8: { state: 'rate-limit-exceeded' },
    9: { state: 'authentication-timeout' },
    10: { state: 'external-instructions' },
  }
} as ReducerState);
export const NoPolicies = createExample(TestedComponent, reducerStatesExample.challengeSelecting);
