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

import { format } from 'date-fns';
import { h, VNode } from 'preact';
import { useState } from 'preact/hooks';
import { DatePicker } from "../../../../components/picker/DatePicker.js";
import { MerchantBackend, WithId } from "../../../../declaration.js";
import { Translate, useTranslator } from '../../../../i18n/index.js';
import { CardTable } from "./Table.js";

export interface ListPageProps {
  errorOrderId: string | undefined,

  onShowAll: () => void,
  onShowPaid: () => void,
  onShowRefunded: () => void,
  onShowNotWired: () => void,
  onCopyURL: (id: string) => void;
  isAllActive: string,
  isPaidActive: string,
  isRefundedActive: string,
  isNotWiredActive: string,

  jumpToDate?: Date,
  onSelectDate: (date?: Date) => void,

  orders: (MerchantBackend.Orders.OrderHistoryEntry & WithId)[];
  onLoadMoreBefore?: () => void;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  onLoadMoreAfter?: () => void;

  onSelectOrder: (o: MerchantBackend.Orders.OrderHistoryEntry & WithId) => void;
  onRefundOrder: (o: MerchantBackend.Orders.OrderHistoryEntry & WithId) => void;
  onSearchOrderById: (id: string) => void;
  onCreate: () => void;
}

export function ListPage({ orders, errorOrderId, isAllActive, onSelectOrder, onRefundOrder, onSearchOrderById, jumpToDate, onCopyURL, onShowAll, onShowPaid, onShowRefunded, onShowNotWired, onSelectDate, isPaidActive, isRefundedActive, isNotWiredActive, onCreate }: ListPageProps): VNode {
  const i18n = useTranslator();
  const dateTooltip = i18n`select date to show nearby orders`;
  const [pickDate, setPickDate] = useState(false);
  const [orderId, setOrderId] = useState<string>('');

  return <section class="section is-main-section">

    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <div class="field has-addons">
            <div class="control">
              <input class={errorOrderId ? "input is-danger" : "input"} type="text" value={orderId} onChange={e => setOrderId(e.currentTarget.value)} placeholder={i18n`order id`} />
              {errorOrderId && <p class="help is-danger">{errorOrderId}</p>}
            </div>
            <span class="has-tooltip-bottom" data-tooltip={i18n`jump to order with the given order ID`}>
              <button class="button" onClick={(e) => onSearchOrderById(orderId)}>
                <span class="icon"><i class="mdi mdi-arrow-right" /></span>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="columns">
      <div class="column is-two-thirds">
        <div class="tabs" style={{overflow:'inherit'}}>
          <ul>
            <li class={isAllActive}>
              <div class="has-tooltip-right" data-tooltip={i18n`remove all filters`}>
                <a onClick={onShowAll}><Translate>All</Translate></a>
              </div>
            </li>
            <li class={isPaidActive}>
              <div class="has-tooltip-right" data-tooltip={i18n`only show paid orders`}>
                <a onClick={onShowPaid}><Translate>Paid</Translate></a>
              </div>
            </li>
            <li class={isRefundedActive}>
              <div class="has-tooltip-right" data-tooltip={i18n`only show orders with refunds`}>
                <a onClick={onShowRefunded}><Translate>Refunded</Translate></a>
              </div>
            </li>
            <li class={isNotWiredActive}>
              <div class="has-tooltip-left" data-tooltip={i18n`only show orders where customers paid, but wire payments from payment provider are still pending`}>
                <a onClick={onShowNotWired}><Translate>Not wired</Translate></a>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div class="column ">
        <div class="buttons is-right">
          <div class="field has-addons">
            {jumpToDate && <div class="control">
              <a class="button" onClick={() => onSelectDate(undefined)}>
                <span class="icon" data-tooltip={i18n`clear date filter`}><i class="mdi mdi-close" /></span>
              </a>
            </div>}
            <div class="control">
              <span class="has-tooltip-top" data-tooltip={dateTooltip}>
                <input class="input" type="text" readonly value={!jumpToDate ? '' : format(jumpToDate, 'yyyy/MM/dd')} placeholder={i18n`date (YYYY/MM/DD)`} onClick={() => { setPickDate(true); }} />
              </span>
            </div>
            <div class="control">
              <span class="has-tooltip-left" data-tooltip={dateTooltip}>
                <a class="button" onClick={() => { setPickDate(true); }}>
                  <span class="icon"><i class="mdi mdi-calendar" /></span>
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DatePicker
      opened={pickDate}
      closeFunction={() => setPickDate(false)}
      dateReceiver={onSelectDate} />

    <CardTable orders={orders}
      onCreate={onCreate}
      onCopyURL={onCopyURL}
      onSelect={onSelectOrder}
      onRefund={onRefundOrder} />
  </section>;
}
