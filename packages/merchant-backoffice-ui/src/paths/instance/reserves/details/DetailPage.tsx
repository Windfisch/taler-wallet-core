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

import { Amounts } from "@gnu-taler/taler-util";
import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { QR } from "../../../../components/exception/QR.js";
import { FormProvider } from "../../../../components/form/FormProvider.js";
import { Input } from "../../../../components/form/Input.js";
import { InputCurrency } from "../../../../components/form/InputCurrency.js";
import { InputDate } from "../../../../components/form/InputDate.js";
import { TextField } from "../../../../components/form/TextField.js";
import { ContinueModal, SimpleModal } from "../../../../components/modal/index.js";
import { MerchantBackend } from "../../../../declaration.js";
import { useTipDetails } from "../../../../hooks/reserves.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";
import { TipInfo } from "./TipInfo.js";

type Entity = MerchantBackend.Tips.ReserveDetail;
type CT = MerchantBackend.ContractTerms;

interface Props {
  onBack: () => void;
  selected: Entity;
  id: string;
}

export function DetailPage({ id, selected, onBack }: Props): VNode {
  const i18n = useTranslator();
  const didExchangeAckTransfer = Amounts.isNonZero(
    Amounts.parseOrThrow(selected.exchange_initial_amount)
  );
  const link = `${selected.payto_uri}?message=${id}&amount=${selected.merchant_initial_amount}`;

  return (
    <div class="columns">
      <div class="column" />
      <div class="column is-four-fifths">
        <div class="section main-section">
          <FormProvider object={{ ...selected, id }} valueHandler={null}>
            <InputDate<Entity>
              name="creation_time"
              label={i18n`Created at`}
              readonly
            />
            <InputDate<Entity>
              name="expiration_time"
              label={i18n`Valid until`}
              readonly
            />
            <InputCurrency<Entity>
              name="merchant_initial_amount"
              label={i18n`Created balance`}
              readonly
            />
            <TextField<Entity>
              name="exchange_url"
              label={i18n`Exchange URL`}
              readonly
            >
              <a target="_blank" rel="noreferrer" href={selected.exchange_url}>
                {selected.exchange_url}
              </a>
            </TextField>

            {didExchangeAckTransfer && (
              <Fragment>
                <InputCurrency<Entity>
                  name="exchange_initial_amount"
                  label={i18n`Exchange balance`}
                  readonly
                />
                <InputCurrency<Entity>
                  name="pickup_amount"
                  label={i18n`Picked up`}
                  readonly
                />
                <InputCurrency<Entity>
                  name="committed_amount"
                  label={i18n`Committed`}
                  readonly
                />
              </Fragment>
            )}
            <Input<Entity>
              name="payto_uri"
              label={i18n`Account address`}
              readonly
            />
            <Input name="id" label={i18n`Subject`} readonly />
          </FormProvider>

          {didExchangeAckTransfer ? (
            <Fragment>
              <div class="card has-table">
                <header class="card-header">
                  <p class="card-header-title">
                    <span class="icon">
                      <i class="mdi mdi-cash-register" />
                    </span>
                    <Translate>Tips</Translate>
                  </p>
                </header>
                <div class="card-content">
                  <div class="b-table has-pagination">
                    <div class="table-wrapper has-mobile-cards">
                      {selected.tips && selected.tips.length > 0 ? (
                        <Table tips={selected.tips} />
                      ) : (
                        <EmptyTable />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Fragment>
          ) : (
            <Fragment>
              <p class="is-size-5">
                <Translate>
                  To complete the setup of the reserve, you must now initiate a
                  wire transfer using the given wire transfer subject and
                  crediting the specified amount to the indicated account of the
                  exchange.
                </Translate>
              </p>
              <p class="is-size-5">
                <Translate>
                  If your system supports RFC 8905, you can do this by opening
                  this URI:
                </Translate>
              </p>
              <pre>
                <a target="_blank" rel="noreferrer" href={link}>
                  {link}
                </a>
              </pre>
              <QR text={link} />
            </Fragment>
          )}

          <div class="buttons is-right mt-5">
            <button class="button" onClick={onBack}>
              <Translate>Back</Translate>
            </button>
          </div>
        </div>
      </div>
      <div class="column" />
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
        <Translate>No tips has been authorized from this reserve</Translate>
      </p>
    </div>
  );
}

interface TableProps {
  tips: MerchantBackend.Tips.TipStatusEntry[];
}

function Table({ tips }: TableProps): VNode {
  return (
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>Authorized</Translate>
            </th>
            <th>
              <Translate>Picked up</Translate>
            </th>
            <th>
              <Translate>Reason</Translate>
            </th>
            <th>
              <Translate>Expiration</Translate>
            </th>
          </tr>
        </thead>
        <tbody>
          {tips.map((t, i) => {
            return <TipRow id={t.tip_id} key={i} entry={t} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

function TipRow({
  id,
  entry,
}: {
  id: string;
  entry: MerchantBackend.Tips.TipStatusEntry;
}) {
  const [selected, setSelected] = useState(false);
  const result = useTipDetails(id);
  if (result.loading) {
    return (
      <tr>
        <td>...</td>
        <td>...</td>
        <td>...</td>
        <td>...</td>
      </tr>
    );
  }
  if (!result.ok) {
    return (
      <tr>
        <td>...</td> {/* authorized */}
        <td>{entry.total_amount}</td>
        <td>{entry.reason}</td>
        <td>...</td> {/* expired */}
      </tr>
    );
  }
  const info = result.data;
  function onSelect() {
    setSelected(true);
  }
  return (
    <Fragment>
      {selected && (
        <SimpleModal
          description="tip"
          active
          onCancel={() => setSelected(false)}
        >
          <TipInfo id={id} amount={info.total_authorized} entity={info} />
        </SimpleModal>
      )}
      <tr>
        <td onClick={onSelect}>{info.total_authorized}</td>
        <td onClick={onSelect}>{info.total_picked_up}</td>
        <td onClick={onSelect}>{info.reason}</td>
        <td onClick={onSelect}>
          {info.expiration.t_s === "never"
            ? "never"
            : format(info.expiration.t_s * 1000, "yyyy/MM/dd HH:mm:ss")}
        </td>
      </tr>
    </Fragment>
  );
}
