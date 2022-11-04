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

import { format } from "date-fns";
import { ComponentChildren, Fragment, h, VNode } from "preact";
import { StateUpdater, useState } from "preact/hooks";
import {
  FormProvider,
  FormErrors,
} from "../../../../components/form/FormProvider.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { InputNumber } from "../../../../components/form/InputNumber.js";
import { MerchantBackend, WithId } from "../../../../declaration.js";
import emptyImage from "../../../../assets/empty.png";
import { Translate, useTranslator } from "../../../../i18n/index.js";
import { Amounts } from "@gnu-taler/taler-util";

type Entity = MerchantBackend.Products.ProductDetail & WithId;

interface Props {
  instances: Entity[];
  onDelete: (id: Entity) => void;
  onSelect: (product: Entity) => void;
  onUpdate: (
    id: string,
    data: MerchantBackend.Products.ProductPatchDetail
  ) => Promise<void>;
  onCreate: () => void;
  selected?: boolean;
}

export function CardTable({
  instances,
  onCreate,
  onSelect,
  onUpdate,
  onDelete,
}: Props): VNode {
  const [rowSelection, rowSelectionHandler] = useState<string | undefined>(
    undefined
  );
  const i18n = useTranslator();
  return (
    <div class="card has-table">
      <header class="card-header">
        <p class="card-header-title">
          <span class="icon">
            <i class="mdi mdi-shopping" />
          </span>
          <Translate>Products</Translate>
        </p>
        <div class="card-header-icon" aria-label="more options">
          <span
            class="has-tooltip-left"
            data-tooltip={i18n`add product to inventory`}
          >
            <button class="button is-info" type="button" onClick={onCreate}>
              <span class="icon is-small">
                <i class="mdi mdi-plus mdi-36px" />
              </span>
            </button>
          </span>
        </div>
      </header>
      <div class="card-content">
        <div class="b-table has-pagination">
          <div class="table-wrapper has-mobile-cards">
            {instances.length > 0 ? (
              <Table
                instances={instances}
                onSelect={onSelect}
                onDelete={onDelete}
                onUpdate={onUpdate}
                rowSelection={rowSelection}
                rowSelectionHandler={rowSelectionHandler}
              />
            ) : (
              <EmptyTable />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
interface TableProps {
  rowSelection: string | undefined;
  instances: Entity[];
  onSelect: (id: Entity) => void;
  onUpdate: (
    id: string,
    data: MerchantBackend.Products.ProductPatchDetail
  ) => Promise<void>;
  onDelete: (id: Entity) => void;
  rowSelectionHandler: StateUpdater<string | undefined>;
}

function Table({
  rowSelection,
  rowSelectionHandler,
  instances,
  onSelect,
  onUpdate,
  onDelete,
}: TableProps): VNode {
  const i18n = useTranslator();
  return (
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>Image</Translate>
            </th>
            <th>
              <Translate>Description</Translate>
            </th>
            <th>
              <Translate>Sell</Translate>
            </th>
            <th>
              <Translate>Taxes</Translate>
            </th>
            <th>
              <Translate>Profit</Translate>
            </th>
            <th>
              <Translate>Stock</Translate>
            </th>
            <th>
              <Translate>Sold</Translate>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {instances.map((i) => {
            const restStockInfo = !i.next_restock
              ? ""
              : i.next_restock.t_s === "never"
              ? "never"
              : `restock at ${format(
                  new Date(i.next_restock.t_s * 1000),
                  "yyyy/MM/dd"
                )}`;
            let stockInfo: ComponentChildren = "";
            if (i.total_stock < 0) {
              stockInfo = "infinite";
            } else {
              const totalStock = i.total_stock - i.total_lost - i.total_sold;
              stockInfo = (
                <label title={restStockInfo}>
                  {totalStock} {i.unit}
                </label>
              );
            }

            const isFree = Amounts.isZero(Amounts.parseOrThrow(i.price));

            return (
              <Fragment key={i.id}>
                <tr key="info">
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={i.image ? i.image : emptyImage}
                      style={{
                        border: "solid black 1px",
                        width: 100,
                        height: 100,
                      }}
                    />
                  </td>
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {i.description}
                  </td>
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {isFree ? i18n`free` : `${i.price} / ${i.unit}`}
                  </td>
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {sum(i.taxes)}
                  </td>
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {difference(i.price, sum(i.taxes))}
                  </td>
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {stockInfo}
                  </td>
                  <td
                    onClick={() =>
                      rowSelection !== i.id && rowSelectionHandler(i.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {i.total_sold} {i.unit}
                  </td>
                  <td class="is-actions-cell right-sticky">
                    <div class="buttons is-right">
                      <span
                        class="has-tooltip-bottom"
                        data-tooltip={i18n`go to product update page`}
                      >
                        <button
                          class="button is-small is-success "
                          type="button"
                          onClick={(): void => onSelect(i)}
                        >
                          <Translate>Update</Translate>
                        </button>
                      </span>
                      <span
                        class="has-tooltip-left"
                        data-tooltip={i18n`remove this product from the database`}
                      >
                        <button
                          class="button is-small is-danger"
                          type="button"
                          onClick={(): void => onDelete(i)}
                        >
                          <Translate>Delete</Translate>
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
                {rowSelection === i.id && (
                  <tr key="form">
                    <td colSpan={10}>
                      <FastProductUpdateForm
                        product={i}
                        onUpdate={(prod) =>
                          onUpdate(i.id, prod).then((r) =>
                            rowSelectionHandler(undefined)
                          )
                        }
                        onCancel={() => rowSelectionHandler(undefined)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface FastProductUpdateFormProps {
  product: Entity;
  onUpdate: (
    data: MerchantBackend.Products.ProductPatchDetail
  ) => Promise<void>;
  onCancel: () => void;
}
interface FastProductUpdate {
  incoming: number;
  lost: number;
  price: string;
}
interface UpdatePrice {
  price: string;
}

function FastProductWithInfiniteStockUpdateForm({
  product,
  onUpdate,
  onCancel,
}: FastProductUpdateFormProps) {
  const [value, valueHandler] = useState<UpdatePrice>({ price: product.price });
  const i18n = useTranslator();

  return (
    <Fragment>
      <FormProvider<FastProductUpdate>
        name="added"
        object={value}
        valueHandler={valueHandler as any}
      >
        <InputCurrency<FastProductUpdate>
          name="price"
          label={i18n`Price`}
          tooltip={i18n`update the product with new price`}
        />
      </FormProvider>

      <div class="buttons is-right mt-5">
        <button class="button" onClick={onCancel}>
          <Translate>Cancel</Translate>
        </button>
        <span
          class="has-tooltip-left"
          data-tooltip={i18n`update product with new price`}
        >
          <button
            class="button is-info"
            onClick={() =>
              onUpdate({
                ...product,
                price: value.price,
              })
            }
          >
            <Translate>Confirm</Translate>
          </button>
        </span>
      </div>
    </Fragment>
  );
}

function FastProductWithManagedStockUpdateForm({
  product,
  onUpdate,
  onCancel,
}: FastProductUpdateFormProps) {
  const [value, valueHandler] = useState<FastProductUpdate>({
    incoming: 0,
    lost: 0,
    price: product.price,
  });

  const currentStock =
    product.total_stock - product.total_sold - product.total_lost;

  const errors: FormErrors<FastProductUpdate> = {
    lost:
      currentStock + value.incoming < value.lost
        ? `lost cannot be greater that current + incoming (max ${
            currentStock + value.incoming
          })`
        : undefined,
  };

  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined
  );
  const i18n = useTranslator();

  return (
    <Fragment>
      <FormProvider<FastProductUpdate>
        name="added"
        errors={errors}
        object={value}
        valueHandler={valueHandler as any}
      >
        <InputNumber<FastProductUpdate>
          name="incoming"
          label={i18n`Incoming`}
          tooltip={i18n`add more elements to the inventory`}
        />
        <InputNumber<FastProductUpdate>
          name="lost"
          label={i18n`Lost`}
          tooltip={i18n`report elements lost in the inventory`}
        />
        <InputCurrency<FastProductUpdate>
          name="price"
          label={i18n`Price`}
          tooltip={i18n`new price for the product`}
        />
      </FormProvider>

      <div class="buttons is-right mt-5">
        <button class="button" onClick={onCancel}>
          <Translate>Cancel</Translate>
        </button>
        <span
          class="has-tooltip-left"
          data-tooltip={
            hasErrors
              ? i18n`the are value with errors`
              : i18n`update product with new stock and price`
          }
        >
          <button
            class="button is-info"
            disabled={hasErrors}
            onClick={() =>
              onUpdate({
                ...product,
                total_stock: product.total_stock + value.incoming,
                total_lost: product.total_lost + value.lost,
                price: value.price,
              })
            }
          >
            <Translate>Confirm</Translate>
          </button>
        </span>
      </div>
    </Fragment>
  );
}

function FastProductUpdateForm(props: FastProductUpdateFormProps) {
  return props.product.total_stock === -1 ? (
    <FastProductWithInfiniteStockUpdateForm {...props} />
  ) : (
    <FastProductWithManagedStockUpdateForm {...props} />
  );
}

function EmptyTable(): VNode {
  return (
    <div class="content has-text-grey has-text-centered">
      <p>
        <span class="icon is-large">
          <i class="mdi mdi-emoticon-sad mdi-48px" />
        </span>
      </p>
      <p>
        <Translate>
          There is no products yet, add more pressing the + sign
        </Translate>
      </p>
    </div>
  );
}

function difference(price: string, tax: number) {
  if (!tax) return price;
  const ps = price.split(":");
  const p = parseInt(ps[1], 10);
  ps[1] = `${p - tax}`;
  return ps.join(":");
}
function sum(taxes: MerchantBackend.Tax[]) {
  return taxes.reduce((p, c) => p + parseInt(c.tax.split(":")[1], 10), 0);
}
