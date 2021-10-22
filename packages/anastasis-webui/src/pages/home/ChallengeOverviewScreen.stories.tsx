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
import { ChallengeOverviewScreen as TestedComponent } from './ChallengeOverviewScreen';


export default {
  title: 'Pages/ChallengeOverviewScreen',
  component: TestedComponent,
  argTypes: {
    onUpdate: { action: 'onUpdate' },
    onBack: { action: 'onBack' },
  },
};

export const OneChallenge = createExample(TestedComponent, {...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{uuid:'1'}]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'just go for it',
      type: 'question',
      uuid: '1',
    }]
  },
} as ReducerState);

export const MoreChallenges = createExample(TestedComponent, {...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{uuid:'1'}, {uuid:'2'}],[{uuid:'3'}]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'just go for it',
      type: 'question',
      uuid: '1',
    },{
      cost: 'USD:1',
      instructions: 'just go for it',
      type: 'question',
      uuid: '2',
    },{
      cost: 'USD:1',
      instructions: 'just go for it',
      type: 'question',
      uuid: '3',
    }]
  },
} as ReducerState);

export const OneBadConfiguredPolicy = createExample(TestedComponent, {...reducerStatesExample.challengeSelecting,
  recovery_information: {
    policies: [[{uuid:'2'}]],
    challenges: [{
      cost: 'USD:1',
      instructions: 'just go for it',
      type: 'sasd',
      uuid: '1',
    }]
  },
} as ReducerState);

export const NoPolicies = createExample(TestedComponent, reducerStatesExample.challengeSelecting);
