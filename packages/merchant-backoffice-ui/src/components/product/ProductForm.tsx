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

import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import * as yup from "yup";
import { useBackendContext } from "../../context/backend.js";
import { MerchantBackend } from "../../declaration.js";
import { useTranslator } from "../../i18n/index.js";
import {
  ProductCreateSchema as createSchema,
  ProductUpdateSchema as updateSchema,
} from "../../schemas/index.js";
import { FormProvider, FormErrors } from "../form/FormProvider.js";
import { Input } from "../form/Input.js";
import { InputCurrency } from "../form/InputCurrency.js";
import { InputImage } from "../form/InputImage.js";
import { InputNumber } from "../form/InputNumber.js";
import { InputStock, Stock } from "../form/InputStock.js";
import { InputTaxes } from "../form/InputTaxes.js";
import { InputWithAddon } from "../form/InputWithAddon.js";

type Entity = MerchantBackend.Products.ProductDetail & { product_id: string };

interface Props {
  onSubscribe: (c?: () => Entity | undefined) => void;
  initial?: Partial<Entity>;
  alreadyExist?: boolean;
}

export function ProductForm({ onSubscribe, initial, alreadyExist }: Props) {
  const [value, valueHandler] = useState<Partial<Entity & { stock: Stock }>>({
    address: {},
    description_i18n: {},
    taxes: [],
    next_restock: { t_s: "never" },
    price: ":0",
    ...initial,
    stock:
      !initial || initial.total_stock === -1
        ? undefined
        : {
            current: initial.total_stock || 0,
            lost: initial.total_lost || 0,
            sold: initial.total_sold || 0,
            address: initial.address,
            nextRestock: initial.next_restock,
          },
  });
  let errors: FormErrors<Entity> = {};

  try {
    (alreadyExist ? updateSchema : createSchema).validateSync(value, {
      abortEarly: false,
    });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const yupErrors = err.inner as yup.ValidationError[];
      errors = yupErrors.reduce(
        (prev, cur) =>
          !cur.path ? prev : { ...prev, [cur.path]: cur.message },
        {}
      );
    }
  }
  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined
  );

  const submit = useCallback((): Entity | undefined => {
    const stock: Stock = (value as any).stock;

    if (!stock) {
      value.total_stock = -1;
    } else {
      value.total_stock = stock.current;
      value.total_lost = stock.lost;
      value.next_restock =
        stock.nextRestock instanceof Date
          ? { t_s: stock.nextRestock.getTime() / 1000 }
          : stock.nextRestock;
      value.address = stock.address;
    }
    delete (value as any).stock;

    if (typeof value.minimum_age !== "undefined" && value.minimum_age < 1) {
      delete value.minimum_age;
    }

    return value as MerchantBackend.Products.ProductDetail & {
      product_id: string;
    };
  }, [value]);

  useEffect(() => {
    onSubscribe(hasErrors ? undefined : submit);
  }, [submit, hasErrors]);

  const backend = useBackendContext();
  const i18n = useTranslator();

  return (
    <div>
      <FormProvider<Entity>
        name="product"
        errors={errors}
        object={value}
        valueHandler={valueHandler}
      >
        {alreadyExist ? undefined : (
          <InputWithAddon<Entity>
            name="product_id"
            addonBefore={`${backend.url}/product/`}
            label={i18n`ID`}
            tooltip={i18n`product identification to use in URLs (for internal use only)`}
          />
        )}
        <InputImage<Entity>
          name="image"
          label={i18n`Image`}
          tooltip={i18n`illustration of the product for customers`}
        />
        <Input<Entity>
          name="description"
          inputType="multiline"
          label={i18n`Description`}
          tooltip={i18n`product description for customers`}
        />
        <InputNumber<Entity>
          name="minimum_age"
          label={i18n`Age restricted`}
          tooltip={i18n`is this product restricted for customer below certain age?`}
        />
        <Input<Entity>
          name="unit"
          label={i18n`Unit`}
          tooltip={i18n`unit describing quantity of product sold (e.g. 2 kilograms, 5 liters, 3 items, 5 meters) for customers`}
        />
        <InputCurrency<Entity>
          name="price"
          label={i18n`Price`}
          tooltip={i18n`sale price for customers, including taxes, for above units of the product`}
        />
        <InputStock
          name="stock"
          label={i18n`Stock`}
          alreadyExist={alreadyExist}
          tooltip={i18n`product inventory for products with finite supply (for internal use only)`}
        />
        <InputTaxes<Entity>
          name="taxes"
          label={i18n`Taxes`}
          tooltip={i18n`taxes included in the product price, exposed to customers`}
        />
      </FormProvider>
    </div>
  );
}
