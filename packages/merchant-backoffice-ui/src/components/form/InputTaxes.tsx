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
import { useCallback, useState } from "preact/hooks";
import * as yup from "yup";
import { MerchantBackend } from "../../declaration.js";
import { Translate, useTranslator } from "../../i18n/index.js";
import { TaxSchema as schema } from "../../schemas/index.js";
import { FormErrors, FormProvider } from "./FormProvider.js";
import { Input } from "./Input.js";
import { InputGroup } from "./InputGroup.js";
import { InputProps, useField } from "./useField.js";

export interface Props<T> extends InputProps<T> {
  isValid?: (e: any) => boolean;
}

type Entity = MerchantBackend.Tax;
export function InputTaxes<T>({
  name,
  readonly,
  label,
}: Props<keyof T>): VNode {
  const { value: taxes, onChange } = useField<T>(name);

  const [value, valueHandler] = useState<Partial<Entity>>({});
  // const [errors, setErrors] = useState<FormErrors<Entity>>({})

  let errors: FormErrors<Entity> = {};

  try {
    schema.validateSync(value, { abortEarly: false });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const yupErrors = err.inner as yup.ValidationError[];
      errors = yupErrors.reduce(
        (prev, cur) =>
          !cur.path ? prev : { ...prev, [cur.path]: cur.message },
        {},
      );
    }
  }
  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined,
  );

  const submit = useCallback((): void => {
    onChange([value as any, ...taxes] as any);
    valueHandler({});
  }, [value]);

  const i18n = useTranslator();

  //FIXME: translating plural singular
  return (
    <InputGroup
      name="tax"
      label={label}
      alternative={
        taxes.length > 0 && (
          <p>This product has {taxes.length} applicable taxes configured.</p>
        )
      }
    >
      <FormProvider<Entity>
        name="tax"
        errors={errors}
        object={value}
        valueHandler={valueHandler}
      >
        <div class="field is-horizontal">
          <div class="field-label is-normal" />
          <div class="field-body" style={{ display: "block" }}>
            {taxes.map((v: any, i: number) => (
              <div
                key={i}
                class="tags has-addons mt-3 mb-0 mr-3"
                style={{ flexWrap: "nowrap" }}
              >
                <span
                  class="tag is-medium is-info mb-0"
                  style={{ maxWidth: "90%" }}
                >
                  <b>{v.tax}</b>: {v.name}
                </span>
                <a
                  class="tag is-medium is-danger is-delete mb-0"
                  onClick={() => {
                    onChange(taxes.filter((f: any) => f !== v) as any);
                    valueHandler(v);
                  }}
                />
              </div>
            ))}
            {!taxes.length && i18n`No taxes configured for this product.`}
          </div>
        </div>

        <Input<Entity>
          name="tax"
          label={i18n`Amount`}
          tooltip={i18n`Taxes can be in currencies that differ from the main currency used by the merchant.`}
        >
          <Translate>
            Enter currency and value separated with a colon, e.g. "USD:2.3".
          </Translate>
        </Input>

        <Input<Entity>
          name="name"
          label={i18n`Description`}
          tooltip={i18n`Legal name of the tax, e.g. VAT or import duties.`}
        />

        <div class="buttons is-right mt-5">
          <button
            class="button is-info"
            data-tooltip={i18n`add tax to the tax list`}
            disabled={hasErrors}
            onClick={submit}
          >
            <Translate>Add</Translate>
          </button>
        </div>
      </FormProvider>
    </InputGroup>
  );
}
