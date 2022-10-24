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

import { WithId } from "../declaration";

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/

export interface Actions<T extends WithId> {
  element: T;
  type: 'DELETE' | 'UPDATE';
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export function buildActions<T extends WithId>(intances: T[], selected: string[], action: 'DELETE'): Actions<T>[] {
  return selected.map(id => intances.find(i => i.id === id))
    .filter(notEmpty)
    .map(id => ({ element: id, type: action }))
}
