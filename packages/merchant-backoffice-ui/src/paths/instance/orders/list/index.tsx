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

import { h, VNode, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../../../../components/exception/loading.js";
import { NotificationCard } from "../../../../components/menu/index.js";
import { MerchantBackend, WithId } from "../../../../declaration.js";
import { HttpError } from "../../../../hooks/backend.js";
import {
  InstanceOrderFilter,
  useInstanceOrders,
  useOrderAPI,
  useOrderDetails,
} from "../../../../hooks/order.js";
import { useTranslator } from "../../../../i18n/index.js";
import { Notification } from "../../../../utils/types.js";
import { RefundModal } from "./Table.js";
import { ListPage } from "./ListPage.js";

interface Props {
  onUnauthorized: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  onNotFound: () => VNode;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export default function ({
  onUnauthorized,
  onLoadError,
  onCreate,
  onSelect,
  onNotFound,
}: Props): VNode {
  const [filter, setFilter] = useState<InstanceOrderFilter>({});
  const [orderToBeRefunded, setOrderToBeRefunded] = useState<
    MerchantBackend.Orders.OrderHistoryEntry | undefined
  >(undefined);

  const setNewDate = (date?: Date) => setFilter((prev) => ({ ...prev, date }));

  const result = useInstanceOrders(filter, setNewDate);
  const { refundOrder, getPaymentURL } = useOrderAPI();

  const [notif, setNotif] = useState<Notification | undefined>(undefined);

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  const isPaidActive = filter.paid === "yes" ? "is-active" : "";
  const isRefundedActive = filter.refunded === "yes" ? "is-active" : "";
  const isNotWiredActive = filter.wired === "no" ? "is-active" : "";
  const isAllActive =
    filter.paid === undefined &&
    filter.refunded === undefined &&
    filter.wired === undefined
      ? "is-active"
      : "";

  const i18n = useTranslator();
  const [errorOrderId, setErrorOrderId] = useState<string | undefined>(
    undefined,
  );

  async function testIfOrderExistAndSelect(orderId: string) {
    if (!orderId) {
      setErrorOrderId(i18n`Enter an order id`);
      return;
    }
    try {
      await getPaymentURL(orderId);
      onSelect(orderId);
      setErrorOrderId(undefined);
    } catch {
      setErrorOrderId(i18n`order not found`);
    }
  }

  return (
    <Fragment>
      <NotificationCard notification={notif} />

      <ListPage
        orders={result.data.orders.map((o) => ({ ...o, id: o.order_id }))}
        onLoadMoreBefore={result.loadMorePrev}
        hasMoreBefore={!result.isReachingStart}
        onLoadMoreAfter={result.loadMore}
        hasMoreAfter={!result.isReachingEnd}
        onSelectOrder={(order) => onSelect(order.id)}
        onRefundOrder={(value) => setOrderToBeRefunded(value)}
        errorOrderId={errorOrderId}
        isAllActive={isAllActive}
        isNotWiredActive={isNotWiredActive}
        isPaidActive={isPaidActive}
        isRefundedActive={isRefundedActive}
        jumpToDate={filter.date}
        onCopyURL={(id) =>
          getPaymentURL(id).then((resp) => copyToClipboard(resp.data))
        }
        onCreate={onCreate}
        onSearchOrderById={testIfOrderExistAndSelect}
        onSelectDate={setNewDate}
        onShowAll={() => setFilter({})}
        onShowPaid={() => setFilter({ paid: "yes" })}
        onShowRefunded={() => setFilter({ refunded: "yes" })}
        onShowNotWired={() => setFilter({ wired: "no" })}
      />

      {orderToBeRefunded && (
        <RefundModalForTable
          id={orderToBeRefunded.order_id}
          onCancel={() => setOrderToBeRefunded(undefined)}
          onConfirm={(value) =>
            refundOrder(orderToBeRefunded.order_id, value)
              .then(() =>
                setNotif({
                  message: i18n`refund created successfully`,
                  type: "SUCCESS",
                }),
              )
              .catch((error) =>
                setNotif({
                  message: i18n`could not create the refund`,
                  type: "ERROR",
                  description: error.message,
                }),
              )
              .then(() => setOrderToBeRefunded(undefined))
          }
          onLoadError={(error) => {
            setNotif({
              message: i18n`could not create the refund`,
              type: "ERROR",
              description: error.message,
            });
            setOrderToBeRefunded(undefined);
            return <div />;
          }}
          onUnauthorized={onUnauthorized}
          onNotFound={() => {
            setNotif({
              message: i18n`could not get the order to refund`,
              type: "ERROR",
              // description: error.message
            });
            setOrderToBeRefunded(undefined);
            return <div />;
          }}
        />
      )}
    </Fragment>
  );
}

interface RefundProps {
  id: string;
  onUnauthorized: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  onNotFound: () => VNode;
  onCancel: () => void;
  onConfirm: (m: MerchantBackend.Orders.RefundRequest) => void;
}

function RefundModalForTable({
  id,
  onUnauthorized,
  onLoadError,
  onNotFound,
  onConfirm,
  onCancel,
}: RefundProps) {
  const result = useOrderDetails(id);

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  return (
    <RefundModal
      order={result.data}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

async function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}
