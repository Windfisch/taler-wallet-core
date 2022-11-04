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
import { h, VNode } from "preact";
import { CreatedSuccessfully } from "../../../components/notifications/CreatedSuccessfully.js";
import { Entity } from "./index.js";

export function InstanceCreatedSuccessfully({ entity, onConfirm }: { entity: Entity; onConfirm: () => void; }): VNode {
  return <CreatedSuccessfully onConfirm={onConfirm}>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">ID</label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={entity.id} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Business Name</label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={entity.name} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Access token</label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            {entity.auth.method === 'external' && 'external'}
            {entity.auth.method === 'token' &&
              <input class="input" readonly value={entity.auth.token} />}
          </p>
        </div>
      </div>
    </div>
  </CreatedSuccessfully>;
}
