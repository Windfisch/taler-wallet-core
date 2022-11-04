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
import { useState } from "preact/hooks";
import { FormProvider, FormErrors } from "../form/FormProvider.js";
import { InputNumber } from "../form/InputNumber.js";
import { InputSearchProduct } from "../form/InputSearchProduct.js";
import { MerchantBackend, WithId } from "../../declaration.js";
import { Translate, useTranslator } from "../../i18n/index.js";
import { ProductMap } from "../../paths/instance/orders/create/CreatePage.js";

type Form = {
  product: MerchantBackend.Products.ProductDetail & WithId,
  quantity: number;
}

interface Props {
  currentProducts: ProductMap,
  onAddProduct: (product: MerchantBackend.Products.ProductDetail & WithId, quantity: number) => void,
  inventory: (MerchantBackend.Products.ProductDetail & WithId)[],
}

export function InventoryProductForm({ currentProducts, onAddProduct, inventory }: Props): VNode {
  const initialState = { quantity: 1 }
  const [state, setState] = useState<Partial<Form>>(initialState)
  const [errors, setErrors] = useState<FormErrors<Form>>({})

  const i18n = useTranslator()

  const productWithInfiniteStock = state.product && state.product.total_stock === -1

  const submit = (): void => {
    if (!state.product) {
      setErrors({ product: i18n`You must enter a valid product identifier.` });
      return;
    }
    if (productWithInfiniteStock) {
      onAddProduct(state.product, 1)
    } else {
      if (!state.quantity || state.quantity <= 0) {
        setErrors({ quantity: i18n`Quantity must be greater than 0!` });
        return;
      }
      const currentStock = state.product.total_stock - state.product.total_lost - state.product.total_sold
      const p = currentProducts[state.product.id]
      if (p) {
        if (state.quantity + p.quantity > currentStock) {
          const left = currentStock - p.quantity;
          setErrors({ quantity: i18n`This quantity exceeds remaining stock. Currently, only ${left} units remain unreserved in stock.` });
          return;
        }
        onAddProduct(state.product, state.quantity + p.quantity)
      } else {
        if (state.quantity > currentStock) {
          const left = currentStock;
          setErrors({ quantity: i18n`This quantity exceeds remaining stock. Currently, only ${left} units remain unreserved in stock.` });
          return;
        }
        onAddProduct(state.product, state.quantity)
      }
    }

    setState(initialState)
  }

  return <FormProvider<Form> errors={errors} object={state} valueHandler={setState}>
    <InputSearchProduct selected={state.product} onChange={(p) => setState(v => ({ ...v, product: p }))} products={inventory} />
    { state.product && <div class="columns mt-5">
      <div class="column is-two-thirds">
        {!productWithInfiniteStock &&
          <InputNumber<Form> name="quantity" label={i18n`Quantity`} tooltip={i18n`how many products will be added`} />
        }
      </div>
      <div class="column">
        <div class="buttons is-right">
          <button class="button is-success" onClick={submit}><Translate>Add from inventory</Translate></button>
        </div>
      </div>
    </div> }

  </FormProvider>
}
