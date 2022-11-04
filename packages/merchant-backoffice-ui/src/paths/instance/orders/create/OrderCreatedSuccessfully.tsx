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
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { CreatedSuccessfully } from "../../../../components/notifications/CreatedSuccessfully.js";
import { useOrderAPI } from "../../../../hooks/order.js";
import { Translate } from "../../../../i18n";
import { Entity } from "./index.js";

interface Props {
  entity: Entity;
  onConfirm: () => void;
  onCreateAnother?: () => void;
}

export function OrderCreatedSuccessfully({ entity, onConfirm, onCreateAnother }: Props): VNode {
  const { getPaymentURL } = useOrderAPI()
  const [url, setURL] = useState<string | undefined>(undefined)

  useEffect(() => {
    getPaymentURL(entity.response.order_id).then(response => {
      setURL(response.data)
    })
  }, [getPaymentURL, entity.response.order_id])

  return <CreatedSuccessfully onConfirm={onConfirm} onCreateAnother={onCreateAnother}>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label"><Translate>Amount</Translate></label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={entity.request.order.amount} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label"><Translate>Summary</Translate></label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={entity.request.order.summary} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label"><Translate>Order ID</Translate></label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={entity.response.order_id} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label"><Translate>Payment URL</Translate></label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={url} />
          </p>
        </div>
      </div>
    </div>
  </CreatedSuccessfully>;
}
