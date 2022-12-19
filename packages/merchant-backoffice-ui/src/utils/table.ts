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

import { WithId } from "../declaration.js";

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

export interface Actions<T extends WithId> {
  element: T;
  type: "DELETE" | "UPDATE";
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export function buildActions<T extends WithId>(
  instances: T[],
  selected: string[],
  action: "DELETE",
): Actions<T>[] {
  return selected
    .map((id) => instances.find((i) => i.id === id))
    .filter(notEmpty)
    .map((id) => ({ element: id, type: action }));
}

/**
 * For any object or array, return the same object if is not empty.
 * not empty:
 *  - for arrays: at least one element not undefined
 *  - for objects: at least one property not undefined
 * @param obj
 * @returns
 */
export function undefinedIfEmpty<
  T extends Record<string, unknown> | Array<unknown>,
>(obj: T): T | undefined {
  if (obj === undefined) return undefined;
  return Object.values(obj).some((v) => v !== undefined) ? obj : undefined;
}
