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

import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { FormProvider } from "../../../../components/form/FormProvider.js";
import { Input } from "../../../../components/form/Input.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { InputDate } from "../../../../components/form/InputDate.js";
import { InputDuration } from "../../../../components/form/InputDuration.js";
import { InputGroup } from "../../../../components/form/InputGroup.js";
import { InputLocation } from "../../../../components/form/InputLocation.js";
import { TextField } from "../../../../components/form/TextField.js";
import { ProductList } from "../../../../components/product/ProductList.js";
import { useBackendContext } from "../../../../context/backend.js";
import { MerchantBackend } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n";
import { mergeRefunds } from "../../../../utils/amount.js";
import { RefundModal } from "../list/Table.js";
import { Event, Timeline } from "./Timeline.js";

type Entity = MerchantBackend.Orders.MerchantOrderStatusResponse;
type CT = MerchantBackend.ContractTerms;

interface Props {
  onBack: () => void;
  selected: Entity;
  id: string;
  onRefund: (id: string, value: MerchantBackend.Orders.RefundRequest) => void;
}

type Paid = MerchantBackend.Orders.CheckPaymentPaidResponse & {
  refund_taken: string;
};
type Unpaid = MerchantBackend.Orders.CheckPaymentUnpaidResponse;
type Claimed = MerchantBackend.Orders.CheckPaymentClaimedResponse;

function ContractTerms({ value }: { value: CT }) {
  const i18n = useTranslator();

  return (
    <InputGroup name="contract_terms" label={i18n`Contract Terms`}>
      <FormProvider<CT> object={value} valueHandler={null}>
        <Input<CT>
          readonly
          name="summary"
          label={i18n`Summary`}
          tooltip={i18n`human-readable description of the whole purchase`}
        />
        <InputCurrency<CT>
          readonly
          name="amount"
          label={i18n`Amount`}
          tooltip={i18n`total price for the transaction`}
        />
        {value.fulfillment_url && (
          <Input<CT>
            readonly
            name="fulfillment_url"
            label={i18n`Fulfillment URL`}
            tooltip={i18n`URL for this purchase`}
          />
        )}
        <Input<CT>
          readonly
          name="max_fee"
          label={i18n`Max fee`}
          tooltip={i18n`maximum total deposit fee accepted by the merchant for this contract`}
        />
        <Input<CT>
          readonly
          name="max_wire_fee"
          label={i18n`Max wire fee`}
          tooltip={i18n`maximum wire fee accepted by the merchant`}
        />
        <Input<CT>
          readonly
          name="wire_fee_amortization"
          label={i18n`Wire fee amortization`}
          tooltip={i18n`over how many customer transactions does the merchant expect to amortize wire fees on average`}
        />
        <InputDate<CT>
          readonly
          name="timestamp"
          label={i18n`Created at`}
          tooltip={i18n`time when this contract was generated`}
        />
        <InputDate<CT>
          readonly
          name="refund_deadline"
          label={i18n`Refund deadline`}
          tooltip={i18n`after this deadline has passed no refunds will be accepted`}
        />
        <InputDate<CT>
          readonly
          name="pay_deadline"
          label={i18n`Payment deadline`}
          tooltip={i18n`after this deadline, the merchant won't accept payments for the contract`}
        />
        <InputDate<CT>
          readonly
          name="wire_transfer_deadline"
          label={i18n`Wire transfer deadline`}
          tooltip={i18n`transfer deadline for the exchange`}
        />
        <InputDate<CT>
          readonly
          name="delivery_date"
          label={i18n`Delivery date`}
          tooltip={i18n`time indicating when the order should be delivered`}
        />
        {value.delivery_date && (
          <InputGroup
            name="delivery_location"
            label={i18n`Location`}
            tooltip={i18n`where the order will be delivered`}
          >
            <InputLocation name="payments.delivery_location" />
          </InputGroup>
        )}
        <InputDuration<CT>
          readonly
          name="auto_refund"
          label={i18n`Auto-refund delay`}
          tooltip={i18n`how long the wallet should try to get an automatic refund for the purchase`}
        />
        <Input<CT>
          readonly
          name="extra"
          label={i18n`Extra info`}
          tooltip={i18n`extra data that is only interpreted by the merchant frontend`}
        />
      </FormProvider>
    </InputGroup>
  );
}

function ClaimedPage({
  id,
  order,
}: {
  id: string;
  order: MerchantBackend.Orders.CheckPaymentClaimedResponse;
}) {
  const events: Event[] = [];
  if (order.contract_terms.timestamp.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.timestamp.t_s * 1000),
      description: "order created",
      type: "start",
    });
  }
  if (order.contract_terms.pay_deadline.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.pay_deadline.t_s * 1000),
      description: "pay deadline",
      type: "deadline",
    });
  }
  if (order.contract_terms.refund_deadline.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.refund_deadline.t_s * 1000),
      description: "refund deadline",
      type: "deadline",
    });
  }
  if (order.contract_terms.wire_transfer_deadline.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.wire_transfer_deadline.t_s * 1000),
      description: "wire deadline",
      type: "deadline",
    });
  }
  if (
    order.contract_terms.delivery_date &&
    order.contract_terms.delivery_date.t_s !== "never"
  ) {
    events.push({
      when: new Date(order.contract_terms.delivery_date?.t_s * 1000),
      description: "delivery",
      type: "delivery",
    });
  }

  const [value, valueHandler] = useState<Partial<Claimed>>(order);
  const i18n = useTranslator();

  return (
    <div>
      <section class="section">
        <div class="columns">
          <div class="column" />
          <div class="column is-10">
            <section class="hero is-hero-bar">
              <div class="hero-body">
                <div class="level">
                  <div class="level-left">
                    <div class="level-item">
                      <Translate>Order</Translate> #{id}
                      <div class="tag is-info ml-4">
                        <Translate>claimed</Translate>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="level">
                  <div class="level-left">
                    <div class="level-item">
                      <h1 class="title">{order.contract_terms.amount}</h1>
                    </div>
                  </div>
                </div>

                <div class="level">
                  <div class="level-left" style={{ maxWidth: "100%" }}>
                    <div class="level-item" style={{ maxWidth: "100%" }}>
                      <div
                        class="content"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <p>
                          <b>
                            <Translate>claimed at</Translate>:
                          </b>{" "}
                          {format(
                            new Date(order.contract_terms.timestamp.t_s * 1000),
                            "yyyy-MM-dd HH:mm:ss"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="section">
              <div class="columns">
                <div class="column is-4">
                  <div class="title">
                    <Translate>Timeline</Translate>
                  </div>
                  <Timeline events={events} />
                </div>
                <div class="column is-8">
                  <div class="title">
                    <Translate>Payment details</Translate>
                  </div>
                  <FormProvider<Claimed>
                    object={value}
                    valueHandler={valueHandler}
                  >
                    <Input
                      name="contract_terms.summary"
                      readonly
                      inputType="multiline"
                      label={i18n`Summary`}
                    />
                    <InputCurrency
                      name="contract_terms.amount"
                      readonly
                      label={i18n`Amount`}
                    />
                    <Input<Claimed>
                      name="order_status"
                      readonly
                      label={i18n`Order status`}
                    />
                  </FormProvider>
                </div>
              </div>
            </section>

            {order.contract_terms.products.length ? (
              <Fragment>
                <div class="title">
                  <Translate>Product list</Translate>
                </div>
                <ProductList list={order.contract_terms.products} />
              </Fragment>
            ) : undefined}

            {value.contract_terms && (
              <ContractTerms value={value.contract_terms} />
            )}
          </div>
          <div class="column" />
        </div>
      </section>
    </div>
  );
}
function PaidPage({
  id,
  order,
  onRefund,
}: {
  id: string;
  order: MerchantBackend.Orders.CheckPaymentPaidResponse;
  onRefund: (id: string) => void;
}) {
  const events: Event[] = [];
  if (order.contract_terms.timestamp.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.timestamp.t_s * 1000),
      description: "order created",
      type: "start",
    });
  }
  if (order.contract_terms.pay_deadline.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.pay_deadline.t_s * 1000),
      description: "pay deadline",
      type: "deadline",
    });
  }
  if (order.contract_terms.refund_deadline.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.refund_deadline.t_s * 1000),
      description: "refund deadline",
      type: "deadline",
    });
  }
  if (order.contract_terms.wire_transfer_deadline.t_s !== "never") {
    events.push({
      when: new Date(order.contract_terms.wire_transfer_deadline.t_s * 1000),
      description: "wire deadline",
      type: "deadline",
    });
  }
  if (
    order.contract_terms.delivery_date &&
    order.contract_terms.delivery_date.t_s !== "never"
  ) {
    if (order.contract_terms.delivery_date)
      events.push({
        when: new Date(order.contract_terms.delivery_date?.t_s * 1000),
        description: "delivery",
        type: "delivery",
      });
  }
  order.refund_details.reduce(mergeRefunds, []).forEach((e) => {
    if (e.timestamp.t_s !== "never") {
      events.push({
        when: new Date(e.timestamp.t_s * 1000),
        description: `refund: ${e.amount}: ${e.reason}`,
        type: e.pending ? "refund" : "refund-taken",
      });
    }
  });
  if (order.wire_details && order.wire_details.length) {
    if (order.wire_details.length > 1) {
      let last: MerchantBackend.Orders.TransactionWireTransfer | null = null;
      let first: MerchantBackend.Orders.TransactionWireTransfer | null = null;
      let total: AmountJson | null = null;

      order.wire_details.forEach((w) => {
        if (last === null || last.execution_time.t_s < w.execution_time.t_s) {
          last = w;
        }
        if (first === null || first.execution_time.t_s > w.execution_time.t_s) {
          first = w;
        }
        total =
          total === null
            ? Amounts.parseOrThrow(w.amount)
            : Amounts.add(total, Amounts.parseOrThrow(w.amount)).amount;
      });
      const last_time = last!.execution_time.t_s;
      if (last_time !== "never") {
        events.push({
          when: new Date(last_time * 1000),
          description: `wired ${Amounts.stringify(total!)}`,
          type: "wired-range",
        });
      }
      const first_time = first!.execution_time.t_s;
      if (first_time !== "never") {
        events.push({
          when: new Date(first_time * 1000),
          description: `wire transfer started...`,
          type: "wired-range",
        });
      }
    } else {
      order.wire_details.forEach((e) => {
        if (e.execution_time.t_s !== "never") {
          events.push({
            when: new Date(e.execution_time.t_s * 1000),
            description: `wired ${e.amount}`,
            type: "wired",
          });
        }
      });
    }
  }

  const [value, valueHandler] = useState<Partial<Paid>>(order);
  const { url } = useBackendContext();
  const refundHost = url.replace(/.*:\/\//, ""); // remove protocol part
  const proto = url.startsWith("http://") ? "taler+http" : "taler";
  const refundurl = `${proto}://refund/${refundHost}/${order.contract_terms.order_id}/`;
  const refundable =
    new Date().getTime() < order.contract_terms.refund_deadline.t_s * 1000;
  const i18n = useTranslator();

  const amount = Amounts.parseOrThrow(order.contract_terms.amount);
  const refund_taken = order.refund_details.reduce((prev, cur) => {
    if (cur.pending) return prev;
    return Amounts.add(prev, Amounts.parseOrThrow(cur.amount)).amount;
  }, Amounts.getZero(amount.currency));
  value.refund_taken = Amounts.stringify(refund_taken);

  return (
    <div>
      <section class="section">
        <div class="columns">
          <div class="column" />
          <div class="column is-10">
            <section class="hero is-hero-bar">
              <div class="hero-body">
                <div class="level">
                  <div class="level-left">
                    <div class="level-item">
                      <Translate>Order</Translate> #{id}
                      <div class="tag is-success ml-4">
                        <Translate>paid</Translate>
                      </div>
                      {order.wired ? (
                        <div class="tag is-success ml-4">
                          <Translate>wired</Translate>
                        </div>
                      ) : null}
                      {order.refunded ? (
                        <div class="tag is-danger ml-4">
                          <Translate>refunded</Translate>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div class="level">
                  <div class="level-left">
                    <div class="level-item">
                      <h1 class="title">{order.contract_terms.amount}</h1>
                    </div>
                  </div>
                  <div class="level-right">
                    <div class="level-item">
                      <h1 class="title">
                        <div class="buttons">
                          <span
                            class="has-tooltip-left"
                            data-tooltip={
                              refundable
                                ? i18n`refund order`
                                : i18n`not refundable`
                            }
                          >
                            <button
                              class="button is-danger"
                              disabled={!refundable}
                              onClick={() => onRefund(id)}
                            >
                              <Translate>refund</Translate>
                            </button>
                          </span>
                        </div>
                      </h1>
                    </div>
                  </div>
                </div>

                <div class="level">
                  <div class="level-left" style={{ maxWidth: "100%" }}>
                    <div class="level-item" style={{ maxWidth: "100%" }}>
                      <div
                        class="content"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          // maxWidth: '100%',
                        }}
                      >
                        <p>
                          <a
                            href={order.contract_terms.fulfillment_url}
                            rel="nofollow"
                            target="new"
                          >
                            {order.contract_terms.fulfillment_url}
                          </a>
                        </p>
                        <p>
                          {format(
                            new Date(order.contract_terms.timestamp.t_s * 1000),
                            "yyyy/MM/dd HH:mm:ss"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="section">
              <div class="columns">
                <div class="column is-4">
                  <div class="title">
                    <Translate>Timeline</Translate>
                  </div>
                  <Timeline events={events} />
                </div>
                <div class="column is-8">
                  <div class="title">
                    <Translate>Payment details</Translate>
                  </div>
                  <FormProvider<Paid>
                    object={value}
                    valueHandler={valueHandler}
                  >
                    {/* <InputCurrency<Paid> name="deposit_total" readonly label={i18n`Deposit total`} /> */}
                    {order.refunded && (
                      <InputCurrency<Paid>
                        name="refund_amount"
                        readonly
                        label={i18n`Refunded amount`}
                      />
                    )}
                    {order.refunded && (
                      <InputCurrency<Paid>
                        name="refund_taken"
                        readonly
                        label={i18n`Refund taken`}
                      />
                    )}
                    <Input<Paid>
                      name="order_status"
                      readonly
                      label={i18n`Order status`}
                    />
                    <TextField<Paid>
                      name="order_status_url"
                      label={i18n`Status URL`}
                    >
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={order.order_status_url}
                      >
                        {order.order_status_url}
                      </a>
                    </TextField>
                    {order.refunded && (
                      <TextField<Paid>
                        name="order_status_url"
                        label={i18n`Refund URI`}
                      >
                        <a target="_blank" rel="noreferrer" href={refundurl}>
                          {refundurl}
                        </a>
                      </TextField>
                    )}
                  </FormProvider>
                </div>
              </div>
            </section>

            {order.contract_terms.products.length ? (
              <Fragment>
                <div class="title">
                  <Translate>Product list</Translate>
                </div>
                <ProductList list={order.contract_terms.products} />
              </Fragment>
            ) : undefined}

            {value.contract_terms && (
              <ContractTerms value={value.contract_terms} />
            )}
          </div>
          <div class="column" />
        </div>
      </section>
    </div>
  );
}

function UnpaidPage({
  id,
  order,
}: {
  id: string;
  order: MerchantBackend.Orders.CheckPaymentUnpaidResponse;
}) {
  const [value, valueHandler] = useState<Partial<Unpaid>>(order);
  const i18n = useTranslator();
  return (
    <div>
      <section class="hero is-hero-bar">
        <div class="hero-body">
          <div class="level">
            <div class="level-left">
              <div class="level-item">
                <h1 class="title">
                  <Translate>Order</Translate> #{id}
                </h1>
              </div>
              <div class="tag is-dark">
                <Translate>unpaid</Translate>
              </div>
            </div>
          </div>

          <div class="level">
            <div class="level-left" style={{ maxWidth: "100%" }}>
              <div class="level-item" style={{ maxWidth: "100%" }}>
                <div
                  class="content"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <p>
                    <b>
                      <Translate>pay at</Translate>:
                    </b>{" "}
                    <a
                      href={order.order_status_url}
                      rel="nofollow"
                      target="new"
                    >
                      {order.order_status_url}
                    </a>
                  </p>
                  <p>
                    <b>
                      <Translate>created at</Translate>:
                    </b>{" "}
                    {order.creation_time.t_s === "never"
                      ? "never"
                      : format(
                          new Date(order.creation_time.t_s * 1000),
                          "yyyy-MM-dd HH:mm:ss"
                        )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section is-main-section">
        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths">
            <FormProvider<Unpaid> object={value} valueHandler={valueHandler}>
              <Input<Unpaid>
                readonly
                name="summary"
                label={i18n`Summary`}
                tooltip={i18n`human-readable description of the whole purchase`}
              />
              <InputCurrency<Unpaid>
                readonly
                name="total_amount"
                label={i18n`Amount`}
                tooltip={i18n`total price for the transaction`}
              />
              <Input<Unpaid>
                name="order_status"
                readonly
                label={i18n`Order status`}
              />
              <Input<Unpaid>
                name="order_status_url"
                readonly
                label={i18n`Order status URL`}
              />
              <TextField<Unpaid> name="taler_pay_uri" label={i18n`Payment URI`}>
                <a target="_blank" rel="noreferrer" href={value.taler_pay_uri}>
                  {value.taler_pay_uri}
                </a>
              </TextField>
            </FormProvider>
          </div>
          <div class="column" />
        </div>
      </section>
    </div>
  );
}

export function DetailPage({ id, selected, onRefund, onBack }: Props): VNode {
  const [showRefund, setShowRefund] = useState<string | undefined>(undefined);

  const DetailByStatus = function () {
    switch (selected.order_status) {
      case "claimed":
        return <ClaimedPage id={id} order={selected} />;
      case "paid":
        return <PaidPage id={id} order={selected} onRefund={setShowRefund} />;
      case "unpaid":
        return <UnpaidPage id={id} order={selected} />;
      default:
        return (
          <div>
            <Translate>
              Unknown order status. This is an error, please contact the
              administrator.
            </Translate>
          </div>
        );
    }
  };

  return (
    <Fragment>
      {DetailByStatus()}
      {showRefund && (
        <RefundModal
          order={selected}
          onCancel={() => setShowRefund(undefined)}
          onConfirm={(value) => {
            onRefund(showRefund, value);
            setShowRefund(undefined);
          }}
        />
      )}
      <div class="columns">
        <div class="column" />
        <div class="column is-four-fifths">
          <div class="buttons is-right mt-5">
            <button class="button" onClick={onBack}>
              <Translate>Back</Translate>
            </button>
          </div>
        </div>
        <div class="column" />
      </div>
    </Fragment>
  );
}

async function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}
