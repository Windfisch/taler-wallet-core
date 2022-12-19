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

import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AsyncButton } from "../../../../components/exception/AsyncButton.js";
import {
  FormErrors,
  FormProvider,
} from "../../../../components/form/FormProvider.js";
import { Input } from "../../../../components/form/Input.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { InputSelector } from "../../../../components/form/InputSelector.js";
import { useConfigContext } from "../../../../context/config.js";
import { MerchantBackend } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";
import {
  CROCKFORD_BASE32_REGEX,
  URL_REGEX,
} from "../../../../utils/constants.js";

type Entity = MerchantBackend.Transfers.TransferInformation;

interface Props {
  onCreate: (d: Entity) => Promise<void>;
  onBack?: () => void;
  accounts: string[];
}

export function CreatePage({ accounts, onCreate, onBack }: Props): VNode {
  const i18n = useTranslator();
  const { currency } = useConfigContext();

  const [state, setState] = useState<Partial<Entity>>({
    wtid: "",
    // payto_uri: ,
    // exchange_url: 'http://exchange.taler:8081/',
    credit_amount: ``,
  });

  const errors: FormErrors<Entity> = {
    wtid: !state.wtid
      ? i18n`cannot be empty`
      : !CROCKFORD_BASE32_REGEX.test(state.wtid)
      ? i18n`check the id, does not look valid`
      : state.wtid.length !== 52
      ? i18n`should have 52 characters, current ${state.wtid.length}`
      : undefined,
    payto_uri: !state.payto_uri ? i18n`cannot be empty` : undefined,
    credit_amount: !state.credit_amount ? i18n`cannot be empty` : undefined,
    exchange_url: !state.exchange_url
      ? i18n`cannot be empty`
      : !URL_REGEX.test(state.exchange_url)
      ? i18n`URL doesn't have the right format`
      : undefined,
  };

  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined,
  );

  const submitForm = () => {
    if (hasErrors) return Promise.reject();
    return onCreate(state as any);
  };

  return (
    <div>
      <section class="section is-main-section">
        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths">
            <FormProvider
              object={state}
              valueHandler={setState}
              errors={errors}
            >
              <InputSelector
                name="payto_uri"
                label={i18n`Credited bank account`}
                values={accounts}
                placeholder={i18n`Select one account`}
                tooltip={i18n`Bank account of the merchant where the payment was received`}
              />
              <Input<Entity>
                name="wtid"
                label={i18n`Wire transfer ID`}
                help=""
                tooltip={i18n`unique identifier of the wire transfer used by the exchange, must be 52 characters long`}
              />
              <Input<Entity>
                name="exchange_url"
                label={i18n`Exchange URL`}
                tooltip={i18n`Base URL of the exchange that made the transfer, should have been in the wire transfer subject`}
                help="http://exchange.taler:8081/"
              />
              <InputCurrency<Entity>
                name="credit_amount"
                label={i18n`Amount credited`}
                tooltip={i18n`Actual amount that was wired to the merchant's bank account`}
              />
            </FormProvider>

            <div class="buttons is-right mt-5">
              {onBack && (
                <button class="button" onClick={onBack}>
                  <Translate>Cancel</Translate>
                </button>
              )}
              <AsyncButton
                disabled={hasErrors}
                data-tooltip={
                  hasErrors
                    ? i18n`Need to complete marked fields`
                    : "confirm operation"
                }
                onClick={submitForm}
              >
                <Translate>Confirm</Translate>
              </AsyncButton>
            </div>
          </div>
          <div class="column" />
        </div>
      </section>
    </div>
  );
}
