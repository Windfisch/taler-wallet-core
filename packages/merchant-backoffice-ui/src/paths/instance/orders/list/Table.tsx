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

import { Amounts } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { h, VNode } from "preact";
import { StateUpdater, useState } from "preact/hooks";
import {
  FormErrors,
  FormProvider,
} from "../../../../components/form/FormProvider";
import { Input } from "../../../../components/form/Input";
import { InputCurrency } from "../../../../components/form/InputCurrency";
import { InputGroup } from "../../../../components/form/InputGroup";
import { InputSelector } from "../../../../components/form/InputSelector";
import { ConfirmModal } from "../../../../components/modal";
import { useConfigContext } from "../../../../context/config";
import { MerchantBackend, WithId } from "../../../../declaration";
import { Translate, useTranslator } from "../../../../i18n";
import { mergeRefunds } from "../../../../utils/amount";

type Entity = MerchantBackend.Orders.OrderHistoryEntry & WithId;
interface Props {
  orders: Entity[];
  onRefund: (value: Entity) => void;
  onCopyURL: (id: string) => void;
  onCreate: () => void;
  onSelect: (order: Entity) => void;
  onLoadMoreBefore?: () => void;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  onLoadMoreAfter?: () => void;
}

export function CardTable({
  orders,
  onCreate,
  onRefund,
  onCopyURL,
  onSelect,
  onLoadMoreAfter,
  onLoadMoreBefore,
  hasMoreAfter,
  hasMoreBefore,
}: Props): VNode {
  const [rowSelection, rowSelectionHandler] = useState<string[]>([]);

  const i18n = useTranslator();

  return (
    <div class="card has-table">
      <header class="card-header">
        <p class="card-header-title">
          <span class="icon">
            <i class="mdi mdi-cash-register" />
          </span>
          <Translate>Orders</Translate>
        </p>

        <div class="card-header-icon" aria-label="more options" />

        <div class="card-header-icon" aria-label="more options">
          <span class="has-tooltip-left" data-tooltip={i18n`create order`}>
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
            {orders.length > 0 ? (
              <Table
                instances={orders}
                onSelect={onSelect}
                onRefund={onRefund}
                onCopyURL={(o) => onCopyURL(o.id)}
                rowSelection={rowSelection}
                rowSelectionHandler={rowSelectionHandler}
                onLoadMoreAfter={onLoadMoreAfter}
                onLoadMoreBefore={onLoadMoreBefore}
                hasMoreAfter={hasMoreAfter}
                hasMoreBefore={hasMoreBefore}
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
  rowSelection: string[];
  instances: Entity[];
  onRefund: (id: Entity) => void;
  onCopyURL: (id: Entity) => void;
  onSelect: (id: Entity) => void;
  rowSelectionHandler: StateUpdater<string[]>;
  onLoadMoreBefore?: () => void;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  onLoadMoreAfter?: () => void;
}

function Table({
  instances,
  onSelect,
  onRefund,
  onCopyURL,
  onLoadMoreAfter,
  onLoadMoreBefore,
  hasMoreAfter,
  hasMoreBefore,
}: TableProps): VNode {
  return (
    <div class="table-container">
      {onLoadMoreBefore && (
        <button
          class="button is-fullwidth"
          disabled={!hasMoreBefore}
          onClick={onLoadMoreBefore}
        >
          <Translate>load newer orders</Translate>
        </button>
      )}
      <table class="table is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th style={{ minWidth: 100 }}>
              <Translate>Date</Translate>
            </th>
            <th style={{ minWidth: 100 }}>
              <Translate>Amount</Translate>
            </th>
            <th style={{ minWidth: 400 }}>
              <Translate>Summary</Translate>
            </th>
            <th style={{ minWidth: 50 }} />
          </tr>
        </thead>
        <tbody>
          {instances.map((i) => {
            return (
              <tr key={i.id}>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.timestamp.t_s === "never"
                    ? "never"
                    : format(
                        new Date(i.timestamp.t_s * 1000),
                        "yyyy/MM/dd HH:mm:ss"
                      )}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.amount}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.summary}
                </td>
                <td class="is-actions-cell right-sticky">
                  <div class="buttons is-right">
                    {i.refundable && (
                      <button
                        class="button is-small is-danger jb-modal"
                        type="button"
                        onClick={(): void => onRefund(i)}
                      >
                        <Translate>Refund</Translate>
                      </button>
                    )}
                    {!i.paid && (
                      <button
                        class="button is-small is-info jb-modal"
                        type="button"
                        onClick={(): void => onCopyURL(i)}
                      >
                        <Translate>copy url</Translate>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {onLoadMoreAfter && (
        <button
          class="button is-fullwidth"
          disabled={!hasMoreAfter}
          onClick={onLoadMoreAfter}
        >
          <Translate>load older orders</Translate>
        </button>
      )}
    </div>
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
        <Translate>No orders have been found matching your query!</Translate>
      </p>
    </div>
  );
}

interface RefundModalProps {
  onCancel: () => void;
  onConfirm: (value: MerchantBackend.Orders.RefundRequest) => void;
  order: MerchantBackend.Orders.MerchantOrderStatusResponse;
}

export function RefundModal({
  order,
  onCancel,
  onConfirm,
}: RefundModalProps): VNode {
  type State = { mainReason?: string; description?: string; refund?: string };
  const [form, setValue] = useState<State>({});
  const i18n = useTranslator();
  // const [errors, setErrors] = useState<FormErrors<State>>({});

  const refunds = (
    order.order_status === "paid" ? order.refund_details : []
  ).reduce(mergeRefunds, []);

  const config = useConfigContext();
  const totalRefunded = refunds
    .map((r) => r.amount)
    .reduce(
      (p, c) => Amounts.add(p, Amounts.parseOrThrow(c)).amount,
      Amounts.getZero(config.currency)
    );
  const orderPrice =
    order.order_status === "paid"
      ? Amounts.parseOrThrow(order.contract_terms.amount)
      : undefined;
  const totalRefundable = !orderPrice
    ? Amounts.getZero(totalRefunded.currency)
    : refunds.length
    ? Amounts.sub(orderPrice, totalRefunded).amount
    : orderPrice;

  const isRefundable = Amounts.isNonZero(totalRefundable);
  const duplicatedText = i18n`duplicated`;

  const errors: FormErrors<State> = {
    mainReason: !form.mainReason ? i18n`required` : undefined,
    description:
      !form.description && form.mainReason !== duplicatedText
        ? i18n`required`
        : undefined,
    refund: !form.refund
      ? i18n`required`
      : !Amounts.parse(form.refund)
      ? i18n`invalid format`
      : Amounts.cmp(totalRefundable, Amounts.parse(form.refund)!) === -1
      ? i18n`this value exceed the refundable amount`
      : undefined,
  };
  const hasErrors = Object.keys(errors).some(
    (k) => (errors as any)[k] !== undefined
  );

  const validateAndConfirm = () => {
    try {
      if (!form.refund) return;
      onConfirm({
        refund: Amounts.stringify(
          Amounts.add(Amounts.parse(form.refund)!, totalRefunded).amount
        ),
        reason:
          form.description === undefined
            ? form.mainReason || ""
            : `${form.mainReason}: ${form.description}`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  //FIXME: parameters in the translation
  return (
    <ConfirmModal
      description="refund"
      danger
      active
      disabled={!isRefundable || hasErrors}
      onCancel={onCancel}
      onConfirm={validateAndConfirm}
    >
      {refunds.length > 0 && (
        <div class="columns">
          <div class="column is-12">
            <InputGroup
              name="asd"
              label={`${Amounts.stringify(totalRefunded)} was already refunded`}
            >
              <table class="table is-fullwidth">
                <thead>
                  <tr>
                    <th>
                      <Translate>date</Translate>
                    </th>
                    <th>
                      <Translate>amount</Translate>
                    </th>
                    <th>
                      <Translate>reason</Translate>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => {
                    return (
                      <tr key={r.timestamp.t_s}>
                        <td>
                          {r.timestamp.t_s === "never"
                            ? "never"
                            : format(
                                new Date(r.timestamp.t_s * 1000),
                                "yyyy-MM-dd HH:mm:ss"
                              )}
                        </td>
                        <td>{r.amount}</td>
                        <td>{r.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </InputGroup>
          </div>
        </div>
      )}

      {isRefundable && (
        <FormProvider<State>
          errors={errors}
          object={form}
          valueHandler={(d) => setValue(d as any)}
        >
          <InputCurrency<State>
            name="refund"
            label={i18n`Refund`}
            tooltip={i18n`amount to be refunded`}
          >
            <Translate>Max refundable:</Translate>{" "}
            {Amounts.stringify(totalRefundable)}
          </InputCurrency>
          <InputSelector
            name="mainReason"
            label={i18n`Reason`}
            values={[
              i18n`Choose one...`,
              duplicatedText,
              i18n`requested by the customer`,
              i18n`other`,
            ]}
            tooltip={i18n`why this order is being refunded`}
          />
          {form.mainReason && form.mainReason !== duplicatedText ? (
            <Input<State>
              label={i18n`Description`}
              name="description"
              tooltip={i18n`more information to give context`}
            />
          ) : undefined}
        </FormProvider>
      )}
    </ConfirmModal>
  );
}
