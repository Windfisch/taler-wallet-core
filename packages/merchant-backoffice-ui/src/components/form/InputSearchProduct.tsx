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
import emptyImage from "../../assets/empty.png";
import { MerchantBackend, WithId } from "../../declaration.js";
import { Translate, useTranslator } from "../../i18n/index.js";
import { FormErrors, FormProvider } from "./FormProvider.js";
import { InputWithAddon } from "./InputWithAddon.js";

type Entity = MerchantBackend.Products.ProductDetail & WithId

export interface Props {
  selected?: Entity;
  onChange: (p?: Entity) => void;
  products: (MerchantBackend.Products.ProductDetail & WithId)[],
}

interface ProductSearch {
  name: string;
}

export function InputSearchProduct({ selected, onChange, products }: Props): VNode {
  const [prodForm, setProdName] = useState<Partial<ProductSearch>>({ name: '' })

  const errors: FormErrors<ProductSearch> = {
    name: undefined
  }
  const i18n = useTranslator()


  if (selected) {
    return <article class="media">
      <figure class="media-left">
        <p class="image is-128x128">
          <img src={selected.image ? selected.image : emptyImage} />
        </p>
      </figure>
      <div class="media-content">
        <div class="content">
          <p class="media-meta"><Translate>Product id</Translate>: <b>{selected.id}</b></p>
          <p><Translate>Description</Translate>: {selected.description}</p>
          <div class="buttons is-right mt-5">
            <button class="button is-info" onClick={() => onChange(undefined)}>clear</button>
          </div>
        </div>
      </div>
    </article>
  }

  return <FormProvider<ProductSearch> errors={errors} object={prodForm} valueHandler={setProdName} >

    <InputWithAddon<ProductSearch>
      name="name"
      label={i18n`Product`}
      tooltip={i18n`search products by it's description or id`}
      addonAfter={<span class="icon" ><i class="mdi mdi-magnify" /></span>}
    >
      <div>
        <ProductList
          name={prodForm.name}
          list={products}
          onSelect={(p) => {
            setProdName({ name: '' })
            onChange(p)
          }}
        />
      </div>
    </InputWithAddon>

  </FormProvider>

}

interface ProductListProps {
  name?: string;
  onSelect: (p: MerchantBackend.Products.ProductDetail & WithId) => void;
  list: (MerchantBackend.Products.ProductDetail & WithId)[]
}

function ProductList({ name, onSelect, list }: ProductListProps) {
  if (!name) {
    /* FIXME
      this BR is added to occupy the space that will be added when the 
      dropdown appears
    */
    return <div ><br /></div>
  }
  const filtered = list.filter(p => p.id.includes(name) || p.description.includes(name))

  return <div class="dropdown is-active">
    <div class="dropdown-menu" id="dropdown-menu" role="menu" style={{ minWidth: '20rem' }}>
      <div class="dropdown-content">
        {!filtered.length ?
          <div class="dropdown-item" >
            <Translate>no products found with that description</Translate>
          </div> :
          filtered.map(p => (
            <div key={p.id} class="dropdown-item" onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
              <article class="media">
                <div class="media-left">
                  <div class="image" style={{ minWidth: 64 }}><img src={p.image ? p.image : emptyImage} style={{ width: 64, height: 64 }} /></div>
                </div>
                <div class="media-content">
                  <div class="content">
                    <p>
                      <strong>{p.id}</strong> <small>{p.price}</small>
                      <br />
                      {p.description}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          ))
        }
      </div>
    </div>
  </div>
}
