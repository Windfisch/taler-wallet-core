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

import { format } from "date-fns";
import { Fragment, h, VNode } from "preact";
import { MerchantBackend, WithId } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";

type Entity = MerchantBackend.Tips.ReserveStatusEntry & WithId;

interface Props {
  instances: Entity[];
  onNewTip: (id: Entity) => void;
  onSelect: (id: Entity) => void;
  onDelete: (id: Entity) => void;
  onCreate: () => void;
}

export function CardTable({
  instances,
  onCreate,
  onSelect,
  onNewTip,
  onDelete,
}: Props): VNode {
  const [withoutFunds, withFunds] = instances.reduce((prev, current) => {
    const amount = current.exchange_initial_amount;
    if (amount.endsWith(":0")) {
      prev[0] = prev[0].concat(current);
    } else {
      prev[1] = prev[1].concat(current);
    }
    return prev;
  }, new Array<Array<Entity>>([], []));

  const i18n = useTranslator();

  return (
    <Fragment>
      {withoutFunds.length > 0 && (
        <div class="card has-table">
          <header class="card-header">
            <p class="card-header-title">
              <span class="icon">
                <i class="mdi mdi-cash" />
              </span>
              <Translate>Reserves not yet funded</Translate>
            </p>
          </header>
          <div class="card-content">
            <div class="b-table has-pagination">
              <div class="table-wrapper has-mobile-cards">
                <TableWithoutFund
                  instances={withoutFunds}
                  onNewTip={onNewTip}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div class="card has-table">
        <header class="card-header">
          <p class="card-header-title">
            <span class="icon">
              <i class="mdi mdi-cash" />
            </span>
            <Translate>Reserves ready</Translate>
          </p>
          <div class="card-header-icon" aria-label="more options" />
          <div class="card-header-icon" aria-label="more options">
            <span class="has-tooltip-left" data-tooltip={i18n`add new reserve`}>
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
              {withFunds.length > 0 ? (
                <Table
                  instances={withFunds}
                  onNewTip={onNewTip}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ) : (
                <EmptyTable />
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
interface TableProps {
  instances: Entity[];
  onNewTip: (id: Entity) => void;
  onDelete: (id: Entity) => void;
  onSelect: (id: Entity) => void;
}

function Table({ instances, onNewTip, onSelect, onDelete }: TableProps): VNode {
  const i18n = useTranslator();
  return (
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>Created at</Translate>
            </th>
            <th>
              <Translate>Expires at</Translate>
            </th>
            <th>
              <Translate>Initial</Translate>
            </th>
            <th>
              <Translate>Picked up</Translate>
            </th>
            <th>
              <Translate>Committed</Translate>
            </th>
            <th />
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
                  {i.creation_time.t_s === "never"
                    ? "never"
                    : format(i.creation_time.t_s * 1000, "yyyy/MM/dd HH:mm:ss")}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.expiration_time.t_s === "never"
                    ? "never"
                    : format(
                        i.expiration_time.t_s * 1000,
                        "yyyy/MM/dd HH:mm:ss"
                      )}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.exchange_initial_amount}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.pickup_amount}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.committed_amount}
                </td>
                <td class="is-actions-cell right-sticky">
                  <div class="buttons is-right">
                    <button
                      class="button is-small is-danger has-tooltip-left"
                      data-tooltip={i18n`delete selected reserve from the database`}
                      type="button"
                      onClick={(): void => onDelete(i)}
                    >
                      Delete
                    </button>
                    <button
                      class="button is-small is-info has-tooltip-left"
                      data-tooltip={i18n`authorize new tip from selected reserve`}
                      type="button"
                      onClick={(): void => onNewTip(i)}
                    >
                      New Tip
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
        <Translate>
          There is no ready reserves yet, add more pressing the + sign or fund
          them
        </Translate>
      </p>
    </div>
  );
}

function TableWithoutFund({
  instances,
  onSelect,
  onDelete,
}: TableProps): VNode {
  const i18n = useTranslator();
  return (
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>Created at</Translate>
            </th>
            <th>
              <Translate>Expires at</Translate>
            </th>
            <th>
              <Translate>Expected Balance</Translate>
            </th>
            <th />
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
                  {i.creation_time.t_s === "never"
                    ? "never"
                    : format(i.creation_time.t_s * 1000, "yyyy/MM/dd HH:mm:ss")}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.expiration_time.t_s === "never"
                    ? "never"
                    : format(
                        i.expiration_time.t_s * 1000,
                        "yyyy/MM/dd HH:mm:ss"
                      )}
                </td>
                <td
                  onClick={(): void => onSelect(i)}
                  style={{ cursor: "pointer" }}
                >
                  {i.merchant_initial_amount}
                </td>
                <td class="is-actions-cell right-sticky">
                  <div class="buttons is-right">
                    <button
                      class="button is-small is-danger jb-modal has-tooltip-left"
                      type="button"
                      data-tooltip={i18n`delete selected reserve from the database`}
                      onClick={(): void => onDelete(i)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
