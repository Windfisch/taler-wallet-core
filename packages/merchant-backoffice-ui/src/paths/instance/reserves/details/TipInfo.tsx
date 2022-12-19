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
import { useBackendContext } from "../../../../context/backend.js";
import { MerchantBackend } from "../../../../declaration.js";

type Entity = MerchantBackend.Tips.TipDetails;

interface Props {
  id: string;
  entity: Entity;
  amount: string;
}

export function TipInfo({ id, amount, entity }: Props): VNode {
  const { url } = useBackendContext();
  const tipHost = url.replace(/.*:\/\//, ""); // remove protocol part
  const proto = url.startsWith("http://") ? "taler+http" : "taler";
  const tipURL = `${proto}://tip/${tipHost}/${id}`;
  return (
    <Fragment>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">Amount</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field">
            <p class="control">
              <input readonly class="input" value={amount} />
            </p>
          </div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">URL</label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field" style={{ overflowWrap: "anywhere" }}>
            <p class="control">
              <a target="_blank" rel="noreferrer" href={tipURL}>
                {tipURL}
              </a>
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
                  !entity.expiration || entity.expiration.t_s === "never"
                    ? "never"
                    : format(
                        entity.expiration.t_s * 1000,
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
