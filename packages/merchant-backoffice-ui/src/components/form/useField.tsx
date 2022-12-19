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

import { ComponentChildren, VNode } from "preact";
import { useFormContext } from "./FormProvider.js";

interface Use<V> {
  error?: string;
  required: boolean;
  value: any;
  initial: any;
  onChange: (v: V) => void;
  toStr: (f: V | undefined) => string;
  fromStr: (v: string) => V;
}

export function useField<T>(name: keyof T): Use<T[typeof name]> {
  const { errors, object, initialObject, toStr, fromStr, valueHandler } =
    useFormContext<T>();
  type P = typeof name;
  type V = T[P];

  const updateField =
    (field: P) =>
    (value: V): void => {
      return valueHandler((prev) => {
        return setValueDeeper(prev, String(field).split("."), value);
      });
    };

  const defaultToString = (f?: V): string => String(!f ? "" : f);
  const defaultFromString = (v: string): V => v as any;
  const value = readField(object, String(name));
  const initial = readField(initialObject, String(name));
  const isDirty = value !== initial;
  const hasError = readField(errors, String(name));
  return {
    error: isDirty ? hasError : undefined,
    required: !isDirty && hasError,
    value,
    initial,
    onChange: updateField(name) as any,
    toStr: toStr[name] ? toStr[name]! : defaultToString,
    fromStr: fromStr[name] ? fromStr[name]! : defaultFromString,
  };
}
/**
 * read the field of an object an support accessing it using '.'
 *
 * @param object
 * @param name
 * @returns
 */
const readField = (object: any, name: string) => {
  return name
    .split(".")
    .reduce((prev, current) => prev && prev[current], object);
};

const setValueDeeper = (object: any, names: string[], value: any): any => {
  if (names.length === 0) return value;
  const [head, ...rest] = names;
  return { ...object, [head]: setValueDeeper(object[head] || {}, rest, value) };
};

export interface InputProps<T> {
  name: T;
  label: ComponentChildren;
  placeholder?: string;
  tooltip?: ComponentChildren;
  readonly?: boolean;
  help?: ComponentChildren;
}
