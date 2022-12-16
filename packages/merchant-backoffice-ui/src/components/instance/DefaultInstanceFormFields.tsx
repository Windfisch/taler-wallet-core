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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { Fragment, h, VNode } from "preact";
import { useBackendContext } from "../../context/backend.js";
import { useTranslator } from "../../i18n/index.js";
import { Entity } from "../../paths/admin/create/CreatePage.js";
import { Input } from "../form/Input.js";
import { InputCurrency } from "../form/InputCurrency.js";
import { InputDuration } from "../form/InputDuration.js";
import { InputGroup } from "../form/InputGroup.js";
import { InputImage } from "../form/InputImage.js";
import { InputLocation } from "../form/InputLocation.js";
import { InputPaytoForm } from "../form/InputPaytoForm.js";
import { InputWithAddon } from "../form/InputWithAddon.js";

export function DefaultInstanceFormFields({
  readonlyId,
  showId,
}: {
  readonlyId?: boolean;
  showId: boolean;
}): VNode {
  const i18n = useTranslator();
  const backend = useBackendContext();
  return (
    <Fragment>
      {showId && (
        <InputWithAddon<Entity>
          name="id"
          addonBefore={`${backend.url}/instances/`}
          readonly={readonlyId}
          label={i18n`Identifier`}
          tooltip={i18n`Name of the instance in URLs. The 'default' instance is special in that it is used to administer other instances.`}
        />
      )}

      <Input<Entity>
        name="name"
        label={i18n`Business name`}
        tooltip={i18n`Legal name of the business represented by this instance.`}
      />

      <Input<Entity>
        name="email"
        label={i18n`Email`}
        tooltip={i18n`Contact email`}
      />

      <Input<Entity>
        name="website"
        label={i18n`Website URL`}
        tooltip={i18n`URL.`}
      />

      <InputImage<Entity>
        name="logo"
        label={i18n`Logo`}
        tooltip={i18n`Logo image.`}
      />

      <InputPaytoForm<Entity>
        name="payto_uris"
        label={i18n`Bank account`}
        tooltip={i18n`URI specifying bank account for crediting revenue.`}
      />

      <InputCurrency<Entity>
        name="default_max_deposit_fee"
        label={i18n`Default max deposit fee`}
        tooltip={i18n`Maximum deposit fees this merchant is willing to pay per order by default.`}
      />

      <InputCurrency<Entity>
        name="default_max_wire_fee"
        label={i18n`Default max wire fee`}
        tooltip={i18n`Maximum wire fees this merchant is willing to pay per wire transfer by default.`}
      />

      <Input<Entity>
        name="default_wire_fee_amortization"
        label={i18n`Default wire fee amortization`}
        tooltip={i18n`Number of orders excess wire transfer fees will be divided by to compute per order surcharge.`}
      />

      <InputGroup
        name="address"
        label={i18n`Address`}
        tooltip={i18n`Physical location of the merchant.`}
      >
        <InputLocation name="address" />
      </InputGroup>

      <InputGroup
        name="jurisdiction"
        label={i18n`Jurisdiction`}
        tooltip={i18n`Jurisdiction for legal disputes with the merchant.`}
      >
        <InputLocation name="jurisdiction" />
      </InputGroup>

      <InputDuration<Entity>
        name="default_pay_delay"
        label={i18n`Default payment delay`}
        withForever
        tooltip={i18n`Time customers have to pay an order before the offer expires by default.`}
      />

      <InputDuration<Entity>
        name="default_wire_transfer_delay"
        label={i18n`Default wire transfer delay`}
        tooltip={i18n`Maximum time an exchange is allowed to delay wiring funds to the merchant, enabling it to aggregate smaller payments into larger wire transfers and reducing wire fees.`}
        withForever
      />
    </Fragment>
  );
}
