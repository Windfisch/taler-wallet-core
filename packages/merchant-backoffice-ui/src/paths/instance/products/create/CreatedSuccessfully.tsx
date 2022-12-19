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
import { h, VNode } from "preact";
import { CreatedSuccessfully as Template } from "../../../../components/notifications/CreatedSuccessfully.js";
import { Entity } from "./index.js";
import emptyImage from "../../assets/empty.png";

interface Props {
  entity: Entity;
  onConfirm: () => void;
  onCreateAnother?: () => void;
}

export function CreatedSuccessfully({
  entity,
  onConfirm,
  onCreateAnother,
}: Props): VNode {
  return (
    <Template onConfirm={onConfirm} onCreateAnother={onCreateAnother}>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Image</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <img src={entity.image} style={{ width: 200, height: 200 }} />
            </p>
          </div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Description</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <textarea class="input" readonly value={entity.description} />
            </p>
          </div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Price</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <input class="input" readonly value={entity.price} />
            </p>
          </div>
        </div>
      </div>
    </Template>
  );
}
