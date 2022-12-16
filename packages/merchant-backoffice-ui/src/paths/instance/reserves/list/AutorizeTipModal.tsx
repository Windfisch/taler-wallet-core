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
import { FormErrors, FormProvider } from "../../../../components/form/FormProvider.js";
import { Input } from "../../../../components/form/Input.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { ConfirmModal, ContinueModal } from "../../../../components/modal/index.js";
import { MerchantBackend } from "../../../../declaration.js";
import { useTranslator } from "../../../../i18n/index.js";
import { AuthorizeTipSchema } from "../../../../schemas/index.js";
import { CreatedSuccessfully } from "./CreatedSuccessfully.js";
import * as yup from 'yup';

interface AuthorizeTipModalProps {
  onCancel: () => void;
  onConfirm: (value: MerchantBackend.Tips.TipCreateRequest) => void;
  tipAuthorized?: {
    response: MerchantBackend.Tips.TipCreateConfirmation;
    request: MerchantBackend.Tips.TipCreateRequest;
  };
}

export function AuthorizeTipModal({ onCancel, onConfirm, tipAuthorized }: AuthorizeTipModalProps): VNode {
  // const result = useOrderDetails(id)
  type State = MerchantBackend.Tips.TipCreateRequest
  const [form, setValue] = useState<Partial<State>>({})
  const i18n = useTranslator();

  // const [errors, setErrors] = useState<FormErrors<State>>({})
  let errors: FormErrors<State> = {}
  try {
    AuthorizeTipSchema.validateSync(form, { abortEarly: false })
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const yupErrors = err.inner as any[]
      errors = yupErrors.reduce((prev, cur) => !cur.path ? prev : ({ ...prev, [cur.path]: cur.message }), {})
    }
  }
  const hasErrors = Object.keys(errors).some(k => (errors as any)[k] !== undefined)

  const validateAndConfirm = () => {
    onConfirm(form as State)
  }
  if (tipAuthorized) {
    return <ContinueModal description="tip" active onConfirm={onCancel}>
      <CreatedSuccessfully
        entity={tipAuthorized.response}
        request={tipAuthorized.request}
        onConfirm={onCancel}
      />
    </ContinueModal>
  }

  return <ConfirmModal description="tip" active onCancel={onCancel} disabled={hasErrors} onConfirm={validateAndConfirm}>

    <FormProvider<State> errors={errors} object={form} valueHandler={setValue} >
      <InputCurrency<State> name="amount" label={i18n`Amount`} tooltip={i18n`amount of tip`} />
      <Input<State> name="justification" label={i18n`Justification`} inputType="multiline" tooltip={i18n`reason for the tip`} />
      <Input<State> name="next_url" label={i18n`URL after tip`} tooltip={i18n`URL to visit after tip payment`} />
    </FormProvider>

  </ConfirmModal>
}


