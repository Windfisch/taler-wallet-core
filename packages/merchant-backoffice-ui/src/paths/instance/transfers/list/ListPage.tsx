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
import { FormProvider } from "../../../../components/form/FormProvider.js";
import { InputSelector } from "../../../../components/form/InputSelector.js";
import { MerchantBackend } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";
import { CardTable } from "./Table.js";

export interface Props {
  transfers: MerchantBackend.Transfers.TransferDetails[];
  onLoadMoreBefore?: () => void;
  onLoadMoreAfter?: () => void;
  onShowAll: () => void;
  onShowVerified: () => void;
  onShowUnverified: () => void;
  isVerifiedTransfers?: boolean;
  isNonVerifiedTransfers?: boolean;
  isAllTransfers?: boolean;
  accounts: string[];
  onChangePayTo: (p?: string) => void;
  payTo?: string;
  onCreate: () => void;
  onDelete: () => void;
}

export function ListPage({
  payTo,
  onChangePayTo,
  transfers,
  onCreate,
  onDelete,
  accounts,
  onLoadMoreBefore,
  onLoadMoreAfter,
  isAllTransfers,
  isNonVerifiedTransfers,
  isVerifiedTransfers,
  onShowAll,
  onShowUnverified,
  onShowVerified,
}: Props): VNode {
  const form = { payto_uri: payTo };

  const i18n = useTranslator();
  return (
    <section class="section is-main-section">
      <div class="columns">
        <div class="column" />
        <div class="column is-10">
          <FormProvider
            object={form}
            valueHandler={(updater) => onChangePayTo(updater(form).payto_uri)}
          >
            <InputSelector
              name="payto_uri"
              label={i18n`Address`}
              values={accounts}
              placeholder={i18n`Select one account`}
              tooltip={i18n`filter by account address`}
            />
          </FormProvider>
        </div>
        <div class="column" />
      </div>
      <div class="tabs">
        <ul>
          <li class={isAllTransfers ? "is-active" : ""}>
            <div
              class="has-tooltip-right"
              data-tooltip={i18n`remove all filters`}
            >
              <a onClick={onShowAll}>
                <Translate>All</Translate>
              </a>
            </div>
          </li>
          <li class={isVerifiedTransfers ? "is-active" : ""}>
            <div
              class="has-tooltip-right"
              data-tooltip={i18n`only show wire transfers confirmed by the merchant`}
            >
              <a onClick={onShowVerified}>
                <Translate>Verified</Translate>
              </a>
            </div>
          </li>
          <li class={isNonVerifiedTransfers ? "is-active" : ""}>
            <div
              class="has-tooltip-right"
              data-tooltip={i18n`only show wire transfers claimed by the exchange`}
            >
              <a onClick={onShowUnverified}>
                <Translate>Unverified</Translate>
              </a>
            </div>
          </li>
        </ul>
      </div>
      <CardTable
        transfers={transfers.map((o) => ({
          ...o,
          id: String(o.transfer_serial_id),
        }))}
        accounts={accounts}
        onCreate={onCreate}
        onDelete={onDelete}
        onLoadMoreBefore={onLoadMoreBefore}
        hasMoreBefore={!onLoadMoreBefore}
        onLoadMoreAfter={onLoadMoreAfter}
        hasMoreAfter={!onLoadMoreAfter}
      />
    </section>
  );
}
