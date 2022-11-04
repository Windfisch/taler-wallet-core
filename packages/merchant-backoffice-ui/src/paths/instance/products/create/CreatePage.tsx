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
import { AsyncButton } from "../../../../components/exception/AsyncButton.js";
import { ProductForm } from "../../../../components/product/ProductForm.js";
import { MerchantBackend } from "../../../../declaration.js";
import { useListener } from "../../../../hooks/listener.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";

type Entity = MerchantBackend.Products.ProductAddDetail & { product_id: string}

interface Props {
  onCreate: (d: Entity) => Promise<void>;
  onBack?: () => void;
}


export function CreatePage({ onCreate, onBack }: Props): VNode {

  const [submitForm, addFormSubmitter] = useListener<Entity | undefined>((result) => {
    if (result) return onCreate(result)
    return Promise.reject()
  })

  const i18n = useTranslator()

  return <div>
    <section class="section is-main-section">
      <div class="columns">
        <div class="column" />
        <div class="column is-four-fifths">
          <ProductForm onSubscribe={addFormSubmitter} />

          <div class="buttons is-right mt-5">
            {onBack && <button class="button" onClick={onBack} ><Translate>Cancel</Translate></button>}
            <AsyncButton onClick={submitForm} data-tooltip={
              !submitForm ? i18n`Need to complete marked fields` : 'confirm operation'
            } disabled={!submitForm}><Translate>Confirm</Translate></AsyncButton>
          </div>

        </div>
        <div class="column" />
      </div>
    </section>
  </div>
}