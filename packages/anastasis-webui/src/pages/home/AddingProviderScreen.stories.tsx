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
import { AddingProviderScreen as TestedComponent } from './AddingProviderScreen';


export default {
  title: 'Pages/ManageProvider',
  component: TestedComponent,
  args: {
    order: 1,
  },
  argTypes: {
    onUpdate: { action: 'onUpdate' },
    onBack: { action: 'onBack' },
  },
};

export const NewProvider = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
} as ReducerState);


export const NewProviderWithoutProviderList = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
  authentication_providers: {}
} as ReducerState);

export const NewVideoProvider = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
} as ReducerState, { providerType: 'video'});

export const NewSmsProvider = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
} as ReducerState, { providerType: 'sms'});

export const NewIBANProvider = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
} as ReducerState, { providerType: 'iban' });
