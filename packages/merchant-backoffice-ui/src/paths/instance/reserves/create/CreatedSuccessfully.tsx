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
import { CreatedSuccessfully as Template } from "../../../../components/notifications/CreatedSuccessfully.js";
import { MerchantBackend } from "../../../../declaration.js";
import { Translate } from "../../../../i18n";
import { QR } from "../../../../components/exception/QR.js";

type Entity = { request: MerchantBackend.Tips.ReserveCreateRequest, response: MerchantBackend.Tips.ReserveCreateConfirmation };

interface Props {
  entity: Entity;
  onConfirm: () => void;
  onCreateAnother?: () => void;
}

export function CreatedSuccessfully({ entity, onConfirm, onCreateAnother }: Props): VNode {
  const link = `${entity.response.payto_uri}?message=${entity.response.reserve_pub}&amount=${entity.request.initial_balance}`

  return <Template onConfirm={onConfirm} onCreateAnother={onCreateAnother}>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Amount</label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input readonly class="input" value={entity.request.initial_balance} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Exchange bank account</label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input readonly class="input" value={entity.response.payto_uri} />
          </p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Wire transfer subject</label>
      </div>
      <div class="field-body is-flex-grow-3">
        <div class="field">
          <p class="control">
            <input class="input" readonly value={entity.response.reserve_pub} />
          </p>
        </div>
      </div>
    </div>
    <p class="is-size-5"><Translate>To complete the setup of the reserve, you must now initiate a wire transfer using the given wire transfer subject and crediting the specified amount to the indicated account of the exchange.</Translate></p>
    <p class="is-size-5"><Translate>If your system supports RFC 8905, you can do this by opening this URI:</Translate></p>
    <pre>
      <a target="_blank" rel="noreferrer" href={link}>{link}</a>
    </pre>
    <QR text={link} />
  </Template>;
}

