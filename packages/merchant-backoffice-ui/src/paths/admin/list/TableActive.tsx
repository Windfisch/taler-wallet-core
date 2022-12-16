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
import { StateUpdater, useEffect, useState } from "preact/hooks";
import { MerchantBackend } from "../../../declaration.js";
import { Translate, useTranslator } from "../../../i18n/index.js";

interface Props {
  instances: MerchantBackend.Instances.Instance[];
  onUpdate: (id: string) => void;
  onDelete: (id: MerchantBackend.Instances.Instance) => void;
  onPurge: (id: MerchantBackend.Instances.Instance) => void;
  onCreate: () => void;
  selected?: boolean;
  setInstanceName: (s: string) => void;
}

export function CardTable({ instances, onCreate, onUpdate, onPurge, setInstanceName, onDelete, selected }: Props): VNode {
  const [actionQueue, actionQueueHandler] = useState<Actions[]>([]);
  const [rowSelection, rowSelectionHandler] = useState<string[]>([])

  useEffect(() => {
    if (actionQueue.length > 0 && !selected && actionQueue[0].type == 'DELETE') {
      onDelete(actionQueue[0].element)
      actionQueueHandler(actionQueue.slice(1))
    }
  }, [actionQueue, selected, onDelete])

  useEffect(() => {
    if (actionQueue.length > 0 && !selected && actionQueue[0].type == 'UPDATE') {
      onUpdate(actionQueue[0].element.id)
      actionQueueHandler(actionQueue.slice(1))
    }
  }, [actionQueue, selected, onUpdate])

  const i18n = useTranslator()

  return <div class="card has-table">
    <header class="card-header">
      <p class="card-header-title"><span class="icon"><i class="mdi mdi-desktop-mac" /></span><Translate>Instances</Translate></p>

      <div class="card-header-icon" aria-label="more options">

        <button class={rowSelection.length > 0 ? "button is-danger" : "is-hidden"}
          type="button" onClick={(): void => actionQueueHandler(buildActions(instances, rowSelection, 'DELETE'))} >
          <Translate>Delete</Translate>
        </button>
      </div>
      <div class="card-header-icon" aria-label="more options">
        <span class="has-tooltip-left" data-tooltip={i18n`add new instance`}>
          <button class="button is-info" type="button" onClick={onCreate}>
            <span class="icon is-small" ><i class="mdi mdi-plus mdi-36px" /></span>
          </button>
        </span>
      </div>

    </header>
    <div class="card-content">
      <div class="b-table has-pagination">
        <div class="table-wrapper has-mobile-cards">
          {instances.length > 0 ?
            <Table instances={instances} onPurge={onPurge} onUpdate={onUpdate} setInstanceName={setInstanceName} onDelete={onDelete} rowSelection={rowSelection} rowSelectionHandler={rowSelectionHandler} /> :
            <EmptyTable />
          }
        </div>
      </div>
    </div>
  </div>
}
interface TableProps {
  rowSelection: string[];
  instances: MerchantBackend.Instances.Instance[];
  onUpdate: (id: string) => void;
  onDelete: (id: MerchantBackend.Instances.Instance) => void;
  onPurge: (id: MerchantBackend.Instances.Instance) => void;
  rowSelectionHandler: StateUpdater<string[]>;
  setInstanceName: (s:string) => void;
}

function toggleSelected<T>(id: T): (prev: T[]) => T[] {
  return (prev: T[]): T[] => prev.indexOf(id) == -1 ? [...prev, id] : prev.filter(e => e != id)
}

function Table({ rowSelection, rowSelectionHandler, setInstanceName, instances, onUpdate, onDelete, onPurge }: TableProps): VNode {
  return (
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th class="is-checkbox-cell">
              <label class="b-checkbox checkbox">
                <input type="checkbox" checked={rowSelection.length === instances.length} onClick={(): void => rowSelectionHandler(rowSelection.length === instances.length ? [] : instances.map(i => i.id))} />
                <span class="check" />
              </label>
            </th>
            <th><Translate>ID</Translate></th>
            <th><Translate>Name</Translate></th>
            <th />
          </tr>
        </thead>
        <tbody>
          {instances.map(i => {
            return <tr key={i.id}>
              <td class="is-checkbox-cell">
                <label class="b-checkbox checkbox">
                  <input type="checkbox" checked={rowSelection.indexOf(i.id) != -1} onClick={(): void => rowSelectionHandler(toggleSelected(i.id))} />
                  <span class="check" />
                </label>
              </td>
              <td><a href={`#/orders?instance=${i.id}`} onClick={(e) => {
                setInstanceName(i.id);
              }}>{i.id}</a></td>
              <td >{i.name}</td>
              <td class="is-actions-cell right-sticky">
                <div class="buttons is-right">
                  <button class="button is-small is-success jb-modal" type="button" onClick={(): void => onUpdate(i.id)}>
                    <Translate>Edit</Translate>
                  </button>
                  {!i.deleted &&
                  <button class="button is-small is-danger jb-modal is-outlined" type="button" onClick={(): void => onDelete(i)}>
                    <Translate>Delete</Translate>
                  </button>
                  }
                  {i.deleted &&
                  <button class="button is-small is-danger jb-modal" type="button" onClick={(): void => onPurge(i)}>
                    <Translate>Purge</Translate>
                  </button>
                  }
                </div>
              </td>
            </tr>
          })}

        </tbody>
      </table>
    </div>
  )
}

function EmptyTable(): VNode {
  return <div class="content has-text-grey has-text-centered">
    <p>
      <span class="icon is-large"><i class="mdi mdi-emoticon-sad mdi-48px" /></span>
    </p>
    <p><Translate>There is no instances yet, add more pressing the + sign</Translate></p>
  </div>
}


interface Actions {
  element: MerchantBackend.Instances.Instance;
  type: 'DELETE' | 'UPDATE';
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

function buildActions(instances: MerchantBackend.Instances.Instance[], selected: string[], action: 'DELETE'): Actions[] {
  return selected.map(id => instances.find(i => i.id === id))
    .filter(notEmpty)
    .map(id => ({ element: id, type: action }))
}
