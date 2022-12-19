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
import { MerchantBackend } from "../../../declaration.js";
import { CardTable as CardTableActive } from "./TableActive.js";
import { useState } from "preact/hooks";
import { Translate, useTranslator } from "../../../i18n/index.js";

interface Props {
  instances: MerchantBackend.Instances.Instance[];
  onCreate: () => void;
  onUpdate: (id: string) => void;
  onDelete: (id: MerchantBackend.Instances.Instance) => void;
  onPurge: (id: MerchantBackend.Instances.Instance) => void;
  selected?: boolean;
  setInstanceName: (s: string) => void;
}

export function View({
  instances,
  onCreate,
  onDelete,
  onPurge,
  onUpdate,
  setInstanceName,
  selected,
}: Props): VNode {
  const [show, setShow] = useState<"active" | "deleted" | null>("active");
  const showIsActive = show === "active" ? "is-active" : "";
  const showIsDeleted = show === "deleted" ? "is-active" : "";
  const showAll = show === null ? "is-active" : "";
  const i18n = useTranslator();

  const showingInstances = showIsDeleted
    ? instances.filter((i) => i.deleted)
    : showIsActive
    ? instances.filter((i) => !i.deleted)
    : instances;

  return (
    <div id="app">
      <section class="section is-main-section">
        <div class="columns">
          <div class="column is-two-thirds">
            <div class="tabs" style={{ overflow: "inherit" }}>
              <ul>
                <li class={showIsActive}>
                  <div
                    class="has-tooltip-right"
                    data-tooltip={i18n`Only show active instances`}
                  >
                    <a onClick={() => setShow("active")}>
                      <Translate>Active</Translate>
                    </a>
                  </div>
                </li>
                <li class={showIsDeleted}>
                  <div
                    class="has-tooltip-right"
                    data-tooltip={i18n`Only show deleted instances`}
                  >
                    <a onClick={() => setShow("deleted")}>
                      <Translate>Deleted</Translate>
                    </a>
                  </div>
                </li>
                <li class={showAll}>
                  <div
                    class="has-tooltip-right"
                    data-tooltip={i18n`Show all instances`}
                  >
                    <a onClick={() => setShow(null)}>
                      <Translate>All</Translate>
                    </a>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <CardTableActive
          instances={showingInstances}
          onDelete={onDelete}
          onPurge={onPurge}
          setInstanceName={setInstanceName}
          onUpdate={onUpdate}
          selected={selected}
          onCreate={onCreate}
        />
      </section>
    </div>
  );
}
