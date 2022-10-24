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
import { useState } from "preact/hooks";
import { FormProvider } from "../../../components/form/FormProvider";
import { Input } from "../../../components/form/Input";
import { MerchantBackend } from "../../../declaration";
import { useTranslator } from "../../../i18n";

type Entity = MerchantBackend.Instances.InstanceReconfigurationMessage;
interface Props {
  onUpdate: () => void;
  onDelete: () => void;
  selected: MerchantBackend.Instances.QueryInstancesResponse;
}

function convert(from: MerchantBackend.Instances.QueryInstancesResponse): Entity {
  const { accounts, ...rest } = from
  const payto_uris = accounts.filter(a => a.active).map(a => a.payto_uri)
  const defaults = {
    default_wire_fee_amortization: 1,
    default_pay_delay: { d_us: 1000 * 60 * 60 }, //one hour
    default_wire_transfer_delay: { d_us: 1000 * 60 * 60 * 2 }, //two hours
  }
  return { ...defaults, ...rest, payto_uris };
}

export function DetailPage({ selected }: Props): VNode {
  const [value, valueHandler] = useState<Partial<Entity>>(convert(selected))

  const i18n = useTranslator()
  
  return <div>
    <section class="hero is-hero-bar">
      <div class="hero-body">
        <div class="level">
          <div class="level-left">
            <div class="level-item">
              <h1 class="title">
                Here goes the instance description
              </h1>
            </div>
          </div>
          <div class="level-right" style="display: none;">
            <div class="level-item" />
          </div>
        </div>
      </div>
    </section>

    <section class="section is-main-section">
      <div class="columns">
        <div class="column" />
        <div class="column is-6">
          <FormProvider<Entity> object={value} valueHandler={valueHandler} >

            <Input<Entity> name="name" readonly label={i18n`Name`} />
            <Input<Entity> name="payto_uris" readonly label={i18n`Account address`} />

          </FormProvider>
        </div>
        <div class="column" />
      </div>
    </section>

  </div>

}