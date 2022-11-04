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

import { Fragment, h, VNode } from "preact";
import { useCallback } from "preact/hooks";
import { useBackendContext } from "../../context/backend.js";
import { useConfigContext } from "../../context/config.js";
import { useInstanceContext } from "../../context/instance.js";
import { useInstanceKYCDetails } from "../../hooks/instance.js";
import { Translate } from "../../i18n/index.js";
import { LangSelector } from "./LangSelector.js";

interface Props {
  onLogout: () => void;
  mobile?: boolean;
  instance: string;
  admin?: boolean;
  mimic?: boolean;
}

export function Sidebar({
  mobile,
  instance,
  onLogout,
  admin,
  mimic,
}: Props): VNode {
  const config = useConfigContext();
  const backend = useBackendContext();

  const kycStatus = useInstanceKYCDetails();
  const needKYC = kycStatus.ok && kycStatus.data.type === "redirect";
  // const withInstanceIdIfNeeded = useCallback(function (path: string) {
  //   if (mimic) {
  //     return path + '?instance=' + instance
  //   }
  //   return path
  // },[instance])

  return (
    <aside class="aside is-placed-left is-expanded">
      {mobile && (
        <div
          class="footer"
          onClick={(e) => {
            return e.stopImmediatePropagation();
          }}
        >
          <LangSelector />
        </div>
      )}
      <div class="aside-tools">
        <div class="aside-tools-label">
          <div>
            <b>Taler</b> Backoffice
          </div>
          <div
            class="is-size-7 has-text-right"
            style={{ lineHeight: 0, marginTop: -10 }}
          >
            {process.env.__VERSION__} ({config.version})
          </div>
        </div>
      </div>
      <div class="menu is-menu-main">
        {instance ? (
          <Fragment>
            <p class="menu-label">
              <Translate>Instance</Translate>
            </p>
            <ul class="menu-list">
              <li>
                <a href={"/update"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-square-edit-outline" />
                  </span>
                  <span class="menu-item-label">
                    <Translate>Settings</Translate>
                  </span>
                </a>
              </li>
              <li>
                <a href={"/orders"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-cash-register" />
                  </span>
                  <span class="menu-item-label">
                    <Translate>Orders</Translate>
                  </span>
                </a>
              </li>
              <li>
                <a href={"/products"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-shopping" />
                  </span>
                  <span class="menu-item-label">
                    <Translate>Products</Translate>
                  </span>
                </a>
              </li>
              <li>
                <a href={"/transfers"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-bank" />
                  </span>
                  <span class="menu-item-label">
                    <Translate>Transfers</Translate>
                  </span>
                </a>
              </li>
              <li>
                <a href={"/reserves"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-cash" />
                  </span>
                  <span class="menu-item-label">Reserves</span>
                </a>
              </li>
              {needKYC && (
                <li>
                  <a href={"/kyc"} class="has-icon">
                    <span class="icon">
                      <i class="mdi mdi-account-check" />
                    </span>
                    <span class="menu-item-label">KYC Status</span>
                  </a>
                </li>
              )}
            </ul>
          </Fragment>
        ) : undefined}
        <p class="menu-label">
          <Translate>Connection</Translate>
        </p>
        <ul class="menu-list">
          <li>
            <div>
              <span style={{ width: "3rem" }} class="icon">
                <i class="mdi mdi-currency-eur" />
              </span>
              <span class="menu-item-label">{config.currency}</span>
            </div>
          </li>
          <li>
            <div>
              <span style={{ width: "3rem" }} class="icon">
                <i class="mdi mdi-web" />
              </span>
              <span class="menu-item-label">
                {new URL(backend.url).hostname}
              </span>
            </div>
          </li>
          <li>
            <div>
              <span style={{ width: "3rem" }} class="icon">
                ID
              </span>
              <span class="menu-item-label">
                {!instance ? "default" : instance}
              </span>
            </div>
          </li>
          {admin && !mimic && (
            <Fragment>
              <p class="menu-label">
                <Translate>Instances</Translate>
              </p>
              <li>
                <a href={"/instance/new"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-plus" />
                  </span>
                  <span class="menu-item-label">
                    <Translate>New</Translate>
                  </span>
                </a>
              </li>
              <li>
                <a href={"/instances"} class="has-icon">
                  <span class="icon">
                    <i class="mdi mdi-format-list-bulleted" />
                  </span>
                  <span class="menu-item-label">
                    <Translate>List</Translate>
                  </span>
                </a>
              </li>
            </Fragment>
          )}
          <li>
            <a
              class="has-icon is-state-info is-hoverable"
              onClick={(): void => onLogout()}
            >
              <span class="icon">
                <i class="mdi mdi-logout default" />
              </span>
              <span class="menu-item-label">
                <Translate>Log out</Translate>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}
