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

import { isAfter, isFuture } from 'date-fns';
import * as yup from 'yup';
import { AMOUNT_REGEX, PAYTO_REGEX } from "../utils/constants";

yup.setLocale({
  mixed: {
    default: 'field_invalid',
  },
  number: {
    min: ({ min }: any) => ({ key: 'field_too_short', values: { min } }),
    max: ({ max }: any) => ({ key: 'field_too_big', values: { max } }),
  },
});

function listOfPayToUrisAreValid(values?: (string | undefined)[]): boolean {
  return !!values && values.every(v => v && PAYTO_REGEX.test(v));
}

function currencyWithAmountIsValid(value?: string): boolean {
  return !!value && AMOUNT_REGEX.test(value)
}
function currencyGreaterThan0(value?: string) {
  if (value) {
    try {
      const [, amount] = value.split(':')
      const intAmount = parseInt(amount, 10)
      return intAmount > 0
    } catch {
      return false
    }
  }
  return true
}

export const InstanceSchema = yup.object().shape({
  id: yup.string().required().meta({ type: 'url' }),
  name: yup.string().required(),
  auth: yup.object().shape({
    method: yup.string().matches(/^(external|token)$/),
    token: yup.string().optional().nullable(),
  }),
  payto_uris: yup.array().of(yup.string())
    .min(1)
    .meta({ type: 'array' })
    .test('payto', '{path} is not valid', listOfPayToUrisAreValid),
  default_max_deposit_fee: yup.string()
    .required()
    .test('amount', 'the amount is not valid', currencyWithAmountIsValid)
    .meta({ type: 'amount' }),
  default_max_wire_fee: yup.string()
    .required()
    .test('amount', '{path} is not valid', currencyWithAmountIsValid)
    .meta({ type: 'amount' }),
  default_wire_fee_amortization: yup.number()
    .required(),
  address: yup.object().shape({
    country: yup.string().optional(),
    address_lines: yup.array().of(yup.string()).max(7).optional(),
    building_number: yup.string().optional(),
    building_name: yup.string().optional(),
    street: yup.string().optional(),
    post_code: yup.string().optional(),
    town_location: yup.string().optional(),
    town: yup.string(),
    district: yup.string().optional(),
    country_subdivision: yup.string().optional(),
  }).meta({ type: 'group' }),
  jurisdiction: yup.object().shape({
    country: yup.string().optional(),
    address_lines: yup.array().of(yup.string()).max(7).optional(),
    building_number: yup.string().optional(),
    building_name: yup.string().optional(),
    street: yup.string().optional(),
    post_code: yup.string().optional(),
    town_location: yup.string().optional(),
    town: yup.string(),
    district: yup.string().optional(),
    country_subdivision: yup.string().optional(),
  }).meta({ type: 'group' }),
  // default_pay_delay: yup.object()
  //   .shape({ d_us: yup.number() })
  //   .required()
  //   .meta({ type: 'duration' }),
  // .transform(numberToDuration),
  default_wire_transfer_delay: yup.object()
    .shape({ d_us: yup.number() })
    .required()
    .meta({ type: 'duration' }),
  // .transform(numberToDuration),
})

export const InstanceUpdateSchema = InstanceSchema.clone().omit(['id']);
export const InstanceCreateSchema = InstanceSchema.clone();

export const AuthorizeTipSchema = yup.object().shape({
  justification: yup.string().required(),
  amount: yup.string()
    .required()
    .test('amount', 'the amount is not valid', currencyWithAmountIsValid)
    .test('amount_positive', 'the amount is not valid', currencyGreaterThan0),
  next_url: yup.string().required(),
})

const stringIsValidJSON = (value?: string) => {
  const p = value?.trim()
  if (!p) return true;
  try {
    JSON.parse(p)
    return true
  } catch {
    return false
  }
}

export const OrderCreateSchema = yup.object().shape({
  pricing: yup.object().required().shape({
    summary: yup.string().ensure().required(),
    order_price: yup.string()
      .ensure()
      .required()
      .test('amount', 'the amount is not valid', currencyWithAmountIsValid)
      .test('amount_positive', 'the amount should be greater than 0', currencyGreaterThan0),
  }),
  extra: yup.string().test('extra', 'is not a JSON format', stringIsValidJSON),
  payments: yup.object().required().shape({
    refund_deadline: yup.date()
      .test('future', 'should be in the future', (d) => d ? isFuture(d) : true),
    pay_deadline: yup.date()
      .test('future', 'should be in the future', (d) => d ? isFuture(d) : true),
    auto_refund_deadline: yup.date()
      .test('future', 'should be in the future', (d) => d ? isFuture(d) : true),
    delivery_date: yup.date()
      .test('future', 'should be in the future', (d) => d ? isFuture(d) : true),
  }).test('payment', 'dates', (d) => {
    if (d.pay_deadline && d.refund_deadline && isAfter(d.refund_deadline, d.pay_deadline)) {
      return new yup.ValidationError('pay deadline should be greater than refund', 'asd', 'payments.pay_deadline')
    }
    return true
  })
})

export const ProductCreateSchema = yup.object().shape({
  product_id: yup.string().ensure().required(),
  description: yup.string().required(),
  unit: yup.string().ensure().required(),
  price: yup.string()
    .required()
    .test('amount', 'the amount is not valid', currencyWithAmountIsValid),
  stock: yup.object({

  }).optional(),
  minimum_age: yup.number().optional().min(0),
})

export const ProductUpdateSchema = yup.object().shape({
  description: yup.string().required(),
  price: yup.string()
    .required()
    .test('amount', 'the amount is not valid', currencyWithAmountIsValid),
  stock: yup.object({

  }).optional(),
  minimum_age: yup.number().optional().min(0),
})


export const TaxSchema = yup.object().shape({
  name: yup.string().required().ensure(),
  tax: yup.string()
    .required()
    .test('amount', 'the amount is not valid', currencyWithAmountIsValid),
})

export const NonInventoryProductSchema = yup.object().shape({
  quantity: yup.number().required().positive(),
  description: yup.string().required(),
  unit: yup.string().ensure().required(),
  price: yup.string()
    .required()
    .test('amount', 'the amount is not valid', currencyWithAmountIsValid),
})
