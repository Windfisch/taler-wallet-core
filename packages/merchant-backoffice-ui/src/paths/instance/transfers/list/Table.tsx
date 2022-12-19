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
import { h, VNode } from "preact";
import { StateUpdater, useState } from "preact/hooks";
import { MerchantBackend, WithId } from "../../../../declaration.js";
import { Translate, useTranslator } from "../../../../i18n/index.js";

type Entity = MerchantBackend.Transfers.TransferDetails & WithId;

interface Props {
  transfers: Entity[];
  onDelete: (id: Entity) => void;
  onCreate: () => void;
  accounts: string[];
  onLoadMoreBefore?: () => void;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  onLoadMoreAfter?: () => void;
}

export function CardTable({
  transfers,
  onCreate,
  onDelete,
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
            <i class="mdi mdi-bank" />
          </span>
          <Translate>Transfers</Translate>
        </p>
        <div class="card-header-icon" aria-label="more options">
          <span class="has-tooltip-left" data-tooltip={i18n`add new transfer`}>
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
            {transfers.length > 0 ? (
              <Table
                instances={transfers}
                onDelete={onDelete}
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
  onDelete: (id: Entity) => void;
  rowSelectionHandler: StateUpdater<string[]>;
  onLoadMoreBefore?: () => void;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  onLoadMoreAfter?: () => void;
}

function toggleSelected<T>(id: T): (prev: T[]) => T[] {
  return (prev: T[]): T[] =>
    prev.indexOf(id) == -1 ? [...prev, id] : prev.filter((e) => e != id);
}

function Table({
  instances,
  onLoadMoreAfter,
  onDelete,
  onLoadMoreBefore,
  hasMoreAfter,
  hasMoreBefore,
}: TableProps): VNode {
  const i18n = useTranslator();
  return (
    <div class="table-container">
      {onLoadMoreBefore && (
        <button
          class="button is-fullwidth"
          data-tooltip={i18n`load more transfers before the first one`}
          disabled={!hasMoreBefore}
          onClick={onLoadMoreBefore}
        >
          <Translate>load newer transfers</Translate>
        </button>
      )}
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>ID</Translate>
            </th>
            <th>
              <Translate>Credit</Translate>
            </th>
            <th>
              <Translate>Address</Translate>
            </th>
            <th>
              <Translate>Exchange URL</Translate>
            </th>
            <th>
              <Translate>Confirmed</Translate>
            </th>
            <th>
              <Translate>Verified</Translate>
            </th>
            <th>
              <Translate>Executed at</Translate>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {instances.map((i) => {
            return (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.credit_amount}</td>
                <td>{i.payto_uri}</td>
                <td>{i.exchange_url}</td>
                <td>{i.confirmed ? i18n`yes` : i18n`no`}</td>
                <td>{i.verified ? i18n`yes` : i18n`no`}</td>
                <td>
                  {i.execution_time
                    ? i.execution_time.t_s == "never"
                      ? i18n`never`
                      : format(
                          i.execution_time.t_s * 1000,
                          "yyyy/MM/dd HH:mm:ss",
                        )
                    : i18n`unknown`}
                </td>
                <td>
                  {i.verified === undefined ? (
                    <button
                      class="button is-danger is-small has-tooltip-left"
                      data-tooltip={i18n`delete selected transfer from the database`}
                      onClick={() => onDelete(i)}
                    >
                      Delete
                    </button>
                  ) : undefined}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {onLoadMoreAfter && (
        <button
          class="button is-fullwidth"
          data-tooltip={i18n`load more transfer after the last one`}
          disabled={!hasMoreAfter}
          onClick={onLoadMoreAfter}
        >
          <Translate>load older transfers</Translate>
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
        <Translate>
          There is no transfer yet, add more pressing the + sign
        </Translate>
      </p>
    </div>
  );
}
