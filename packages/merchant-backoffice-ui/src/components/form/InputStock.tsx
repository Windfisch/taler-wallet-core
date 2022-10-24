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
import { Fragment, h } from "preact";
import { MerchantBackend, Timestamp } from "../../declaration";
import { InputProps, useField } from "./useField";
import { FormProvider, FormErrors } from "./FormProvider";
import { useLayoutEffect, useState } from "preact/hooks";
import { Input } from "./Input";
import { InputGroup } from "./InputGroup";
import { InputNumber } from "./InputNumber";
import { InputDate } from "./InputDate";
import { Translate, useTranslator } from "../../i18n";
import { InputLocation } from "./InputLocation";

export interface Props<T> extends InputProps<T> {
  alreadyExist?: boolean;
}


type Entity = Stock

export interface Stock {
  current: number;
  lost: number;
  sold: number;
  address?: MerchantBackend.Location;
  nextRestock?: Timestamp;
}

interface StockDelta {
  incoming: number;
  lost: number;
}


export function InputStock<T>({ name, tooltip, label, alreadyExist }: Props<keyof T>) {
  const { error, value, onChange } = useField<T>(name);

  const [errors, setErrors] = useState<FormErrors<Entity>>({})

  const [formValue, valueHandler] = useState<Partial<Entity>>(value)
  const [addedStock, setAddedStock] = useState<StockDelta>({ incoming: 0, lost: 0 })
  const i18n = useTranslator()


  useLayoutEffect(() => {
    if (!formValue) {
      onChange(undefined as any)
    } else {
      onChange({
        ...formValue,
        current: (formValue?.current || 0) + addedStock.incoming,
        lost: (formValue?.lost || 0) + addedStock.lost
      } as any)
    }
  }, [formValue, addedStock])

  if (!formValue) {
    return <Fragment>
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label">
            {label}
            {tooltip && <span class="icon has-tooltip-right" data-tooltip={tooltip}>
              <i class="mdi mdi-information" />
            </span>}
          </label>
        </div>
        <div class="field-body is-flex-grow-3">
          <div class="field has-addons">
            {!alreadyExist ?
              <button class="button" 
                data-tooltip={i18n`click here to configure the stock of the product, leave it as is and the backend will not control stock`}
                onClick={(): void => { valueHandler({ current: 0, lost: 0, sold: 0 } as Stock as any); }} >
                <span><Translate>Manage stock</Translate></span>
              </button> : <button class="button" 
                data-tooltip={i18n`this product has been configured without stock control`}
                disabled >
                <span><Translate>Infinite</Translate></span>
              </button>
            }
          </div>
        </div>
      </div>
    </Fragment >
  }

  const currentStock = (formValue.current || 0) - (formValue.lost || 0) - (formValue.sold || 0)

  const stockAddedErrors: FormErrors<typeof addedStock> = {
    lost: currentStock + addedStock.incoming < addedStock.lost ?
      i18n`lost cannot be greater than current and incoming (max ${currentStock + addedStock.incoming})`
      : undefined
  }

  // const stockUpdateDescription = stockAddedErrors.lost ? '' : (
  //   !!addedStock.incoming || !!addedStock.lost ?
  //     i18n`current stock will change from ${currentStock} to ${currentStock + addedStock.incoming - addedStock.lost}` :
  //     i18n`current stock will stay at ${currentStock}`
  // )

  return <Fragment>
    <div class="card">
      <header class="card-header">
        <p class="card-header-title">
          {label}
          {tooltip && <span class="icon" data-tooltip={tooltip}>
            <i class="mdi mdi-information" />
          </span>}
        </p>
      </header>
      <div class="card-content">
        <FormProvider<Entity> name="stock" errors={errors} object={formValue} valueHandler={valueHandler}>
          {alreadyExist ? <Fragment>

            <FormProvider name="added" errors={stockAddedErrors} object={addedStock} valueHandler={setAddedStock as any}>
              <InputNumber name="incoming" label={i18n`Incoming`} />
              <InputNumber name="lost" label={i18n`Lost`} />
            </FormProvider>

            {/* <div class="field is-horizontal">
              <div class="field-label is-normal" />
              <div class="field-body is-flex-grow-3">
                <div class="field">
                  {stockUpdateDescription}
                </div>
              </div>
            </div> */}

          </Fragment> : <InputNumber<Entity> name="current"
            label={i18n`Current`}
            side={
              <button class="button is-danger" 
                data-tooltip={i18n`remove stock control for this product`}
                onClick={(): void => { valueHandler(undefined as any) }} >
                <span><Translate>without stock</Translate></span>
              </button>
            }
          />}

          <InputDate<Entity> name="nextRestock" label={i18n`Next restock`} withTimestampSupport />

          <InputGroup<Entity> name="address" label={i18n`Delivery address`}>
            <InputLocation name="address" />
          </InputGroup>
        </FormProvider>
      </div>
    </div>
  </Fragment>
}
  // (


