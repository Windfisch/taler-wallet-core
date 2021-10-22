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
import { AttributeEntryScreen as TestedComponent } from './AttributeEntryScreen';


export default {
  title: 'Pages/AttributeEntryScreen',
  component: TestedComponent,
  argTypes: {
    onUpdate: { action: 'onUpdate' },
    onBack: { action: 'onBack' },
  },
};

export const WithSomeAttributes = createExample(TestedComponent, {
  ...reducerStatesExample.attributeEditing,
  required_attributes: [{
    name: 'first',
    label: 'first',
    type: 'type',
    uuid: 'asdasdsa1',
    widget: 'wid',
  }, {
    name: 'pepe',
    label: 'second',
    type: 'type',
    uuid: 'asdasdsa2',
    widget: 'wid',
  }, {
    name: 'pepe2',
    label: 'third',
    type: 'type',
    uuid: 'asdasdsa3',
    widget: 'calendar',
  }]
} as ReducerState);

export const Empty = createExample(TestedComponent, {
  ...reducerStatesExample.attributeEditing,
  required_attributes: undefined
} as ReducerState);
