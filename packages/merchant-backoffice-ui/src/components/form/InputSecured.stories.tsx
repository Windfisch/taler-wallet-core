/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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

import { h, VNode } from 'preact';
import { useState } from 'preact/hooks';
import { FormProvider } from "./FormProvider.js";
import { InputSecured } from './InputSecured.js';

export default {
  title: 'Components/Form/InputSecured',
  component: InputSecured,
};

type T = { auth_token: string | null }

export const InitialValueEmpty = (): VNode => {
  const [state, setState] = useState<Partial<T>>({ auth_token: '' })
  return <FormProvider<T> object={state} errors={{}} valueHandler={setState}>
    Initial value: ''
    <InputSecured<T> name="auth_token" label="Access token" />
  </FormProvider>
}

export const InitialValueToken = (): VNode => {
  const [state, setState] = useState<Partial<T>>({ auth_token: 'token' })
  return <FormProvider<T> object={state} errors={{}} valueHandler={setState}>
    <InputSecured<T> name="auth_token" label="Access token" />
  </FormProvider>
}

export const InitialValueNull = (): VNode => {
  const [state, setState] = useState<Partial<T>>({ auth_token: null })
  return <FormProvider<T> object={state} errors={{}} valueHandler={setState}>
    Initial value: ''
    <InputSecured<T> name="auth_token" label="Access token" />
  </FormProvider>
}
