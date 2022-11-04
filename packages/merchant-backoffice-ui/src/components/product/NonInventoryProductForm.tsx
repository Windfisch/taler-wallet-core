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
import { Fragment, h, VNode } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import * as yup from 'yup';
import { FormErrors, FormProvider } from "../form/FormProvider.js";
import { Input } from "../form/Input.js";
import { InputCurrency } from "../form/InputCurrency.js";
import { InputImage } from "../form/InputImage.js";
import { InputNumber } from "../form/InputNumber.js";
import { InputTaxes } from "../form/InputTaxes.js";
import { MerchantBackend } from "../../declaration.js";
import { useListener } from "../../hooks/listener.js";
import { Translate, useTranslator } from "../../i18n";
import {
  NonInventoryProductSchema as schema
} from "../../schemas.js";


type Entity = MerchantBackend.Product

interface Props {
  onAddProduct: (p: Entity) => Promise<void>;
  productToEdit?: Entity;
}
export function NonInventoryProductFrom({ productToEdit, onAddProduct }: Props): VNode {
  const [showCreateProduct, setShowCreateProduct] = useState(false)

  const isEditing = !!productToEdit

  useEffect(() => {
    setShowCreateProduct(isEditing)
  }, [isEditing])

  const [submitForm, addFormSubmitter] = useListener<Partial<MerchantBackend.Product> | undefined>((result) => {
    if (result) {
      setShowCreateProduct(false)
      return onAddProduct({
        quantity: result.quantity || 0,
        taxes: result.taxes || [],
        description: result.description || '',
        image: result.image || '',
        price: result.price || '',
        unit: result.unit || ''
      })
    }
    return Promise.resolve()
  })

  const i18n = useTranslator()

  return <Fragment>
    <div class="buttons">
      <button class="button is-success" data-tooltip={i18n`describe and add a product that is not in the inventory list`} onClick={() => setShowCreateProduct(true)} ><Translate>Add custom product</Translate></button>
    </div>
    {showCreateProduct && <div class="modal is-active">
      <div class="modal-background " onClick={() => setShowCreateProduct(false)} />
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">{i18n`Complete information of the product`}</p>
          <button class="delete " aria-label="close" onClick={() => setShowCreateProduct(false)} />
        </header>
        <section class="modal-card-body">
          <ProductForm initial={productToEdit} onSubscribe={addFormSubmitter} />
        </section>
        <footer class="modal-card-foot">
          <div class="buttons is-right" style={{ width: '100%' }}>
            <button class="button " onClick={() => setShowCreateProduct(false)} ><Translate>Cancel</Translate></button>
            <button class="button is-info " disabled={!submitForm} onClick={submitForm} ><Translate>Confirm</Translate></button>
          </div>
        </footer>
      </div>
      <button class="modal-close is-large " aria-label="close" onClick={() => setShowCreateProduct(false)} />
    </div>}
  </Fragment>
}

interface ProductProps {
  onSubscribe: (c?: () => Entity | undefined) => void;
  initial?: Partial<Entity>;
}

interface NonInventoryProduct {
  quantity: number;
  description: string;
  unit: string;
  price: string;
  image: string;
  taxes: MerchantBackend.Tax[];
}

export function ProductForm({ onSubscribe, initial }: ProductProps): VNode {
  const [value, valueHandler] = useState<Partial<NonInventoryProduct>>({
    taxes: [],
    ...initial,
  })
  let errors: FormErrors<Entity> = {}
  try {
    schema.validateSync(value, { abortEarly: false })
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const yupErrors = err.inner as yup.ValidationError[]
      errors = yupErrors.reduce((prev, cur) => !cur.path ? prev : ({ ...prev, [cur.path]: cur.message }), {})
    }
  }

  const submit = useCallback((): Entity | undefined => {
    return value as MerchantBackend.Product
  }, [value])

  const hasErrors = Object.keys(errors).some(k => (errors as any)[k] !== undefined)

  useEffect(() => {
    onSubscribe(hasErrors ? undefined : submit)
  }, [submit, hasErrors])

  const i18n = useTranslator()

  return <div>
    <FormProvider<NonInventoryProduct> name="product" errors={errors} object={value} valueHandler={valueHandler} >

      <InputImage<NonInventoryProduct> name="image" label={i18n`Image`} tooltip={i18n`photo of the product`} />
      <Input<NonInventoryProduct> name="description" inputType="multiline" label={i18n`Description`} tooltip={i18n`full product description`} />
      <Input<NonInventoryProduct> name="unit" label={i18n`Unit`} tooltip={i18n`name of the product unit`} />
      <InputCurrency<NonInventoryProduct> name="price" label={i18n`Price`} tooltip={i18n`amount in the current currency`} />

      <InputNumber<NonInventoryProduct> name="quantity" label={i18n`Quantity`} tooltip={i18n`how many products will be added`} />

      <InputTaxes<NonInventoryProduct> name="taxes" label={i18n`Taxes`} />

    </FormProvider>
  </div>
}
