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

import { ComponentChildren, createContext, h, VNode } from "preact";
import { useContext, useMemo } from "preact/hooks";

type Updater<S> = (value: ((prevState: S) => S) ) => void;

export interface Props<T> {
  object?: Partial<T>;
  errors?: FormErrors<T>;
  name?: string;
  valueHandler: Updater<Partial<T>> | null;
  children: ComponentChildren
}

const noUpdater: Updater<Partial<unknown>> = () => (s: unknown) => s

export function FormProvider<T>({ object = {}, errors = {}, name = '', valueHandler, children }: Props<T>): VNode {
  const initialObject = useMemo(() => object, []);
  const value = useMemo<FormType<T>>(() => ({ errors, object, initialObject, valueHandler: valueHandler ? valueHandler : noUpdater, name, toStr: {}, fromStr: {} }), [errors, object, valueHandler]);

  return <FormContext.Provider value={value}>
    <form class="field" onSubmit={(e) => {
      e.preventDefault();
      // if (valueHandler) valueHandler(object);
    }}>
      {children}
    </form>
  </FormContext.Provider>;
}

export interface FormType<T> {
  object: Partial<T>;
  initialObject: Partial<T>;
  errors: FormErrors<T>;
  toStr: FormtoStr<T>;
  name: string;
  fromStr: FormfromStr<T>;
  valueHandler: Updater<Partial<T>>;
}

const FormContext = createContext<FormType<unknown>>(null!)

export function useFormContext<T>() {
  return useContext<FormType<T>>(FormContext)
}

export type FormErrors<T> = {
  [P in keyof T]?: string | FormErrors<T[P]>
}

export type FormtoStr<T> = {
  [P in keyof T]?: ((f?: T[P]) => string)
}

export type FormfromStr<T> = {
  [P in keyof T]?: ((f: string) => T[P])
}

export type FormUpdater<T> = {
  [P in keyof T]?: (f: keyof T) => (v: T[P]) => void
}
