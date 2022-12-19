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
import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { CreatedSuccessfully as Template } from "../../../../components/notifications/CreatedSuccessfully.js";
import { MerchantBackend } from "../../../../declaration.js";

type Entity = MerchantBackend.Tips.TipCreateConfirmation;

interface Props {
  entity: Entity;
  request: MerchantBackend.Tips.TipCreateRequest;
  onConfirm: () => void;
  onCreateAnother?: () => void;
}

export function CreatedSuccessfully({
  request,
  entity,
  onConfirm,
  onCreateAnother,
}: Props): VNode {
  return (
    <Fragment>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Amount</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <input readonly class="input" value={request.amount} />
            </p>
          </div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Justification</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <input readonly class="input" value={request.justification} />
            </p>
          </div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">URL</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <input readonly class="input" value={entity.tip_status_url} />
            </p>
          </div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Valid until</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <input
                class="input"
                readonly
                value={
                  !entity.tip_expiration ||
                  entity.tip_expiration.t_s === "never"
                    ? "never"
                    : format(
                        entity.tip_expiration.t_s * 1000,
                        "yyyy/MM/dd HH:mm:ss",
                      )
                }
              />
            </p>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
