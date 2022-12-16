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

import { add, isAfter, isBefore, isFuture } from "date-fns";
import { Amounts } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  FormProvider,
  FormErrors,
} from "../../../../components/form/FormProvider.js";
import { Input } from "../../../../components/form/Input.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { InputDate } from "../../../../components/form/InputDate.js";
import { InputGroup } from "../../../../components/form/InputGroup.js";
import { InputLocation } from "../../../../components/form/InputLocation.js";
import { ProductList } from "../../../../components/product/ProductList.js";
import { useConfigContext } from "../../../../context/config.js";
import { Duration, MerchantBackend, WithId } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";
import { OrderCreateSchema as schema } from "../../../../schemas/index.js";
import { rate } from "../../../../utils/amount.js";
import { InventoryProductForm } from "../../../../components/product/InventoryProductForm.js";
import { NonInventoryProductFrom } from "../../../../components/product/NonInventoryProductForm.js";
import { InputNumber } from "../../../../components/form/InputNumber.js";
import { InputBoolean } from "../../../../components/form/InputBoolean.js";
import { undefinedIfEmpty } from "../../../../utils/table.js";

interface Props {
  onCreate: (d: MerchantBackend.Orders.PostOrderRequest) => void;
  onBack?: () => void;
  instanceConfig: InstanceConfig;
  instanceInventory: (MerchantBackend.Products.ProductDetail & WithId)[];
}
interface InstanceConfig {
  default_max_wire_fee: string;
  default_max_deposit_fee: string;
  default_wire_fee_amortization: number;
  default_pay_delay: Duration;
}

function with_defaults(config: InstanceConfig): Partial<Entity> {
  const defaultPayDeadline =
    !config.default_pay_delay || config.default_pay_delay.d_us === "forever"
      ? undefined
      : add(new Date(), { seconds: config.default_pay_delay.d_us / 1000 });

  return {
    inventoryProducts: {},
    products: [],
    pricing: {},
    payments: {
      max_wire_fee: config.default_max_wire_fee,
      max_fee: config.default_max_deposit_fee,
      wire_fee_amortization: config.default_wire_fee_amortization,
      pay_deadline: defaultPayDeadline,
      refund_deadline: defaultPayDeadline,
      createToken: true,
    },
    shipping: {},
    extra: "",
  };
}

interface ProductAndQuantity {
  product: MerchantBackend.Products.ProductDetail & WithId;
  quantity: number;
}
export interface ProductMap {
  [id: string]: ProductAndQuantity;
}

interface Pricing {
  products_price: string;
  order_price: string;
  summary: string;
}
interface Shipping {
  delivery_date?: Date;
  delivery_location?: MerchantBackend.Location;
  fullfilment_url?: string;
}
interface Payments {
  refund_deadline?: Date;
  pay_deadline?: Date;
  wire_transfer_deadline?: Date;
  auto_refund_deadline?: Date;
  max_fee?: string;
  max_wire_fee?: string;
  wire_fee_amortization?: number;
  createToken: boolean;
  minimum_age?: number;
}
interface Entity {
  inventoryProducts: ProductMap;
  products: MerchantBackend.Product[];
  pricing: Partial<Pricing>;
  payments: Partial<Payments>;
  shipping: Partial<Shipping>;
  extra: string;
}

const stringIsValidJSON = (value: string) => {
  try {
    JSON.parse(value.trim());
    return true;
  } catch {
    return false;
  }
};

export function CreatePage({
  onCreate,
  onBack,
  instanceConfig,
  instanceInventory,
}: Props): VNode {
  const [value, valueHandler] = useState(with_defaults(instanceConfig));
  const config = useConfigContext();
  const zero = Amounts.zeroOfCurrency(config.currency);

  const inventoryList = Object.values(value.inventoryProducts || {});
  const productList = Object.values(value.products || {});

  const i18n = useTranslator();

  const errors: FormErrors<Entity> = {
    pricing: undefinedIfEmpty({
      summary: !value.pricing?.summary ? i18n`required` : undefined,
      order_price: !value.pricing?.order_price
        ? i18n`required`
        : Amounts.isZero(value.pricing.order_price)
        ? i18n`must be greater than 0`
        : undefined,
    }),
    extra:
      value.extra && !stringIsValidJSON(value.extra)
        ? i18n`not a valid json`
        : undefined,
    payments: undefinedIfEmpty({
      refund_deadline: !value.payments?.refund_deadline
        ? undefined
        : !isFuture(value.payments.refund_deadline)
        ? i18n`should be in the future`
        : value.payments.pay_deadline &&
          isBefore(value.payments.refund_deadline, value.payments.pay_deadline)
        ? i18n`refund deadline cannot be before pay deadline`
        : value.payments.wire_transfer_deadline &&
          isBefore(
            value.payments.wire_transfer_deadline,
            value.payments.refund_deadline
          )
        ? i18n`wire transfer deadline cannot be before refund deadline`
        : undefined,
      pay_deadline: !value.payments?.pay_deadline
        ? undefined
        : !isFuture(value.payments.pay_deadline)
        ? i18n`should be in the future`
        : value.payments.wire_transfer_deadline &&
          isBefore(
            value.payments.wire_transfer_deadline,
            value.payments.pay_deadline
          )
        ? i18n`wire transfer deadline cannot be before pay deadline`
        : undefined,
      auto_refund_deadline: !value.payments?.auto_refund_deadline
        ? undefined
        : !isFuture(value.payments.auto_refund_deadline)
        ? i18n`should be in the future`
        : !value.payments?.refund_deadline
        ? i18n`should have a refund deadline`
        : !isAfter(
            value.payments.refund_deadline,
            value.payments.auto_refund_deadline
          )
        ? i18n`auto refund cannot be after refund deadline`
        : undefined,
    }),
    shipping: undefinedIfEmpty({
      delivery_date: !value.shipping?.delivery_date
        ? undefined
        : !isFuture(value.shipping.delivery_date)
        ? i18n`should be in the future`
        : undefined,
    }),
  };
  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined
  );

  const submit = (): void => {
    const order = schema.cast(value);
    if (!value.payments) return;
    if (!value.shipping) return;

    const request: MerchantBackend.Orders.PostOrderRequest = {
      order: {
        amount: order.pricing.order_price,
        summary: order.pricing.summary,
        products: productList,
        extra: value.extra,
        pay_deadline: value.payments.pay_deadline
          ? {
              t_s: Math.floor(value.payments.pay_deadline.getTime() / 1000),
            }
          : undefined,
        wire_transfer_deadline: value.payments.wire_transfer_deadline
          ? {
              t_s: Math.floor(
                value.payments.wire_transfer_deadline.getTime() / 1000
              ),
            }
          : undefined,
        refund_deadline: value.payments.refund_deadline
          ? {
              t_s: Math.floor(value.payments.refund_deadline.getTime() / 1000),
            }
          : undefined,
        auto_refund: value.payments.auto_refund_deadline
          ? {
              d_us: Math.floor(
                value.payments.auto_refund_deadline.getTime() * 1000
              ),
            }
          : undefined,
        wire_fee_amortization: value.payments.wire_fee_amortization as number,
        max_fee: value.payments.max_fee as string,
        max_wire_fee: value.payments.max_wire_fee as string,

        delivery_date: value.shipping.delivery_date
          ? { t_s: value.shipping.delivery_date.getTime() / 1000 }
          : undefined,
        delivery_location: value.shipping.delivery_location,
        fulfillment_url: value.shipping.fullfilment_url,
        minimum_age: value.payments.minimum_age,
      },
      inventory_products: inventoryList.map((p) => ({
        product_id: p.product.id,
        quantity: p.quantity,
      })),
      create_token: value.payments.createToken,
    };

    onCreate(request);
  };

  const addProductToTheInventoryList = (
    product: MerchantBackend.Products.ProductDetail & WithId,
    quantity: number
  ) => {
    valueHandler((v) => {
      const inventoryProducts = { ...v.inventoryProducts };
      inventoryProducts[product.id] = { product, quantity };
      return { ...v, inventoryProducts };
    });
  };

  const removeProductFromTheInventoryList = (id: string) => {
    valueHandler((v) => {
      const inventoryProducts = { ...v.inventoryProducts };
      delete inventoryProducts[id];
      return { ...v, inventoryProducts };
    });
  };

  const addNewProduct = async (product: MerchantBackend.Product) => {
    return valueHandler((v) => {
      const products = v.products ? [...v.products, product] : [];
      return { ...v, products };
    });
  };

  const removeFromNewProduct = (index: number) => {
    valueHandler((v) => {
      const products = v.products ? [...v.products] : [];
      products.splice(index, 1);
      return { ...v, products };
    });
  };

  const [editingProduct, setEditingProduct] = useState<
    MerchantBackend.Product | undefined
  >(undefined);

  const totalPriceInventory = inventoryList.reduce((prev, cur) => {
    const p = Amounts.parseOrThrow(cur.product.price);
    return Amounts.add(prev, Amounts.mult(p, cur.quantity).amount).amount;
  }, zero);

  const totalPriceProducts = productList.reduce((prev, cur) => {
    if (!cur.price) return zero;
    const p = Amounts.parseOrThrow(cur.price);
    return Amounts.add(prev, Amounts.mult(p, cur.quantity).amount).amount;
  }, zero);

  const hasProducts = inventoryList.length > 0 || productList.length > 0;
  const totalPrice = Amounts.add(totalPriceInventory, totalPriceProducts);

  const totalAsString = Amounts.stringify(totalPrice.amount);
  const allProducts = productList.concat(inventoryList.map(asProduct));

  useEffect(() => {
    valueHandler((v) => {
      return {
        ...v,
        pricing: {
          ...v.pricing,
          products_price: hasProducts ? totalAsString : undefined,
          order_price: hasProducts ? totalAsString : undefined,
        },
      };
    });
  }, [hasProducts, totalAsString]);

  const discountOrRise = rate(
    value.pricing?.order_price || `${config.currency}:0`,
    totalAsString
  );

  const minAgeByProducts = allProducts.reduce(
    (cur, prev) =>
      !prev.minimum_age || cur > prev.minimum_age ? cur : prev.minimum_age,
    0
  );
  return (
    <div>
      <section class="section is-main-section">
        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths">
            {/* // FIXME: translating plural singular */}
            <InputGroup
              name="inventory_products"
              label={i18n`Manage products in order`}
              alternative={
                allProducts.length > 0 && (
                  <p>
                    {allProducts.length} products with a total price of{" "}
                    {totalAsString}.
                  </p>
                )
              }
              tooltip={i18n`Manage list of products in the order.`}
            >
              <InventoryProductForm
                currentProducts={value.inventoryProducts || {}}
                onAddProduct={addProductToTheInventoryList}
                inventory={instanceInventory}
              />

              <NonInventoryProductFrom
                productToEdit={editingProduct}
                onAddProduct={(p) => {
                  setEditingProduct(undefined);
                  return addNewProduct(p);
                }}
              />

              {allProducts.length > 0 && (
                <ProductList
                  list={allProducts}
                  actions={[
                    {
                      name: i18n`Remove`,
                      tooltip: i18n`Remove this product from the order.`,
                      handler: (e, index) => {
                        if (e.product_id) {
                          removeProductFromTheInventoryList(e.product_id);
                        } else {
                          removeFromNewProduct(index);
                          setEditingProduct(e);
                        }
                      },
                    },
                  ]}
                />
              )}
            </InputGroup>

            <FormProvider<Entity>
              errors={errors}
              object={value}
              valueHandler={valueHandler as any}
            >
              {hasProducts ? (
                <Fragment>
                  <InputCurrency
                    name="pricing.products_price"
                    label={i18n`Total price`}
                    readonly
                    tooltip={i18n`total product price added up`}
                  />
                  <InputCurrency
                    name="pricing.order_price"
                    label={i18n`Total price`}
                    addonAfter={
                      discountOrRise > 0 &&
                      (discountOrRise < 1
                        ? `discount of %${Math.round(
                            (1 - discountOrRise) * 100
                          )}`
                        : `rise of %${Math.round((discountOrRise - 1) * 100)}`)
                    }
                    tooltip={i18n`Amount to be paid by the customer`}
                  />
                </Fragment>
              ) : (
                <InputCurrency
                  name="pricing.order_price"
                  label={i18n`Order price`}
                  tooltip={i18n`final order price`}
                />
              )}

              <Input
                name="pricing.summary"
                inputType="multiline"
                label={i18n`Summary`}
                tooltip={i18n`Title of the order to be shown to the customer`}
              />

              <InputGroup
                name="shipping"
                label={i18n`Shipping and Fulfillment`}
                initialActive
              >
                <InputDate
                  name="shipping.delivery_date"
                  label={i18n`Delivery date`}
                  tooltip={i18n`Deadline for physical delivery assured by the merchant.`}
                />
                {value.shipping?.delivery_date && (
                  <InputGroup
                    name="shipping.delivery_location"
                    label={i18n`Location`}
                    tooltip={i18n`address where the products will be delivered`}
                  >
                    <InputLocation name="shipping.delivery_location" />
                  </InputGroup>
                )}
                <Input
                  name="shipping.fullfilment_url"
                  label={i18n`Fulfillment URL`}
                  tooltip={i18n`URL to which the user will be redirected after successful payment.`}
                />
              </InputGroup>

              <InputGroup
                name="payments"
                label={i18n`Taler payment options`}
                tooltip={i18n`Override default Taler payment settings for this order`}
              >
                <InputDate
                  name="payments.pay_deadline"
                  label={i18n`Payment deadline`}
                  tooltip={i18n`Deadline for the customer to pay for the offer before it expires. Inventory products will be reserved until this deadline.`}
                />
                <InputDate
                  name="payments.refund_deadline"
                  label={i18n`Refund deadline`}
                  tooltip={i18n`Time until which the order can be refunded by the merchant.`}
                />
                <InputDate
                  name="payments.wire_transfer_deadline"
                  label={i18n`Wire transfer deadline`}
                  tooltip={i18n`Deadline for the exchange to make the wire transfer.`}
                />
                <InputDate
                  name="payments.auto_refund_deadline"
                  label={i18n`Auto-refund deadline`}
                  tooltip={i18n`Time until which the wallet will automatically check for refunds without user interaction.`}
                />

                <InputCurrency
                  name="payments.max_fee"
                  label={i18n`Maximum deposit fee`}
                  tooltip={i18n`Maximum deposit fees the merchant is willing to cover for this order. Higher deposit fees must be covered in full by the consumer.`}
                />
                <InputCurrency
                  name="payments.max_wire_fee"
                  label={i18n`Maximum wire fee`}
                  tooltip={i18n`Maximum aggregate wire fees the merchant is willing to cover for this order. Wire fees exceeding this amount are to be covered by the customers.`}
                />
                <InputNumber
                  name="payments.wire_fee_amortization"
                  label={i18n`Wire fee amortization`}
                  tooltip={i18n`Factor by which wire fees exceeding the above threshold are divided to determine the share of excess wire fees to be paid explicitly by the consumer.`}
                />
                <InputBoolean
                  name="payments.createToken"
                  label={i18n`Create token`}
                  tooltip={i18n`Uncheck this option if the merchant backend generated an order ID with enough entropy to prevent adversarial claims.`}
                />
                <InputNumber
                  name="payments.minimum_age"
                  label={i18n`Minimum age required`}
                  tooltip={i18n`Any value greater than 0 will limit the coins able be used to pay this contract. If empty the age restriction will be defined by the products`}
                  help={
                    minAgeByProducts > 0
                      ? i18n`Min age defined by the producs is ${minAgeByProducts}`
                      : undefined
                  }
                />
              </InputGroup>

              <InputGroup
                name="extra"
                label={i18n`Additional information`}
                tooltip={i18n`Custom information to be included in the contract for this order.`}
              >
                <Input
                  name="extra"
                  inputType="multiline"
                  label={`Value`}
                  tooltip={i18n`You must enter a value in JavaScript Object Notation (JSON).`}
                />
              </InputGroup>
            </FormProvider>

            <div class="buttons is-right mt-5">
              {onBack && (
                <button class="button" onClick={onBack}>
                  <Translate>Cancel</Translate>
                </button>
              )}
              <button
                class="button is-success"
                onClick={submit}
                disabled={hasErrors}
              >
                <Translate>Confirm</Translate>
              </button>
            </div>
          </div>
          <div class="column" />
        </div>
      </section>
    </div>
  );
}

function asProduct(p: ProductAndQuantity): MerchantBackend.Product {
  return {
    product_id: p.product.id,
    image: p.product.image,
    price: p.product.price,
    unit: p.product.unit,
    quantity: p.quantity,
    description: p.product.description,
    taxes: p.product.taxes,
    minimum_age: p.product.minimum_age,
  };
}
