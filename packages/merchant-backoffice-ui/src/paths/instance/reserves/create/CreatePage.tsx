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

import { Fragment, h, VNode } from "preact";
import { StateUpdater, useEffect, useState } from "preact/hooks";
import { FormErrors, FormProvider } from "../../../../components/form/FormProvider.js";
import { Input } from "../../../../components/form/Input.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { ExchangeBackend, MerchantBackend } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";
import { AsyncButton } from "../../../../components/exception/AsyncButton.js";
import { canonicalizeBaseUrl, ExchangeKeysJson } from "@gnu-taler/taler-util"
import { PAYTO_WIRE_METHOD_LOOKUP, URL_REGEX } from "../../../../utils/constants.js";
import { request } from "../../../../hooks/backend.js";
import { InputSelector } from "../../../../components/form/InputSelector.js";

type Entity = MerchantBackend.Tips.ReserveCreateRequest

interface Props {
  onCreate: (d: Entity) => Promise<void>;
  onBack?: () => void;
}


enum Steps {
  EXCHANGE,
  WIRE_METHOD,
}

interface ViewProps {
  step: Steps,
  setCurrentStep: (s: Steps) => void;
  reserve: Partial<Entity>;
  onBack?: () => void;
  submitForm: () => Promise<void>;
  setReserve: StateUpdater<Partial<Entity>>;
}
function ViewStep({ step, setCurrentStep, reserve, onBack, submitForm, setReserve }: ViewProps): VNode {
  const i18n = useTranslator()
  const [wireMethods, setWireMethods] = useState<Array<string>>([])
  const [exchangeQueryError, setExchangeQueryError] = useState<string | undefined>(undefined)

  useEffect(() => {
    setExchangeQueryError(undefined)
  }, [reserve.exchange_url])

  switch (step) {
    case Steps.EXCHANGE: {
      const errors: FormErrors<Entity> = {
        initial_balance: !reserve.initial_balance ? 'cannot be empty' : !(parseInt(reserve.initial_balance.split(':')[1], 10) > 0) ? i18n`it should be greater than 0` : undefined,
        exchange_url: !reserve.exchange_url ? i18n`cannot be empty` : !URL_REGEX.test(reserve.exchange_url) ? i18n`must be a valid URL` : !exchangeQueryError ? undefined : exchangeQueryError,
      }

      const hasErrors = Object.keys(errors).some(k => (errors as any)[k] !== undefined)

      return <Fragment>
        <FormProvider<Entity> object={reserve} errors={errors} valueHandler={setReserve}>
          <InputCurrency<Entity> name="initial_balance" label={i18n`Initial balance`} tooltip={i18n`balance prior to deposit`} />
          <Input<Entity> name="exchange_url" label={i18n`Exchange URL`} tooltip={i18n`URL of exchange`} />
        </FormProvider>

        <div class="buttons is-right mt-5">
          {onBack && <button class="button" onClick={onBack} ><Translate>Cancel</Translate></button>}
          <AsyncButton class="has-tooltip-left" onClick={() => {
            return request<ExchangeBackend.WireResponse>(`${reserve.exchange_url}wire`).then(r => {
              const wireMethods = r.data.accounts.map(a => {
                const match = PAYTO_WIRE_METHOD_LOOKUP.exec(a.payto_uri)
                return match && match[1] || ''
              })
              setWireMethods(wireMethods)
              setCurrentStep(Steps.WIRE_METHOD)
              return
            }).catch((r: any) => {
              setExchangeQueryError(r.message)
            })
          }} data-tooltip={
            hasErrors ? i18n`Need to complete marked fields` : 'confirm operation'
          } disabled={hasErrors} ><Translate>Next</Translate></AsyncButton>
        </div>
      </Fragment>
    }

    case Steps.WIRE_METHOD: {
      const errors: FormErrors<Entity> = {
        wire_method: !reserve.wire_method ? i18n`cannot be empty` : undefined,
      }

      const hasErrors = Object.keys(errors).some(k => (errors as any)[k] !== undefined)
      return <Fragment>
        <FormProvider<Entity> object={reserve} errors={errors} valueHandler={setReserve}>
          <InputCurrency<Entity> name="initial_balance" label={i18n`Initial balance`} tooltip={i18n`balance prior to deposit`} readonly />
          <Input<Entity> name="exchange_url" label={i18n`Exchange URL`} tooltip={i18n`URL of exchange`} readonly />
          <InputSelector<Entity> name="wire_method" label={i18n`Wire method`} tooltip={i18n`method to use for wire transfer`} values={wireMethods} placeholder={i18n`Select one wire method`} />
        </FormProvider>
        <div class="buttons is-right mt-5">
          {onBack && <button class="button" onClick={() => setCurrentStep(Steps.EXCHANGE)} ><Translate>Back</Translate></button>}
          <AsyncButton onClick={submitForm} data-tooltip={
              hasErrors ? i18n`Need to complete marked fields` : 'confirm operation'
            } disabled={hasErrors} ><Translate>Confirm</Translate></AsyncButton>
        </div>
      </Fragment>

    }
  }
}

export function CreatePage({ onCreate, onBack }: Props): VNode {
  const [reserve, setReserve] = useState<Partial<Entity>>({})


  const submitForm = () => {
    return onCreate(reserve as Entity)
  }

  const [currentStep, setCurrentStep] = useState(Steps.EXCHANGE)


  return <div>
    <section class="section is-main-section">
      <div class="columns">
        <div class="column" />
        <div class="column is-four-fifths">

          <div class="tabs is-toggle is-fullwidth is-small">
            <ul>
              <li class={currentStep === Steps.EXCHANGE ? "is-active" : ""}>
                <a style={{ cursor: 'initial' }}>
                  <span>Step 1: Specify exchange</span>
                </a>
              </li>
              <li class={currentStep === Steps.WIRE_METHOD ? "is-active" : ""}>
                <a style={{ cursor: 'initial' }}>
                  <span>Step 2: Select wire method</span>
                </a>
              </li>
            </ul>
          </div>

          <ViewStep step={currentStep} reserve={reserve}
            setCurrentStep={setCurrentStep}
            setReserve={setReserve}
            submitForm={submitForm}
            onBack={onBack}
          />
        </div>
        <div class="column" />
      </div>
    </section>
  </div>
}
